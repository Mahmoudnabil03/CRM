'use server';

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { userSchema } from '@/lib/validation/schemas';

export async function GET(request: Request) {
  const db = createDb((globalThis as any).CRM_DB);
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const email = url.searchParams.get('email');

  if (id) {
    const user = await db.select().from(users).where(eq(users.id, id)).get();
    return NextResponse.json(user ?? null);
  }

  if (email) {
    const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
    return NextResponse.json(user ? [user] : []);
  }

  const allUsers = await db.select().from(users).all();
  return NextResponse.json(allUsers);
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = userSchema.parse(body);
  const db = createDb((globalThis as any).CRM_DB);
  const newUser = { ...result, id: crypto.randomUUID() };
  await db.insert(users).values(newUser).run();
  return NextResponse.json(newUser, { status: 201 });
}

export async function PUT(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await request.json();
  const result = userSchema.parse(body);
  const db = createDb((globalThis as any).CRM_DB);
  await db.update(users).set(result).where(eq(users.id, id)).run();
  return NextResponse.json({ id });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const db = createDb((globalThis as any).CRM_DB);
  await db.delete(users).where(eq(users.id, id)).run();
  return NextResponse.json({ id });
}
