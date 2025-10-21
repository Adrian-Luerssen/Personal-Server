import { Injectable } from "@nestjs/common";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkoutCategory } from "./category.entity";

@Injectable()
export class WorkoutCategoriesService extends TypeOrmCrudService<WorkoutCategory> {
  constructor(@InjectRepository(WorkoutCategory) repo) {
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
    return this.repo.save(category);
  }

  /**
   * Update a category
   */
  async updateCategory(categoryId: string, body: { name: string }) {
    const category = await this.repo.findOne({ where: { id: categoryId } });
    if (!category) throw new Error("Category not found");
    category.name = body.name;
    return this.repo.save(category);
  }

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: string) {
    await this.repo.delete(categoryId);
    return { success: true };
  }
}
