import { Column, Entity, ManyToOne } from "typeorm";
import { Exclude } from "class-transformer";
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

  @Exclude()
  @Column({ nullable: false })
  password: string;

  @Exclude()
  @Column({ nullable: true })
  mfaSecret?: string;

  @Column({ default: false })
  mfaEnabled: boolean;
}
