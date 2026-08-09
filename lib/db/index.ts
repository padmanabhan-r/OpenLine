import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Database handle.
 *
 * Resolved lazily so that importing anything from `lib/db` does not require a
 * DATABASE_URL. The test suite and the pure logic in `lib/script` and
 * `lib/phone` must stay runnable with no credentials at all — that is what
 * makes the repository clonable and the contribution's no-call path real.
 */

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.",
    );
  }

  cached = drizzle(neon(url), { schema });
  return cached;
}

export { schema };
