import { Entity, Column, OneToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Account } from "./account.entity";

export enum ThemeMode { DARK = "dark", LIGHT = "light", AUTO = "auto" }
export enum SidebarPosition { LEFT = "left", RIGHT = "right" }
export enum Density { COMPACT = "compact", COMFORTABLE = "comfortable", SPACIOUS = "spacious" }

@Entity("account_preferences")
export class AccountPreferences {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: false })
  accountId: string;

  @OneToOne(() => Account, { onDelete: "CASCADE" })
  @JoinColumn({ name: "accountId" })
  account: Account;

  @Column({ type: "varchar", length: 7, default: "#7dd3fc" })
  accentColor: string;

  @Column({ type: "enum", enum: ThemeMode, default: ThemeMode.DARK })
  themeMode: ThemeMode;

  @Column({ type: "jsonb", nullable: true })
  background: { type: "solid" | "gradient" | "image"; value: string } | null;

  @Column({ type: "enum", enum: SidebarPosition, default: SidebarPosition.LEFT })
  sidebarPosition: SidebarPosition;

  @Column({ type: "enum", enum: Density, default: Density.COMFORTABLE })
  density: Density;

  @Column({ type: "text", nullable: true })
  customCss: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
