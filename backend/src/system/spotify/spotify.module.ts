import { SpotifyCredentials } from "./spotifyCredentials.entity";
import { SpotifyService } from "./spotify.service";
import { SpotifyController } from "./spotify.controller";

export const SpotifyModules = {
  SpotifyEntities: [SpotifyCredentials],
  SpotifyServices: [SpotifyService],
  SpotifyControllers: [SpotifyController],
};