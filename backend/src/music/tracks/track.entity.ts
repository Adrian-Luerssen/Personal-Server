import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  JoinTable,
} from "typeorm";
import { AbstractEntity } from "../../system/common/AbstractEntity";
import { Artist } from "src/music/artists/artist.entity";
import { Album } from "src/music/albums/album.entity";
import { Stream } from "src/music/streams/stream.entity";
import { ApiProperty } from "@nestjs/swagger";
import { bigInt } from "../../shared/typeormDataTypes";

@Entity()
export class Track extends AbstractEntity {
  @ApiProperty({ description: "Title of the track" })
  @Column({ nullable: false })
  title: string;

  @ApiProperty({ description: "Spotify track ID" })
  @Column({ nullable: true, unique: true })
  spotifyId?: string;

  @ApiProperty({ description: "Spotify URI" })
  @Column({ nullable: true })
  spotifyUri?: string;

  @ApiProperty({ description: "Spotify API href" })
  @Column({ nullable: true })
  spotifyHref?: string;

  @ApiProperty({ description: "Track number in the album" })
  @Column({ type: "int", nullable: true })
  trackNumber?: number;

  @ApiProperty({ description: "Disc number if multi-disc album" })
  @Column({ type: "int", default: 1 })
  discNumber: number;

  @ApiProperty({ description: "Duration of the track in seconds" })
  @Column({ type: "int", nullable: false })
  duration: number;

  @ApiProperty({ description: "Genres of the track" })
  @Column({ type: "simple-array", nullable: true })
  genres?: string[];

  @ApiProperty({ description: "Release date of the track" })
  @Column({ type: "date", nullable: true })
  releaseDate?: Date;

  @ApiProperty({ description: "Whether the track is explicit" })
  @Column({ default: false })
  isExplicit: boolean;

  @ApiProperty({ description: "Lyrics of the track" })
  @Column({ type: "text", nullable: true })
  lyrics?: string;

  @ApiProperty({ description: "Writers/composers of the track" })
  @Column({ type: "simple-array", nullable: true })
  writers?: string[];

  @ApiProperty({ description: "Producers of the track" })
  @Column({ type: "simple-array", nullable: true })
  producers?: string[];

  @ApiProperty({ description: "Featured artists" })
  @Column({ type: "simple-array", nullable: true })
  featuredArtists?: string[];

  @ApiProperty({ description: "BPM (Beats Per Minute)" })
  @Column({ type: "int", nullable: true })
  bpm?: number;

  @ApiProperty({ description: "Musical key of the track" })
  @Column({ nullable: true })
  musicalKey?: string;

  @ApiProperty({ description: "Audio features as JSON" })
  @Column({ type: "json", nullable: true })
  audioFeatures?: {
    danceability?: number;
    energy?: number;
    loudness?: number;
    speechiness?: number;
    acousticness?: number;
    instrumentalness?: number;
    liveness?: number;
    valence?: number;
  };

  @ApiProperty({ description: "ISRC (International Standard Recording Code)" })
  @Column({ nullable: true })
  isrc?: string;

  @ApiProperty({ description: "Preview URL for 30-second sample" })
  @Column({ nullable: true })
  previewUrl?: string;

  @ApiProperty({ description: "Spotify images (album/track thumbnails)" })
  @Column({ type: "json", nullable: true })
  images?: Array<{ url: string; height?: number; width?: number }>;

  @ApiProperty({ description: "External URLs for streaming platforms" })
  @Column({ type: "json", nullable: true })
  externalUrls?: {
    spotify?: string;
    appleMusic?: string;
    youtube?: string;
    amazonMusic?: string;
    deezer?: string;
  };

  @ApiProperty({ description: "Track availability on streaming platforms" })
  @Column({ type: "json", nullable: true })
  availability?: {
    spotify?: boolean;
    appleMusic?: boolean;
    youtube?: boolean;
    amazonMusic?: boolean;
    deezer?: boolean;
  };

  @ApiProperty({ description: "Total streams count" })
  @Column(bigInt({ default: 0 }))
  totalStreams: number;

  @ApiProperty({ description: "Monthly streams count" })
  @Column(bigInt({ default: 0 }))
  monthlyStreams: number;

  @ApiProperty({ description: "Weekly streams count" })
  @Column(bigInt({ default: 0 }))
  weeklyStreams: number;

  @ApiProperty({ description: "Daily streams count" })
  @Column(bigInt({ default: 0 }))
  dailyStreams: number;

  @ApiProperty({ description: "Peak chart position" })
  @Column({ type: "int", nullable: true })
  peakChartPosition?: number;

  @ApiProperty({ description: "Chart positions as JSON" })
  @Column({ type: "json", nullable: true })
  chartPositions?: {
    billboard100?: number;
    spotifyTop50?: number;
    appleMusicTop100?: number;
    youtubeTop100?: number;
  };

  @ApiProperty({ description: "Popularity score (0-100)" })
  @Column({ type: "int", default: 0 })
  popularity: number;

  @ApiProperty({ description: "Artists of this track", type: () => [Artist] })
  @ManyToMany(() => Artist, (artist) => artist.tracks, { cascade: true })
  @JoinTable({ name: "track_artists" })
  artists: Artist[];

  @ApiProperty({
    description: "The album this track belongs to",
    type: () => Album,
  })
  @ManyToOne(() => Album, (album) => album.tracks, { nullable: true })
  album?: Album;

  @ApiProperty({ description: "ID of the album" })
  @Column({ nullable: true })
  albumId?: string;

  @ApiProperty({ description: "Streams of this track", type: () => [Stream] })
  @OneToMany(() => Stream, (stream) => stream.track, { cascade: true })
  streams: Stream[];

  @ApiProperty({
    description: "Playlists containing this track",
    type: () => [Object],
  })
  @ManyToMany(
    () => require("../playlists/playlist.entity").Playlist,
    (playlist: any) => playlist.tracks
  )
  playlists?: any[];
}
