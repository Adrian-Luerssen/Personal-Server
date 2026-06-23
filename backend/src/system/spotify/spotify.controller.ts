import { Body, Controller, Get, Post } from "@nestjs/common";
import {
  CrudAccountAuth,
  CrudAccountOwnedEntity,
} from "../common/CrudEntity.decorator";
import { ApiBearerAuth } from "@nestjs/swagger";
import { SpotifyCredentials } from "./spotifyCredentials.entity";
import { SpotifyService } from "./spotify.service";
import { NoAuth, ReqUser } from "../auth/auth.decorator";
import { SpotifyGateway } from "./spotify.gateway";

@CrudAccountOwnedEntity({
  model: { type: SpotifyCredentials },
})
@CrudAccountAuth()
@ApiBearerAuth("access-token")
@Controller("spotify")
export class SpotifyController {
  constructor(
    private service: SpotifyService,
    private gateway: SpotifyGateway
  ) {}

  @Get("me")
  async me(@ReqUser() user: any) {
    return this.service.getByAccountId(user.id);
  }

  @Post("tokens")
  async tokens(
    @ReqUser() user: any,
    @Body()
    body: {
      accessToken: string;
      refreshToken?: string;
      tokenType?: string;
      scope?: string;
      expiresIn?: number;
    }
  ) {
    return this.service.linkAccountWithTokens(user.id, body);
  }

  @Get("linked")
  async isLinked(@ReqUser() user: any): Promise<{
    linked: boolean;
    betaAccess: ReturnType<SpotifyService["getBetaAccessStatus"]>;
  }> {
    const linked = await this.service.hasLinkedSpotify(user.id);
    const profile = await this.service.getByAccountId(user.id);
    return {
      linked,
      betaAccess: this.service.getBetaAccessStatus(profile?.email),
    };
  }

  @Post("profile")
  async profile(
    @ReqUser() user: any,
    @Body() body: Partial<SpotifyCredentials>
  ) {
    return this.service.updateProfile(user.id, body);
  }

  @Post("stream-tracking")
  async streamTracking(
    @ReqUser() user: any,
    @Body() body: { enabled: boolean }
  ) {
    return this.service.updateStreamTracking(user.id, body.enabled);
  }

  @Post("sync-streams")
  async syncStreams(@ReqUser() user: any) {
    const res = await this.service.syncLatestStreams(user.id);
    // After syncing, broadcast current status update to the user's room
    await this.gateway.broadcastCurrentForAccount(user.id);
    return res;
  }

  @NoAuth()
  @Post("sync-streams-global")
  async syncStreamsGlobal() {
    return await this.service.syncLatestStreamsForAllUsers();
  }

  @NoAuth()
  @Post("refreshAllTokens")
  async refreshAllTokens() {
    const resp = await this.service.refreshAllTokens();
    return resp;
  }

  @Get("currently-playing")
  async currentlyPlaying(@ReqUser() user: any) {
    return await this.service.getAccountCurrentlyPlaying(user.id);
  }

  @Post("backfill-streams")
  async backfillStreams(@ReqUser() user: any) {
    return await this.service.backfillStreams(user.id);
  }
}
