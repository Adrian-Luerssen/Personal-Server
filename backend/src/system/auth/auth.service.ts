import { Injectable } from "@nestjs/common";

import * as bcrypt from "bcryptjs";
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import { Account } from "../accounts/account.entity";
import { AccountsService } from "../accounts/accounts.service";
import { RefreshTokenService } from "./refreshToken.service";
import { AuthConfiguration } from "./auth.configuration";

export const MAINTENENCE = false;

@Injectable()
export class AuthService {
  constructor(
    private accountService: AccountsService,
    private refreshTokenService: RefreshTokenService,
    private authConfiguration: AuthConfiguration
  ) {}

  public async resetPassword(
    authenticateRequest
  ): Promise<Account | undefined> {
    const { email, password, newPassword } = authenticateRequest;
    const account = await this.authenticateAccount(email, password);

    if (account) {
      return await this.accountService.changePassword(account, newPassword);
    } else {
      return undefined;
    }
  }
  public async authenticateAccount(
    email: string,
    credentials: string
  ): Promise<Account | undefined> {
    const account = await this.accountService.findAccountByEmail(email);
    if (account) {
      const result = await AuthService.verifyCredential(account, credentials);
      if (result) {
        return account;
      }
    }
    return undefined;
  }

  public async authenticateAccountForRefreshToken(
    email: string,
    credentials: string,
    rememberMe: boolean
  ): Promise<string | undefined> {
    const account = await this.authenticateAccount(email, credentials);

    if (account) {
      return await this.refreshTokenService.generateRefreshToken(
        account,
        rememberMe
      );
    }
    return undefined;
  }

  public async hashCredential(credential: string): Promise<string> {
    return await bcrypt.hash(credential, this.authConfiguration.hashRounds());
  }

  public async createAccount(
    email: string,
    password: string,
    additionalData?: { firstName?: string; lastName?: string }
  ): Promise<Account> {
    // Check if account already exists
    const existingAccount = await this.accountService.findAccountByEmail(email);
    if (existingAccount) {
      throw new Error("Account with this email already exists");
    }

    // Hash password
    const hashedPassword = await this.hashCredential(password);

    // Create account
    const accountData = {
      email,
      password: hashedPassword,
      ...additionalData,
    };

    return await this.accountService.createAccount(accountData);
  }

  static async verifyCredential(
    account: Account,
    inputCredential: string
  ): Promise<boolean> {
    return await bcrypt.compare(inputCredential, account.password);
  }

  // MFA Methods
  public async authenticateWithMFA(
    email: string,
    credentials: string,
    rememberMe: boolean,
    mfaCode?: string
  ): Promise<{
    refreshToken?: string;
    mfaRequired?: boolean;
    tempToken?: string;
  }> {
    const account = await this.authenticateAccount(email, credentials);
    if (!account) {
      return {};
    }

    // If MFA is enabled, require code
    if (account.mfaEnabled && account.mfaSecret) {
      if (!mfaCode) {
        // Generate a temporary token that encodes the account ID
        const tempToken = Buffer.from(`${account.id}:${Date.now()}`).toString(
          "base64"
        );
        return { mfaRequired: true, tempToken };
      }

      // Verify MFA code
      const verified = speakeasy.totp.verify({
        secret: account.mfaSecret,
        encoding: "base32",
        token: mfaCode,
        window: 2,
      });

      if (!verified) {
        throw new Error("Invalid MFA code");
      }
    }

    // Generate tokens
    const refreshToken = await this.refreshTokenService.generateRefreshToken(
      account,
      rememberMe
    );
    return { refreshToken };
  }

  public async setupMFA(
    accountId: string
  ): Promise<{ secret: string; qrCode: string }> {
    const account = await this.accountService.findOne({
      where: { id: accountId },
    });
    if (!account) throw new Error("Account not found");

    const secret = speakeasy.generateSecret({
      name: `PersonalServer (${account.email})`,
      issuer: "PersonalServer",
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode,
    };
  }

  public async enableMFA(
    accountId: string,
    secret: string,
    code: string
  ): Promise<{ success: boolean; message: string }> {
    const account = await this.accountService.findOne({
      where: { id: accountId },
    });
    if (!account) throw new Error("Account not found");

    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!verified) {
      return { success: false, message: "Invalid code" };
    }

    await this.accountService.updateAccount(accountId, {
      mfaSecret: secret,
      mfaEnabled: true,
    });

    return { success: true, message: "MFA enabled successfully" };
  }

  public async disableMFA(
    accountId: string,
    code: string
  ): Promise<{ success: boolean; message: string }> {
    const account = await this.accountService.findOne({
      where: { id: accountId },
    });
    if (!account) throw new Error("Account not found");
    if (!account.mfaEnabled || !account.mfaSecret) {
      return { success: false, message: "MFA is not enabled" };
    }

    const verified = speakeasy.totp.verify({
      secret: account.mfaSecret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!verified) {
      return { success: false, message: "Invalid code" };
    }

    await this.accountService.updateAccount(accountId, {
      mfaSecret: null,
      mfaEnabled: false,
    });

    return { success: true, message: "MFA disabled successfully" };
  }

  public async getMFAStatus(accountId: string): Promise<{ enabled: boolean }> {
    const account = await this.accountService.findOne({
      where: { id: accountId },
    });
    return { enabled: account?.mfaEnabled ?? false };
  }
}
