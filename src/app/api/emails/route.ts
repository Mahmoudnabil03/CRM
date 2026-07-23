'use server';

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createDb } from '@/lib/db/client';
import { emails } from '@/lib/db/schema';
import { emailSchema } from '@/lib/validation/schemas';

export async function GET(request: Request) {
  const db = createDb((globalThis as any).CRM_DB);
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    const email = await db.select().from(emails).where(eq(emails.id, id)).get();
    return NextResponse.json(email ?? null);
  }

  const allEmails = await db.select().from(emails).all();
  return NextResponse.json(allEmails);
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = emailSchema.parse(body);
  const db = createDb((globalThis as any).CRM_DB);
  const newEmail = { ...result, id: crypto.randomUUID() };
  await db.insert(emails).values(newEmail).run();
  return NextResponse.json(newEmail, { status: 201 });
}

export async function PUT(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await request.json();
  const result = emailSchema.parse(body);
  const db = createDb((globalThis as any).CRM_DB);
  await db.update(emails).set(result).where(eq(emails.id, id)).run();
  return NextResponse.json({ id });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const db = createDb((globalThis as any).CRM_DB);
  await db.delete(emails).where(eq(emails.id, id)).run();
  return NextResponse.json({ id });
}
