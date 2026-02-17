import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ALL_SCOPES } from '../constants/scopes';

export class UpdateAgentKeyDto {
  @ApiProperty({ description: 'New name for the key', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiProperty({
    description: 'Updated scopes',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsIn(ALL_SCOPES, { each: true })
  scopes?: string[];

  @ApiProperty({ description: 'Whether the key is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Expiry timestamp (ISO string)', required: false, nullable: true })
  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @ApiProperty({ description: 'Extra metadata', required: false, nullable: true })
  @IsOptional()
  metadata?: Record<string, any> | null;
}
