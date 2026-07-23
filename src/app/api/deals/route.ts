'use server';

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createDb } from '@/lib/db/client';
import { deals } from '@/lib/db/schema';
import { dealSchema } from '@/lib/validation/schemas';

export async function GET(request: Request) {
  const db = createDb((globalThis as any).CRM_DB);
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    const deal = await db.select().from(deals).where(eq(deals.id, id)).get();
    return NextResponse.json(deal ?? null);
  }

  const allDeals = await db.select().from(deals).all();
  return NextResponse.json(allDeals);
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = dealSchema.parse(body);
  const db = createDb((globalThis as any).CRM_DB);
  const newDeal = { ...result, id: crypto.randomUUID() };
  await db.insert(deals).values(newDeal).run();
  return NextResponse.json(newDeal, { status: 201 });
}

export async function PUT(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await request.json();
  const result = dealSchema.parse(body);
  const db = createDb((globalThis as any).CRM_DB);
  await db.update(deals).set(result).where(eq(deals.id, id)).run();
  return NextResponse.json({ id });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const db = createDb((globalThis as any).CRM_DB);
  await db.delete(deals).where(eq(deals.id, id)).run();
  return NextResponse.json({ id });
}
