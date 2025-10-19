import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { HttpException, Injectable } from "@nestjs/common";
import { Account } from "../accounts/account.entity";
import { RefreshToken } from "./refreshToken.entity";
import { AuthConfiguration } from "./auth.configuration";
import { AuthService } from "./auth.service";
import * as bcrypt from "bcryptjs";
import { JwtService } from "@nestjs/jwt";
import * as uuid from "uuid";
import { Repository } from "typeorm";
import { JwtPayload } from "./jwt.dto";

@Injectable()
export class RefreshTokenService extends TypeOrmCrudService<RefreshToken> {
  constructor(
    @InjectRepository(RefreshToken) repo,
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    private authConfiguration: AuthConfiguration,
    private jwtService: JwtService
  ) {
    super(repo);
  }

  public decodeAccessToken(accessToken: string): JwtPayload {
    try {
      const a = this.jwtService.verify<JwtPayload>(accessToken, {
        secret: this.authConfiguration.jwtKey(),
      });
      return a;
    } catch (err) {
      throw new HttpException("Invalid access token", 403);
    }
  }
  public async validateAccessToken(accessToken: string): Promise<Account> {
    const decoded: JwtPayload = this.decodeAccessToken(accessToken);

    //console.log("validating aaccess token, payload: " , decoded);
    const account = await this.accountRepo.findOne({
      where: { id: decoded.accountId },
    });

    return account;
  }

  public async generateAccessToken(refreshToken: string): Promise<string> {
    let decoded;
    try {
      decoded = this.jwtService.verify(refreshToken, {
        secret: this.authConfiguration.jwtKey(),
      });
    } catch (err) {
      throw new HttpException("Invalid refresh token", 403);
    }
    const refreshTokenEntity = await this.repo.findOne({
      where: { crossToken: decoded.crossToken },
    });
    if (!refreshTokenEntity) {
      throw new HttpException("Invalid refresh token", 403);
    }
    const payload: JwtPayload = {
      type: "access",
      accountId: refreshTokenEntity.account.id,
      accountName: refreshTokenEntity.account.name,
    };

    //console.log("payload access" , payload);
    return this.jwtService.sign(payload, {
      secret: this.authConfiguration.jwtKey(),
      expiresIn: this.authConfiguration.accessTokenExpire(),
    });
  }

  public async generateRefreshToken(
    account: Account,
    rememberMe: boolean
  ): Promise<string> {
    const crossToken = uuid.v4();
    const payload: JwtPayload = {
      type: "refresh",
      crossToken,
      accountId: account.id,
      accountName: account.name,
    };

    const token = this.jwtService.sign(payload, {
      secret: this.authConfiguration.jwtKey(),
      expiresIn: this.authConfiguration.refreshTokenExpire(rememberMe),
    });
    const decode = this.jwtService.verify(token, {
      secret: this.authConfiguration.jwtKey(),
    });
    const refreshToken = new RefreshToken();
    refreshToken.token = await this.hashToken(token);
    refreshToken.account = account;
    refreshToken.crossToken = crossToken;
    refreshToken.rememberMe = rememberMe;
    refreshToken.expiresAt = new Date(decode.exp * 1000);

    await this.repo.save(refreshToken);
    return token;
  }

  public async refreshRefreshToken(refreshToken: string) {
    let decoded;
    try {
      decoded = this.jwtService.verify(refreshToken, {
        secret: this.authConfiguration.jwtKey(),
      });
    } catch (err) {
      throw new HttpException("Invalid refresh token", 403);
    }
    const refreshTokenEntity = await this.repo.findOne({
      where: { crossToken: decoded.crossToken },
    });

    if (refreshTokenEntity.rememberMe) {
      const payload: JwtPayload = {
        type: "refresh",
        accountId: refreshTokenEntity.account.id,
        accountName: refreshTokenEntity.account.name,
      };
      const newRefresh = this.jwtService.sign(payload, {
        secret: this.authConfiguration.jwtKey(),
        expiresIn: this.authConfiguration.refreshTokenExpire(
          refreshTokenEntity.rememberMe
        ),
      });
      let newHash = await this.hashToken(newRefresh);
      await this.repo.update(refreshTokenEntity.id, {
        token: newHash,
        expiresAt: new Date(
          (this.jwtService.decode(newRefresh) as any).exp * 1000
        ),
      });
      return newRefresh;
    } else {
      return refreshToken;
    }
  }

  public async hashToken(token: string): Promise<string> {
    return await bcrypt.hash(token, this.authConfiguration.hashRounds());
  }
}
