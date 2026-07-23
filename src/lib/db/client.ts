import type { AnyD1Database } from 'drizzle-orm/d1';
import { drizzle } from 'drizzle-orm/d1';

export function createDb(binding: AnyD1Database): ReturnType<typeof drizzle> {
  return drizzle(binding);
}
