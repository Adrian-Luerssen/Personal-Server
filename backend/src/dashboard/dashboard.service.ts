import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Stream, StreamPlatform } from "../music/streams/stream.entity";
import { Track } from "../music/tracks/track.entity";
import { WorkoutSession } from "../workout/sessions/session.entity";
import { Account } from "../system/accounts/account.entity";
import { SyncService } from "../sync/sync.service";
import { formatDateYYYYMMDDInZone } from "../utils/utils";

export type DashboardFocus = "momentum" | "steady" | "attention";

export interface DashboardSnapshotItem {
  id: string;
  label: string;
  value: string;
  note: string;
}

export interface DashboardInsightItem {
  id: string;
  title: string;
  summary: string;
  tone: "positive" | "neutral" | "warning";
  domains: string[];
  evidence: string[];
}

export interface DashboardAiPrompt {
  id: string;
  label: string;
  prompt: string;
  pageContext: {
    route: string;
    pageType: string;
    filters: Record<string, string>;
  };
}

export interface LandingMetricItem {
  id: string;
  value: number;
  suffix?: string;
  label: string;
  note: string;
}

export interface DashboardIntelligenceResponse {
  generatedAt: string;
  focus: DashboardFocus;
  score: number;
  headline: string;
  summary: string;
  snapshot: DashboardSnapshotItem[];
  insights: DashboardInsightItem[];
  aiPrompts: DashboardAiPrompt[];
}

export interface LandingStatsResponse {
  generatedAt: string;
  metrics: LandingMetricItem[];
}

export interface DashboardMobileSnapshotResponse {
  accountId: string;
  generatedAt: string;
  sync: {
    checkedAt: string;
    watermarks: Record<string, number>;
  };
  intelligence: DashboardIntelligenceResponse;
  weeklySummary: {
    workouts: number;
    habitsCompleted: number;
    habitsTotal: number;
    spending: number;
    streams: number;
  };
  workoutHabitCorrelation: {
    workoutDays: {
      completionRate: number;
      total: number;
      successful: number;
    };
    restDays: {
      completionRate: number;
      total: number;
      successful: number;
    };
    totalWorkoutDays: number;
  };
  habits: {
    total: number;
    completedToday: number;
    incompleteToday: number;
    completionPct: number;
    dailyCompletions: Array<{ date: string; count: number }>;
    today: Array<{
      habitId: string;
      habitName: string;
      habitIconName: string;
      habitColor: string;
      frequencyType: string;
      trackingType: string;
      numericUnit: string | null;
      todayStatus: string | null;
      numericValue: number | null;
      comment: string | null;
      completedToday: boolean;
      currentStreak: number;
      longestStreak: number;
      successRate: number;
    }>;
  };
  workout: {
    totals: {
      totalWorkouts: number;
      totalSets: number;
      totalReps: number;
      totalVolume: number;
      totalTimeSeconds: number;
    };
    activeSession: Record<string, any> | null;
    recentSessions: Array<Record<string, any>>;
  };
  finance: {
    summary: {
      totalIncome: number;
      totalExpense: number;
      netBalance: number;
      incomeCount: number;
      expenseCount: number;
    };
    monthlySpent: number;
  };
  spotify: {
    stats: {
      totalStreams: number;
      msListened: number;
      uniqueTracks: number;
      uniqueArtists: number;
      lastStream?: string;
    };
    rankingPreview: Array<{
      rank: number;
      accountId: string;
      displayName: string;
      spotifyUserId?: string;
      streamCount: number;
      uniqueTracks: number;
      msListened: number;
      lastStream?: string;
    }>;
  };
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Stream) private readonly streamRepo: Repository<Stream>,
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    @InjectRepository(WorkoutSession)
    private readonly sessionRepo: Repository<WorkoutSession>,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly syncService?: SyncService
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
      `SELECT DISTINCT date FROM app_workout_session
       WHERE "accountId" = $1 AND date >= $2`,
      [accountId, from]
    );
    const workoutDateSet = new Set(workoutDays.map((r: any) => r.date));

    // Get habit entries for same period
    const habitEntries = await this.dataSource.query(
      `SELECT date, status FROM app_habit_entry he
       INNER JOIN app_habit h ON he."habitId" = h.id
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
      `SELECT COUNT(*) as count FROM app_workout_session
       WHERE "accountId" = $1 AND date >= $2`,
      [accountId, from]
    );

    // Habit completions this week
    const habits = await this.dataSource.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN he.status = 'success' THEN 1 ELSE 0 END) as completed
       FROM app_habit_entry he
       INNER JOIN app_habit h ON he."habitId" = h.id
       WHERE h."accountId" = $1 AND he.date >= $2`,
      [accountId, from]
    );

    // Spending this week
    const spending = await this.dataSource.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM app_finance_transactions
       WHERE "accountId" = $1 AND "transactionDate" >= $2
       AND "isIncome" = false AND (type IS NULL OR type NOT IN (1, 3))`,
      [accountId, from]
    );

    // Streams this week
    const streams = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM app_stream s
       INNER JOIN app_track t ON s."trackId" = t.id
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

  async getDashboardIntelligence(accountId: string): Promise<DashboardIntelligenceResponse> {
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

  async getMobileSnapshot(
    account: Account
  ): Promise<DashboardMobileSnapshotResponse> {
    const accountId = account.id;
    const now = new Date();
    const today = formatDateYYYYMMDDInZone(now, "Europe/Madrid");
    const monthStart = `${today.slice(0, 7)}-01`;
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const weekStart = formatDateYYYYMMDDInZone(sevenDaysAgo, "Europe/Madrid");

    const [
      intelligence,
      weeklySummary,
      workoutHabitCorrelation,
      habitRows,
      habitTrendRows,
      workoutTotalRows,
      activeSessionRows,
      recentSessionRows,
      financeRows,
      spotifyRows,
      rankingRows,
      watermarks,
    ] = await Promise.all([
      this.getDashboardIntelligence(accountId),
      this.getWeeklySummary(accountId),
      this.getWorkoutHabitCorrelation(accountId),
      this.getMobileHabitsToday(accountId, today),
      this.getMobileHabitDailyCompletions(accountId, weekStart),
      this.getMobileWorkoutTotals(accountId),
      this.getMobileActiveWorkout(accountId),
      this.getMobileRecentWorkouts(accountId),
      this.getMobileFinanceSummary(accountId, monthStart),
      this.getMobileSpotifyStats(accountId),
      this.getMobileSpotifyRanking(),
      this.syncService?.getWatermarks(accountId) ?? Promise.resolve({}),
    ]);

    const habitsToday = habitRows.map((row) => {
      const streak = row.entries
        ? this.calculateHabitStreak(row.entries, today)
        : {
            current: this.parseNumber(row.currentStreak),
            longest: this.parseNumber(row.longestStreak),
          };
      return {
        habitId: row.habitId,
        habitName: row.habitName,
        habitIconName: row.habitIconName || "circle-check",
        habitColor: row.habitColor || "#a78bfa",
        frequencyType: row.frequencyType || "daily",
        trackingType: row.trackingType || "boolean",
        numericUnit: row.numericUnit ?? null,
        todayStatus: row.todayStatus ?? null,
        numericValue: row.numericValue != null ? Number(row.numericValue) : null,
        comment: row.comment ?? null,
        completedToday: this.parseBoolean(row.completedToday),
        currentStreak: streak.current,
        longestStreak: streak.longest,
        successRate: this.parseNumber(row.successRate),
      };
    });
    const completedToday = habitsToday.filter((habit) => habit.completedToday)
      .length;
    const totalHabits = habitsToday.length;

    const workoutTotalsRow = workoutTotalRows[0] ?? {};
    const financeRow = financeRows[0] ?? {};
    const spotifyRow = spotifyRows[0] ?? {};
    const totalIncome = this.parseNumber(financeRow.totalIncome);
    const totalExpense = this.parseNumber(financeRow.totalExpense);

    return {
      accountId,
      generatedAt: now.toISOString(),
      sync: {
        checkedAt: new Date().toISOString(),
        watermarks,
      },
      intelligence,
      weeklySummary,
      workoutHabitCorrelation,
      habits: {
        total: totalHabits,
        completedToday,
        incompleteToday: Math.max(totalHabits - completedToday, 0),
        completionPct:
          totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0,
        dailyCompletions: habitTrendRows.map((row) => ({
          date: this.toDateOnly(row.date),
          count: this.parseNumber(row.count),
        })),
        today: habitsToday,
      },
      workout: {
        totals: {
          totalWorkouts: this.parseNumber(workoutTotalsRow.totalWorkouts),
          totalSets: this.parseNumber(workoutTotalsRow.totalSets),
          totalReps: this.parseNumber(workoutTotalsRow.totalReps),
          totalVolume: this.parseNumber(workoutTotalsRow.totalVolume),
          totalTimeSeconds: this.parseNumber(workoutTotalsRow.totalTimeSeconds),
        },
        activeSession: this.mapWorkoutSession(activeSessionRows[0]),
        recentSessions: recentSessionRows.map((row) =>
          this.mapWorkoutSession(row)
        ),
      },
      finance: {
        summary: {
          totalIncome,
          totalExpense,
          netBalance: totalIncome - totalExpense,
          incomeCount: this.parseNumber(financeRow.incomeCount),
          expenseCount: this.parseNumber(financeRow.expenseCount),
        },
        monthlySpent: totalExpense,
      },
      spotify: {
        stats: {
          totalStreams: this.parseNumber(spotifyRow.totalStreams),
          msListened: this.parseNumber(spotifyRow.msListened),
          uniqueTracks: this.parseNumber(spotifyRow.uniqueTracks),
          uniqueArtists: this.parseNumber(spotifyRow.uniqueArtists),
          lastStream: spotifyRow.lastStream
            ? new Date(spotifyRow.lastStream).toISOString()
            : undefined,
        },
        rankingPreview: rankingRows.map((row) => ({
          rank: this.parseNumber(row.rank),
          accountId: row.accountId,
          displayName: row.displayName || "Spotify User",
          spotifyUserId: row.spotifyUserId || undefined,
          streamCount: this.parseNumber(row.streamCount),
          uniqueTracks: this.parseNumber(row.uniqueTracks),
          msListened: this.parseNumber(row.msListened),
          lastStream: row.lastStream
            ? new Date(row.lastStream).toISOString()
            : undefined,
        })),
      },
    };
  }

  private getMobileHabitsToday(accountId: string, today: string) {
    return this.dataSource.query(
      `SELECT
        h.id AS "habitId",
        h.name AS "habitName",
        COALESCE(h."iconName", 'circle-check') AS "habitIconName",
        COALESCE(h.color, '#a78bfa') AS "habitColor",
        h."frequencyType" AS "frequencyType",
        h."trackingType" AS "trackingType",
        h."numericUnit" AS "numericUnit",
        he.status AS "todayStatus",
        he."numericValue" AS "numericValue",
        he.comment AS "comment",
        CASE WHEN he.status = 'success' THEN true ELSE false END AS "completedToday",
        COALESCE(streaks."currentStreak", 0) AS "currentStreak",
        COALESCE(streaks."longestStreak", 0) AS "longestStreak",
        COALESCE(entry_history.entries, '[]'::json) AS "entries",
        COALESCE(stats."successRate", 0) AS "successRate"
       FROM app_habit h
       LEFT JOIN app_habit_entry he
        ON he."habitId" = h.id
        AND he."accountId" = h."accountId"
        AND he.date = $2
       LEFT JOIN LATERAL (
        SELECT COUNT(*) FILTER (WHERE recent.status = 'success') AS "currentStreak",
               COUNT(*) FILTER (WHERE recent.status = 'success') AS "longestStreak"
        FROM (
          SELECT e.status
          FROM app_habit_entry e
          WHERE e."habitId" = h.id AND e."accountId" = h."accountId"
          ORDER BY e.date DESC
          LIMIT 30
        ) recent
       ) streaks ON true
       LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object('date', e.date, 'status', e.status)
          ORDER BY e.date ASC
        ) AS entries
        FROM app_habit_entry e
        WHERE e."habitId" = h.id AND e."accountId" = h."accountId"
       ) entry_history ON true
       LEFT JOIN LATERAL (
        SELECT
          CASE
            WHEN COUNT(*) FILTER (WHERE e.status IN ('success', 'fail')) = 0 THEN 0
            ELSE ROUND(
              (COUNT(*) FILTER (WHERE e.status = 'success')::numeric /
               COUNT(*) FILTER (WHERE e.status IN ('success', 'fail'))::numeric) * 100,
              1
            )
          END AS "successRate"
        FROM app_habit_entry e
        WHERE e."habitId" = h.id AND e."accountId" = h."accountId"
       ) stats ON true
       WHERE h."accountId" = $1 AND h."isActive" = true
       ORDER BY "completedToday" ASC, h.name ASC`,
      [accountId, today]
    );
  }

  private getMobileHabitDailyCompletions(accountId: string, weekStart: string) {
    return this.dataSource.query(
      `SELECT e.date AS date, COUNT(*) AS count
       FROM app_habit_entry e
       WHERE e."accountId" = $1
        AND e.status = 'success'
        AND e.date >= $2
       GROUP BY e.date
       ORDER BY e.date ASC`,
      [accountId, weekStart]
    );
  }

  private getMobileWorkoutTotals(accountId: string) {
    return this.dataSource.query(
      `SELECT
        (SELECT COUNT(*) FROM app_workout_session s WHERE s."accountId" = $1) AS "totalWorkouts",
        (SELECT COUNT(*) FROM app_workout_set st WHERE st."accountId" = $1) AS "totalSets",
        (SELECT COALESCE(SUM(st.reps), 0) FROM app_workout_set st WHERE st."accountId" = $1) AS "totalReps",
        (SELECT COALESCE(SUM(st.weight * st.reps), 0) FROM app_workout_set st WHERE st."accountId" = $1) AS "totalVolume",
        (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (s."endAt" - s."startAt"))), 0)
          FROM app_workout_session s
          WHERE s."accountId" = $1 AND s."endAt" IS NOT NULL) AS "totalTimeSeconds"`,
      [accountId]
    );
  }

  private getMobileActiveWorkout(accountId: string) {
    return this.dataSource.query(
      `SELECT
        s.id,
        s.title,
        s.date,
        s."startAt",
        s."endAt",
        COUNT(st.id) AS "setCount"
       FROM app_workout_session s
       LEFT JOIN app_workout_set st
        ON st."sessionId" = s.id AND st."accountId" = s."accountId"
       WHERE s."accountId" = $1 AND s."endAt" IS NULL
       GROUP BY s.id
       ORDER BY s."startAt" DESC
       LIMIT 1`,
      [accountId]
    );
  }

  private getMobileRecentWorkouts(accountId: string) {
    return this.dataSource.query(
      `SELECT
        s.id,
        s.title,
        s.date,
        s."startAt",
        s."endAt",
        COUNT(st.id) AS "setCount"
       FROM app_workout_session s
       LEFT JOIN app_workout_set st
        ON st."sessionId" = s.id AND st."accountId" = s."accountId"
       WHERE s."accountId" = $1
       GROUP BY s.id
       ORDER BY s."startAt" DESC
       LIMIT 5`,
      [accountId]
    );
  }

  private getMobileFinanceSummary(accountId: string, monthStart: string) {
    return this.dataSource.query(
      `SELECT
        COALESCE(SUM(CASE WHEN "isIncome" = true THEN amount ELSE 0 END), 0) AS "totalIncome",
        COALESCE(SUM(CASE WHEN "isIncome" = false AND (type IS NULL OR type NOT IN (1, 3)) THEN amount ELSE 0 END), 0) AS "totalExpense",
        COUNT(*) FILTER (WHERE "isIncome" = true) AS "incomeCount",
        COUNT(*) FILTER (WHERE "isIncome" = false AND (type IS NULL OR type NOT IN (1, 3))) AS "expenseCount"
       FROM app_finance_transactions
       WHERE "accountId" = $1 AND "transactionDate" >= $2`,
      [accountId, monthStart]
    );
  }

  private getMobileSpotifyStats(accountId: string) {
    return this.dataSource.query(
      `SELECT
        COUNT(*) AS "totalStreams",
        COALESCE(SUM(t.duration), 0) AS "msListened",
        COUNT(DISTINCT s."trackId") AS "uniqueTracks",
        COUNT(DISTINCT ta."artistId") AS "uniqueArtists",
        MAX(s."streamedAt") AS "lastStream"
       FROM app_stream s
       INNER JOIN app_track t ON s."trackId" = t.id
       LEFT JOIN app_track_artists ta ON ta."trackId" = t.id
       WHERE s."accountId" = $1
        AND s.platform = 'spotify'
        AND s."streamType" = 'play'
        AND s."isValidPlay" = true`,
      [accountId]
    );
  }

  private getMobileSpotifyRanking() {
    return this.dataSource.query(
      `SELECT
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, MAX(s."streamedAt") DESC) AS rank,
        s."accountId" AS "accountId",
        COALESCE(
          MAX(NULLIF(sc."displayName", '')),
          MAX(NULLIF(a.name, '')),
          MAX(NULLIF(sc."spotifyUserId", '')),
          s."accountId"::text
        ) AS "displayName",
        MAX(sc."spotifyUserId") AS "spotifyUserId",
        COUNT(*) AS "streamCount",
        COUNT(DISTINCT s."trackId") AS "uniqueTracks",
        COALESCE(SUM(t.duration), 0) AS "msListened",
        MAX(s."streamedAt") AS "lastStream"
       FROM app_stream s
       INNER JOIN app_track t ON s."trackId" = t.id
       LEFT JOIN app_spotify_credentials sc ON sc."accountId" = s."accountId"
       LEFT JOIN app_account a ON a.id = s."accountId"
       WHERE s.platform = 'spotify'
        AND s."streamType" = 'play'
        AND s."isValidPlay" = true
       GROUP BY s."accountId"
       ORDER BY COUNT(*) DESC, MAX(s."streamedAt") DESC
       LIMIT 5`
    );
  }

  async getLandingStats(): Promise<LandingStatsResponse> {
    const [workouts, habits, streams] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*) as count FROM app_workout_session`),
      this.dataSource.query(`SELECT COUNT(*) as count FROM app_habit_entry`),
      this.dataSource.query(`SELECT COUNT(*) as count FROM app_stream`),
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

  private parseNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private parseBoolean(value: any): boolean {
    return value === true || value === "true" || value === 1 || value === "1";
  }

  private toDateOnly(value: any): string {
    if (!value) return "";
    if (typeof value === "string") return value.slice(0, 10);
    return new Date(value).toISOString().slice(0, 10);
  }

  private mapWorkoutSession(row: any): Record<string, any> | null {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title ?? null,
      name: row.title || "Workout session",
      date: this.toDateOnly(row.date),
      startAt: row.startAt ? new Date(row.startAt).toISOString() : null,
      endAt: row.endAt ? new Date(row.endAt).toISOString() : null,
      setCount: this.parseNumber(row.setCount),
    };
  }

  private calculateHabitStreak(
    entriesValue: any,
    today: string
  ): { current: number; longest: number } {
    const entries = this.parseHabitEntries(entriesValue);
    if (entries.length === 0) return { current: 0, longest: 0 };

    const dateMap = new Map<string, string>();
    for (const entry of entries) {
      if (entry.date && entry.status) {
        dateMap.set(this.toDateOnly(entry.date), entry.status);
      }
    }

    let current = 0;
    let checkDate = new Date(`${today}T00:00:00.000Z`);
    if (!dateMap.has(today)) {
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      const status = dateMap.get(dateStr);
      if (!status) break;
      if (status === "success") {
        current += 1;
      } else if (status === "fail") {
        break;
      }
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }

    let longest = 0;
    let running = 0;
    for (const entry of [...entries].sort((a, b) =>
      this.toDateOnly(a.date).localeCompare(this.toDateOnly(b.date))
    )) {
      if (entry.status === "success") {
        running += 1;
        longest = Math.max(longest, running);
      } else if (entry.status === "fail") {
        running = 0;
      }
    }

    return { current, longest };
  }

  private parseHabitEntries(entriesValue: any): Array<{
    date: string;
    status: string;
  }> {
    if (Array.isArray(entriesValue)) return entriesValue;
    if (typeof entriesValue !== "string") return [];
    try {
      const parsed = JSON.parse(entriesValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private parseCount(rows: Array<{ count?: string | number | null }>) {
    const raw = rows?.[0]?.count;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") return parseInt(raw, 10) || 0;
    return 0;
  }
}
