// Mock @nestjsx/crud-typeorm to avoid filesystem read errors on Windows/OneDrive
jest.mock('@nestjsx/crud-typeorm', () => ({
  TypeOrmCrudService: class {
    constructor(public repo: any) {}
  },
}));

jest.mock('@nestjs/config', () => ({
  ConfigService: class {},
}));

jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: {
    EVERY_5_MINUTES: '*/5 * * * *',
  },
}));

import { ForbiddenException } from '@nestjs/common';
import { SpotifyCredentials } from './spotifyCredentials.entity';
import { SpotifyService } from './spotify.service';

type FakeRepo = {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
};

function createService(env: Record<string, string> = {}) {
  const store = new Map<string, any>();
  const repo: FakeRepo = {
    findOne: jest.fn(async ({ where }: any) => store.get(where.accountId) || null),
    create: jest.fn((data: any = {}) => ({ ...data })),
    save: jest.fn(async (entity: any) => {
      store.set(entity.accountId, entity);
      return entity;
    }),
    find: jest.fn(async () => Array.from(store.values())),
  };
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        SPOTIFY_CLIENT_ID: 'client-id',
        SPOTIFY_CLIENT_SECRET: 'client-secret',
        SPOTIFY_REDIRECT_URI: 'http://localhost/callback',
        ...env,
      };
      return values[key];
    }),
  };

  const service = new SpotifyService(
    repo as any,
    config as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
  );

  return { service, repo, store };
}

describe('SpotifyService beta access', () => {
  it('reports beta access metadata from configuration', () => {
    const { service } = createService({
      SPOTIFY_BETA_MODE: 'true',
      SPOTIFY_BETA_LIMIT: '10',
      SPOTIFY_BETA_ALLOWED_EMAILS:
        'Allowed@Example.com, second@example.com; allowed@example.com',
    });

    expect(service.getBetaAccessStatus('allowed@example.com')).toEqual(
      expect.objectContaining({
        enabled: true,
        enforced: true,
        limit: 10,
        approved: true,
        configuredUsers: 2,
        remainingSlots: 8,
      })
    );
    expect(service.getBetaAccessStatus('other@example.com').approved).toBe(
      false
    );
  });

  it('links an approved beta tester after checking Spotify profile identity', async () => {
    const { service, repo } = createService({
      SPOTIFY_BETA_ALLOWED_EMAILS: 'allowed@example.com',
    });
    jest.spyOn(service, 'getCurrentUser').mockResolvedValue({
      id: 'spotify-user-1',
      display_name: 'Allowed Tester',
      email: 'allowed@example.com',
      external_urls: { spotify: 'https://open.spotify.com/user/spotify-user-1' },
      images: [{ url: 'https://example.com/avatar.jpg' }],
    });

    const result = await service.linkAccountWithTokens('account-1', {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      scope: 'user-read-email user-read-private',
      expiresIn: 3600,
    });

    expect(service.getCurrentUser).toHaveBeenCalledWith('access-token');
    expect(repo.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        spotifyUserId: 'spotify-user-1',
        displayName: 'Allowed Tester',
        email: 'allowed@example.com',
        scopes: ['user-read-email', 'user-read-private'],
      })
    );
    expect(result.email).toBe('allowed@example.com');
  });

  it('rejects unapproved beta testers before saving credentials', async () => {
    const { service, repo } = createService({
      SPOTIFY_BETA_ALLOWED_EMAILS: 'allowed@example.com',
    });
    jest.spyOn(service, 'getCurrentUser').mockResolvedValue({
      id: 'spotify-user-2',
      display_name: 'Blocked Tester',
      email: 'blocked@example.com',
    });

    await expect(
      service.linkAccountWithTokens('account-1', {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('clears stored tokens when disconnecting', async () => {
    const { service, repo, store } = createService();
    store.set('account-1', {
      accountId: 'account-1',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      scopes: ['user-read-email'],
      expiresAt: new Date(),
    } as SpotifyCredentials);

    await service.linkAccountWithTokens('account-1', {
      accessToken: '',
      refreshToken: '',
    });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        accessToken: null,
        refreshToken: null,
        tokenType: null,
        scopes: [],
        expiresAt: null,
      })
    );
  });
});
