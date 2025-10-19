import { Injectable } from "@nestjs/common";

import * as bcrypt from "bcryptjs";
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
}
