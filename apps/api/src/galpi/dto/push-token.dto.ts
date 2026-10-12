import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/** Expo 푸시 토큰 모양 */
export const EXPO_PUSH_TOKEN = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

export class PushTokenDto {
  @ApiProperty({ description: 'Expo 푸시 토큰', example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  @Matches(EXPO_PUSH_TOKEN)
  token!: string;
}
