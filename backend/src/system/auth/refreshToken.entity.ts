import { Column, Entity, Index, ManyToOne } from "typeorm";
import { AbstractAccountOwnedEntity } from "../common/AbstractAccountOwnedEntity";
import { Account } from "../accounts/account.entity";

@Entity()
export class RefreshToken extends AbstractAccountOwnedEntity {
  @Column({
    nullable: false,
    unique: true,
  })
  token: string;

  @Column({ nullable: false })
  @Index()
  crossToken: string;

  @Column({
    nullable: false,
  })
  expiresAt: Date;

  @ManyToOne(() => Account, {
    nullable: false,
    onDelete: "CASCADE",
    eager: true,
  })
  account: Account;

  @Column({
    default: false,
  })
  rememberMe: boolean;
}
