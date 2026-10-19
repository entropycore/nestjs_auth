// src/auth/dto/shared.ts
import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().max(255).pipe(z.email());
export const nameSchema = z.string().trim().min(1).max(100);