import { MiddlewareConsumer, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthService } from "./auth/auth.service";
import { AuthController } from "./auth/auth.controller";

import { RefreshToken } from "./auth/refreshToken.entity";
import { RefreshTokenService } from "./auth/refreshToken.service";
import { AuthConfiguration } from "./auth/auth.configuration";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AuthTokenGuard } from "./auth/auth.token.guard";

import { AccountSegregationSubscriber } from "./auth/accountSegregation.subscriber";
import { RequestContextMiddleware } from "./auth/RequestContext.middleware";
import { RequestContextProvider } from "./auth/requestContext.provider";

import { AccountsModules } from "./accounts/accounts.module";
import { SpotifyModules } from "./spotify/spotify.module";
import { DataService } from "./data/data.service";
import { DataController } from "./data/data.controller";
import { Track } from "../music/tracks/track.entity";
import { Album } from "../music/albums/album.entity";
import { Artist } from "../music/artists/artist.entity";
import { Stream } from "../music/streams/stream.entity";
import { Playlist } from "../music/playlists/playlist.entity";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_KEY,
      signOptions: { expiresIn: "1h" },
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forFeature([
      ...AccountsModules.AccountEntities,
      ...SpotifyModules.SpotifyEntities,
      // make music repositories available to system-level services (e.g. SpotifyService)
      Track,
      Album,
      Artist,
      Stream,
      Playlist,
      RefreshToken,
    ]),
    ConfigModule,
  ],
  providers: [
    ...AccountsModules.AccountServices,
    ...SpotifyModules.SpotifyServices,

    AccountSegregationSubscriber,
    AuthConfiguration,
    AuthService,
    RefreshTokenService,
    RequestContextMiddleware,
    RequestContextProvider,
    DataService,

    {
      provide: APP_GUARD,
      useClass: AuthTokenGuard,
    },
  ],
  exports: [],
  controllers: [
    ...AccountsModules.AccountControllers,
    ...SpotifyModules.SpotifyControllers,
    AuthController,
    DataController,
  ],
})
export class SystemModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
