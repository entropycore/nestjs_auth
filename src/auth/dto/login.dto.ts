import { z } from 'zod';

export const authCredentialsSchema = z.object({
  phone: z.string().min(1, 'Le numéro de téléphone est obligatoire'),
  pin: z.string()
    .length(4, 'Le PIN doit contenir exactement 4 chiffres')
    .regex(/^\d+$/, 'Le PIN ne doit contenir que des chiffres'),
});


export type AuthCredentialsDto = z.infer<typeof authCredentialsSchema>;