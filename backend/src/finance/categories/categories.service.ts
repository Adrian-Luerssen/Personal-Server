import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FinanceCategory } from "../entities/category.entity";
import { Account } from "../../system/accounts/account.entity";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(FinanceCategory)
    private readonly repo: Repository<FinanceCategory>
  ) {}

  findAll(account: Account) {
    return this.repo.find({
      where: { accountId: account.id },
      relations: ["parentCategory"],
      order: { name: "ASC" },
    });
  }

  async findOne(account: Account, id: string) {
    const category = await this.repo.findOne({
      where: { id, accountId: account.id },
      relations: ["parentCategory"],
    });
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  create(account: Account, dto: Partial<FinanceCategory>) {
    const category = this.repo.create({
      ...dto,
      accountId: account.id,
      account,
    });
    return this.repo.save(category);
  }

  async update(account: Account, id: string, dto: Partial<FinanceCategory>) {
    const category = await this.findOne(account, id);
    Object.assign(category, dto);
    return this.repo.save(category);
  }

  async remove(account: Account, id: string) {
    const category = await this.findOne(account, id);
    await this.repo.remove(category);
    return { success: true };
  }
}
