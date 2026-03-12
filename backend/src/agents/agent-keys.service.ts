import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AgentKey } from './entities/agent-key.entity';
import { Account } from '../system/accounts/account.entity';
import { CreateAgentKeyDto } from './dto/create-agent-key.dto';
import { UpdateAgentKeyDto } from './dto/update-agent-key.dto';

@Injectable()
export class AgentKeysService {
  constructor(
    @InjectRepository(AgentKey)
    private readonly repo: Repository<AgentKey>,
  ) {}

  /**
   * Generate a new API key for an account.
   * The raw key is returned ONLY ONCE — it is not stored in plain text.
   */
  async createKey(
    account: Account,
    dto: CreateAgentKeyDto,
  ): Promise<{ key: string; agentKey: AgentKey }> {
    const rawKey = `ps_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = await bcrypt.hash(rawKey, 10);
    // First 16 chars: "ps_live_" (8) + first 8 hex chars
    const keyPrefix = rawKey.slice(0, 16);

    const agentKey = this.repo.create({
      accountId: account.id,
      account,
      name: dto.name,
      keyHash,
      keyPrefix,
      scopes: dto.scopes,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      metadata: dto.metadata ?? null,
      isActive: true,
      requestCount: 0,
    });

    await this.repo.save(agentKey);

    // Strip keyHash from the returned object
    const safeKey = await this.repo.findOne({
      where: { id: agentKey.id },
      select: ['id', 'name', 'keyPrefix', 'scopes', 'isActive', 'expiresAt', 'metadata', 'createdAt', 'updatedAt', 'accountId'],
    });

    return { key: rawKey, agentKey: safeKey! };
  }

  /**
   * Validate a raw API key. Returns the AgentKey if valid, null otherwise.
   * Logs the prefix only — never the full key.
   */
  async validateKey(rawKey: string): Promise<AgentKey | null> {
    if (!rawKey || rawKey.length < 16) return null;

    const prefix = rawKey.slice(0, 16);
    const candidates = await this.repo.find({
      where: { keyPrefix: prefix, isActive: true },
    });

    for (const candidate of candidates) {
      const matches = await bcrypt.compare(rawKey, candidate.keyHash);
      if (matches) {
        // Update usage stats without awaiting (fire-and-forget)
        this.repo.update(candidate.id, {
          lastUsedAt: new Date(),
          requestCount: () => '"requestCount" + 1',
        } as any).catch(() => {/* ignore update errors */});

        return candidate;
      }
    }

    return null;
  }

  /**
   * List all keys for an account (masked — no keyHash returned).
   */
  async listKeys(accountId: string): Promise<Partial<AgentKey>[]> {
    return this.repo.find({
      where: { accountId },
      select: [
        'id',
        'name',
        'keyPrefix',
        'scopes',
        'isActive',
        'lastUsedAt',
        'expiresAt',
        'metadata',
        'requestCount',
        'createdAt',
        'updatedAt',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Toggle a key's active state.
   */
  async toggleKey(accountId: string, keyId: string): Promise<Partial<AgentKey>> {
    const key = await this.repo.findOne({ where: { id: keyId, accountId } });
    if (!key) throw new NotFoundException('Key not found');
    await this.repo.update({ id: keyId, accountId }, { isActive: !key.isActive });
    return this.getKey(accountId, keyId);
  }

  /**
   * Permanently delete a key.
   */
  async deleteKey(accountId: string, keyId: string): Promise<void> {
    const key = await this.repo.findOne({ where: { id: keyId, accountId } });
    if (!key) throw new NotFoundException('Key not found');
    await this.repo.remove(key);
  }

  /**
   * Update key name, scopes, or other mutable fields.
   */
  async updateKey(
    accountId: string,
    keyId: string,
    dto: UpdateAgentKeyDto,
  ): Promise<Partial<AgentKey>> {
    const key = await this.repo.findOne({ where: { id: keyId, accountId } });
    if (!key) throw new NotFoundException('Key not found');

    const updates: Partial<AgentKey> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.scopes !== undefined) updates.scopes = dto.scopes;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;
    if (dto.metadata !== undefined) updates.metadata = dto.metadata;
    if (dto.expiresAt !== undefined) {
      updates.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }

    await this.repo.update({ id: keyId, accountId }, updates);

    const updated = await this.repo.findOne({
      where: { id: keyId },
      select: [
        'id',
        'name',
        'keyPrefix',
        'scopes',
        'isActive',
        'lastUsedAt',
        'expiresAt',
        'metadata',
        'requestCount',
        'createdAt',
        'updatedAt',
      ],
    });
    return updated!;
  }

  /**
   * Get a single key (masked) for an account.
   */
  async getKey(accountId: string, keyId: string): Promise<Partial<AgentKey>> {
    const key = await this.repo.findOne({
      where: { id: keyId, accountId },
      select: [
        'id',
        'name',
        'keyPrefix',
        'scopes',
        'isActive',
        'lastUsedAt',
        'expiresAt',
        'metadata',
        'requestCount',
        'createdAt',
        'updatedAt',
      ],
    });
    if (!key) throw new NotFoundException('Key not found');
    return key;
  }
}
