import { Column, Entity, ManyToOne } from "typeorm";
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
}
