import { Column, Entity } from 'typeorm';
import { AbstractEntity } from '../system/common/AbstractEntity';
export enum ProgramType {
  LEVEL_2_AUTO = 'LEVEL_2_AUTO',
}

@Entity()
export class Tool extends AbstractEntity {
  @Column({
    nullable: false,
    unique: true,
  })
  name: string;

  @Column({
    type: 'enum',
    enum: ProgramType,
    default: ProgramType.LEVEL_2_AUTO,
  })
  program: string;

  @Column()
  version: string;

  @Column()
  download_link: string;
}
