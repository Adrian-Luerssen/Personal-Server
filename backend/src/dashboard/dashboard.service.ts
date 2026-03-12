import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Stream, StreamPlatform } from "../music/streams/stream.entity";
import { Track } from "../music/tracks/track.entity";
import { WorkoutSession } from "../workout/sessions/session.entity";
import { Account } from "../system/accounts/account.entity";

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
}
