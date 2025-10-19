import { Column, Entity, ManyToMany } from "typeorm";
import { AbstractEntity } from "../../system/common/AbstractEntity";
import { Album } from "src/music/albums/album.entity";
import { Track } from "src/music/tracks/track.entity";
import { ApiProperty } from "@nestjs/swagger";
import { bigInt } from "../../shared/typeormDataTypes";

@Entity()
export class Artist extends AbstractEntity {
  @ApiProperty({ description: "Name of the artist" })
  @Column({ nullable: false })
  name: string;

  @ApiProperty({ description: "Stage name or alias of the artist" })
  @Column({ nullable: true })
  stageName?: string;

  @ApiProperty({ description: "Spotify artist ID" })
  @Column({ nullable: true, unique: true })
  spotifyId?: string;

  @ApiProperty({ description: "Spotify URI" })
  @Column({ nullable: true })
  spotifyUri?: string;

  @ApiProperty({ description: "Spotify API href" })
  @Column({ nullable: true })
  spotifyHref?: string;

  @ApiProperty({ description: "Biography of the artist" })
  @Column({ type: "text", nullable: true })
  biography?: string;

  @ApiProperty({ description: "Country of origin" })
  @Column({ nullable: true })
  country?: string;

  @ApiProperty({ description: "City of origin" })
  @Column({ nullable: true })
  city?: string;

  @ApiProperty({ description: "Genres associated with the artist" })
  @Column({ type: "simple-array", nullable: true })
  genres?: string[];

  @ApiProperty({ description: "Date when the artist started their career" })
  @Column({ type: "date", nullable: true })
  careerStartDate?: Date;

  @ApiProperty({ description: "Date when the artist ended their career" })
  @Column({ type: "date", nullable: true })
  careerEndDate?: Date;

  @ApiProperty({ description: "Profile image URL" })
  @Column({ nullable: true })
  profileImageUrl?: string;

  @ApiProperty({ description: "Spotify images array" })
  @Column({ type: "json", nullable: true })
  images?: Array<{ url: string; height?: number; width?: number }>;

  @ApiProperty({ description: "Cover image URL" })
  @Column({ nullable: true })
  coverImageUrl?: string;

  @ApiProperty({ description: "Official website URL" })
  @Column({ nullable: true })
  website?: string;

  @ApiProperty({ description: "Social media links as JSON" })
  @Column({ type: "json", nullable: true })
  socialMedia?: {
    spotify?: string;
    youtube?: string;
    instagram?: string;
    twitter?: string;
    facebook?: string;
    tiktok?: string;
  };

  @ApiProperty({ description: "Record label" })
  @Column({ nullable: true })
  recordLabel?: string;

  @ApiProperty({ description: "Whether the artist is currently active" })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: "Monthly listeners count" })
  @Column(bigInt({ default: 0 }))
  monthlyListeners: number;

  @ApiProperty({ description: "Total followers count across platforms" })
  @Column(bigInt({ default: 0 }))
  totalFollowers: number;

  @ApiProperty({ description: "Spotify followers count" })
  @Column(bigInt({ default: 0 }))
  spotifyFollowers: number;

  @ApiProperty({ description: "Verified status" })
  @Column({ default: false })
  isVerified: boolean;

  @ApiProperty({ description: "Albums by this artist", type: () => [Album] })
  @ManyToMany(() => Album, (album) => album.artists)
  albums: Album[];

  @ApiProperty({ description: "Tracks by this artist", type: () => [Track] })
  @ManyToMany(() => Track, (track) => track.artists)
  tracks: Track[];
}
