import { organizations } from './schema';
import { eq } from 'drizzle-orm';
import { createDb } from './client';

export const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000000';
export const DEFAULT_ORGANIZATION_NAME = 'VisionGuard';

export async function ensureDefaultOrganization(db: ReturnType<typeof createDb>) {
  const existing = await db.select().from(organizations).where(eq(organizations.id, DEFAULT_ORGANIZATION_ID)).get();
  if (!existing) {
    await db.insert(organizations).values({
      id: DEFAULT_ORGANIZATION_ID,
      name: DEFAULT_ORGANIZATION_NAME,
    }).run();
  }
}
