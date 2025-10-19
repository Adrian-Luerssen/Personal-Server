import { Column, ManyToOne } from 'typeorm';
import { Account } from '../accounts/account.entity';
import { AbstractEntity } from './AbstractEntity';
import { ApiProperty } from '@nestjs/swagger';

export class AbstractAccountOwnedEntity extends AbstractEntity {
  @ApiProperty({
    description: 'Account of which this entity instance is property of.',
  })
  @ManyToOne(() => Account, {
    nullable: false,
    onUpdate: 'RESTRICT',
    onDelete: 'CASCADE',
    eager: true,
  })
  account: Account;
  @Column({ nullable: false })
  accountId: string;
}
