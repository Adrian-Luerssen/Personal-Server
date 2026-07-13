import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { MediaItem } from "./media-item.entity";

@Entity("media_season")
@Index("IDX_media_season_item_number", ["accountId", "mediaItemId", "number"], { unique: true })
export class MediaSeason extends AbstractAccountOwnedEntity {
  @Column()
  mediaItemId: string;

  @ManyToOne(() => MediaItem, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "mediaItemId" })
  mediaItem: MediaItem;

  @Column({ type: "integer" })
  number: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  providerSeasonId?: string;

  @Column({ type: "varchar", length: 500 })
  name: string;

  @Column({ type: "text", nullable: true })
  overview?: string;

  @Column({ type: "varchar", length: 1000, nullable: true })
  posterUrl?: string;

  @Column({ type: "date", nullable: true })
  airDate?: string;

  @Column({ type: "integer", nullable: true })
  episodeCount?: number;
}
