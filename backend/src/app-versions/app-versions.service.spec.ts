import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { AppVersion } from './app-version.entity';
import { AppVersionsService } from './app-versions.service';

describe('AppVersionsService', () => {
  let service: AppVersionsService;
  let repo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((input) => ({ id: 'version-new', ...input })),
      save: jest.fn(async (input) => ({ id: input.id || 'version-saved', ...input })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppVersionsService,
        { provide: getRepositoryToken(AppVersion), useValue: repo },
      ],
    }).compile();

    service = module.get(AppVersionsService);
  });

  it('requires an update when installed version is below the latest minimum supported version', async () => {
    repo.find.mockResolvedValue([
      {
        platform: 'android',
        version: '0.0.1.20',
        releaseTag: 'android-v0.0.1.20',
        apkUrl: 'https://example.com/personal-server.apk',
        minimumSupportedVersion: '0.0.1.18',
        required: false,
        changelog: { features: ['Native updater'] },
        publishedAt: new Date('2026-06-29T13:00:00Z'),
      },
      {
        platform: 'android',
        version: '0.0.1.17',
        releaseTag: 'android-v0.0.1.17',
        minimumSupportedVersion: '0.0.1.0',
        required: false,
        changelog: { features: ['Old release'] },
        publishedAt: new Date('2026-06-28T13:00:00Z'),
      },
    ]);

    const status = await service.getStatus({
      platform: 'android',
      installedVersion: '0.0.1.17',
    });

    expect(status.updateAvailable).toBe(true);
    expect(status.updateRequired).toBe(true);
    expect(status.reason).toBe('below-minimum-supported-version');
    expect(status.latest.version).toBe('0.0.1.20');
    expect(status.installed.version).toBe('0.0.1.17');
    expect(status.changelog.features).toEqual(['Native updater']);
  });

  it('upserts version records from release workflow metadata', async () => {
    repo.findOne.mockResolvedValue(null);

    const saved = await service.upsertRelease({
      platform: 'android',
      version: '0.0.1.21',
      releaseTag: 'android-v0.0.1.21',
      releaseName: 'Personal Server Android v0.0.1.21',
      apkUrl: 'https://example.com/personal-server.apk',
      versionCode: 21,
      minimumSupportedVersion: '0.0.1.18',
      required: false,
      changelog: {
        summary: 'Native app maintenance',
        features: ['Install APK updates in-app'],
      },
      publishedAt: '2026-06-29T14:00:00Z',
    });

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { platform: 'android', version: '0.0.1.21' },
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'android',
        version: '0.0.1.21',
        releaseTag: 'android-v0.0.1.21',
        minimumSupportedVersion: '0.0.1.18',
      }),
    );
    expect(saved.changelog.features).toEqual(['Install APK updates in-app']);
  });
});
