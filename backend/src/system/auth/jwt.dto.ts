export type JwtType = "access" | "refresh";

export interface JwtPayload {
  accountId: string;
  type: JwtType;
  crossToken?: string;
  accountName?: string;
}
