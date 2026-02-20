import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { IsEmail, IsNotEmpty, IsOptional, MinLength } from "class-validator";
import { RefreshTokenService } from "./refreshToken.service";
import { NoAuth, ReqUser } from "./auth.decorator";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { SpotifyService } from "../spotify/spotify.service";
import { SpotifyCredentials } from "../spotify/spotifyCredentials.entity";

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
    private spotifyService: SpotifyService
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
    status: 302,
    description: "Redirect to Spotify authorization",
  })
  @NoAuth()
  async linkSpotify(): Promise<{ url: string }> {
    // Optionally generate state to validate callback
    const state = Math.random().toString(36).substring(2, 15);
    const url = this.spotifyService.generateAuthUrl(state);
    return { url };
  }

  @Get("/spotify/callback")
  @NoAuth()
  @ApiOperation({
    summary: "Spotify OAuth callback to exchange code for tokens",
  })
  async spotifyCallback(
    @Query("code") code?: string,
    @Query("state") state?: string
  ): Promise<{ message: string }> {
    // This path should be configured as SPOTIFY_REDIRECT_URI
    // The account context must be bound via frontend flow (e.g., linking after login)
    if (!code) {
      throw new HttpException("Missing authorization code", 400);
    }
    // get access token and refresh token
    const tokenData = await this.spotifyService.exchangeCodeForTokens(code);
    if (!tokenData) {
      throw new HttpException("Failed to exchange code for tokens", 400);
    }
    console.log("Token Data:", tokenData);
    // In a real implementation we'd get the accountId from session/cookie/frontend hand-off
    // For now, reject to avoid linking to unknown account
    throw new HttpException("Account context required for linking", 400);
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
