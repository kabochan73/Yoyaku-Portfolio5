import "server-only";
import { z } from "zod";

const envSchema = z.object({
  API_URL: z.url(),
  BUILD_API_URL: z.url().optional(),
  FRONTEND_URL: z.url(),
  REVALIDATE_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  return envSchema.parse(source);
}

export const env = parseEnv(process.env);
