import { z } from 'zod';

export const contactSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  company: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const dealSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  title: z.string().min(1),
  contactId: z.string().uuid().optional().nullable(),
  value: z.number().nonnegative(),
  stage: z.enum(['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']),
  closeDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const taskSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  title: z.string().min(1),
  dueDate: z.string().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  completed: z.boolean().optional(),
});

export const emailSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  subject: z.string().min(1),
  contactId: z.string().uuid().optional().nullable(),
  date: z.string().min(1),
  direction: z.enum(['Outbound', 'Inbound']),
  summary: z.string().optional().nullable(),
});

export const userSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  unlockedSections: z.array(z.string()).optional(),
});
