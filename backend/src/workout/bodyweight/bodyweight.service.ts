import { Injectable } from "@nestjs/common";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { BodyWeightEntry } from "./bodyweight.entity";

@Injectable()
export class BodyWeightService extends TypeOrmCrudService<BodyWeightEntry> {
  constructor(@InjectRepository(BodyWeightEntry) repo) {
    super(repo);
  }
  /**
   * Get all bodyweight entries, sorted by date descending
   */
  async getAllEntries() {
    return this.repo.find({ order: { date: "DESC" } });
  }

  /**
   * Create a new bodyweight entry
   */
  async createEntry(body: { date: string; weight: number }) {
    const entry = this.repo.create({ date: body.date, weightKg: body.weight });
    return this.repo.save(entry);
  }

  /**
   * Update a bodyweight entry
   */
  async updateEntry(entryId: string, body: { date: string; weight: number }) {
    const entry = await this.repo.findOne({ where: { id: entryId } });
    if (!entry) throw new Error("Entry not found");
    entry.date = body.date;
    entry.weightKg = body.weight;
    return this.repo.save(entry);
  }

  /**
   * Delete a bodyweight entry
   */
  async deleteEntry(entryId: string) {
    await this.repo.delete(entryId);
    return { success: true };
  }
}
