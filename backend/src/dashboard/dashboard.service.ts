import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Stream, StreamPlatform } from "../music/streams/stream.entity";
import { Track } from "../music/tracks/track.entity";
import { WorkoutSession } from "../workout/sessions/session.entity";
import { Account } from "../system/accounts/account.entity";

type DashboardFocus = "momentum" | "steady" | "attention";

interface DashboardSnapshotItem {
  id: string;
  label: string;
  value: string;
  note: string;
}

interface DashboardInsightItem {
  id: string;
  title: string;
  summary: string;
  tone: "positive" | "neutral" | "warning";
  domains: string[];
  evidence: string[];
}

interface DashboardAiPrompt {
  id: string;
  label: string;
  prompt: string;
  pageContext: {
    route: string;
    pageType: string;
    filters: Record<string, string>;
  };
}

interface LandingMetricItem {
  id: string;
  value: number;
  suffix?: string;
  label: string;
  note: string;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Stream) private readonly streamRepo: Repository<Stream>,
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    @InjectRepository(WorkoutSession)
    private readonly sessionRepo: Repository<WorkoutSession>,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Returns how many Spotify streams occurred during finished workout sessions and the total streamed time in seconds.
   * Optionally constrained by a timeframe window (streamedAt between from/to).
   */
  async getSpotifyStreamsDuringWorkouts(
    account: Account,
    opts?: { from?: Date; to?: Date }
  ): Promise<{ streams: number; totalTimeSeconds: number }> {
    const qb = this.streamRepo
      .createQueryBuilder("st")
      .innerJoin(
        WorkoutSession,
        "ws",
        // Only match streams inside completed sessions for this account
        'ws."accountId" = st."accountId" AND ws."endAt" IS NOT NULL AND st."streamedAt" BETWEEN ws."startAt" AND ws."endAt"'
      )
      .innerJoin(Track, "t", 't."id" = st."trackId"')
      .where('st."accountId" = :accountId', { accountId: account.id })
      .andWhere("st.platform = :platform", { platform: StreamPlatform.SPOTIFY })
      .select("COUNT(*)", "streams")
      .addSelect("COALESCE(SUM(t.duration), 0)", "timeSeconds");

    if (opts?.from) {
      qb.andWhere('st."streamedAt" >= :from', { from: opts.from });
    }
    if (opts?.to) {
      qb.andWhere('st."streamedAt" <= :to', { to: opts.to });
    }

    const raw = await qb.getRawOne<{ streams: string; timeSeconds: string }>();
    return {
      streams: raw ? parseInt(raw.streams, 10) : 0,
      totalTimeSeconds: raw ? parseInt(raw.timeSeconds, 10) : 0,
    };
  }

  /**
   * Correlation: habit completion rate on workout days vs non-workout days
   */
  async getWorkoutHabitCorrelation(accountId: string) {
    // Get workout dates for last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const from = ninetyDaysAgo.toISOString().slice(0, 10);

    const workoutDays = await this.dataSource.query(
      `SELECT DISTINCT date FROM app_workout_sessions
       WHERE "accountId" = $1 AND date >= $2`,
      [accountId, from]
    );
    const workoutDateSet = new Set(workoutDays.map((r: any) => r.date));

    // Get habit entries for same period
    const habitEntries = await this.dataSource.query(
      `SELECT date, status FROM app_habit_entries he
       INNER JOIN app_habits h ON he."habitId" = h.id
       WHERE h."accountId" = $1 AND he.date >= $2`,
      [accountId, from]
    );

    let workoutDaySuccess = 0, workoutDayTotal = 0;
    let restDaySuccess = 0, restDayTotal = 0;

    for (const entry of habitEntries) {
      if (workoutDateSet.has(entry.date)) {
        workoutDayTotal++;
        if (entry.status === 'success') workoutDaySuccess++;
      } else {
        restDayTotal++;
        if (entry.status === 'success') restDaySuccess++;
      }
    }

    return {
      workoutDays: {
        completionRate: workoutDayTotal > 0 ? Math.round((workoutDaySuccess / workoutDayTotal) * 100) : 0,
        total: workoutDayTotal,
        successful: workoutDaySuccess,
      },
      restDays: {
        completionRate: restDayTotal > 0 ? Math.round((restDaySuccess / restDayTotal) * 100) : 0,
        total: restDayTotal,
        successful: restDaySuccess,
      },
      totalWorkoutDays: workoutDateSet.size,
    };
  }

  /**
   * Weekly activity summary across all domains
   */
  async getWeeklySummary(accountId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const from = sevenDaysAgo.toISOString().slice(0, 10);

    // Workouts this week
    const workouts = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM app_workout_sessions
       WHERE "accountId" = $1 AND date >= $2`,
      [accountId, from]
    );

    // Habit completions this week
    const habits = await this.dataSource.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN he.status = 'success' THEN 1 ELSE 0 END) as completed
       FROM app_habit_entries he
       INNER JOIN app_habits h ON he."habitId" = h.id
       WHERE h."accountId" = $1 AND he.date >= $2`,
      [accountId, from]
    );

    // Spending this week
    const spending = await this.dataSource.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions
       WHERE "accountId" = $1 AND "transactionDate" >= $2
       AND "isIncome" = false AND (type IS NULL OR type NOT IN (1, 3))`,
      [accountId, from]
    );

    // Streams this week
    const streams = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM app_streams s
       INNER JOIN app_tracks t ON s."trackId" = t.id
       WHERE t."accountId" = $1 AND s."streamedAt" >= $2`,
      [accountId, from]
    );

    return {
      workouts: parseInt(workouts[0]?.count) || 0,
      habitsCompleted: parseInt(habits[0]?.completed) || 0,
      habitsTotal: parseInt(habits[0]?.total) || 0,
      spending: parseFloat(spending[0]?.total) || 0,
      streams: parseInt(streams[0]?.count) || 0,
    };
  }

  async getDashboardIntelligence(accountId: string) {
    const [weekly, correlation] = await Promise.all([
      this.getWeeklySummary(accountId),
      this.getWorkoutHabitCorrelation(accountId),
    ]);

    const habitRate =
      weekly.habitsTotal > 0
        ? Math.round((weekly.habitsCompleted / weekly.habitsTotal) * 100)
        : 0;
    const workoutDayDelta =
      correlation.workoutDays.completionRate - correlation.restDays.completionRate;

    const score = this.computeDashboardScore({
      workouts: weekly.workouts,
      habitRate,
      spending: weekly.spending,
      workoutDayDelta,
    });

    const focus: DashboardFocus =
      score >= 70 ? "momentum" : score >= 45 ? "steady" : "attention";

    const snapshot: DashboardSnapshotItem[] = [
      {
        id: "training",
        label: "Training",
        value: `${weekly.workouts} sessions`,
        note:
          weekly.workouts >= 4
            ? "Consistent cadence this week"
            : weekly.workouts > 0
              ? "Room to add one more strong session"
              : "No training signal yet this week",
      },
      {
        id: "habits",
        label: "Habits",
        value: `${habitRate}%`,
        note: `${weekly.habitsCompleted}/${weekly.habitsTotal} completions logged`,
      },
      {
        id: "spending",
        label: "Spending",
        value: `$${Math.round(Math.abs(weekly.spending))}`,
        note:
          weekly.spending <= 250
            ? "Spending pressure is under control"
            : "Worth reviewing the week’s biggest categories",
      },
      {
        id: "media",
        label: "Listening",
        value: `${weekly.streams} streams`,
        note:
          weekly.streams >= 80
            ? "Strong soundtrack signal around the week"
            : "Lighter media footprint than usual",
      },
    ];

    const insights: DashboardInsightItem[] = [
      {
        id: "habit-workout-correlation",
        title:
          workoutDayDelta > 0
            ? "Training days are lifting your consistency"
            : "Training days are not yet improving consistency",
        summary:
          workoutDayDelta > 0
            ? `You complete ${workoutDayDelta}% more habits on workout days than on rest days.`
            : `Habit completion is ${Math.abs(workoutDayDelta)}% lower on workout days, which suggests your training routine may be competing with your habit cadence.`,
        tone: workoutDayDelta > 0 ? "positive" : "warning",
        domains: ["workout", "habits"],
        evidence: [
          `${correlation.workoutDays.completionRate}% completion on workout days`,
          `${correlation.restDays.completionRate}% completion on rest days`,
          `${correlation.totalWorkoutDays} workout days in the measured window`,
        ],
      },
      {
        id: "spending-watch",
        title:
          weekly.spending <= 250
            ? "Spending is staying contained"
            : "Spending drift deserves attention",
        summary:
          weekly.spending <= 250
            ? "This week’s spend is low enough that you can focus on consistency rather than correction."
            : "This week’s spending is elevated enough to justify a category-level review before the pattern hardens.",
        tone: weekly.spending <= 250 ? "positive" : "warning",
        domains: ["finance"],
        evidence: [
          `$${Math.round(Math.abs(weekly.spending))} spent this week`,
          weekly.spending <= 250
            ? "Below the current soft warning threshold"
            : "Above the current soft warning threshold",
        ],
      },
      {
        id: "weekly-cadence",
        title:
          weekly.workouts >= 4 && habitRate >= 70
            ? "Your weekly cadence looks cohesive"
            : "Your weekly cadence is fragmented",
        summary:
          weekly.workouts >= 4 && habitRate >= 70
            ? "Training volume and habit consistency are moving in the same direction, which is the right base for deeper optimization."
            : "The week has signals, but not enough consistency yet to trust the broader trend without intervention.",
        tone:
          weekly.workouts >= 4 && habitRate >= 70 ? "positive" : "neutral",
        domains: ["workout", "habits", "finance", "media"],
        evidence: [
          `${weekly.workouts} workouts logged`,
          `${habitRate}% habit completion`,
          `${weekly.streams} listening events`,
        ],
      },
    ];

    const aiPrompts: DashboardAiPrompt[] = [
      {
        id: "training-pattern",
        label: "Ask AI about my training pattern",
        prompt: `Review my current dashboard context and explain whether my recent workout cadence is actually helping my broader weekly consistency. Focus on actionable changes, not generic encouragement.`,
        pageContext: {
          route: "/home",
          pageType: "dashboard",
          filters: { source: "dashboard-intelligence", prompt: "training-pattern" },
        },
      },
      {
        id: "spending-drift",
        label: "Ask AI where money is drifting",
        prompt: `Using my current weekly dashboard signals, tell me what spending patterns are most likely worth reviewing right now and what category-level drilldowns I should check first.`,
        pageContext: {
          route: "/home",
          pageType: "dashboard",
          filters: { source: "dashboard-intelligence", prompt: "spending-drift" },
        },
      },
      {
        id: focus === "attention" ? "course-correct" : "habit-leverage",
        label:
          focus === "attention"
            ? "Ask AI how to course-correct this week"
            : "Ask AI which habits are worth doubling down on",
        prompt:
          focus === "attention"
            ? `Use my current dashboard data to identify the smallest set of changes that would most improve this week across training, habits, and spending.`
            : `Use my current dashboard data to identify the habits and routines that seem to create the biggest positive spillover into training and weekly consistency.`,
        pageContext: {
          route: "/home",
          pageType: "dashboard",
          filters: {
            source: "dashboard-intelligence",
            prompt: focus === "attention" ? "course-correct" : "habit-leverage",
          },
        },
      },
    ];

    return {
      generatedAt: new Date().toISOString(),
      focus,
      score,
      headline:
        focus === "momentum"
          ? "Momentum is building across the week"
          : focus === "steady"
            ? "Steady, but with one or two weak seams"
            : "Attention is needed to tighten the week",
      summary:
        focus === "momentum"
          ? "Your current mix of training, consistency, and spending control is coherent enough to optimize rather than rescue."
          : focus === "steady"
            ? "The week is holding together, but the signals are mixed enough that one good correction could improve the whole picture."
            : "The current pattern is fragmented. Use the recommendations below to stabilize consistency before chasing more volume or complexity.",
      snapshot,
      insights,
      aiPrompts,
    };
  }

  async getLandingStats() {
    const [workouts, habits, streams] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*) as count FROM app_workout_sessions`),
      this.dataSource.query(`SELECT COUNT(*) as count FROM app_habit_entries`),
      this.dataSource.query(`SELECT COUNT(*) as count FROM app_streams`),
    ]);

    const metrics: LandingMetricItem[] = [
      {
        id: "workouts",
        value: this.parseCount(workouts),
        suffix: "+",
        label: "Workout sessions captured",
        note: "Logged lifts, runs, and training blocks preserved in one timeline.",
      },
      {
        id: "habits",
        value: this.parseCount(habits),
        suffix: "+",
        label: "Habit check-ins preserved",
        note: "Daily consistency records kept as part of the same reflective system.",
      },
      {
        id: "streams",
        value: this.parseCount(streams),
        suffix: "+",
        label: "Listening events mapped",
        note: "Media history connected back to routines, workouts, and weekly review.",
      },
    ];

    return {
      generatedAt: new Date().toISOString(),
      metrics,
    };
  }

  private computeDashboardScore(args: {
    workouts: number;
    habitRate: number;
    spending: number;
    workoutDayDelta: number;
  }) {
    const trainingScore = Math.min(args.workouts * 8, 30);
    const habitsScore = Math.min(Math.round(args.habitRate * 0.35), 35);
    const spendingScore =
      args.spending <= 250 ? 20 : args.spending <= 400 ? 12 : 4;
    const correlationScore =
      args.workoutDayDelta > 0 ? 18 : args.workoutDayDelta >= -10 ? 10 : 4;

    return trainingScore + habitsScore + spendingScore + correlationScore;
  }

  private parseCount(rows: Array<{ count?: string | number | null }>) {
    const raw = rows?.[0]?.count;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") return parseInt(raw, 10) || 0;
    return 0;
  }
}
