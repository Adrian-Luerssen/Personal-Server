import { Column, Entity, Index } from "typeorm";
import { AbstractAccountOwnedEntity } from "../common/AbstractAccountOwnedEntity";
import { ApiProperty } from "@nestjs/swagger";

@Entity()
export class SpotifyCredentials extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Spotify user ID" })
  @Index({ unique: true })
  @Column({ nullable: true })
  spotifyUserId?: string;

  @ApiProperty({ description: "Spotify display name" })
  @Column({ nullable: true })
  displayName?: string;

  @ApiProperty({ description: "Spotify email" })
  @Index()
  @Column({ nullable: true })
  email?: string;

  @ApiProperty({ description: "Profile URL" })
  @Column({ nullable: true })
  profileUrl?: string;

  @ApiProperty({ description: "Primary Spotify profile image URL" })
  @Column({ nullable: true })
  profileImageUrl?: string;

  @ApiProperty({ description: "Spotify user images" })
  @Column({ type: "json", nullable: true })
  images?: Array<{ url: string; height?: number; width?: number }>;

  @ApiProperty({ description: "Access token (encrypt at rest in production)" })
  @Column({ type: "text", nullable: true })
  accessToken?: string;

  @ApiProperty({ description: "Refresh token (encrypt at rest in production)" })
  @Column({ type: "text", nullable: true })
  refreshToken?: string;

  @ApiProperty({ description: "Token type (e.g., Bearer)" })
  @Column({ nullable: true })
  tokenType?: string;

  @ApiProperty({ description: "Token scopes" })
  @Column({ type: "simple-array", nullable: true })
  scopes?: string[];

  @ApiProperty({ description: "Token expiry date/time" })
  @Column({ type: "timestamp", nullable: true })
  expiresAt?: Date;

  @ApiProperty({
    description: "Whether stream tracking is enabled for this account",
    default: true,
  })
  @Column({ type: "boolean", default: true })
  streamTrackingEnabled: boolean;
}
