import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { IsEmail, IsNotEmpty, IsOptional, MinLength } from "class-validator";
import { RefreshTokenService } from "./refreshToken.service";
import { NoAuth, ReqUser } from "./auth.decorator";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { SpotifyService } from "../spotify/spotify.service";
import { SpotifyCredentials } from "../spotify/spotifyCredentials.entity";
import { ConfigService } from "@nestjs/config";

export class AuthenticateRequest {
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @IsNotEmpty()
  password: string;
  rememberMe: boolean;
  @IsOptional()
  mfaCode?: string;
}

export class RegisterRequest {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  name: string;
}

interface AuthenticateResponse {
  refreshToken?: string;
  accessToken?: string;
  mfaRequired?: boolean;
  tempToken?: string;
}

interface RefreshRequest {
  refreshToken: string;
}
interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private refreshTokenService: RefreshTokenService,
    private spotifyService: SpotifyService,
    private configService: ConfigService
  ) {}

  @Post("/register")
  @NoAuth()
  @ApiOperation({ summary: "Register a new user account" })
  @ApiResponse({ status: 201, description: "Account created successfully" })
  @ApiResponse({
    status: 400,
    description: "Invalid input or email already exists",
  })
  async register(
    @Body() request: RegisterRequest
  ): Promise<{ message: string; accountId: string }> {
    try {
      const account = await this.authService.createAccount(
        request.email,
        request.password,
        { name: request.name }
      );
      return {
        message: "Account created successfully",
        accountId: account.id,
      };
    } catch (error) {
      if (
        error.message.includes("duplicate") ||
        error.message.includes("already exists")
      ) {
        throw new HttpException("Email already registered", 400);
      }
      throw new HttpException("Failed to create account", 400);
    }
  }

  @Post("/access")
  @NoAuth()
  @ApiOperation({ summary: "Authenticate user and get tokens" })
  @ApiResponse({ status: 200, description: "Authentication successful" })
  @ApiResponse({ status: 403, description: "Invalid credentials" })
  async authenticate(
    @Body() request: AuthenticateRequest
  ): Promise<AuthenticateResponse> {
    const result = await this.authService.authenticateWithMFA(
      request.email,
      request.password,
      request.rememberMe,
      request.mfaCode
    );

    if (result.mfaRequired) {
      return {
        mfaRequired: true,
        tempToken: result.tempToken,
      };
    }

    if (result.refreshToken) {
      const accessToken = await this.refreshTokenService.generateAccessToken(
        result.refreshToken
      );
      return {
        refreshToken: result.refreshToken,
        accessToken,
      };
    }
    throw new HttpException("Unauthorized Credentials", 403);
  }

  // Spotify Link Flow
  @Get("/spotify/link")
  @ApiOperation({ summary: "Initiate Spotify OAuth linking" })
  @ApiResponse({
    status: 200,
    description: "Returns Spotify authorization URL",
  })
  async linkSpotify(@ReqUser() user: any): Promise<{ url: string }> {
    // Encode accountId in state so the callback can associate tokens with the user
    const state = Buffer.from(JSON.stringify({ accountId: user.id })).toString("base64url");
    const url = this.spotifyService.generateAuthUrl(state);
    return { url };
  }

  @Get("/spotify/callback")
  @NoAuth()
  @ApiOperation({
    summary: "Spotify OAuth redirect callback - exchanges code and redirects to frontend",
  })
  async spotifyCallbackRedirect(
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error: string,
    @Res() res: Response
  ): Promise<void> {
    const frontendUrl = this.configService.get("DOMAIN_APP") || "http://localhost:4040";

    if (error) {
      res.redirect(`${frontendUrl}/settings?spotify_error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${frontendUrl}/settings?spotify_error=missing_code_or_state`);
      return;
    }

    try {
      // Decode accountId from state
      const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
      const accountId = stateData.accountId;

      if (!accountId) {
        res.redirect(`${frontendUrl}/settings?spotify_error=invalid_state`);
        return;
      }

      const tokenData = await this.spotifyService.exchangeCodeForTokens(code);
      await this.spotifyService.upsertTokens(accountId, {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type,
        scope: tokenData.scope,
        expiresIn: tokenData.expires_in,
      });

      // Fetch profile and store basic info
      const me = await this.spotifyService.getCurrentUser(tokenData.access_token);
      await this.spotifyService.updateProfile(accountId, {
        spotifyUserId: me.id,
        displayName: me.display_name,
        email: me.email,
        profileUrl: me.external_urls?.spotify,
        images: me.images,
      });

      res.redirect(`${frontendUrl}/spotify/personal?linked=true`);
    } catch (e) {
      console.error("Spotify callback error:", e);
      res.redirect(`${frontendUrl}/settings?spotify_error=token_exchange_failed`);
    }
  }

  @Post("/spotify/callback")
  @ApiOperation({
    summary:
      "Spotify OAuth callback - exchange code for tokens using authenticated user",
  })
  async spotifyCallback(
    @ReqUser() user: any,
    @Body("code") code?: string
  ): Promise<{ message: string }> {
    if (!code) {
      throw new HttpException("Missing authorization code", 400);
    }
    const tokenData = await this.spotifyService.exchangeCodeForTokens(code);
    if (!tokenData) {
      throw new HttpException("Failed to exchange code for tokens", 400);
    }
    await this.spotifyService.upsertTokens(user.id, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
      expiresIn: tokenData.expires_in,
    });

    // Fetch profile and store basic info
    const me = await this.spotifyService.getCurrentUser(
      tokenData.access_token
    );
    await this.spotifyService.updateProfile(user.id, {
      spotifyUserId: me.id,
      displayName: me.display_name,
      email: me.email,
      profileUrl: me.external_urls?.spotify,
      images: me.images,
    });

    return { message: "Spotify account linked successfully" };
  }

  @Post("/spotify/callback/:accountId")
  @NoAuth()
  @ApiOperation({
    summary: "Complete linking for a specific account (backend-to-backend)",
  })
  async spotifyCallbackWithAccount(
    @Param("accountId") accountId: string,
    @Body("code") code: string
  ): Promise<{ message: string }> {
    if (!code) throw new HttpException("Missing authorization code", 400);
    const tokenData = await this.spotifyService.exchangeCodeForTokens(code);
    await this.spotifyService.upsertTokens(accountId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
      expiresIn: tokenData.expires_in,
    });

    // Fetch profile and store basic info
    const me = await this.spotifyService.getCurrentUser(tokenData.access_token);
    await this.spotifyService.updateProfile(accountId, {
      spotifyUserId: me.id,
      displayName: me.display_name,
      email: me.email,
      profileUrl: me.external_urls?.spotify,
      images: me.images,
    });

    return { message: "Spotify account linked successfully" };
  }

  @Post("/refresh")
  @NoAuth()
  async refresh(@Body() request: RefreshRequest): Promise<RefreshResponse> {
    const access = await this.refreshTokenService.generateAccessToken(
      request.refreshToken
    );
    const refreshToken = await this.refreshTokenService.refreshRefreshToken(
      request.refreshToken
    );
    //console.log("refresh token" , refreshToken);
    //console.log("access token" , access);
    return {
      accessToken: access,
      refreshToken: refreshToken,
    };
  }

  @Post("/mfa/setup")
  @ApiOperation({ summary: "Generate MFA secret and QR code for setup" })
  async setupMFA(
    @ReqUser() user: any
  ): Promise<{ secret: string; qrCode: string }> {
    return await this.authService.setupMFA(user.id);
  }

  @Post("/mfa/enable")
  @ApiOperation({ summary: "Enable MFA after verifying setup code" })
  async enableMFA(
    @ReqUser() user: any,
    @Body() body: { secret: string; code: string }
  ): Promise<{ success: boolean; message: string }> {
    return await this.authService.enableMFA(user.id, body.secret, body.code);
  }

  @Post("/mfa/disable")
  @ApiOperation({ summary: "Disable MFA for account" })
  async disableMFA(
    @ReqUser() user: any,
    @Body() body: { code: string }
  ): Promise<{ success: boolean; message: string }> {
    return await this.authService.disableMFA(user.id, body.code);
  }

  @Get("/mfa/status")
  @ApiOperation({ summary: "Check if MFA is enabled" })
  async mfaStatus(@ReqUser() user: any): Promise<{ enabled: boolean }> {
    return await this.authService.getMFAStatus(user.id);
  }
}
