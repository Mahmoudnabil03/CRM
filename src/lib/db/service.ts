import type { AnyD1Database } from 'drizzle-orm/d1';
import { createDb } from './client';
import { contacts, deals, tasks, emails, users } from './schema';

export function getDb(binding: AnyD1Database) {
  return createDb(binding);
}

export async function getAllContacts(db: ReturnType<typeof createDb>) {
  return db.select().from(contacts).all();
}

export async function getAllDeals(db: ReturnType<typeof createDb>) {
  return db.select().from(deals).all();
}

export async function getAllTasks(db: ReturnType<typeof createDb>) {
  return db.select().from(tasks).all();
}

export async function getAllEmails(db: ReturnType<typeof createDb>) {
  return db.select().from(emails).all();
}

export async function getAllUsers(db: ReturnType<typeof createDb>) {
  return db.select().from(users).all();
}
