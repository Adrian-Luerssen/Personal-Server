import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaItem, MediaType, MediaStatus } from '../entities/media-item.entity';

describe('MediaService', () => {
  let service: MediaService;
  let mockQueryBuilder: any;
  let mockRepo: any;
  let mockCacheManager: any;

  const mockAccount = { id: 'acc-123' } as any;

  beforeEach(async () => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto: any) => ({ ...dto })),
      save: jest.fn((entity: any) => Promise.resolve({ id: 'new-id', ...entity })),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    mockCacheManager = {
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: getRepositoryToken(MediaItem), useValue: mockRepo },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========== CRUD ==========

  describe('findAll', () => {
    it('should query all items for the account ordered by updatedAt', async () => {
      await service.findAll(mockAccount);

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('m');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'm.accountId = :accountId',
        { accountId: 'acc-123' },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('m.updatedAt', 'DESC');
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('should filter by type when provided', async () => {
      await service.findAll(mockAccount, { type: MediaType.ANIME });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('m.type = :type', {
        type: 'anime',
      });
    });

    it('should filter by status when provided', async () => {
      await service.findAll(mockAccount, { status: MediaStatus.COMPLETED });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('m.status = :status', {
        status: 'completed',
      });
    });

    it('should filter by search term with ILIKE', async () => {
      await service.findAll(mockAccount, { search: 'naruto' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('m.title ILIKE :search', {
        search: '%naruto%',
      });
    });

    it('should apply multiple filters simultaneously', async () => {
      await service.findAll(mockAccount, {
        type: MediaType.MANGA,
        status: MediaStatus.READING,
        search: 'one piece',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });
  });

  describe('findOne', () => {
    it('should return the item when found', async () => {
      const mockItem = { id: 'item-1', title: 'Test', accountId: 'acc-123' };
      mockRepo.findOne.mockResolvedValue(mockItem);

      const result = await service.findOne(mockAccount, 'item-1');

      expect(result).toEqual(mockItem);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { accountId: 'acc-123', id: 'item-1' },
      });
    });

    it('should throw NotFoundException when item does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockAccount, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a media item with defaults and reset cache', async () => {
      const dto = { title: 'Attack on Titan', type: MediaType.ANIME };

      await service.create(mockAccount, dto);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Attack on Titan',
          type: 'anime',
          status: 'planning',
          metadata: {},
          externalIds: {},
          accountId: 'acc-123',
        }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
      expect(mockCacheManager.reset).toHaveBeenCalled();
    });

    it('should use provided status instead of default', async () => {
      const dto = {
        title: 'Steins;Gate',
        type: MediaType.ANIME,
        status: MediaStatus.COMPLETED,
        rating: 9.5,
      };

      await service.create(mockAccount, dto);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          rating: 9.5,
        }),
      );
    });
  });

  describe('update', () => {
    it('should merge metadata instead of replacing', async () => {
      const existingItem = {
        id: 'item-1',
        accountId: 'acc-123',
        metadata: { episodesWatched: 5, episodes: 24 },
        externalIds: { malId: 123 },
      };
      mockRepo.findOne.mockResolvedValue({ ...existingItem });

      await service.update(mockAccount, 'item-1', {
        metadata: { episodesWatched: 10 },
      });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { episodesWatched: 10, episodes: 24 },
        }),
      );
    });

    it('should merge externalIds instead of replacing', async () => {
      const existingItem = {
        id: 'item-1',
        accountId: 'acc-123',
        metadata: {},
        externalIds: { malId: 123 },
      };
      mockRepo.findOne.mockResolvedValue({ ...existingItem });

      await service.update(mockAccount, 'item-1', {
        externalIds: { tmdbId: 456 },
      });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          externalIds: { malId: 123, tmdbId: 456 },
        }),
      );
    });

    it('should throw NotFoundException for missing item', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(mockAccount, 'missing', { rating: 8 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove item and reset cache', async () => {
      const mockItem = { id: 'item-1', accountId: 'acc-123' };
      mockRepo.findOne.mockResolvedValue(mockItem);

      await service.remove(mockAccount, 'item-1');

      expect(mockRepo.remove).toHaveBeenCalledWith(mockItem);
      expect(mockCacheManager.reset).toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing item', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(mockAccount, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ========== STATS ==========

  describe('getStats', () => {
    it('should calculate correct stats from items', async () => {
      const items = [
        { type: 'anime', status: 'completed', rating: 9 },
        { type: 'anime', status: 'watching', rating: 7 },
        { type: 'manga', status: 'completed', rating: 8 },
        { type: 'movie', status: 'completed', rating: null },
        { type: 'book', status: 'planning', rating: null },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(items);

      const stats = await service.getStats(mockAccount);

      expect(stats.total).toBe(5);
      expect(stats.byType).toEqual({ anime: 2, manga: 1, movie: 1, book: 1 });
      expect(stats.byStatus).toEqual({ completed: 3, watching: 1, planning: 1 });
      expect(stats.completed).toBe(3);
      expect(stats.rated).toBe(3);
      expect(stats.averageRating).toBe(8); // (9+7+8)/3 = 8
    });

    it('should filter stats by type when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getStats(mockAccount, MediaType.ANIME);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('m.type = :type', {
        type: 'anime',
      });
    });

    it('should return null averageRating when no items are rated', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([
        { type: 'anime', status: 'planning', rating: null },
      ]);

      const stats = await service.getStats(mockAccount);

      expect(stats.averageRating).toBeNull();
    });

    it('should calculate ratings distribution by integer bucket', async () => {
      const items = [
        { type: 'anime', status: 'completed', rating: 7.5 },
        { type: 'anime', status: 'completed', rating: 7.2 },
        { type: 'anime', status: 'completed', rating: 9 },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(items);

      const stats = await service.getStats(mockAccount);

      expect(stats.ratingsDistribution).toEqual({ '7': 2, '9': 1 });
    });
  });

  describe('resetClassification', () => {
    it('restores TVTime-sourced items to TV with their original import cover and removes guessed MAL ids', async () => {
      const item = {
        id: 'item-1',
        type: MediaType.ANIME,
        coverUrl: 'https://cdn.myanimelist.net/images/anime/wrong.jpg',
        externalIds: { tvdbId: 311900, malId: 999 },
        metadata: {
          importSource: 'tvtime',
          sourceType: 'tv',
          reclassified: true,
          tags: ['anime'],
          importCoverUrl: 'https://artworks.thetvdb.com/banners/posters/311900-4.jpg',
          malScore: 7.1,
          synopsis: 'Wrong anime match',
        },
      };
      mockQueryBuilder.getMany.mockResolvedValue([item]);

      const result = await service.resetClassification(mockAccount);

      expect(result).toEqual({ reset: 1 });
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MediaType.TV,
          coverUrl: 'https://artworks.thetvdb.com/banners/posters/311900-4.jpg',
          externalIds: { tvdbId: 311900 },
          metadata: expect.objectContaining({
            importSource: 'tvtime',
            sourceType: 'tv',
            tags: ['tv'],
            importCoverUrl: 'https://artworks.thetvdb.com/banners/posters/311900-4.jpg',
          }),
        }),
      );
      expect(mockRepo.save.mock.calls[0][0].metadata).not.toHaveProperty('malScore');
      expect(mockRepo.save.mock.calls[0][0].metadata).not.toHaveProperty('synopsis');
      expect(mockRepo.save.mock.calls[0][0].metadata).not.toHaveProperty('reclassified');
    });

    it('repairs legacy TVTime rows that were reclassified before import source metadata existed', async () => {
      const item = {
        id: 'item-2',
        title: 'Mr. Robot',
        type: MediaType.ANIME,
        coverUrl: 'https://cdn.myanimelist.net/images/anime/wrong.jpg',
        externalIds: { malId: 321 },
        metadata: {
          reclassified: true,
          tags: ['anime'],
          episodes: 45,
          episodesWatched: 26,
          runtime: 50,
          archived: true,
          malScore: 6.9,
        },
      };
      mockQueryBuilder.getMany.mockResolvedValue([item]);

      await service.resetClassification(mockAccount);

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MediaType.TV,
          coverUrl: null,
          externalIds: {},
          metadata: expect.objectContaining({
            importSource: 'tvtime',
            sourceType: 'tv',
            tags: ['tv'],
            episodesWatched: 26,
            runtime: 50,
            archived: true,
          }),
        }),
      );
      expect(mockRepo.save.mock.calls[0][0].metadata).not.toHaveProperty('malScore');
      expect(mockRepo.save.mock.calls[0][0].metadata).not.toHaveProperty('reclassified');
    });
  });

  // ========== BULK CREATE ==========

  describe('bulkCreate', () => {
    it('should skip items that already exist (by title+type)', async () => {
      mockRepo.findOne
        .mockResolvedValueOnce({ id: 'existing' }) // first item exists
        .mockResolvedValueOnce(null); // second item is new

      const items = [
        { title: 'Existing Show', type: MediaType.ANIME },
        { title: 'New Show', type: MediaType.ANIME },
      ];

      const result = await service.bulkCreate(mockAccount, items);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should reset cache after bulk import', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await service.bulkCreate(mockAccount, [
        { title: 'Show 1', type: MediaType.TV },
      ]);

      expect(mockCacheManager.reset).toHaveBeenCalled();
    });
  });
});
