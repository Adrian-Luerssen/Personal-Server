import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkoutSession } from "./session.entity";
import { In, Repository } from "typeorm";
import { Account } from "../../system/accounts/account.entity";
import { WorkoutSet } from "../sets/set.entity";

@Injectable()
export class WorkoutSessionsService extends TypeOrmCrudService<WorkoutSession> {
  constructor(
    @InjectRepository(WorkoutSession) repo: Repository<WorkoutSession>
  ) {
    super(repo);
  }

  async startSession(
    account: Account,
    body: { date?: string; title?: string; notes?: string; startAt?: string }
  ) {
    const now = new Date();
    const startAt = body.startAt ? new Date(body.startAt) : now;
    if (isNaN(startAt.getTime()))
      throw new BadRequestException("Invalid startAt");

    const date = body.date ?? startAt.toISOString().slice(0, 10);
    const session = this.repo.create({
      accountId: account.id,
      account,
      date,
      title: body.title,
      notes: body.notes,
      startAt,
      endAt: null,
    });
    return this.repo.save(session);
  }

  async endSession(
    account: Account,
    id: string,
    body: { endAt?: string; notes?: string; title?: string }
  ) {
    const session = await this.repo.findOne({ where: { id } });
    if (!session) throw new BadRequestException("Session not found");
    if (session.accountId !== account.id)
      throw new ForbiddenException("Not your session");

    const endAt = body.endAt ? new Date(body.endAt) : new Date();
    if (isNaN(endAt.getTime())) throw new BadRequestException("Invalid endAt");
    if (endAt < session.startAt)
      throw new BadRequestException("endAt cannot be before startAt");

    session.endAt = endAt;
    if (body.notes !== undefined) session.notes = body.notes;
    if (body.title !== undefined) session.title = body.title;
    return this.repo.save(session);
  }

  /**
   * Returns the active session for the account (session with no endAt)
   */
  async getActiveSession(account: Account) {
    const result = await this.repo.findOne({
      where: { accountId: account.id },
      relations: ["sets", "sets.exercise", "sets.exercise.category"],
      order: { date: "DESC" },
    });
    if (result && result.endAt !== null) {
      return null;
    }

    if (!result) return null;

    // Transform to include category info
    const categoryMap = new Map();
    const transformedSets = (result.sets || []).map((set) => {
      const cat = set.exercise?.category;
      let categoryInfo = null;
      if (cat) {
        categoryMap.set(cat.id, {
          id: cat.id,
          name: cat.name,
          color: cat.color,
        });
        categoryInfo = { id: cat.id, name: cat.name, color: cat.color };
      }
      return {
        ...set,
        category: categoryInfo,
      };
    });

    return {
      ...result,
      sets: transformedSets,
      categories: Array.from(categoryMap.values()),
    };
  }

  /**
   * Returns the most recent N sessions for the account, fully populated
   */
  async getRecentSessions(account: Account, limit = 5) {
    const sessions = await this.repo.find({
      where: { accountId: account.id },
      order: { startAt: "DESC" },
      take: limit,
      relations: ["sets", "sets.exercise", "sets.exercise.category"],
    });

    // Transform sessions to include category info
    return sessions.map((session) => {
      const categoryMap = new Map();
      const transformedSets = (session.sets || []).map((set) => {
        const cat = set.exercise?.category;
        let categoryInfo = null;
        if (cat) {
          categoryMap.set(cat.id, {
            id: cat.id,
            name: cat.name,
            color: cat.color,
          });
          categoryInfo = { id: cat.id, name: cat.name, color: cat.color };
        }
        return {
          ...set,
          category: categoryInfo,
        };
      });

      return {
        ...session,
        sets: transformedSets,
        categories: Array.from(categoryMap.values()),
      };
    });
  }

  /**
   * Returns all sessions for the account, fully populated
   */

  /**
   * Returns paginated sessions and summary stats for the account
   */
  async getPaginatedSessions(account: Account, page = 1, limit = 20) {
    // Step 1: get page of session IDs (fast count, no relation join)
    const qb = this.repo
      .createQueryBuilder("s")
      .where("s.accountId = :aid", { aid: account.id })
      .orderBy("s.startAt", "DESC")
      .select(["s.id"]) // only ids for pagination
      .skip((page - 1) * limit)
      .take(limit);
    const [idRows, totalWorkouts] = await qb.getManyAndCount();
    const ids = idRows.map((r) => r.id);

    // Step 2: fetch sessions by ids with relations, then sort back to original order
    let sessions = [] as WorkoutSession[];
    if (ids.length) {
      sessions = await this.repo.find({
        where: { id: In(ids) },
        relations: ["sets", "sets.exercise", "sets.exercise.category"],
      });
      const orderMap = new Map(ids.map((id, idx) => [id, idx] as const));
      sessions.sort((a, b) => (orderMap.get(a.id)! - orderMap.get(b.id)!));
    }

    // Transform sessions to include category info without mutating entities
    const transformedSessions = sessions.map((session) => {
      const categoryMap = new Map<string, { id: string; name: string; color: string }>();
      const transformedSets = (session.sets || []).map((set) => {
        const cat = set.exercise?.category;
        let categoryInfo: { id: string; name: string; color: string } | null = null;
        if (cat) {
          categoryMap.set(cat.id, { id: cat.id, name: cat.name, color: cat.color });
          categoryInfo = { id: cat.id, name: cat.name, color: cat.color };
        }
        return {
          ...set,
          category: categoryInfo,
        };
      });
      return {
        ...session,
        sets: transformedSets,
        categories: Array.from(categoryMap.values()),
      };
    });

    // Aggregates via SQL (fast): totalSets, totalVolume, totalTimeSeconds
    const setRepo = this.repo.manager.getRepository(WorkoutSet);
    const totalSets = await setRepo.count({ where: { accountId: account.id } });

    // totalVolume: SUM(weight * reps)
    const volumeRow = await setRepo
      .createQueryBuilder("st")
      .where("st.accountId = :aid", { aid: account.id })
      .select("COALESCE(SUM(st.weight * st.reps), 0)", "volume")
      .getRawOne<{ volume: string | number | null }>();
    const totalVolume = volumeRow?.volume ? Number(volumeRow.volume) : 0;

    // totalReps: SUM(reps)
    const repsRow = await setRepo
      .createQueryBuilder("st")
      .where("st.accountId = :aid", { aid: account.id })
      .select("COALESCE(SUM(st.reps), 0)", "reps")
      .getRawOne<{ reps: string | number | null }>();
    const totalReps = repsRow?.reps ? Number(repsRow.reps) : 0;

    // totalTimeSeconds: SUM(EPOCH(endAt - startAt)) (PostgreSQL)
    let totalTimeSeconds = 0;
    try {
      const timeRow = await this.repo
        .createQueryBuilder("s")
        .where("s.accountId = :aid", { aid: account.id })
        .andWhere("s.endAt IS NOT NULL")
        .select("COALESCE(SUM(EXTRACT(EPOCH FROM (s.endAt - s.startAt))), 0)", "seconds")
        .getRawOne<{ seconds: string | number | null }>();
      totalTimeSeconds = timeRow?.seconds ? Math.floor(Number(timeRow.seconds)) : 0;
    } catch {
      // Fallback (DBs without EXTRACT): compute from minimal dataset
      const times = await this.repo.find({
        where: { accountId: account.id },
        select: ["startAt", "endAt"],
      });
      totalTimeSeconds = times.reduce((acc, s) => {
        if (s.startAt && s.endAt) {
          const diff = (new Date(s.endAt).getTime() - new Date(s.startAt).getTime()) / 1000;
          if (diff > 0) return acc + Math.floor(diff);
        }
        return acc;
      }, 0);
    }

    return {
      sessions: transformedSessions,
      totalWorkouts,
      totalSets,
      totalReps,
      totalVolume,
      totalTimeSeconds,
    };
  }

  /**
   * Deletes a session by id for the account
   */
  async deleteSession(account: Account, id: string) {
    const session = await this.repo.findOne({ where: { id } });
    if (!session) throw new BadRequestException("Session not found");
    if (session.accountId !== account.id)
      throw new ForbiddenException("Not your session");
    await this.repo.delete(id);
    return { success: true };
  }
}
