// src/auth/dto/login.dto.ts
import { z } from 'zod';
import { emailSchema } from './shared';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});
export type LoginDto = z.infer<typeof loginSchema>;