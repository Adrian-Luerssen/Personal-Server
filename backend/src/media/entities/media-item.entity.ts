import { Column, Entity, Index } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { ApiProperty } from "@nestjs/swagger";

export enum MediaType {
  ANIME = "anime",
  MANGA = "manga",
  TV = "tv",
  MOVIE = "movie",
  BOOK = "book",
}

export enum MediaStatus {
  PLANNING = "planning",
  WATCHING = "watching",
  READING = "reading",
  COMPLETED = "completed",
  DROPPED = "dropped",
  PAUSED = "paused",
}

@Entity()
@Index(["accountId", "type"])
@Index(["accountId", "status"])
@Index(["accountId", "title", "type"], { unique: true })
export class MediaItem extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Title of the media item" })
  @Column({ type: "varchar", length: 500 })
  title: string;

  @ApiProperty({ description: "Media type", enum: MediaType })
  @Column({ type: "varchar", length: 10 })
  type: MediaType;

  @ApiProperty({ description: "Tracking status", enum: MediaStatus })
  @Column({ type: "varchar", length: 20, default: MediaStatus.PLANNING })
  status: MediaStatus;

  @ApiProperty({ description: "User rating (0-10)", required: false })
  @Column({ type: "decimal", precision: 3, scale: 1, nullable: true })
  rating?: number;

  @ApiProperty({ description: "Date started consuming", required: false })
  @Column({ type: "date", nullable: true })
  startDate?: string;

  @ApiProperty({ description: "Date finished consuming", required: false })
  @Column({ type: "date", nullable: true })
  endDate?: string;

  @ApiProperty({ description: "User notes", required: false })
  @Column({ type: "text", nullable: true })
  notes?: string;

  @ApiProperty({ description: "Cover image URL", required: false })
  @Column({ type: "varchar", length: 1000, nullable: true })
  coverUrl?: string;

  @ApiProperty({
    description:
      "Type-specific metadata (e.g. episodesWatched, chaptersRead, seasons, pages)",
  })
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, any>;

  @ApiProperty({
    description:
      "External service IDs (e.g. malId, tmdbId, openLibraryKey)",
  })
  @Column({ type: "jsonb", default: {} })
  externalIds: Record<string, any>;
}
