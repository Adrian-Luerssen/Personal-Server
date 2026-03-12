import { Column, Entity } from "typeorm";
import { AbstractEntity } from "../common/AbstractEntity";

@Entity()
export class Account extends AbstractEntity {
  @Column({
    nullable: false,
    unique: true,
  })
  name: string;

  @Column({ nullable: false })
  email: string;

  @Column({ nullable: false })
  password: string;

  @Column({ nullable: true })
  mfaSecret?: string;

  @Column({ default: false })
  mfaEnabled: boolean;

  toJSON() {
    const { password, mfaSecret, ...safe } = this as any;
    return safe;
  }
}
