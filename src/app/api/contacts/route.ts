'use server';

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createDb } from '@/lib/db/client';
import { contacts } from '@/lib/db/schema';
import { contactSchema } from '@/lib/validation/schemas';

export async function GET(request: Request) {
  const db = createDb((globalThis as any).CRM_DB);
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    const contact = await db.select().from(contacts).where(eq(contacts.id, id)).get();
    return NextResponse.json(contact ?? null);
  }

  const allContacts = await db.select().from(contacts).all();
  return NextResponse.json(allContacts);
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = contactSchema.parse(body);
  const db = createDb((globalThis as any).CRM_DB);
  const newContact = { ...result, id: crypto.randomUUID() };
  await db.insert(contacts).values(newContact).run();
  return NextResponse.json(newContact, { status: 201 });
}

export async function PUT(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await request.json();
  const result = contactSchema.parse(body);
  const db = createDb((globalThis as any).CRM_DB);
  await db.update(contacts).set(result).where(eq(contacts.id, id)).run();
  return NextResponse.json({ id });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const db = createDb((globalThis as any).CRM_DB);
  await db.delete(contacts).where(eq(contacts.id, id)).run();
  return NextResponse.json({ id });
}
