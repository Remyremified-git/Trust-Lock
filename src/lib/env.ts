import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ADMIN_API_TOKEN: z.string().min(16, "ADMIN_API_TOKEN must be set"),
  AUTH_SESSION_SECRET: z.string().min(24, "AUTH_SESSION_SECRET must be set"),
  ADMIN_SEED_PUBLIC_KEY_PEM: z.string().min(1, "ADMIN_SEED_PUBLIC_KEY_PEM is required"),
  ADMIN_SEED_PRIVATE_KEY_PEM: z
    .string()
    .min(1, "ADMIN_SEED_PRIVATE_KEY_PEM is required"),
  ADMIN_VAULT_AT_REST_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "ADMIN_VAULT_AT_REST_KEY must be 64 hex chars"),
  AUTH_DATA_AT_REST_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "AUTH_DATA_AT_REST_KEY must be 64 hex chars")
    .optional(),
});

type ServerEnv = z.infer<typeof serverSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${errors}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}
