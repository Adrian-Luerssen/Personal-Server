import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class AddFinanceBudgets1710288000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "finance_budgets",
        columns: [
          { name: "id", type: "uuid", isPrimary: true, generationStrategy: "uuid", default: "uuid_generate_v4()" },
          { name: "createdAt", type: "timestamptz", default: "now()" },
          { name: "updatedAt", type: "timestamptz", default: "now()" },
          { name: "accountId", type: "uuid" },
          { name: "amount", type: "decimal", precision: 12, scale: 2 },
          { name: "period", type: "varchar", length: "20", default: "'monthly'" },
          { name: "categoryId", type: "uuid", isNullable: true },
        ],
        foreignKeys: [
          {
            columnNames: ["accountId"],
            referencedTableName: "app_accounts",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
          {
            columnNames: ["categoryId"],
            referencedTableName: "finance_categories",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      "finance_budgets",
      new TableIndex({
        name: "IDX_finance_budgets_account_category_period",
        columnNames: ["accountId", "categoryId", "period"],
        isUnique: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("finance_budgets");
  }
}
