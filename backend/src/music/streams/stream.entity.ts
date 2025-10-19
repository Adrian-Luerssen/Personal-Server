import { Column, Entity, ManyToOne, JoinColumn, Index } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { Track } from "../tracks/track.entity";
import { ApiProperty } from "@nestjs/swagger";

export enum StreamPlatform {
  SPOTIFY = "spotify",
  APPLE_MUSIC = "appleMusic",
  YOUTUBE = "youtube",
  AMAZON_MUSIC = "amazonMusic",
  DEEZER = "deezer",
  TIDAL = "tidal",
  SOUNDCLOUD = "soundcloud",
  PANDORA = "pandora",
}

export enum StreamType {
  PLAY = "play",
  SKIP = "skip",
  SAVE = "save",
  SHARE = "share",
  DOWNLOAD = "download",
}

@Entity()
@Index(["trackId", "platform", "streamedAt"])
@Index(["platform", "streamedAt"])
@Index(["trackId", "streamedAt"])
export class Stream extends AbstractAccountOwnedEntity {
  @ApiProperty({
    description: "Platform where the stream occurred",
    enum: StreamPlatform,
  })
  @Column({
    type: "enum",
    enum: StreamPlatform,
    nullable: false,
  })
  platform: StreamPlatform;

  @ApiProperty({ description: "Type of stream interaction", enum: StreamType })
  @Column({
    type: "enum",
    enum: StreamType,
    default: StreamType.PLAY,
  })
  streamType: StreamType;

  @ApiProperty({ description: "Timestamp when the stream occurred" })
  @Column({ type: "timestamp", nullable: false })
  streamedAt: Date;

  @ApiProperty({
    description: "Whether the stream was counted as a valid play",
  })
  @Column({ default: true })
  isValidPlay: boolean;

  @ApiProperty({
    description: "Source of the stream (playlist, search, radio, etc.)",
  })
  @Column({ nullable: true })
  source?: string;

  @ApiProperty({ description: "Context information as JSON" })
  @Column({ type: "json", nullable: true })
  context?: {
    playlistId?: string;
    playlistName?: string;
    albumId?: string;
    artistId?: string;
    radioStation?: string;
    searchQuery?: string;
  };

  @ApiProperty({
    description: "The track that was streamed",
    type: () => Track,
  })
  @ManyToOne(() => Track, (track) => track.streams, { nullable: false })
  @JoinColumn({ name: "trackId" })
  track: Track;

  @ApiProperty({ description: "ID of the track" })
  @Column()
  trackId: string;
}
