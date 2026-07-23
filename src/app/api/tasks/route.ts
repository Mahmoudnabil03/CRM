'use server';

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createDb } from '@/lib/db/client';
import { tasks } from '@/lib/db/schema';
import { taskSchema } from '@/lib/validation/schemas';

export async function GET(request: Request) {
  const db = createDb((globalThis as any).CRM_DB);
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
    return NextResponse.json(task ?? null);
  }

  const allTasks = await db.select().from(tasks).all();
  return NextResponse.json(allTasks);
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = taskSchema.parse(body);
  const db = createDb((globalThis as any).CRM_DB);
  const newTask = { ...result, id: crypto.randomUUID() };
  await db.insert(tasks).values(newTask).run();
  return NextResponse.json(newTask, { status: 201 });
}

export async function PUT(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await request.json();
  const result = taskSchema.parse(body);
  const db = createDb((globalThis as any).CRM_DB);
  await db.update(tasks).set(result).where(eq(tasks.id, id)).run();
  return NextResponse.json({ id });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const db = createDb((globalThis as any).CRM_DB);
  await db.delete(tasks).where(eq(tasks.id, id)).run();
  return NextResponse.json({ id });
}
