import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
    private readonly sessionRepo: Repository<WorkoutSession>
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
}
