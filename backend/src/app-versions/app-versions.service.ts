import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppVersion, AppVersionChangelog } from './app-version.entity';

export interface AppVersionStatusInput {
  platform?: string;
  installedVersion?: string;
}

export interface UpsertAppReleaseInput {
  platform?: string;
  version: string;
  versionCode?: number | null;
  releaseTag?: string | null;
  releaseName?: string | null;
  apkUrl?: string | null;
  minimumSupportedVersion?: string | null;
  required?: boolean;
  changelog?: AppVersionChangelog;
  publishedAt?: string | Date | null;
}

function normalizePlatform(value?: string) {
  return String(value || 'android').trim().toLowerCase() || 'android';
}

export function normalizeAppVersion(value?: string | null) {
  return String(value || '')
    .trim()
    .replace(/^android-v/i, '')
    .replace(/^v/i, '')
    .split(/[+-]/)[0];
}

function parseComparableVersion(value?: string | null) {
  const normalized = normalizeAppVersion(value);
  if (!/^\d+(?:\.\d+){0,3}$/.test(normalized)) return null;
  return normalized.split('.').map((part) => Number(part));
}

export function compareAppVersions(left?: string | null, right?: string | null) {
  const leftParts = parseComparableVersion(left);
  const rightParts = parseComparableVersion(right);
  if (!leftParts || !rightParts) return null;

  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;
    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }
  return 0;
}

function normalizeChangelog(value?: AppVersionChangelog): AppVersionChangelog {
  return {
    summary: value?.summary || '',
    features: Array.isArray(value?.features) ? value.features : [],
    fixes: Array.isArray(value?.fixes) ? value.fixes : [],
    technical: Array.isArray(value?.technical) ? value.technical : [],
    commits: Array.isArray(value?.commits) ? value.commits : [],
    previousAndroidTag: value?.previousAndroidTag ?? null,
    range: value?.range || '',
    compareUrl: value?.compareUrl || '',
  };
}

@Injectable()
export class AppVersionsService {
  constructor(
    @InjectRepository(AppVersion)
    private readonly repo: Repository<AppVersion>,
  ) {}

  async getStatus(input: AppVersionStatusInput = {}) {
    const platform = normalizePlatform(input.platform);
    const installedVersion = normalizeAppVersion(input.installedVersion);
    const releases = await this.repo.find({
      where: { platform },
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
      take: 100,
    });

    const latest = this.selectLatest(releases);
    const installed =
      installedVersion && releases.find((release) => release.version === installedVersion)
        ? releases.find((release) => release.version === installedVersion)
        : null;

    const latestComparison = latest
      ? compareAppVersions(latest.version, installedVersion)
      : null;
    const minimumComparison = latest
      ? compareAppVersions(installedVersion, latest.minimumSupportedVersion)
      : null;

    const updateAvailable = latestComparison === 1;
    const belowMinimum = minimumComparison != null && minimumComparison < 0;
    const installedBlocked = installed?.required === true;
    const latestForcesOldVersions = latest?.required === true && updateAvailable;
    const updateRequired = Boolean(updateAvailable && (belowMinimum || installedBlocked || latestForcesOldVersions));
    const reason = updateRequired
      ? belowMinimum
        ? 'below-minimum-supported-version'
        : installedBlocked
          ? 'installed-version-blocked'
          : 'latest-release-required'
      : updateAvailable
        ? 'newer-version-available'
        : 'current-or-newer';

    return {
      platform,
      installedVersion,
      updateAvailable,
      updateRequired,
      reason,
      latest: latest ? this.serialize(latest) : null,
      installed: installed ? this.serialize(installed) : null,
      changelog: normalizeChangelog((updateAvailable ? latest : installed)?.changelog),
    };
  }

  async upsertRelease(input: UpsertAppReleaseInput) {
    if (!input?.version) {
      throw new BadRequestException('version is required');
    }

    const platform = normalizePlatform(input.platform);
    const version = normalizeAppVersion(input.version);
    if (!parseComparableVersion(version)) {
      throw new BadRequestException('version must be a numeric semantic version');
    }

    const existing = await this.repo.findOne({ where: { platform, version } });
    const releaseValues = {
      platform,
      version,
      versionCode: input.versionCode ?? existing?.versionCode ?? null,
      releaseTag: input.releaseTag ?? existing?.releaseTag ?? null,
      releaseName: input.releaseName ?? existing?.releaseName ?? null,
      apkUrl: input.apkUrl ?? existing?.apkUrl ?? null,
      minimumSupportedVersion: normalizeAppVersion(input.minimumSupportedVersion) || existing?.minimumSupportedVersion || '0.0.0',
      required: input.required === true,
      changelog: normalizeChangelog(input.changelog),
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : existing?.publishedAt || new Date(),
    };
    const release = existing ? Object.assign(existing, releaseValues) : this.repo.create(releaseValues);

    return this.repo.save(release);
  }

  private selectLatest(releases: AppVersion[]) {
    return [...releases].sort((left, right) => {
      const comparison = compareAppVersions(right.version, left.version);
      if (comparison != null && comparison !== 0) return comparison;
      return Number(right.publishedAt || right.createdAt || 0) - Number(left.publishedAt || left.createdAt || 0);
    })[0] || null;
  }

  private serialize(release: AppVersion) {
    return {
      id: release.id,
      platform: release.platform,
      version: release.version,
      versionCode: release.versionCode ?? null,
      releaseTag: release.releaseTag ?? null,
      releaseName: release.releaseName ?? null,
      apkUrl: release.apkUrl ?? null,
      minimumSupportedVersion: release.minimumSupportedVersion,
      required: release.required === true,
      changelog: normalizeChangelog(release.changelog),
      publishedAt: release.publishedAt ?? null,
    };
  }
}
