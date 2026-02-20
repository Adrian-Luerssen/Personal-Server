import { SpotifyCredentials } from "./spotifyCredentials.entity";
import { SpotifyService } from "./spotify.service";
import { SpotifyController } from "./spotify.controller";
import { SpotifyGateway } from "./spotify.gateway";

export const SpotifyModules = {
  SpotifyEntities: [SpotifyCredentials],
  SpotifyServices: [SpotifyService, SpotifyGateway],
  SpotifyControllers: [SpotifyController],
};
