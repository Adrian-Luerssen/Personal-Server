import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { MediaItem } from "./media-item.entity";
import { MediaSeason } from "./media-season.entity";

@Entity("media_episode")
@Index("IDX_media_episode_season_number", ["accountId", "seasonId", "number"], { unique: true })
@Index("IDX_media_episode_item_watched", ["accountId", "mediaItemId", "watched"])
export class MediaEpisode extends AbstractAccountOwnedEntity {
  @Column()
  mediaItemId: string;

  @ManyToOne(() => MediaItem, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "mediaItemId" })
  mediaItem: MediaItem;

  @Column()
  seasonId: string;

  @ManyToOne(() => MediaSeason, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "seasonId" })
  season: MediaSeason;

  @Column({ type: "integer" })
  seasonNumber: number;

  @Column({ type: "integer" })
  number: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  providerEpisodeId?: string;

  @Column({ type: "varchar", length: 500 })
  title: string;

  @Column({ type: "text", nullable: true })
  overview?: string;

  @Column({ type: "date", nullable: true })
  airDate?: string;

  @Column({ type: "integer", nullable: true })
  runtime?: number;

  @Column({ type: "varchar", length: 1000, nullable: true })
  imageUrl?: string;

  @Column({ type: "boolean", default: false })
  watched: boolean;

  @Column({ type: "timestamptz", nullable: true })
  watchedAt?: Date;
}
