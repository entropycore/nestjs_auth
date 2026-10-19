// src/auth/dto/register.dto.ts
import { z } from 'zod';
import { emailSchema, nameSchema } from './shared';

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(72), // bcrypt ignore tout après 72 octets
  firstName: nameSchema,
  lastName: nameSchema,
});
export type RegisterDto = z.infer<typeof registerSchema>;