import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1760743652844 implements MigrationInterface {
    name = 'Init1760743652844'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."app_tool_program_enum" AS ENUM('LEVEL_2_AUTO')`);
        await queryRunner.query(`CREATE TABLE "app_tool" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "program" "public"."app_tool_program_enum" NOT NULL DEFAULT 'LEVEL_2_AUTO', "version" character varying NOT NULL, "download_link" character varying NOT NULL, CONSTRAINT "UQ_cc5db5d17616342766dc3989fa1" UNIQUE ("name"), CONSTRAINT "PK_f3563cfefac104b806a4c39fde9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "app_account" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, CONSTRAINT "UQ_12ecbaffe8f5533580c945610f4" UNIQUE ("name"), CONSTRAINT "PK_67616a35344586911a7e0e936f6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "app_spotify_credentials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "accountId" uuid NOT NULL, "spotifyUserId" character varying, "displayName" character varying, "email" character varying, "profileUrl" character varying, "images" json, "accessToken" text, "refreshToken" text, "tokenType" character varying, "scopes" text, "expiresAt" TIMESTAMP, "streamTrackingEnabled" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_290e00a382d0b380bde9c56ef44" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_96363c125ed7edff2af784e368" ON "app_spotify_credentials" ("spotifyUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_437842afab05a7006cafb85129" ON "app_spotify_credentials" ("email") `);
        await queryRunner.query(`CREATE TABLE "app_refresh_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "accountId" uuid NOT NULL, "token" character varying NOT NULL, "crossToken" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "rememberMe" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_445b8da44e0206f8b7544163dad" UNIQUE ("token"), CONSTRAINT "PK_c2ba96083bdc5d8d804f2a33efa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b5099d6b3b14331d92d3149d9d" ON "app_refresh_token" ("crossToken") `);
        await queryRunner.query(`CREATE TYPE "public"."app_album_type_enum" AS ENUM('studio', 'live', 'compilation', 'soundtrack', 'ep', 'single', 'remix')`);
        await queryRunner.query(`CREATE TABLE "app_album" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying NOT NULL, "spotifyId" character varying, "spotifyUri" character varying, "spotifyHref" character varying, "type" "public"."app_album_type_enum" NOT NULL DEFAULT 'studio', "releaseDate" date, "description" text, "genres" text, "coverImageUrl" character varying, "images" json, "recordLabel" character varying, "producers" text, "totalDuration" integer, "trackCount" integer NOT NULL DEFAULT '0', "isExplicit" boolean NOT NULL DEFAULT false, "copyright" character varying, "upc" character varying, "isrc" character varying, "availableMarkets" text, "totalStreams" numeric NOT NULL DEFAULT '0', "monthlyStreams" numeric NOT NULL DEFAULT '0', "peakChartPosition" integer, "chartPositions" json, "availability" json, CONSTRAINT "UQ_ce93b9ecee985314d3e432c14c2" UNIQUE ("spotifyId"), CONSTRAINT "UQ_0e7de32939ea200554799b56399" UNIQUE ("upc"), CONSTRAINT "PK_5d070b58365ada7b8a2f421b9e1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "app_artist" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "stageName" character varying, "spotifyId" character varying, "spotifyUri" character varying, "spotifyHref" character varying, "biography" text, "country" character varying, "city" character varying, "genres" text, "careerStartDate" date, "careerEndDate" date, "profileImageUrl" character varying, "images" json, "coverImageUrl" character varying, "website" character varying, "socialMedia" json, "recordLabel" character varying, "isActive" boolean NOT NULL DEFAULT true, "monthlyListeners" numeric NOT NULL DEFAULT '0', "totalFollowers" numeric NOT NULL DEFAULT '0', "spotifyFollowers" numeric NOT NULL DEFAULT '0', "isVerified" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_3aa15ecfe55fcc3ba770b52c5db" UNIQUE ("spotifyId"), CONSTRAINT "PK_7d32c562746db54378e7421a16b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."app_stream_platform_enum" AS ENUM('spotify', 'appleMusic', 'youtube', 'amazonMusic', 'deezer', 'tidal', 'soundcloud', 'pandora')`);
        await queryRunner.query(`CREATE TYPE "public"."app_stream_streamtype_enum" AS ENUM('play', 'skip', 'save', 'share', 'download')`);
        await queryRunner.query(`CREATE TABLE "app_stream" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "accountId" uuid NOT NULL, "platform" "public"."app_stream_platform_enum" NOT NULL, "streamType" "public"."app_stream_streamtype_enum" NOT NULL DEFAULT 'play', "streamedAt" TIMESTAMP NOT NULL, "isValidPlay" boolean NOT NULL DEFAULT true, "source" character varying, "context" json, "trackId" uuid NOT NULL, CONSTRAINT "PK_a9ca80814f307405b3d16871631" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e3920247ba3243e5a9eb19c02b" ON "app_stream" ("trackId", "streamedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_8dc537be26fdca7ffdb63dfcdc" ON "app_stream" ("platform", "streamedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_081f24706eba0345cffc1f529e" ON "app_stream" ("trackId", "platform", "streamedAt") `);
        await queryRunner.query(`CREATE TABLE "app_track" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying NOT NULL, "spotifyId" character varying, "spotifyUri" character varying, "spotifyHref" character varying, "trackNumber" integer, "discNumber" integer NOT NULL DEFAULT '1', "duration" integer NOT NULL, "genres" text, "releaseDate" date, "isExplicit" boolean NOT NULL DEFAULT false, "lyrics" text, "writers" text, "producers" text, "featuredArtists" text, "bpm" integer, "musicalKey" character varying, "audioFeatures" json, "isrc" character varying, "previewUrl" character varying, "images" json, "externalUrls" json, "availability" json, "totalStreams" numeric NOT NULL DEFAULT '0', "monthlyStreams" numeric NOT NULL DEFAULT '0', "weeklyStreams" numeric NOT NULL DEFAULT '0', "dailyStreams" numeric NOT NULL DEFAULT '0', "peakChartPosition" integer, "chartPositions" json, "popularity" integer NOT NULL DEFAULT '0', "albumId" uuid, CONSTRAINT "UQ_af13b7372bacd003ed8c6c28cfb" UNIQUE ("spotifyId"), CONSTRAINT "UQ_cd517be6a9bd1e4fa507078fcf6" UNIQUE ("isrc"), CONSTRAINT "PK_0a511a9ba410cce3244d80ae2e9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "app_playlist" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying, "spotifyId" character varying, "spotifyUri" character varying, "spotifyHref" character varying, "description" text, "ownerId" character varying, "totalTracks" integer, "images" json, CONSTRAINT "PK_f163019df94cfa639937ccd733d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f6581a38cde930dad7082edf44" ON "app_playlist" ("spotifyId") `);
        await queryRunner.query(`CREATE TABLE "app_album_artists" ("albumId" uuid NOT NULL, "artistId" uuid NOT NULL, CONSTRAINT "PK_9545641dea0daa6bff2e0e17134" PRIMARY KEY ("albumId", "artistId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b5db4687aab60db0445cb345d6" ON "app_album_artists" ("albumId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f1af7af9989803647516b858be" ON "app_album_artists" ("artistId") `);
        await queryRunner.query(`CREATE TABLE "app_track_artists" ("trackId" uuid NOT NULL, "artistId" uuid NOT NULL, CONSTRAINT "PK_56125f928a05851f4f36d6aabdb" PRIMARY KEY ("trackId", "artistId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_819c19876fd8a393a546673e0b" ON "app_track_artists" ("trackId") `);
        await queryRunner.query(`CREATE INDEX "IDX_a564720c5cf19d96e17abd96e2" ON "app_track_artists" ("artistId") `);
        await queryRunner.query(`CREATE TABLE "app_playlist_tracks" ("playlistId" uuid NOT NULL, "trackId" uuid NOT NULL, CONSTRAINT "PK_d22b0ed1ac8b4958f11f2435526" PRIMARY KEY ("playlistId", "trackId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_de27995388b04335219283e9ce" ON "app_playlist_tracks" ("playlistId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ff921c6d98b3a3f87f779a6575" ON "app_playlist_tracks" ("trackId") `);
        await queryRunner.query(`ALTER TABLE "app_spotify_credentials" ADD CONSTRAINT "FK_7c9328d1ab0377c6315c45c1212" FOREIGN KEY ("accountId") REFERENCES "app_account"("id") ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE "app_refresh_token" ADD CONSTRAINT "FK_b19abfe6a991c7788757e889b12" FOREIGN KEY ("accountId") REFERENCES "app_account"("id") ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE "app_stream" ADD CONSTRAINT "FK_4637fbc54c4b1fc43e85b5aa7db" FOREIGN KEY ("accountId") REFERENCES "app_account"("id") ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE "app_stream" ADD CONSTRAINT "FK_c0091c860879e53ed40acc3c48b" FOREIGN KEY ("trackId") REFERENCES "app_track"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app_track" ADD CONSTRAINT "FK_81378a9ef588952a80cea228018" FOREIGN KEY ("albumId") REFERENCES "app_album"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app_album_artists" ADD CONSTRAINT "FK_b5db4687aab60db0445cb345d6e" FOREIGN KEY ("albumId") REFERENCES "app_album"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "app_album_artists" ADD CONSTRAINT "FK_f1af7af9989803647516b858bea" FOREIGN KEY ("artistId") REFERENCES "app_artist"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app_track_artists" ADD CONSTRAINT "FK_819c19876fd8a393a546673e0b1" FOREIGN KEY ("trackId") REFERENCES "app_track"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "app_track_artists" ADD CONSTRAINT "FK_a564720c5cf19d96e17abd96e27" FOREIGN KEY ("artistId") REFERENCES "app_artist"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app_playlist_tracks" ADD CONSTRAINT "FK_de27995388b04335219283e9ce8" FOREIGN KEY ("playlistId") REFERENCES "app_playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "app_playlist_tracks" ADD CONSTRAINT "FK_ff921c6d98b3a3f87f779a6575a" FOREIGN KEY ("trackId") REFERENCES "app_track"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app_playlist_tracks" DROP CONSTRAINT "FK_ff921c6d98b3a3f87f779a6575a"`);
        await queryRunner.query(`ALTER TABLE "app_playlist_tracks" DROP CONSTRAINT "FK_de27995388b04335219283e9ce8"`);
        await queryRunner.query(`ALTER TABLE "app_track_artists" DROP CONSTRAINT "FK_a564720c5cf19d96e17abd96e27"`);
        await queryRunner.query(`ALTER TABLE "app_track_artists" DROP CONSTRAINT "FK_819c19876fd8a393a546673e0b1"`);
        await queryRunner.query(`ALTER TABLE "app_album_artists" DROP CONSTRAINT "FK_f1af7af9989803647516b858bea"`);
        await queryRunner.query(`ALTER TABLE "app_album_artists" DROP CONSTRAINT "FK_b5db4687aab60db0445cb345d6e"`);
        await queryRunner.query(`ALTER TABLE "app_track" DROP CONSTRAINT "FK_81378a9ef588952a80cea228018"`);
        await queryRunner.query(`ALTER TABLE "app_stream" DROP CONSTRAINT "FK_c0091c860879e53ed40acc3c48b"`);
        await queryRunner.query(`ALTER TABLE "app_stream" DROP CONSTRAINT "FK_4637fbc54c4b1fc43e85b5aa7db"`);
        await queryRunner.query(`ALTER TABLE "app_refresh_token" DROP CONSTRAINT "FK_b19abfe6a991c7788757e889b12"`);
        await queryRunner.query(`ALTER TABLE "app_spotify_credentials" DROP CONSTRAINT "FK_7c9328d1ab0377c6315c45c1212"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ff921c6d98b3a3f87f779a6575"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_de27995388b04335219283e9ce"`);
        await queryRunner.query(`DROP TABLE "app_playlist_tracks"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a564720c5cf19d96e17abd96e2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_819c19876fd8a393a546673e0b"`);
        await queryRunner.query(`DROP TABLE "app_track_artists"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f1af7af9989803647516b858be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b5db4687aab60db0445cb345d6"`);
        await queryRunner.query(`DROP TABLE "app_album_artists"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f6581a38cde930dad7082edf44"`);
        await queryRunner.query(`DROP TABLE "app_playlist"`);
        await queryRunner.query(`DROP TABLE "app_track"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_081f24706eba0345cffc1f529e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8dc537be26fdca7ffdb63dfcdc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e3920247ba3243e5a9eb19c02b"`);
        await queryRunner.query(`DROP TABLE "app_stream"`);
        await queryRunner.query(`DROP TYPE "public"."app_stream_streamtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."app_stream_platform_enum"`);
        await queryRunner.query(`DROP TABLE "app_artist"`);
        await queryRunner.query(`DROP TABLE "app_album"`);
        await queryRunner.query(`DROP TYPE "public"."app_album_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b5099d6b3b14331d92d3149d9d"`);
        await queryRunner.query(`DROP TABLE "app_refresh_token"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_437842afab05a7006cafb85129"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_96363c125ed7edff2af784e368"`);
        await queryRunner.query(`DROP TABLE "app_spotify_credentials"`);
        await queryRunner.query(`DROP TABLE "app_account"`);
        await queryRunner.query(`DROP TABLE "app_tool"`);
        await queryRunner.query(`DROP TYPE "public"."app_tool_program_enum"`);
    }

}
