import { Test, TestingModule } from '@nestjs/testing';
import { SkillController } from './skill.controller';
import * as fs from 'fs';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

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

  it('should return markdown content from local file', () => {
    const mockMarkdown = '# Agent Skill\n\nThis is the skill document.';
    mockedFs.readFileSync.mockReturnValue(mockMarkdown);

    const result = controller.getSkill();

    expect(result).toBe(mockMarkdown);
    expect(mockedFs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('agent-skill.md'),
      'utf-8',
    );
  });

  it('should read from docs/agent-skill.md relative to cwd', () => {
    mockedFs.readFileSync.mockReturnValue('content');

    controller.getSkill();

    const callPath = mockedFs.readFileSync.mock.calls[0][0] as string;
    expect(callPath).toMatch(/docs[/\\]agent-skill\.md$/);
  });

  it('should throw when file does not exist', () => {
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });

    expect(() => controller.getSkill()).toThrow('ENOENT');
  });
});
