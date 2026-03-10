import { CACHE_MANAGER, Inject, Injectable } from "@nestjs/common";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkoutCategory } from "./category.entity";
import { Cache } from "cache-manager";

@Injectable()
export class WorkoutCategoriesService extends TypeOrmCrudService<WorkoutCategory> {
  constructor(
    @InjectRepository(WorkoutCategory) repo,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {
    super(repo);
  }
  /**
   * Get all categories, sorted by name
   */
  async getAllCategories() {
    return this.repo.find({ order: { name: "ASC" } });
  }

  /**
   * Create a new category
   */
  async createCategory(body: { name: string }) {
    const category = this.repo.create({ name: body.name });
    const result = await this.repo.save(category);
    await this.cacheManager.reset();
    return result;
  }

  /**
   * Update a category
   */
  async updateCategory(categoryId: string, body: { name: string }) {
    const category = await this.repo.findOne({ where: { id: categoryId } });
    if (!category) throw new Error("Category not found");
    category.name = body.name;
    const result = await this.repo.save(category);
    await this.cacheManager.reset();
    return result;
  }

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: string) {
    await this.repo.delete(categoryId);
    await this.cacheManager.reset();
    return { success: true };
  }
}
