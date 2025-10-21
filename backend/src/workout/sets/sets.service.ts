import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkoutSet } from "./set.entity";
import { Repository } from "typeorm";
import { Account } from "../../system/accounts/account.entity";
import { WorkoutSession } from "../sessions/session.entity";

@Injectable()
export class WorkoutSetsService extends TypeOrmCrudService<WorkoutSet> {
  constructor(
    @InjectRepository(WorkoutSet) repo: Repository<WorkoutSet>,
    @InjectRepository(WorkoutSession)
    private readonly sessionRepo: Repository<WorkoutSession>
  ) {
    super(repo);
  }

  async addSet(
    account: Account,
    sessionId: string,
    body: Partial<
      Pick<
        WorkoutSet,
        | "exerciseId"
        | "order"
        | "reps"
        | "weight"
        | "distance"
        | "durationSec"
        | "rpe"
        | "notes"
      >
    >
  ) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new BadRequestException("Session not found");
    if (session.accountId !== account.id)
      throw new ForbiddenException("Not your session");

    let order = body.order ?? 0;
    if (order === 0) {
      const maxOrder = await this.repo
        .createQueryBuilder("s")
        .where("s.sessionId = :sessionId", { sessionId })
        .select("MAX(s.order)", "max")
        .getRawOne<{ max: number | null }>();
      order = (maxOrder?.max ?? -1) + 1;
    }

    const set = this.repo.create({
      accountId: account.id,
      account,
      sessionId,
      order,
      exerciseId: body.exerciseId ?? null,
      reps: body.reps ?? null,
      weight: body.weight ?? null,
      distance: body.distance ?? null,
      durationSec: body.durationSec ?? null,
      rpe: body.rpe ?? null,
      notes: body.notes ?? null,
    });
    return this.repo.save(set);
  }

  async reorderSets(
    account: Account,
    sessionId: string,
    order: Array<{ id: string; order: number }>
  ) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new BadRequestException("Session not found");
    if (session.accountId !== account.id)
      throw new ForbiddenException("Not your session");

    const ids = order.map((o) => o.id);
    const sets = await this.repo.findByIds(ids);
    for (const s of sets) {
      if (s.sessionId !== sessionId)
        throw new BadRequestException("Set does not belong to session");
      if (s.accountId !== account.id)
        throw new ForbiddenException("Not your set");
      const newOrder = order.find((o) => o.id === s.id)?.order;
      if (newOrder === undefined) continue;
      s.order = newOrder;
    }
    await this.repo.save(sets);
    return { updated: sets.length };
  }

  /**
   * Deletes a set by id for the account
   */
  async deleteSet(account: Account, setId: string) {
    const set = await this.repo.findOne({ where: { id: setId } });
    if (!set) throw new BadRequestException("Set not found");
    if (set.accountId !== account.id)
      throw new ForbiddenException("Not your set");
    await this.repo.delete(setId);
    return { success: true };
  }
}
