import { Entity, Column, ManyToMany, JoinTable, Index } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { Track } from "../tracks/track.entity";
import { ApiProperty } from "@nestjs/swagger";
import { AbstractEntity } from "src/system/common/AbstractEntity";

@Entity()
@Index(["spotifyId"])
export class Playlist extends AbstractEntity {
  @ApiProperty({ description: "Playlist title" })
  @Column({ nullable: true })
  title?: string;

  @ApiProperty({ description: "Spotify playlist id" })
  @Column({ nullable: true })
  spotifyId?: string;

  @ApiProperty({ description: "Spotify playlist uri" })
  @Column({ nullable: true })
  spotifyUri?: string;

  @ApiProperty({ description: "Spotify playlist href" })
  @Column({ nullable: true })
  spotifyHref?: string;

  @ApiProperty({ description: "Playlist description" })
  @Column({ nullable: true, type: "text" })
  description?: string;

  @ApiProperty({ description: "Owner id on Spotify" })
  @Column({ nullable: true })
  ownerId?: string;

  @ApiProperty({ description: "Total number of tracks" })
  @Column({ nullable: true, type: "int" })
  totalTracks?: number;

  @ApiProperty({ description: "Playlist images" })
  @Column({ type: "json", nullable: true })
  images?: any[];

  @ManyToMany(() => Track, (track) => track.playlists, { cascade: true })
  @JoinTable({ name: "playlist_tracks" })
  tracks?: Track[];
}
