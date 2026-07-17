import {
  Controller,
  Param,
  Patch,
  Get,
  Query,
  Post,
  Body,
  HttpException,
} from "@nestjs/common";
import { CrudController } from "@nestjsx/crud";

import { Account, AccountRole } from "./account.entity";
import { AccountsService } from "./accounts.service";
import { CrudEntity } from "../common/CrudEntity.decorator";
import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ReqUser } from "../auth/auth.decorator";
import { AuthService } from "../auth/auth.service";

@CrudEntity({
  model: {
    type: Account,
  },
})
@ApiBearerAuth("access-token")
@Controller("accounts")
export class AccountsController implements CrudController<Account> {
  constructor(
    public service: AccountsService,
    private readonly authService: AuthService
  ) {}

  @Get("/")
  @ApiOperation({ summary: "Get current account details" })
  async getAccount(
    @ReqUser() user: any
  ): Promise<{ name: string; email: string; role: AccountRole }> {
    const account = await this.service.getAccountInfo(user.id);
    if (!account) {
      throw new HttpException("Account not found", 404);
    }
    return { name: account.name, email: account.email, role: account.role };
  }

  @Post("/change-password")
  @ApiOperation({ summary: "Change user password" })
  async changePassword(
    @ReqUser() user: any,
    @Body() body: { oldPassword: string; newPassword: string }
  ): Promise<{ success: boolean; message: string }> {
    if (!body.oldPassword || !body.newPassword) {
      throw new HttpException("Old and new passwords are required", 400);
    }
    if (body.newPassword.length < 6) {
      throw new HttpException(
        "New password must be at least 6 characters",
        400
      );
    }
    const account = await this.authService.authenticateAccount(
      user.email,
      body.oldPassword
    );
    if (!account) {
      throw new HttpException("Current password is incorrect", 403);
    }
    const hashedPassword = await this.authService.hashCredential(
      body.newPassword
    );
    await this.service.updateAccount(user.id, { password: hashedPassword });
    return { success: true, message: "Password changed successfully" };
  }

  @Post("/update-account")
  @ApiOperation({ summary: "Update account details" })
  async updateAccount(
    @ReqUser() user: any,
    @Body() body: { name?: string; email?: string }
  ): Promise<{ success: boolean; message: string }> {
    if (!body.name && !body.email) {
      throw new HttpException(
        "At least one field (name or email) is required",
        400
      );
    }
    const updates: any = {};
    if (body.name) updates.name = body.name;
    if (body.email) {
      // Check if email is already taken by another account
      const existing = await this.service.findAccountByEmail(body.email);
      if (existing && existing.id !== user.id) {
        throw new HttpException("Email is already in use", 400);
      }
      updates.email = body.email;
    }
    await this.service.updateAccount(user.id, updates);
    return { success: true, message: "Account updated successfully" };
  }
}
