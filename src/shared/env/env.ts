import { z } from 'zod'

export const envSchema = z.object({
  PORT: z.coerce.number().optional().default(3333),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .optional()
    .default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().optional().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().optional().default('48h'),
  TMDB_ACCESS_TOKEN: z.string(),
  TMDB_BASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().optional().default('http://localhost:3000'),
  REDIS_URL: z.string(),
  EMAIL_USER: z.string().email(),
  EMAIL_CLIENT_ID: z.string(),
  EMAIL_CLIENT_SECRET: z.string(),
  EMAIL_REDIRECT_URI: z.string().url(),
  EMAIL_REFRESH_TOKEN: z.string(),
  FRONTEND_URL: z.string().url(),
  R2_ACCOUNT_ID: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET: z.string(),
  R2_PUBLIC_URL: z.string().url(),
})

export type Env = z.infer<typeof envSchema>
