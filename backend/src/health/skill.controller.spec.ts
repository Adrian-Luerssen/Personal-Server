import { Test, TestingModule } from '@nestjs/testing';
import { SkillController } from './skill.controller';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SkillController', () => {
  let controller: SkillController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SkillController],
    }).compile();

    controller = module.get<SkillController>(SkillController);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return markdown content from GitHub', async () => {
    const mockMarkdown = '# Agent Skill\n\nThis is the skill document.';
    mockedAxios.get.mockResolvedValue({ data: mockMarkdown });

    const result = await controller.getSkill();

    expect(result).toBe(mockMarkdown);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/Adrian-Luerssen/Personal-Server/main/docs/agent-skill.md',
      { responseType: 'text', timeout: 10000 },
    );
  });

  it('should throw InternalServerErrorException when GitHub fetch fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'));

    await expect(controller.getSkill()).rejects.toThrow('Failed to fetch agent skill document');
  });

  it('should throw InternalServerErrorException on non-200 response', async () => {
    mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

    await expect(controller.getSkill()).rejects.toThrow('Failed to fetch agent skill document');
  });
});
