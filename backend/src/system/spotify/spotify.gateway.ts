import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable, Logger } from "@nestjs/common";
import { SpotifyService } from "./spotify.service";
import { RefreshTokenService } from "../auth/refreshToken.service";

// Allow CORS to the same origin as HTTP CORS (configured in main.ts via ConfigService)
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  },
  namespace: "/ws",
})
@Injectable()
export class SpotifyGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SpotifyGateway.name);
  private clientMap = new Map<
    string,
    {
      accountId: string;
      interval?: NodeJS.Timer;
      lastTrackId?: string;
      lastIsPlaying?: boolean;
    }
  >();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly spotifyService: SpotifyService,
    private readonly refreshTokenService: RefreshTokenService
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected ${client.id}`);
    const meta = this.clientMap.get(client.id);
    if (meta?.interval) clearInterval(meta.interval);
    this.clientMap.delete(client.id);
  }

  // Client sends their access token to start receiving personal updates
  @SubscribeMessage("spotify:subscribeCurrent")
  async handleSubscribeCurrent(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { accessToken: string; intervalMs?: number }
  ) {
    try {
      const jwt = payload?.accessToken;
      if (!jwt) {
        client.emit("spotify:error", { message: "Missing access token" });
        return;
      }
      const account = await this.refreshTokenService.validateAccessToken(jwt);
      if (!account) {
        client.emit("spotify:error", { message: "Invalid access token" });
        return;
      }

      // Join a room for the account to receive targeted events
      const room = `acct:${account.id}`;
      await client.join(room);

      // Immediately send current state
      const now = await this.spotifyService.getAccountCurrentlyPlaying(
        account.id
      );
      client.emit("spotify:current", now);

      // Start per-client polling of Spotify currently playing
      const pollEvery = Math.max(
        3000,
        Math.min(20000, Number(payload?.intervalMs) || 5000)
      );
      const meta = {
        accountId: account.id,
        interval: undefined as unknown as NodeJS.Timer,
        lastTrackId: undefined as string | undefined,
        lastIsPlaying: undefined as boolean | undefined,
      };
      const interval = setInterval(async () => {
        try {
          const state = await this.spotifyService.getAccountCurrentlyPlaying(
            account.id
          );
          const currentId = state?.track?.spotifyId;
          const isPlaying = !!state?.isPlaying;
          const changed =
            meta.lastTrackId !== currentId || meta.lastIsPlaying !== isPlaying;
          if (changed) {
            meta.lastTrackId = currentId;
            meta.lastIsPlaying = isPlaying;
            client.emit("spotify:current", state);
          }
        } catch (e) {
          this.logger.debug(
            `poll error for ${client.id}: ${(e as any)?.message || e}`
          );
        }
      }, pollEvery);
      meta.interval = interval;
      this.clientMap.set(client.id, meta);
    } catch (e: any) {
      this.logger.error("subscribe error", e);
      client.emit("spotify:error", {
        message: e?.message || "Subscribe failed",
      });
    }
  }

  // Admin/broadcast trigger to push latest state to all subscribers for their own accounts
  // This can be invoked by a scheduler or an HTTP controller in the future.
  async broadcastCurrentForAccount(accountId: string) {
    try {
      const payload = await this.spotifyService.getAccountCurrentlyPlaying(
        accountId
      );
      this.server.to(`acct:${accountId}`).emit("spotify:current", payload);
    } catch (e) {
      this.logger.error("broadcast error", e as any);
    }
  }
}
