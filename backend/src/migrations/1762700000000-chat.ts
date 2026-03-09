import { MigrationInterface, QueryRunner } from "typeorm";

export class Chat1762700000000 implements MigrationInterface {
  name = "Chat1762700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "app_chat_sender" AS ENUM ('user', 'agent')
    `);
    await queryRunner.query(`
      CREATE TYPE "app_chat_status" AS ENUM ('sent', 'read', 'thinking', 'delivered', 'error')
    `);
    await queryRunner.query(`
      CREATE TABLE "app_chat_conversation" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "accountId" uuid NOT NULL,
        "title" varchar(200),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_conversation" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_conversation_account" FOREIGN KEY ("accountId")
          REFERENCES "app_account"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "app_chat_message" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conversationId" uuid NOT NULL,
        "accountId" uuid NOT NULL,
        "sender" "app_chat_sender" NOT NULL,
        "agentKeyId" uuid,
        "text" text NOT NULL,
        "status" "app_chat_status" NOT NULL DEFAULT 'sent',
        "pageContext" jsonb,
        "replyToId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_message" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_message_conversation" FOREIGN KEY ("conversationId")
          REFERENCES "app_chat_conversation"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_chat_message_account" FOREIGN KEY ("accountId")
          REFERENCES "app_account"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_chat_message_agent_key" FOREIGN KEY ("agentKeyId")
          REFERENCES "app_agent_key"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_chat_message_reply" FOREIGN KEY ("replyToId")
          REFERENCES "app_chat_message"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_chat_message_conversation" ON "app_chat_message" ("conversationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_chat_message_account_status" ON "app_chat_message" ("accountId", "status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "app_chat_message"`);
    await queryRunner.query(`DROP TABLE "app_chat_conversation"`);
    await queryRunner.query(`DROP TYPE "app_chat_status"`);
    await queryRunner.query(`DROP TYPE "app_chat_sender"`);
  }
}
