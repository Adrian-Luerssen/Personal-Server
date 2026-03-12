import { Test, TestingModule } from '@nestjs/testing';
import { DataController } from './data.controller';
import { DataService } from './data.service';

describe('DataController', () => {
  let controller: DataController;
  let dataService: jest.Mocked<DataService>;

  const mockAccount = { id: 'test-account-id' } as any;

  beforeEach(async () => {
    const mockDataService = {
      deleteWorkoutData: jest.fn(),
      deleteFinanceData: jest.fn(),
      deleteHabitsData: jest.fn(),
      deleteMusicData: jest.fn(),
      deleteChatData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataController],
      providers: [
        { provide: DataService, useValue: mockDataService },
      ],
    }).compile();

    controller = module.get<DataController>(DataController);
    dataService = module.get(DataService);
  });

  describe('deleteWorkout', () => {
    it('should call dataService.deleteWorkoutData with account id', async () => {
      dataService.deleteWorkoutData.mockResolvedValue({ success: true, module: 'workout' });

      const result = await controller.deleteWorkout(mockAccount);

      expect(result).toEqual({ success: true, module: 'workout' });
      expect(dataService.deleteWorkoutData).toHaveBeenCalledWith('test-account-id');
    });

    it('should propagate service errors', async () => {
      dataService.deleteWorkoutData.mockRejectedValue(new Error('DB error'));

      await expect(controller.deleteWorkout(mockAccount)).rejects.toThrow('DB error');
    });
  });

  describe('deleteFinance', () => {
    it('should call dataService.deleteFinanceData with account id', async () => {
      dataService.deleteFinanceData.mockResolvedValue({ success: true, module: 'finance' });

      const result = await controller.deleteFinance(mockAccount);

      expect(result).toEqual({ success: true, module: 'finance' });
      expect(dataService.deleteFinanceData).toHaveBeenCalledWith('test-account-id');
    });

    it('should propagate service errors', async () => {
      dataService.deleteFinanceData.mockRejectedValue(new Error('DB error'));

      await expect(controller.deleteFinance(mockAccount)).rejects.toThrow('DB error');
    });
  });

  describe('deleteHabits', () => {
    it('should call dataService.deleteHabitsData with account id', async () => {
      dataService.deleteHabitsData.mockResolvedValue({ success: true, module: 'habits' });

      const result = await controller.deleteHabits(mockAccount);

      expect(result).toEqual({ success: true, module: 'habits' });
      expect(dataService.deleteHabitsData).toHaveBeenCalledWith('test-account-id');
    });
  });

  describe('deleteMusic', () => {
    it('should call dataService.deleteMusicData with account id', async () => {
      dataService.deleteMusicData.mockResolvedValue({ success: true, module: 'music' });

      const result = await controller.deleteMusic(mockAccount);

      expect(result).toEqual({ success: true, module: 'music' });
      expect(dataService.deleteMusicData).toHaveBeenCalledWith('test-account-id');
    });
  });

  describe('deleteChat', () => {
    it('should call dataService.deleteChatData with account id', async () => {
      dataService.deleteChatData.mockResolvedValue({ success: true, module: 'chat' });

      const result = await controller.deleteChat(mockAccount);

      expect(result).toEqual({ success: true, module: 'chat' });
      expect(dataService.deleteChatData).toHaveBeenCalledWith('test-account-id');
    });
  });
});
