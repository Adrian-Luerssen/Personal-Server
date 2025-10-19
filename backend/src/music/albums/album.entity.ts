import { Column, Entity, ManyToMany, OneToMany, JoinTable } from "typeorm";
import { AbstractEntity } from "../../system/common/AbstractEntity";
import { Artist } from "src/music/artists/artist.entity";
import { Track } from "src/music/tracks/track.entity";
import { ApiProperty } from "@nestjs/swagger";
import { bigInt } from "../../shared/typeormDataTypes";

export enum AlbumType {
  STUDIO = "studio",
  LIVE = "live",
  COMPILATION = "compilation",
  SOUNDTRACK = "soundtrack",
  EP = "ep",
  SINGLE = "single",
  REMIX = "remix",
}

@Entity()
export class Album extends AbstractEntity {
  @ApiProperty({ description: "Title of the album" })
  @Column({ nullable: false })
  title: string;

  @ApiProperty({ description: "Spotify album ID" })
  @Column({ nullable: true, unique: true })
  spotifyId?: string;

  @ApiProperty({ description: "Spotify URI" })
  @Column({ nullable: true })
  spotifyUri?: string;

  @ApiProperty({ description: "Spotify API href" })
  @Column({ nullable: true })
  spotifyHref?: string;

  @ApiProperty({ description: "Type of album", enum: AlbumType })
  @Column({
    type: "enum",
    enum: AlbumType,
    default: AlbumType.STUDIO,
  })
  type: AlbumType;

  @ApiProperty({ description: "Release date of the album" })
  @Column({ type: "date", nullable: true })
  releaseDate?: Date;

  @ApiProperty({ description: "Description of the album" })
  @Column({ type: "text", nullable: true })
  description?: string;

  @ApiProperty({ description: "Genres of the album" })
  @Column({ type: "simple-array", nullable: true })
  genres?: string[];

  @ApiProperty({ description: "Album cover image URL" })
  @Column({ nullable: true })
  coverImageUrl?: string;

  @ApiProperty({ description: "Spotify images array" })
  @Column({ type: "json", nullable: true })
  images?: Array<{ url: string; height?: number; width?: number }>;

  @ApiProperty({ description: "Record label that released the album" })
  @Column({ nullable: true })
  recordLabel?: string;

  @ApiProperty({ description: "Producer(s) of the album" })
  @Column({ type: "simple-array", nullable: true })
  producers?: string[];

  @ApiProperty({ description: "Total duration of the album in seconds" })
  @Column({ type: "int", nullable: true })
  totalDuration?: number;

  @ApiProperty({ description: "Number of tracks in the album" })
  @Column({ type: "int", default: 0 })
  trackCount: number;

  @ApiProperty({ description: "Whether the album is explicit" })
  @Column({ default: false })
  isExplicit: boolean;

  @ApiProperty({ description: "Copyright information" })
  @Column({ nullable: true })
  copyright?: string;

  @ApiProperty({ description: "UPC (Universal Product Code)" })
  @Column({ nullable: true })
  upc?: string;

  @ApiProperty({ description: "ISRC (International Standard Recording Code)" })
  @Column({ nullable: true })
  isrc?: string;

  @ApiProperty({ description: "Available markets (Spotify)" })
  @Column({ type: "simple-array", nullable: true })
  availableMarkets?: string[];

  @ApiProperty({ description: "Total streams count" })
  @Column(bigInt({ default: 0 }))
  totalStreams: number;

  @ApiProperty({ description: "Monthly streams count" })
  @Column(bigInt({ default: 0 }))
  monthlyStreams: number;

  @ApiProperty({ description: "Peak chart position" })
  @Column({ type: "int", nullable: true })
  peakChartPosition?: number;

  @ApiProperty({ description: "Chart positions as JSON" })
  @Column({ type: "json", nullable: true })
  chartPositions?: {
    billboard200?: number;
    uk?: number;
    spotify?: number;
    apple?: number;
  };

  @ApiProperty({ description: "Album availability on streaming platforms" })
  @Column({ type: "json", nullable: true })
  availability?: {
    spotify?: boolean;
    appleMusic?: boolean;
    youtube?: boolean;
    amazonMusic?: boolean;
    deezer?: boolean;
  };

  @ApiProperty({ description: "Artists of this album", type: () => [Artist] })
  @ManyToMany(() => Artist, (artist) => artist.albums, { cascade: true })
  @JoinTable({ name: "album_artists" })
  artists: Artist[];

  @ApiProperty({ description: "Tracks in this album", type: () => [Track] })
  @OneToMany(() => Track, (track) => track.album, { cascade: true })
  tracks: Track[];
}
