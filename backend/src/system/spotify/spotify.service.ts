import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import axios, { AxiosInstance } from "axios";
import { SpotifyCredentials } from "./spotifyCredentials.entity";
import { Track } from "../../music/tracks/track.entity";
import { Album } from "../../music/albums/album.entity";
import { Artist } from "../../music/artists/artist.entity";
import {
  Stream,
  StreamPlatform,
  StreamType,
} from "../../music/streams/stream.entity";

@Injectable()
export class SpotifyService extends TypeOrmCrudService<SpotifyCredentials> {
  private readonly spotifyApi: AxiosInstance = axios.create({
    baseURL: "https://api.spotify.com/v1",
  });
  private readonly clientId: string =
    this.configService.get<string>("SPOTIFY_CLIENT_ID")!;
  private readonly clientSecret: string = this.configService.get<string>(
    "SPOTIFY_CLIENT_SECRET"
  )!;
  private readonly redirectUri: string = this.configService.get<string>(
    "SPOTIFY_REDIRECT_URI"
  )!;

  constructor(
    @InjectRepository(SpotifyCredentials) repo: Repository<SpotifyCredentials>,
    private configService: ConfigService,
    @InjectRepository(Track) private trackRepo: Repository<Track>,
    @InjectRepository(Album) private albumRepo: Repository<Album>,
    @InjectRepository(Artist) private artistRepo: Repository<Artist>,
    @InjectRepository(Stream) private streamRepo: Repository<Stream>,
    @InjectRepository(require("../../music/playlists/playlist.entity").Playlist)
    private playlistRepo: Repository<any>
  ) {
    super(repo);
  }

  private getPrimaryProfileImageUrl(
    images?: Array<{ url?: string; height?: number; width?: number }> | null
  ): string | undefined {
    return images?.find((image) => image?.url)?.url;
  }

  private async refreshStoredProfile(
    accountId: string,
    accessToken: string
  ): Promise<void> {
    try {
      const me = await this.getCurrentUser(accessToken);
      this.assertBetaAccessAllowed({ email: me.email });
      await this.updateProfile(accountId, {
        spotifyUserId: me.id,
        displayName: me.display_name,
        email: me.email,
        profileUrl: me.external_urls?.spotify,
        profileImageUrl: this.getPrimaryProfileImageUrl(me.images),
        images: me.images,
      });
    } catch (error) {
      Logger.warn(
        `Failed to refresh Spotify profile for account ${accountId}: ${error}`,
        "SpotifyProfile"
      );
    }
  }

  private async refreshStoredProfileIfMissing(
    credentials: SpotifyCredentials,
    accessToken: string
  ): Promise<void> {
    if (
      credentials.profileImageUrl ||
      this.getPrimaryProfileImageUrl(credentials.images)
    ) {
      return;
    }
    await this.refreshStoredProfile(credentials.accountId, accessToken);
  }

  private getBetaAllowedEmails(): string[] {
    const raw = this.configService.get<string>("SPOTIFY_BETA_ALLOWED_EMAILS") || "";
    const emails = raw
      .split(/[,\n;]/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    return Array.from(new Set(emails));
  }

  private getBooleanConfig(name: string): boolean {
    const raw = (this.configService.get<string>(name) || "").trim().toLowerCase();
    return ["1", "true", "yes", "on"].includes(raw);
  }

  getBetaAccessStatus(email?: string): {
    enabled: boolean;
    enforced: boolean;
    limit: number;
    approved: boolean | null;
    configuredUsers: number;
    remainingSlots: number;
  } {
    const allowedEmails = this.getBetaAllowedEmails();
    const configuredLimit = Number(
      this.configService.get<string>("SPOTIFY_BETA_LIMIT") || "10"
    );
    const limit =
      Number.isFinite(configuredLimit) && configuredLimit > 0
        ? configuredLimit
        : 10;
    const enabled =
      this.getBooleanConfig("SPOTIFY_BETA_MODE") || allowedEmails.length > 0;
    const enforced = allowedEmails.length > 0;
    const normalizedEmail = email?.trim().toLowerCase();

    return {
      enabled,
      enforced,
      limit,
      approved: enforced
        ? Boolean(normalizedEmail && allowedEmails.includes(normalizedEmail))
        : null,
      configuredUsers: allowedEmails.length,
      remainingSlots: Math.max(limit - allowedEmails.length, 0),
    };
  }

  assertBetaAccessAllowed(profile: { email?: string }): void {
    const status = this.getBetaAccessStatus(profile.email);
    if (!status.enforced || status.approved) return;

    if (!profile.email) {
      throw new ForbiddenException(
        "Spotify is currently in beta. This Spotify profile did not expose an email address that can be checked against the approved tester list."
      );
    }

    throw new ForbiddenException(
      "Spotify is currently in beta. This Spotify account is not on the approved tester list."
    );
  }

  // Refresh tokens if expired and return valid access token
  async getOrRefreshAccessToken(accountId: string): Promise<string | null> {
    const credentials = await this.getByAccountId(accountId);
    if (!credentials || !credentials.accessToken) return null;
    const now = new Date();
    const expiresAt = credentials.expiresAt;
    const buffer = 5 * 60 * 1000;
    if (expiresAt && now.getTime() > expiresAt.getTime() - buffer) {
      if (!credentials.refreshToken) return null;
      try {
        const refreshed = await this.refreshAccessToken(
          credentials.refreshToken
        );
        const updatedCredentials = await this.upsertTokens(accountId, {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token || credentials.refreshToken,
          tokenType: refreshed.token_type,
          scope: refreshed.scope,
          expiresIn: refreshed.expires_in,
        });
        await this.refreshStoredProfileIfMissing(
          updatedCredentials,
          refreshed.access_token
        );
        return refreshed.access_token;
      } catch (error) {
        return null;
      }
    }
    await this.refreshStoredProfileIfMissing(
      credentials,
      credentials.accessToken
    );
    return credentials.accessToken;
  }

  async syncLatestStreamsForAllUsers(): Promise<{
    saved: number;
    skipped: number;
  }> {
    const users = await this.repo.find();
    const result = { saved: 0, skipped: 0 };
    for (const user of users) {
      const resp = await this.syncLatestStreams(user.accountId);
      result.saved += resp.saved;
      result.skipped += resp.skipped;
    }
    return result;
  }

  // Sync latest streams for a user
  async syncLatestStreams(
    accountId: string
  ): Promise<{ saved: number; skipped: number }> {
    const accessToken = await this.getOrRefreshAccessToken(accountId);
    if (!accessToken) throw new Error("Spotify not linked or token expired");
    const creds = await this.getByAccountId(accountId);
    if (!creds.streamTrackingEnabled) return { saved: 0, skipped: 0 };
    let recent;
    try {
      recent = await this.getRecentlyPlayed(accessToken, 50);
    } catch (e) {
      // if 401 Unauthorized, likely token issue, throw error
      throw new HttpException(
        "Failed to fetch recently played: Unauthorized",
        HttpStatus.UNAUTHORIZED
      );
    }
    let saved = 0,
      skipped = 0;
    for (const item of recent.items || []) {
      const playedAt = new Date(item.played_at);
      const trackData = item.track;
      // Fetch or create the track (and related album/artist) via helper
      let track = await this.fetchOrCreateTrack(trackData.id, accessToken);
      // Save stream - check for duplicate using ISO string to avoid timezone issues
      const alreadyStreamed = await this.streamRepo
        .createQueryBuilder("stream")
        .where("stream.accountId = :accountId", { accountId })
        .andWhere("stream.trackId = :trackId", { trackId: track.id })
        .andWhere("stream.streamedAt = :streamedAt", {
          streamedAt: playedAt.toISOString(),
        })
        .getOne();
      if (alreadyStreamed) {
        skipped++;
        continue;
      }
      const stream = new Stream();
      stream.accountId = accountId;
      stream.track = track;
      stream.platform = StreamPlatform.SPOTIFY;
      stream.streamType = StreamType.PLAY;
      stream.streamedAt = playedAt;
      stream.source = item.context?.type;
      switch (item.context?.type) {
        case "playlist":
          const playlistId = item.context.uri.split(":").pop();

          try {
            const fullPlaylist = await this.fetchOrCreatePlaylist(
              playlistId,
              accessToken
            );
            if (!fullPlaylist) break;
            stream.context = { playlistId: fullPlaylist.id };
            if (fullPlaylist) {
              stream.context.playlistName =
                fullPlaylist.title || fullPlaylist.name;
              // ensure track is added to playlist.tracks relation
              if (
                fullPlaylist.tracks &&
                !fullPlaylist.tracks.find((t: any) => t.id === track.id)
              ) {
                fullPlaylist.tracks = fullPlaylist.tracks || [];
                fullPlaylist.tracks.push(track);
                await this.playlistRepo.save(fullPlaylist);
              }
            }
          } catch (e) {
            // ignore playlist fetch failures
            console.log("Failed to fetch playlist for stream context", e);
            stream.source = undefined;
          }
          break;
        case "album":
          const spotifyAlbumId = item.context.uri.split(":").pop();
          // get internal album ID
          const album = await this.albumRepo.findOne({
            where: { spotifyId: spotifyAlbumId },
          });
          stream.context = { albumId: album?.id };
          break;
        case "artist":
          const spotifyArtistId = item.context.uri.split(":").pop();
          // get internal artist ID
          const artist = await this.artistRepo.findOne({
            where: { spotifyId: spotifyArtistId },
          });
          stream.context = { artistId: artist?.id };
          break;
      }
      stream.isValidPlay = true;

      await this.streamRepo.insert({
        accountId: stream.accountId,
        trackId: track.id,
        platform: stream.platform,
        streamType: stream.streamType,
        streamedAt: stream.streamedAt,
        isValidPlay: stream.isValidPlay,
        source: stream.source,
        context: stream.context,
      });

      saved++;
    }
    return { saved, skipped };
  }

  // Backfill streams by walking backwards in time using the 'before' cursor
  async backfillStreams(
    accountId: string
  ): Promise<{ saved: number; skipped: number; pages: number }> {
    const accessToken = await this.getOrRefreshAccessToken(accountId);
    if (!accessToken) throw new Error("Spotify not linked or token expired");
    const creds = await this.getByAccountId(accountId);
    if (!creds.streamTrackingEnabled) return { saved: 0, skipped: 0, pages: 0 };

    let saved = 0;
    let skipped = 0;
    let pages = 0;
    let before: number | undefined = undefined;
    const limit = 50;

    while (true) {
      pages++;
      let recent;
      try {
        recent = await this.getRecentlyPlayed(accessToken, limit, before);
      } catch (e) {
        throw new HttpException(
          "Failed to fetch recently played: Unauthorized",
          HttpStatus.UNAUTHORIZED
        );
      }

      const items = recent.items || [];
      if (items.length === 0) {
        // No more items to fetch
        break;
      }

      // Process items in this page
      for (const item of items) {
        const playedAt = new Date(item.played_at);
        const trackData = item.track;

        let track = await this.fetchOrCreateTrack(trackData.id, accessToken);

        // Check if stream already exists - using ISO string to avoid timezone issues
        const alreadyStreamed = await this.streamRepo
          .createQueryBuilder("stream")
          .where("stream.accountId = :accountId", { accountId })
          .andWhere("stream.trackId = :trackId", { trackId: track.id })
          .andWhere("stream.streamedAt = :streamedAt", {
            streamedAt: playedAt.toISOString(),
          })
          .getOne();
        if (alreadyStreamed) {
          skipped++;
          continue;
        }

        const stream = new Stream();
        stream.accountId = accountId;
        stream.track = track;
        stream.platform = StreamPlatform.SPOTIFY;
        stream.streamType = StreamType.PLAY;
        stream.streamedAt = playedAt;
        stream.source = item.context?.type;

        switch (item.context?.type) {
          case "playlist":
            const playlistId = item.context.uri.split(":").pop();
            try {
              const fullPlaylist = await this.fetchOrCreatePlaylist(
                playlistId,
                accessToken
              );
              if (!fullPlaylist) break;
              stream.context = { playlistId: fullPlaylist.id };
              if (fullPlaylist) {
                stream.context.playlistName =
                  fullPlaylist.title || fullPlaylist.name;
                if (
                  fullPlaylist.tracks &&
                  !fullPlaylist.tracks.find((t: any) => t.id === track.id)
                ) {
                  fullPlaylist.tracks = fullPlaylist.tracks || [];
                  fullPlaylist.tracks.push(track);
                  await this.playlistRepo.save(fullPlaylist);
                }
              }
            } catch (e) {
              console.log("Failed to fetch playlist for stream context", e);
              stream.source = undefined;
            }
            break;
          case "album":
            const spotifyAlbumId = item.context.uri.split(":").pop();
            const album = await this.albumRepo.findOne({
              where: { spotifyId: spotifyAlbumId },
            });
            stream.context = { albumId: album?.id };
            break;
          case "artist":
            const spotifyArtistId = item.context.uri.split(":").pop();
            const artist = await this.artistRepo.findOne({
              where: { spotifyId: spotifyArtistId },
            });
            stream.context = { artistId: artist?.id };
            break;
        }
        stream.isValidPlay = true;

        await this.streamRepo.insert({
          accountId: stream.accountId,
          trackId: track.id,
          platform: stream.platform,
          streamType: stream.streamType,
          streamedAt: stream.streamedAt,
          isValidPlay: stream.isValidPlay,
          source: stream.source,
          context: stream.context,
        });

        saved++;
      }

      // Update cursor for next iteration: use the earliest played_at timestamp as Unix time
      if (items.length > 0) {
        // Use the earliest played_at timestamp in this batch (last item)
        const earliestItem = items[items.length - 1];
        before = new Date(earliestItem.played_at).getTime();
      } else {
        break;
      }

      // Optional: add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return { saved, skipped, pages };
  }

  // Helper: fetch full track from Spotify and persist track, album, artist as needed
  private async fetchOrCreateTrack(
    spotifyTrackId: string,
    accessToken: string
  ): Promise<Track> {
    // Check existing
    let track = await this.trackRepo.findOne({
      where: { spotifyId: spotifyTrackId },
    });
    if (track) return track;

    const res = await this.spotifyApi.get(`/tracks/${spotifyTrackId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const fullTrack = res.data;

    // Ensure album
    const album = await this.fetchOrCreateAlbum(
      fullTrack.album.id,
      accessToken
    );

    // Ensure all artists
    const artistIds: string[] = (fullTrack.artists || [])
      .map((a: any) => a.id)
      .filter(Boolean);
    const artists: Artist[] = [];
    for (const aid of artistIds) {
      const a = await this.fetchOrCreateArtist(aid, accessToken);
      if (a) artists.push(a);
    }

    track = this.trackRepo.create();
    track.title = fullTrack.name;
    track.spotifyId = fullTrack.id;
    track.spotifyUri = fullTrack.uri;
    track.spotifyHref = fullTrack.href;
    track.duration = fullTrack.duration_ms;
    track.isExplicit = fullTrack.explicit;
    track.releaseDate = fullTrack.album.release_date
      ? new Date(fullTrack.album.release_date)
      : undefined;
    track.genres = [];
    track.images = fullTrack.album.images;
    track.popularity = fullTrack.popularity || 0;
    track.trackNumber = fullTrack.track_number;
    track.discNumber = fullTrack.disc_number;
    track.isrc = fullTrack.external_ids?.isrc;
    track.previewUrl = fullTrack.preview_url;
    track.externalUrls = fullTrack.external_urls;
    track.album = album;
    track.albumId = album?.id;
    if (artists.length) {
      track.artists = artists;
    }

    await this.trackRepo.save(track);
    return track;
  }

  private async fetchOrCreateAlbum(
    spotifyAlbumId: string,
    accessToken: string
  ): Promise<Album> {
    let album = await this.albumRepo.findOne({
      where: { spotifyId: spotifyAlbumId },
    });
    if (album) return album;

    const res = await this.spotifyApi.get(`/albums/${spotifyAlbumId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const fullAlbum = res.data;

    album = this.albumRepo.create();
    album.title = fullAlbum.name;
    album.spotifyId = fullAlbum.id;
    album.spotifyUri = fullAlbum.uri;
    album.spotifyHref = fullAlbum.href;
    album.releaseDate = fullAlbum.release_date
      ? new Date(fullAlbum.release_date)
      : undefined;
    album.trackCount = fullAlbum.total_tracks || 0;
    album.images = fullAlbum.images;
    album.coverImageUrl = fullAlbum.images?.[0]?.url;
    album.availableMarkets = fullAlbum.available_markets || [];
    album.genres = fullAlbum.genres || [];
    album.recordLabel = fullAlbum.label;
    album.upc = fullAlbum.external_ids?.upc;
    album.isrc = fullAlbum.external_ids?.isrc;
    album.isExplicit = fullAlbum.explicit ?? false;
    album.copyright = (fullAlbum.copyrights || [])
      .map((c: any) => `${c.type}: ${c.text}`)
      .join("; ");

    const albumArtistIds: string[] = (fullAlbum.artists || [])
      .map((a: any) => a.id)
      .filter(Boolean);
    if (albumArtistIds.length) {
      const albumArtists: Artist[] = [];
      for (const aid of albumArtistIds) {
        const a = await this.fetchOrCreateArtist(aid, accessToken);
        if (a) albumArtists.push(a);
      }
      album.artists = albumArtists;
    }

    await this.albumRepo.save(album);
    return album;
  }

  private async fetchOrCreatePlaylist(
    spotifyPlaylistId: string,
    accessToken: string
  ): Promise<any> {
    if (!spotifyPlaylistId) return null;
    let playlist = await this.playlistRepo.findOne({
      where: { spotifyId: spotifyPlaylistId },
      relations: ["tracks"],
    });
    let res;
    try {
      res = await this.spotifyApi.get(`/playlists/${spotifyPlaylistId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (e) {
      return null;
    }
    const fullPlaylist = res.data;
    const items = fullPlaylist.tracks?.items || [];

    // check if there are new tracks or deleted tracks from the playlist

    if (!playlist) {
      playlist = this.playlistRepo.create();
      playlist.title = fullPlaylist.name;
      playlist.spotifyId = fullPlaylist.id;
      playlist.spotifyUri = fullPlaylist.uri;
      playlist.spotifyHref = fullPlaylist.href;
      playlist.description = fullPlaylist.description;
      playlist.ownerId = fullPlaylist.owner?.id;
      playlist.totalTracks =
        fullPlaylist.tracks?.total || fullPlaylist.total_tracks || 0;
      playlist.images = fullPlaylist.images || [];
    }

    // optionally populate tracks basic info (we only store relation to track entities)
    const tracks: Track[] = [];
    for (const it of items) {
      const t = it.track;
      if (!t) continue;
      let track = await this.trackRepo.findOne({ where: { spotifyId: t.id } });
      if (!track) {
        // create minimal track record by fetching full details
        track = await this.fetchOrCreateTrack(t.id, accessToken);
      }
      if (track) tracks.push(track);
    }

    if (tracks.length) playlist.tracks = tracks;

    await this.playlistRepo.save(playlist);
    return playlist;
  }

  private async fetchOrCreateArtist(
    spotifyArtistId: string,
    accessToken: string
  ): Promise<Artist> {
    let artist = await this.artistRepo.findOne({
      where: { spotifyId: spotifyArtistId },
    });
    if (artist) return artist;

    const res = await this.spotifyApi.get(`/artists/${spotifyArtistId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const fullArtist = res.data;

    artist = this.artistRepo.create();
    artist.name = fullArtist.name;
    artist.spotifyId = fullArtist.id;
    artist.spotifyUri = fullArtist.uri;
    artist.genres = fullArtist.genres || [];
    artist.images = fullArtist.images;
    artist.totalFollowers = fullArtist.followers?.total;
    artist.isVerified = fullArtist.verified ?? false;

    await this.artistRepo.save(artist);
    return artist;
  }

  async getByAccountId(accountId: string): Promise<SpotifyCredentials | null> {
    return await this.repo.findOne({ where: { accountId } });
  }

  async hasLinkedSpotify(accountId: string): Promise<boolean> {
    const creds = await this.getByAccountId(accountId);
    return !!(creds && creds.accessToken);
  }

  async upsertTokens(
    accountId: string,
    data: {
      accessToken: string;
      refreshToken?: string;
      tokenType?: string;
      scope?: string; // space-delimited per Spotify
      expiresIn?: number; // seconds
    }
  ): Promise<SpotifyCredentials> {
    const existing = await this.getByAccountId(accountId);
    let expiresAt: Date | undefined = undefined;
    if (data.expiresIn) {
      expiresAt = new Date(Date.now() + data.expiresIn * 1000);
    }
    const scopes = data.scope
      ? data.scope.split(" ").filter(Boolean)
      : undefined;

    if (existing) {
      existing.accessToken = data.accessToken;
      if (Object.prototype.hasOwnProperty.call(data, "refreshToken")) {
        existing.refreshToken = data.refreshToken || null;
      }
      if (data.tokenType) existing.tokenType = data.tokenType;
      if (scopes) existing.scopes = scopes;
      if (expiresAt) existing.expiresAt = expiresAt;
      return await this.repo.save(existing);
    }

    const created = this.repo.create({
      accountId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenType: data.tokenType,
      scopes,
      expiresAt,
    });
    return await this.repo.save(created);
  }

  async disconnect(accountId: string): Promise<SpotifyCredentials> {
    const existing = await this.getByAccountId(accountId);
    const credentials =
      existing ||
      this.repo.create({
        accountId,
      });

    credentials.accessToken = null;
    credentials.refreshToken = null;
    credentials.tokenType = null;
    credentials.scopes = [];
    credentials.expiresAt = null;

    return await this.repo.save(credentials);
  }

  async linkAccountWithTokens(
    accountId: string,
    data: {
      accessToken: string;
      refreshToken?: string;
      tokenType?: string;
      scope?: string;
      expiresIn?: number;
    }
  ): Promise<SpotifyCredentials> {
    if (!data.accessToken?.trim()) {
      return await this.disconnect(accountId);
    }

    const me = await this.getCurrentUser(data.accessToken);
    this.assertBetaAccessAllowed({ email: me.email });

    await this.upsertTokens(accountId, data);
    return await this.updateProfile(accountId, {
      spotifyUserId: me.id,
      displayName: me.display_name,
      email: me.email,
      profileUrl: me.external_urls?.spotify,
      profileImageUrl: this.getPrimaryProfileImageUrl(me.images),
      images: me.images,
    });
  }

  async updateProfile(
    accountId: string,
    profile: {
      spotifyUserId?: string;
      displayName?: string;
      email?: string;
      profileUrl?: string;
      profileImageUrl?: string;
      images?: Array<{ url: string; height?: number; width?: number }>;
    }
  ): Promise<SpotifyCredentials> {
    const normalizedProfile = { ...profile };
    const profileImageUrl =
      profile.profileImageUrl || this.getPrimaryProfileImageUrl(profile.images);
    if (profileImageUrl) {
      normalizedProfile.profileImageUrl = profileImageUrl;
    }
    const existing = await this.getByAccountId(accountId);
    if (!existing) {
      const created = this.repo.create({ accountId, ...normalizedProfile });
      return await this.repo.save(created);
    }
    Object.assign(existing, normalizedProfile);
    return await this.repo.save(existing);
  }

  // OAuth 2.0 Authorization Code Flow
  generateAuthUrl(state?: string): string {
    const scopes = [
      "user-read-email",
      "user-read-private",
      "user-read-playback-state",
      "user-read-currently-playing",
      "user-read-recently-played",
      "user-top-read",
      "playlist-read-private",
      "playlist-read-collaborative",
      "user-library-read",
    ].join(" ");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      scope: scopes,
      redirect_uri: this.redirectUri,
      ...(state && { state }),
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
    scope: string;
    expires_in: number;
  }> {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.redirectUri,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${this.clientId}:${this.clientSecret}`
          ).toString("base64")}`,
        },
      }
    );

    return response.data;
  }

  async refreshAllTokens(): Promise<void> {
    const users = await this.repo.find();
    for (const user of users) {
      const credentials = await this.getByAccountId(user.accountId);
      if (credentials && user.refreshToken) {
        const refreshToken = await this.refreshAccessToken(user.refreshToken);
        await this.upsertTokens(user.accountId, {
          accessToken: refreshToken.access_token,
          refreshToken: refreshToken.refresh_token || user.refreshToken,
        });
        await this.refreshStoredProfile(user.accountId, refreshToken.access_token);
      }
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    token_type: string;
    scope: string;
    expires_in: number;
    refresh_token?: string;
  }> {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${this.clientId}:${this.clientSecret}`
          ).toString("base64")}`,
        },
      }
    );

    return response.data;
  }

  // Spotify API Methods
  async getCurrentUser(accessToken: string): Promise<any> {
    const response = await this.spotifyApi.get("/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async getUserTopTracks(
    accessToken: string,
    timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
    limit: number = 50
  ): Promise<any> {
    const response = await this.spotifyApi.get("/me/top/tracks", {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { time_range: timeRange, limit },
    });
    return response.data;
  }

  async getUserTopArtists(
    accessToken: string,
    timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
    limit: number = 50
  ): Promise<any> {
    const response = await this.spotifyApi.get("/me/top/artists", {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { time_range: timeRange, limit },
    });
    return response.data;
  }

  // Returns Spotify's currently playing info raw
  async getCurrentlyPlaying(accessToken: string): Promise<any | null> {
    try {
      const response = await this.spotifyApi.get(
        "/me/player/currently-playing",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      // 200 with data or 204 no content
      if (!response.data) return null;
      return response.data;
    } catch (e: any) {
      // If 204 or 202, axios may not throw; but in error cases (e.g., 204 not here)
      if (e?.response?.status === 204) return null;
      if (e?.response?.status === 401) return null;
      throw e;
    }
  }

  // Convenience method: resolves token by account and returns simplified payload
  async getAccountCurrentlyPlaying(accountId: string): Promise<{
    isPlaying: boolean;
    progressMs?: number;
    device?: any;
    track?: {
      spotifyId: string;
      name: string;
      artists: string[];
      album: string;
      durationMs: number;
      explicit?: boolean;
      uri?: string;
      href?: string;
      images?: any[];
    };
    raw?: any;
  }> {
    const accessToken = await this.getOrRefreshAccessToken(accountId);
    if (!accessToken) {
      return { isPlaying: false };
    }
    const data = await this.getCurrentlyPlaying(accessToken);
    if (!data) return { isPlaying: false };
    const item = data.item || data.track; // item is track or episode
    if (!item) return { isPlaying: false, raw: data };
    const images = item.album?.images || item.images;
    return {
      isPlaying: !!data.is_playing,
      progressMs: data.progress_ms,
      device: data.device,
      track: {
        spotifyId: item.id,
        name: item.name,
        artists: (item.artists || []).map((a: any) => a.name),
        album: item.album?.name,
        durationMs: item.duration_ms,
        explicit: item.explicit,
        uri: item.uri,
        href: item.href,
        images,
      },
      raw: data,
    };
  }

  async getRecentlyPlayed(
    accessToken: string,
    limit: number = 50,
    before?: number
  ): Promise<any> {
    const params: any = { limit };
    if (before) {
      params.before = before;
    }
    const response = await this.spotifyApi.get("/me/player/recently-played", {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
    });
    return response.data;
  }

  async getUserPlaylists(
    accessToken: string,
    limit: number = 50
  ): Promise<any> {
    const response = await this.spotifyApi.get("/me/playlists", {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit },
    });
    return response.data;
  }

  async updateStreamTracking(
    accountId: string,
    enabled: boolean
  ): Promise<SpotifyCredentials> {
    const existing = await this.getByAccountId(accountId);
    if (!existing) {
      const created = this.repo.create({
        accountId,
        streamTrackingEnabled: enabled,
      });
      return await this.repo.save(created);
    }
    existing.streamTrackingEnabled = enabled;
    return await this.repo.save(existing);
  }

  // ========== Scheduled Tasks ==========

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleStreamSync() {
    try {
      const result = await this.syncLatestStreamsForAllUsers();
      Logger.log(
        `Stream sync: saved=${result.saved}, skipped=${result.skipped}`,
        "SpotifyCron"
      );
    } catch (err) {
      Logger.warn(`Stream sync failed: ${err}`, "SpotifyCron");
    }
  }

  @Cron("*/45 * * * *")
  async handleTokenRefresh() {
    try {
      await this.refreshAllTokens();
      Logger.log("Token refresh completed", "SpotifyCron");
    } catch (err) {
      Logger.warn(`Token refresh failed: ${err}`, "SpotifyCron");
    }
  }
}
