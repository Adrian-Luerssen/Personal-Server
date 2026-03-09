import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { INestApplication, Logger } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Account } from "./system/accounts/account.entity";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AbstractAccountOwnedEntity } from "./system/common/AbstractAccountOwnedEntity";
import { AbstractEntity } from "./system/common/AbstractEntity";
import * as bodyParser from "body-parser";
import * as bcrypt from "bcryptjs";

async function setupInitialData(app: INestApplication) {
  const configService = app.get(ConfigService);
  const accountRepository: Repository<Account> = app.get(
    getRepositoryToken(Account)
  );

  let rootAccount: Account = await accountRepository.findOne({
    where: { email: "root@gmail.com" }, // new typeORM expects either FindOneOptions<Account> or that <--
  });
  if (!rootAccount) {
    const hashRounds = parseInt(configService.get("AUTH_HASH_ROUNDS") || "10", 10);
    const plainPassword = configService.get("USER_ROOT_CREDENTIALS");
    const hashedPassword = await bcrypt.hash(plainPassword, hashRounds);
    
    rootAccount = new Account();
    rootAccount.email = "root@gmail.com";
    rootAccount.password = hashedPassword;
    rootAccount.name = "root";
    rootAccount = await accountRepository.save(rootAccount);
  }
}

function setupSwagger(app: INestApplication) {
  const configService = app.get(ConfigService);
  if (configService.get("SWAGGER_ENABLED") === "true") {
    const config = new DocumentBuilder()
      .setTitle("Adrian")
      .setDescription("My personal server API description")
      .setVersion("1.0")
      .addTag("Adrian")
      .addBearerAuth(
        { type: "http", scheme: "bearer", bearerFormat: "JWT", in: "header" },
        "access-token"
      )
      .build();
    const document = SwaggerModule.createDocument(app, config, {
      extraModels: [AbstractAccountOwnedEntity, AbstractEntity],
    });
    SwaggerModule.setup("docs", app, document);
  }
}

const setupCors = (app) => {
  const configService = app.get(ConfigService);
  app.enableCors({
    origin: configService.get("CORS_ORIGIN"),
  });
};

function setupSelfPing(app: INestApplication) {
  const configService = app.get(ConfigService);
  const selfUrl = configService.get("RENDER_EXTERNAL_URL");
  if (!selfUrl) return; // Only activate on Render (RENDER_EXTERNAL_URL is auto-set by Render)

  const pingUrl = `${selfUrl}/api/health`;
  const PING_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

  setInterval(async () => {
    try {
      const res = await fetch(pingUrl);
      Logger.debug(`Self-ping: ${res.status}`, "KeepAlive");
    } catch (err) {
      Logger.warn(`Self-ping failed: ${err}`, "KeepAlive");
    }
  }, PING_INTERVAL_MS);

  Logger.log(`Keep-alive self-ping enabled → ${pingUrl} every 4m`, "KeepAlive");
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
  app.setGlobalPrefix("api");
  await setupInitialData(app);
  setupCors(app);
  setupSwagger(app);
  const configService = app.get(ConfigService);
  const port = configService.get("PORT");
  Logger.log(`BCome API on port ${port}`);
  await app.listen(port);
  setupSelfPing(app);
}
bootstrap();
