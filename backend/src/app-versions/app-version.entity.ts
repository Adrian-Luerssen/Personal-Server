import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../system/common/AbstractEntity';

export interface AppVersionChangelog {
  summary?: string;
  features?: string[];
  fixes?: string[];
  technical?: string[];
  commits?: Array<{
    hash: string;
    shortHash: string;
    subject: string;
    body?: string;
  }>;
  previousAndroidTag?: string | null;
  range?: string;
  compareUrl?: string;
}

@Entity('versions')
@Index(['platform', 'version'], { unique: true })
@Index(['platform', 'publishedAt'])
export class AppVersion extends AbstractEntity {
  @Column({ type: 'varchar', length: 40, default: 'android' })
  platform: string;

  @Column({ type: 'varchar', length: 40 })
  version: string;

  @Column({ type: 'integer', nullable: true })
  versionCode?: number | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  releaseTag?: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  releaseName?: string | null;

  @Column({ type: 'text', nullable: true })
  apkUrl?: string | null;

  @Column({ type: 'varchar', length: 40, default: '0.0.0' })
  minimumSupportedVersion: string;

  @Column({ type: 'boolean', default: false })
  required: boolean;

  @Column({ type: 'jsonb', default: {} })
  changelog: AppVersionChangelog;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date | null;
}
