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
})

export type Env = z.infer<typeof envSchema>
