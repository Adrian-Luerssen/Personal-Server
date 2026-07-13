import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { MediaItem, MediaType } from "./media-item.entity";

export enum MediaRelationType {
  PREQUEL = "prequel",
  SEQUEL = "sequel",
  SIDE_STORY = "side_story",
  SPIN_OFF = "spin_off",
  PARENT_STORY = "parent_story",
  ALTERNATIVE = "alternative",
  OTHER = "other",
}

@Entity("media_relation")
@Index("IDX_media_relation_source_target", ["accountId", "sourceMediaItemId", "relationType", "targetMalId"], { unique: true })
export class MediaRelation extends AbstractAccountOwnedEntity {
  @Column()
  sourceMediaItemId: string;

  @ManyToOne(() => MediaItem, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "sourceMediaItemId" })
  sourceMediaItem: MediaItem;

  @Column({ nullable: true })
  targetMediaItemId?: string;

  @ManyToOne(() => MediaItem, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "targetMediaItemId" })
  targetMediaItem?: MediaItem;

  @Column({ type: "varchar", length: 30 })
  relationType: MediaRelationType;

  @Column({ type: "integer", nullable: true })
  targetMalId?: number;

  @Column({ type: "varchar", length: 500 })
  targetTitle: string;

  @Column({ type: "varchar", length: 10, default: MediaType.ANIME })
  targetType: MediaType;

  @Column({ type: "varchar", length: 1000, nullable: true })
  targetCoverUrl?: string;

  @Column({ type: "integer", nullable: true })
  targetYear?: number;

  @Column({ type: "integer", default: 0 })
  sortOrder: number;
}
