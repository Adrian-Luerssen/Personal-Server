import {
  Connection,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from "typeorm";
import { InjectConnection } from "@nestjs/typeorm";
import { AbstractAccountOwnedEntity } from "../common/AbstractAccountOwnedEntity";
import { RequestContextProvider } from "./requestContext.provider";
import { LoadEvent } from "typeorm/subscriber/event/LoadEvent";
import { HttpException } from "@nestjs/common";
import { Account } from "../accounts/account.entity";
import { RemoveEvent } from "typeorm/subscriber/event/RemoveEvent";
import { RefreshToken } from "./refreshToken.entity";

@EventSubscriber()
export class AccountSegregationSubscriber implements EntitySubscriberInterface {
  constructor(
    @InjectConnection() readonly connection: Connection,
    private requestContextProvider: RequestContextProvider
  ) {
    connection.subscribers.push(this);
  }

  afterLoad?(entity: any, event?: LoadEvent<any>): void {
    this.test(event.entity, false);
  }

  beforeInsert(event: InsertEvent<any>): void {
    this.fillAccountIdIfNull(event.entity);
    this.test(event.entity, true);
  }

  beforeUpdate(event: UpdateEvent<any>): void {
    this.test(event.databaseEntity, true);
    this.test(event.entity, true);
  }

  beforeRemove?(event: RemoveEvent<any>): void {
    this.test(event.databaseEntity, true);
  }

  private fillAccountIdIfNull(entity: any) {
    if (this.requestContextProvider.hasSession()) {
      const accountId = this.requestContextProvider.accountId();
      if (accountId) {
        if (entity instanceof AbstractAccountOwnedEntity && !entity.account) {
          entity.account = { id: accountId } as Account;
        }
      }
    }
  }

  private test(entity: any, isWrite: boolean) {
    return;
    if (this.requestContextProvider.hasSession()) {
      const accountId = this.requestContextProvider.accountId();
      if (entity instanceof AbstractAccountOwnedEntity && entity.account) {
        if (entity.account.id !== accountId) {
          throw new HttpException(
            "Trying to access an entity which does not belong to the account",
            404
          );
        }
      } else if (entity instanceof Account) {
        if (entity.id !== accountId) {
          throw new HttpException(
            "Trying to access an account which is not yours",
            404
          );
        }
      }
    }
  }
}
