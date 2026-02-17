import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ALL_SCOPES } from '../constants/scopes';

export class CreateAgentKeyDto {
  @ApiProperty({ description: 'Name for this agent key', example: 'Claudia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'List of scopes to grant this key',
    example: ['workout:read', 'finance:read'],
    type: [String],
  })
  @IsArray()
  @IsIn(ALL_SCOPES, { each: true })
  scopes: string[];

  @ApiProperty({
    description: 'Expiry timestamp (ISO string). Null means no expiry.',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @ApiProperty({
    description: 'Extra metadata',
    required: false,
    nullable: true,
    example: { agentType: 'ai', version: '1.0' },
  })
  @IsOptional()
  metadata?: Record<string, any> | null;
}
