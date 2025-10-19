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

async function setupInitialData(app: INestApplication) {
  const configService = app.get(ConfigService);
  const accountRepository: Repository<Account> = app.get(
    getRepositoryToken(Account)
  );

  let rootAccount: Account = await accountRepository.findOne({
    where: { email: "root@gmail.com" }, // new typeORM expects either FindOneOptions<Account> or that <--
  });
  if (!rootAccount) {
    rootAccount = new Account();
    rootAccount.email = "root@gmail.com";
    rootAccount.password = configService.get("USER_ROOT_CREDENTIALS");
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
}
bootstrap();
