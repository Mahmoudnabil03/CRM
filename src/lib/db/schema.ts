import { sqliteTable } from 'drizzle-orm/sqlite-core';
import { integer, text } from 'drizzle-orm/sqlite-core/columns';

export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  unlockedSections: text('unlocked_sections', { mode: 'json' }).notNull().default('[]'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  company: text('company'),
  email: text('email'),
  phone: text('phone'),
  title: text('title'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const deals = sqliteTable('deals', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  contactId: text('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  value: integer('value').notNull().default(0),
  stage: text('stage').notNull().default('Lead'),
  closeDate: text('close_date'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  dueDate: text('due_date'),
  contactId: text('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  dealId: text('deal_id').references(() => deals.id, { onDelete: 'set null' }),
  notes: text('notes'),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const emails = sqliteTable('emails', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  contactId: text('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  date: text('date').notNull(),
  direction: text('direction').notNull().default('Outbound'),
  summary: text('summary'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});
