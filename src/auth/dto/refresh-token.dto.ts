// src/auth/dto/refresh-token.dto.ts
import { z } from 'zod';

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20),
});
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;