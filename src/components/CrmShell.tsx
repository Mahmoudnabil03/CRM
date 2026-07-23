'use client';
 
import React from 'react';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { supabase } from '@/lib/auth/supabaseClient';
import { BarChart, Bar, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Users,
  Briefcase,
  CheckSquare,
  Mail,
  LayoutDashboard,
  Plus,
  X,
  Search,
  Trash2,
  Pencil,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Lock,
  LogOut,
  AlertCircle,
} from 'lucide-react';

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'deals', label: 'Deals', icon: Briefcase },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'emails', label: 'Email Log', icon: Mail },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);
const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
const STAGE_COLOR = {
  Lead: '#8B93A0',
  Qualified: '#5AA6E0',
  Proposal: '#2E86D6',
  Negotiation: '#1B5FA0',
  Won: '#3F8F5F',
  Lost: '#B23A3A',
};
const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000000';

type Contact = {
  id: string;
  organizationId: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  notes?: string | null;
};

type Deal = {
  id: string;
  organizationId: string;
  title: string;
  contactId?: string | null;
  value: number;
  stage: string;
  closeDate?: string | null;
  notes?: string | null;
};

type Task = {
  id: string;
  organizationId: string;
  title: string;
  dueDate?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  notes?: string | null;
  completed: boolean;
};

type Email = {
  id: string;
  organizationId: string;
  subject: string;
  contactId?: string | null;
  date: string;
  direction: 'Outbound' | 'Inbound';
  summary?: string | null;
};

type User = {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  unlockedSections: string[];
};

const fmtMoney = (value: number) => `$${Number(value || 0).toLocaleString('en-US')}`;
const fmtDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const todayStr = () => new Date().toISOString().slice(0, 10);
const isOverdue = (value?: string | null) => value ? new Date(value + 'T00:00:00') < new Date(new Date().toDateString()) : false;

const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: 16,
    }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
  >
    <div style={{ width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 18, boxShadow: '0 20px 60px rgba(15,23,42,0.18)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #E5E7EB' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569' }}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label style={{ display: 'block', marginBottom: 16, fontSize: 13, color: '#475569' }}>
    <span style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{label}</span>
    {children}
  </label>
);

const requestJson = async <T,>(path: string, body?: unknown, method = 'GET'): Promise<T> => {
  const options: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(path, options);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `${method} ${path} failed`);
  }
  return res.json();
};

export function CrmShell() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingEmail, setEditingEmail] = useState<Email | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) throw new Error('Supabase auth client is not configured.');

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const email = sessionData?.session?.user?.email ?? null;
      // setSessionEmail removed

      const [contactsRes, dealsRes, tasksRes, emailsRes, usersRes] = await Promise.all([
        requestJson<Contact[]>('/api/contacts'),
        requestJson<Deal[]>('/api/deals'),
        requestJson<Task[]>('/api/tasks'),
        requestJson<Email[]>('/api/emails'),
        requestJson<User[]>('/api/users'),
      ]);

      setContacts(contactsRes);
      setDeals(dealsRes);
      setTasks(tasksRes);
      setEmails(emailsRes);
      setUsers(usersRes || []);

      if (email) {
        const matchedUsers = await requestJson<User[]>(`/api/users?email=${encodeURIComponent(email)}`);
        setCurrentUser(matchedUsers[0] || null);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      setError((err as Error)?.message || 'Unable to load CRM data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isAdmin = currentUser?.role === 'admin';
  const allowedSections = useMemo(() => {
    if (!currentUser) return ['dashboard'];
    if (isAdmin) return [...SECTION_IDS, 'admin'];
    return currentUser.unlockedSections?.length ? currentUser.unlockedSections : ['dashboard'];
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (!allowedSections.includes(activeSection)) {
      setActiveSection(allowedSections[0] || 'dashboard');
    }
  }, [allowedSections, activeSection]);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const saveContact = async (contact: Contact) => {
    const url = contact.id ? `/api/contacts?id=${encodeURIComponent(contact.id)}` : '/api/contacts';
    await requestJson<Contact>(url, contact, contact.id ? 'PUT' : 'POST');
    await loadData();
  };

  const saveDeal = async (deal: Deal) => {
    const url = deal.id ? `/api/deals?id=${encodeURIComponent(deal.id)}` : '/api/deals';
    await requestJson<Deal>(url, deal, deal.id ? 'PUT' : 'POST');
    await loadData();
  };

  const saveTask = async (task: Task) => {
    const url = task.id ? `/api/tasks?id=${encodeURIComponent(task.id)}` : '/api/tasks';
    await requestJson<Task>(url, task, task.id ? 'PUT' : 'POST');
    await loadData();
  };

  const saveEmail = async (email: Email) => {
    const url = email.id ? `/api/emails?id=${encodeURIComponent(email.id)}` : '/api/emails';
    await requestJson<Email>(url, email, email.id ? 'PUT' : 'POST');
    await loadData();
  };

  const saveUser = async (user: User) => {
    const url = user.id ? `/api/users?id=${encodeURIComponent(user.id)}` : '/api/users';
    await requestJson<User>(url, user, user.id ? 'PUT' : 'POST');
    await loadData();
  };

  const deleteResource = async (resource: 'contacts' | 'deals' | 'tasks' | 'emails' | 'users', id: string) => {
    await requestJson<{ id: string }>(`/api/${resource}?id=${encodeURIComponent(id)}`, undefined, 'DELETE');
    await loadData();
  };

  if (loading) {
    return (
      <div style={{ padding: 40, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: 18 }}>
        Loading CRM…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, minHeight: '100vh', color: '#b91c1c' }}>
        <h2 style={{ marginTop: 0 }}>Error loading CRM</h2>
        <p>{error}</p>
        <button style={{ marginTop: 16, padding: '10px 18px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }} onClick={loadData}>
          Retry
        </button>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ padding: 40, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16, textAlign: 'center' }}>
        <h2>Your Supabase account is authenticated, but no CRM user record was found.</h2>
        <p>Please ask an administrator to add your email to the CRM users table.</p>
        <button style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }} onClick={signOut}>
          Sign out and try again
        </button>
      </div>
    );
  }

  const currentNav = [...SECTIONS.filter((section) => allowedSections.includes(section.id))];
  if (isAdmin) currentNav.push({ id: 'admin', label: 'Admin', icon: ShieldCheck });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F8FAFC', color: '#0F172A' }}>
      <aside style={{ width: 280, padding: 24, background: '#FFFFFF', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>VisionGuard</div>
          <div style={{ fontSize: 13, color: '#64748B' }}>CRM for crm.visionguardeg.com</div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
          {currentNav.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 14,
                border: 'none',
                background: activeSection === section.id ? '#2563eb' : 'transparent',
                color: activeSection === section.id ? '#fff' : '#0F172A',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                textAlign: 'left',
              }}
            >
              <section.icon size={16} /> {section.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
          <div style={{ marginBottom: 12, fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick stats</div>
          <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
            <div>Contacts: {contacts.length}</div>
            <div>Deals: {deals.length}</div>
            <div>Tasks: {tasks.length}</div>
            <div>Emails: {emails.length}</div>
            <div>Users: {users.length}</div>
          </div>

          <div style={{ marginTop: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{currentUser.name}</div>
              <div style={{ color: '#64748B', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                {isAdmin ? <ShieldCheck size={12} /> : <Lock size={12} />} {isAdmin ? 'Admin' : 'Team member'}
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              style={{ background: 'transparent', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 12px', cursor: 'pointer' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeSection === 'dashboard' && (
          <Dashboard
            contacts={contacts}
            deals={deals}
            tasks={tasks}
            emails={emails}
            onNavigate={setActiveSection}
          />
        )}
        {activeSection === 'contacts' && (
          <ContactsView
            contacts={contacts}
            deals={deals}
            query={query}
            setQuery={setQuery}
            onEdit={setEditingContact}
            onSave={saveContact}
            onDelete={(id) => deleteResource('contacts', id)}
            editingContact={editingContact}
            onClose={() => setEditingContact(null)}
          />
        )}
        {activeSection === 'deals' && (
          <DealsView
            deals={deals}
            contacts={contacts}
            onEdit={setEditingDeal}
            onSave={saveDeal}
            onDelete={(id) => deleteResource('deals', id)}
            editingDeal={editingDeal}
            onClose={() => setEditingDeal(null)}
          />
        )}
        {activeSection === 'tasks' && (
          <TasksView
            tasks={tasks}
            contacts={contacts}
            deals={deals}
            onEdit={setEditingTask}
            onSave={saveTask}
            onDelete={(id) => deleteResource('tasks', id)}
            editingTask={editingTask}
            onClose={() => setEditingTask(null)}
          />
        )}
        {activeSection === 'emails' && (
          <EmailsView
            emails={emails}
            contacts={contacts}
            onEdit={setEditingEmail}
            onSave={saveEmail}
            onDelete={(id) => deleteResource('emails', id)}
            editingEmail={editingEmail}
            onClose={() => setEditingEmail(null)}
          />
        )}
        {activeSection === 'admin' && isAdmin && (
          <AdminView
            users={users}
            currentUserId={currentUser.id}
            onEdit={setEditingUser}
            onSave={saveUser}
            onDelete={(id) => deleteResource('users', id)}
            editingUser={editingUser}
            onClose={() => setEditingUser(null)}
          />
        )}
      </main>
    </div>
  );
}

function Dashboard({ contacts, deals, tasks, emails, onNavigate }: { contacts: Contact[]; deals: Deal[]; tasks: Task[]; emails: Email[]; onNavigate: (_section: string) => void; }) {
  const openDeals = deals.filter((deal) => deal.stage !== 'Won' && deal.stage !== 'Lost');
  const pipelineValue = openDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
  const wonThisMonth = deals.filter((deal) => {
    if (deal.stage !== 'Won' || !deal.closeDate) return false;
    const date = new Date(deal.closeDate + 'T00:00:00');
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).reduce((sum, deal) => sum + Number(deal.value || 0), 0);
  const dueSoon = tasks.filter((task) => !task.completed && task.dueDate && new Date(task.dueDate + 'T00:00:00') <= new Date(new Date().setDate(new Date().getDate() + 7)));
  const stageData = STAGES.map((stage) => ({ stage, value: deals.filter((deal) => deal.stage === stage).reduce((sum, deal) => sum + Number(deal.value || 0), 0) }));
  const recentEmails = [...emails].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 32 }}> 
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        <StatCard label="Open pipeline value" value={fmtMoney(pipelineValue)} />
        <StatCard label="Open deals" value={openDeals.length.toString()} />
        <StatCard label="Won this month" value={fmtMoney(wonThisMonth)} />
        <StatCard label="Tasks due in 7 days" value={dueSoon.length.toString()} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Pipeline by stage</h2>
            <button type="button" onClick={() => onNavigate('deals')} style={pillButtonStyle}>View deals</button>
          </div>
          {deals.length === 0 ? (
            <EmptyState icon={Briefcase} title="No deals yet" description="Add a deal to start filling the pipeline." />
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} margin={{ left: -20, right: 0, bottom: 0, top: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number | string) => fmtMoney(Number(value))} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {stageData.map((entry) => <Cell key={entry.stage} fill={STAGE_COLOR[entry.stage as keyof typeof STAGE_COLOR]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Due this week</h2>
            <button type="button" onClick={() => onNavigate('tasks')} style={pillButtonStyle}>View tasks</button>
          </div>
          {dueSoon.length === 0 ? (
            <EmptyState icon={CheckSquare} title="No due tasks" description="You have no tasks due in the next 7 days." />
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {dueSoon.map((task) => (
                <div key={task.id} style={{ padding: 14, borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{task.title}</div>
                  <div style={{ color: isOverdue(task.dueDate) ? '#B23A3A' : '#475569' }}>{fmtDate(task.dueDate)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Recent emails</h2>
            <button type="button" onClick={() => onNavigate('emails')} style={pillButtonStyle}>View email log</button>
          </div>
          {emails.length === 0 ? (
            <EmptyState icon={Mail} title="No email activity" description="Log emails to keep a record for accounts." />
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {recentEmails.map((email) => (
                <div key={email.id} style={{ padding: 14, borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 600 }}>{email.subject}</div>
                  <div style={{ color: '#64748B', fontSize: 13 }}>{fmtDate(email.date)} · {email.direction}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Contacts</h2>
            <button type="button" onClick={() => onNavigate('contacts')} style={pillButtonStyle}>View contacts</button>
          </div>
          <div style={{ minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
            {contacts.length === 0 ? 'No contacts yet' : `${contacts.length} contacts in the system`}
          </div>
        </div>
      </div>
    </div>
  );
}

const pillButtonStyle = {
  borderRadius: 999,
  padding: '8px 12px',
  border: '1px solid #E2E8F0',
  background: 'white',
  color: '#334155',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700,
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #E2E8F0' }}>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof Briefcase; title: string; description: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 28, color: '#64748B' }}>
      <Icon size={28} style={{ marginBottom: 14 }} />
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: '#0F172A' }}>{title}</div>
      <div style={{ fontSize: 13 }}>{description}</div>
    </div>
  );
}

function ContactsView({ contacts, deals, query, setQuery, onEdit, onSave, onDelete, editingContact, onClose }: {
  contacts: Contact[];
  deals: Deal[];
  query: string;
  setQuery: (_value: string) => void;
  onEdit: (_contact: Contact | null) => void;
  onSave: (_contact: Contact) => void;
  onDelete: (_id: string) => void;
  editingContact: Contact | null;
  onClose: () => void;
}) {
  const filtered = contacts.filter((contact) => `${contact.name} ${contact.company ?? ''} ${contact.email ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const dealCount = (contactId: string) => deals.filter((deal) => deal.contactId === contactId).length;

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Contacts</h1>
          <p style={{ margin: '8px 0 0', color: '#64748B' }}>Manage your customers, companies, and contact details.</p>
        </div>
        <button type="button" onClick={() => onEdit({ id: '', organizationId: DEFAULT_ORGANIZATION_ID, name: '', email: '', role: 'user', unlockedSections: ['dashboard'] } as unknown as Contact)} style={{ ...pillButtonStyle, background: '#2563eb', color: '#fff', border: 'none' }}>
          <Plus size={14} /> Add contact
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #E2E8F0', borderRadius: 14, padding: '10px 14px', flex: 1, background: '#fff' }}>
          <Search size={16} color="#64748B" />
          <input
            placeholder="Search contacts"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, color: '#0F172A' }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No contacts found" description="Add a contact to get your CRM started." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <th style={{ padding: '12px 16px' }}>Name</th>
                <th style={{ padding: '12px 16px' }}>Company</th>
                <th style={{ padding: '12px 16px' }}>Email</th>
                <th style={{ padding: '12px 16px' }}>Deals</th>
                <th style={{ padding: '12px 16px' }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => (
                <tr key={contact.id} style={{ borderTop: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{contact.name}</td>
                  <td style={{ padding: '14px 16px' }}>{contact.company || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>{contact.email || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>{dealCount(contact.id)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <button type="button" onClick={() => onEdit(contact)} style={tableActionStyle}><Pencil size={14} /></button>
                    <button type="button" onClick={() => onDelete(contact.id)} style={tableActionStyle}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingContact && (
        <Modal title={editingContact.id ? 'Edit contact' : 'Add contact'} onClose={onClose}>
          <ContactForm contact={editingContact} onSave={onSave} onCancel={onClose} />
        </Modal>
      )}
    </div>
  );
}

const tableActionStyle = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: '#475569',
  marginLeft: 8,
};

function ContactForm({ contact, onSave, onCancel }: { contact: Contact; onSave: (_contact: Contact) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Contact>({ ...contact });
  const update = (field: keyof Contact) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [field]: event.target.value });
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSave({ ...form, organizationId: DEFAULT_ORGANIZATION_ID }); }}>
      <Field label="Name"><input required value={form.name} onChange={update('name')} style={inputStyle} /></Field>
      <Field label="Company"><input value={form.company || ''} onChange={update('company')} style={inputStyle} /></Field>
      <Field label="Email"><input type="email" value={form.email || ''} onChange={update('email')} style={inputStyle} /></Field>
      <Field label="Phone"><input value={form.phone || ''} onChange={update('phone')} style={inputStyle} /></Field>
      <Field label="Title"><input value={form.title || ''} onChange={update('title')} style={inputStyle} /></Field>
      <Field label="Notes"><textarea value={form.notes || ''} onChange={update('notes')} style={textareaStyle} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
        <button type="button" onClick={onCancel} style={{ ...pillButtonStyle, background: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0' }}>
          Cancel
        </button>
        <button type="submit" style={{ ...pillButtonStyle, background: '#2563EB', color: '#fff', border: 'none' }}>
          Save contact
        </button>
      </div>
    </form>
  );
}

function DealsView({ deals, contacts, onEdit, onSave, onDelete, editingDeal, onClose }: {
  deals: Deal[];
  contacts: Contact[];
  onEdit: (_deal: Deal | null) => void;
  onSave: (_deal: Deal) => void;
  onDelete: (_id: string) => void;
  editingDeal: Deal | null;
  onClose: () => void;
}) {
  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Deals</h1>
          <p style={{ margin: '8px 0 0', color: '#64748B' }}>Track revenue, stages, and pipeline health.</p>
        </div>
        <button type="button" onClick={() => onEdit({ id: '', organizationId: DEFAULT_ORGANIZATION_ID, title: '', value: 0, stage: 'Lead', contactId: '', closeDate: '', notes: '' } as Deal)} style={{ ...pillButtonStyle, background: '#2563eb', color: '#fff', border: 'none' }}>
          <Plus size={14} /> Add deal
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((deal) => deal.stage === stage);
          return (
            <div key={stage} style={{ background: '#fff', borderRadius: 20, padding: 18, border: '1px solid #E2E8F0', minHeight: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <strong>{stage}</strong>
                <span style={{ fontSize: 13, color: '#64748B' }}>{stageDeals.length}</span>
              </div>
              <div style={{ height: 1, background: STAGE_COLOR[stage as keyof typeof STAGE_COLOR], marginBottom: 14, borderRadius: 8 }} />
              {stageDeals.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13 }}>No deals</div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {stageDeals.map((deal) => (
                    <button key={deal.id} type="button" onClick={() => onEdit(deal)} style={{ width: '100%', textAlign: 'left', padding: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, cursor: 'pointer' }}>
                      <div style={{ fontWeight: 600 }}>{deal.title}</div>
                      <div style={{ marginTop: 4, color: '#475569', fontSize: 13 }}>${deal.value?.toLocaleString() || 0}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingDeal && (
        <Modal title={editingDeal.id ? 'Edit deal' : 'Add deal'} onClose={onClose}>
          <DealForm deal={editingDeal} contacts={contacts} onSave={onSave} onDelete={editingDeal.id ? () => onDelete(editingDeal.id) : undefined} onCancel={onClose} />
        </Modal>
      )}
    </div>
  );
}

function DealForm({ deal, contacts, onSave, onDelete, onCancel }: { deal: Deal; contacts: Contact[]; onSave: (_deal: Deal) => void; onDelete?: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<Deal>({ ...deal, value: deal.value || 0, stage: deal.stage || 'Lead' });
  const update = (field: keyof Deal) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = field === 'value' ? Number(event.target.value) : event.target.value;
    setForm({ ...form, [field]: value });
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSave({ ...form, organizationId: DEFAULT_ORGANIZATION_ID }); }}>
      <Field label="Title"><input required value={form.title} onChange={update('title')} style={inputStyle} /></Field>
      <Field label="Contact">
        <select value={form.contactId || ''} onChange={update('contactId')} style={inputStyle}>
          <option value="">Unassigned</option>
          {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
        </select>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Value"> <input type="number" min={0} value={form.value} onChange={update('value')} style={inputStyle} /> </Field>
        <Field label="Stage">
          <select value={form.stage} onChange={update('stage')} style={inputStyle}>
            {STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Close date"><input type="date" value={form.closeDate || ''} onChange={update('closeDate')} style={inputStyle} /></Field>
      <Field label="Notes"><textarea value={form.notes || ''} onChange={update('notes')} style={textareaStyle} /></Field>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 20 }}>
        {onDelete ? (
          <button type="button" onClick={onDelete} style={{ ...pillButtonStyle, color: '#B23A3A', background: '#FEF2F2', border: '1px solid #FECACA' }}>
            Delete deal
          </button>
        ) : <div />}
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" onClick={onCancel} style={{ ...pillButtonStyle, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }}>Cancel</button>
          <button type="submit" style={{ ...pillButtonStyle, background: '#2563EB', color: '#fff', border: 'none' }}>Save deal</button>
        </div>
      </div>
    </form>
  );
}

function TasksView({ tasks, contacts, deals, onEdit, onSave, onDelete, editingTask, onClose }: {
  tasks: Task[];
  contacts: Contact[];
  deals: Deal[];
  onEdit: (_task: Task | null) => void;
  onSave: (_task: Task) => void;
  onDelete: (_id: string) => void;
  editingTask: Task | null;
  onClose: () => void;
}) {
  const sorted = [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed) || (a.dueDate || '').localeCompare(b.dueDate || ''));

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Tasks</h1>
          <p style={{ margin: '8px 0 0', color: '#64748B' }}>Follow up, assign, and complete customer work.</p>
        </div>
        <button type="button" onClick={() => onEdit({ id: '', organizationId: DEFAULT_ORGANIZATION_ID, title: '', dueDate: todayStr(), completed: false } as Task)} style={{ ...pillButtonStyle, background: '#2563eb', color: '#fff', border: 'none' }}>
          <Plus size={14} /> Add task
        </button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {sorted.length === 0 ? (
          <EmptyState icon={CheckSquare} title="No tasks yet" description="Create tasks to track your next actions." />
        ) : (
          sorted.map((task) => (
            <div key={task.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', padding: 16, borderRadius: 18, border: '1px solid #E2E8F0', background: '#fff' }}>
              <button type="button" onClick={() => onSave({ ...task, completed: !task.completed })} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid #E2E8F0', background: task.completed ? '#3F8F5F' : 'transparent', color: task.completed ? '#fff' : '#64748B', cursor: 'pointer' }}>
                {task.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              </button>
              <div>
                <div style={{ fontWeight: 600, color: task.completed ? '#94A3B8' : '#0F172A' }}>{task.title}</div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                  {task.dueDate ? `${fmtDate(task.dueDate)} · ` : ''}
                  {task.contactId ? `Contact: ${contacts.find((c) => c.id === task.contactId)?.name || 'Unknown'}` : 'No contact assigned'}
                  {task.dealId ? ` · Deal: ${deals.find((d) => d.id === task.dealId)?.title || 'Unknown'}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => onEdit(task)} style={tableActionStyle}><Pencil size={14} /></button>
                <button type="button" onClick={() => onDelete(task.id)} style={tableActionStyle}><Trash2 size={14} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingTask && (
        <Modal title={editingTask.id ? 'Edit task' : 'Add task'} onClose={onClose}>
          <TaskForm task={editingTask} contacts={contacts} deals={deals} onSave={onSave} onDelete={editingTask.id ? () => onDelete(editingTask.id) : undefined} onCancel={onClose} />
        </Modal>
      )}
    </div>
  );
}

function TaskForm({ task, contacts, deals, onSave, onDelete, onCancel }: { task: Task; contacts: Contact[]; deals: Deal[]; onSave: (_task: Task) => void; onDelete?: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<Task>({ ...task, completed: task.completed ?? false });
  const update = (field: keyof Task) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = event.target as HTMLInputElement;
    setForm({ ...form, [field]: field === 'completed' ? target.checked : target.value });
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSave({ ...form, organizationId: DEFAULT_ORGANIZATION_ID }); }}>
      <Field label="Task"><input required value={form.title} onChange={update('title')} style={inputStyle} /></Field>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
        <Field label="Due date"><input type="date" value={form.dueDate || ''} onChange={update('dueDate')} style={inputStyle} /></Field>
        <Field label="Contact">
          <select value={form.contactId || ''} onChange={update('contactId')} style={inputStyle}>
            <option value="">None</option>
            {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Related deal">
        <select value={form.dealId || ''} onChange={update('dealId')} style={inputStyle}>
          <option value="">None</option>
          {deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.title}</option>)}
        </select>
      </Field>
      <Field label="Notes"><textarea value={form.notes || ''} onChange={update('notes')} style={textareaStyle} /></Field>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 20 }}>
        {onDelete ? (
          <button type="button" onClick={onDelete} style={{ ...pillButtonStyle, color: '#B23A3A', background: '#FEF2F2', border: '1px solid #FECACA' }}>
            Delete task
          </button>
        ) : <div />}
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" onClick={onCancel} style={{ ...pillButtonStyle, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }}>Cancel</button>
          <button type="submit" style={{ ...pillButtonStyle, background: '#2563EB', color: '#fff', border: 'none' }}>Save task</button>
        </div>
      </div>
    </form>
  );
}

function EmailsView({ emails, contacts, onEdit, onSave, onDelete, editingEmail, onClose }: { emails: Email[]; contacts: Contact[]; onEdit: (_email: Email | null) => void; onSave: (_email: Email) => void; onDelete: (_id: string) => void; editingEmail: Email | null; onClose: () => void; }) {
  const sorted = [...emails].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Email Log</h1>
          <p style={{ margin: '8px 0 0', color: '#64748B' }}>Record outbound and inbound customer communication.</p>
        </div>
        <button type="button" onClick={() => onEdit({ id: '', organizationId: DEFAULT_ORGANIZATION_ID, subject: '', date: todayStr(), direction: 'Outbound', summary: '' } as Email)} style={{ ...pillButtonStyle, background: '#2563eb', color: '#fff', border: 'none' }}>
          <Plus size={14} /> Log email
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Mail} title="No emails logged" description="Create an email log entry to capture the conversation." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ textTransform: 'uppercase', color: '#475569', fontSize: 12, letterSpacing: '0.08em' }}>
              <tr>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Subject</th>
                <th style={{ padding: '12px 16px' }}>Contact</th>
                <th style={{ padding: '12px 16px' }}>Direction</th>
                <th style={{ padding: '12px 16px' }} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((email) => (
                <tr key={email.id} style={{ borderTop: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '14px 16px' }}>{fmtDate(email.date)}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{email.subject}</td>
                  <td style={{ padding: '14px 16px' }}>{contacts.find((contact) => contact.id === email.contactId)?.name || '—'}</td>
                  <td style={{ padding: '14px 16px' }}><span style={{ padding: '4px 10px', borderRadius: 999, background: email.direction === 'Outbound' ? '#DBEAFE' : '#D1FAE5', color: email.direction === 'Outbound' ? '#1D4ED8' : '#166534', fontSize: 12 }}>{email.direction}</span></td>
                  <td style={{ padding: '14px 16px' }}>
                    <button type="button" onClick={() => onEdit(email)} style={tableActionStyle}><Pencil size={14} /></button>
                    <button type="button" onClick={() => onDelete(email.id)} style={tableActionStyle}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingEmail && (
        <Modal title={editingEmail.id ? 'Edit email log' : 'Log email'} onClose={onClose}>
          <EmailForm email={editingEmail} contacts={contacts} onSave={onSave} onDelete={editingEmail.id ? () => onDelete(editingEmail.id) : undefined} onCancel={onClose} />
        </Modal>
      )}
    </div>
  );
}

function EmailForm({ email, contacts, onSave, onDelete, onCancel }: { email: Email; contacts: Contact[]; onSave: (_email: Email) => void; onDelete?: () => void; onCancel: () => void; }) {
  const [form, setForm] = useState<Email>({ ...email, direction: email.direction || 'Outbound' });
  const update = (field: keyof Email) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [field]: event.target.value });
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSave({ ...form, organizationId: DEFAULT_ORGANIZATION_ID }); }}>
      <Field label="Subject"><input required value={form.subject} onChange={update('subject')} style={inputStyle} /></Field>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
        <Field label="Contact">
          <select value={form.contactId || ''} onChange={update('contactId')} style={inputStyle}>
            <option value="">No contact</option>
            {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
          </select>
        </Field>
        <Field label="Date"><input type="date" value={form.date} onChange={update('date')} style={inputStyle} /></Field>
      </div>
      <Field label="Direction">
        <select value={form.direction} onChange={update('direction')} style={inputStyle}>
          <option value="Outbound">Outbound</option>
          <option value="Inbound">Inbound</option>
        </select>
      </Field>
      <Field label="Summary"><textarea value={form.summary || ''} onChange={update('summary')} style={textareaStyle} /></Field>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 20 }}>
        {onDelete ? (
          <button type="button" onClick={onDelete} style={{ ...pillButtonStyle, color: '#B23A3A', background: '#FEF2F2', border: '1px solid #FECACA' }}>
            Delete email
          </button>
        ) : <div />}
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" onClick={onCancel} style={{ ...pillButtonStyle, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }}>Cancel</button>
          <button type="submit" style={{ ...pillButtonStyle, background: '#2563EB', color: '#fff', border: 'none' }}>Save email</button>
        </div>
      </div>
    </form>
  );
}

function AdminView({ users, currentUserId, onEdit, onSave, onDelete, editingUser, onClose }: { users: User[]; currentUserId: string; onEdit: (_user: User | null) => void; onSave: (_user: User) => void; onDelete: (_id: string) => void; editingUser: User | null; onClose: () => void; }) {
  const adminCount = users.filter((user) => user.role === 'admin').length;

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Admin</h1>
          <p style={{ margin: '8px 0 0', color: '#64748B' }}>Manage users, roles, and CRM access.</p>
        </div>
        <button type="button" onClick={() => onEdit({ id: '', organizationId: DEFAULT_ORGANIZATION_ID, name: '', email: '', role: 'user', unlockedSections: ['dashboard'] } as User)} style={{ ...pillButtonStyle, background: '#2563eb', color: '#fff', border: 'none' }}>
          <Plus size={14} /> Add user
        </button>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users configured" description="Add your first CRM user here." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ textTransform: 'uppercase', color: '#475569', fontSize: 12, letterSpacing: '0.08em' }}>
              <tr>
                <th style={{ padding: '12px 16px' }}>Name</th>
                <th style={{ padding: '12px 16px' }}>Email</th>
                <th style={{ padding: '12px 16px' }}>Role</th>
                <th style={{ padding: '12px 16px' }}>Sections</th>
                <th style={{ padding: '12px 16px' }} />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSoleAdmin = user.role === 'admin' && adminCount <= 1;
                return (
                  <tr key={user.id} style={{ borderTop: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{user.name}{user.id === currentUserId ? ' (you)' : ''}</td>
                    <td style={{ padding: '14px 16px' }}>{user.email}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '6px 10px', borderRadius: 999, background: user.role === 'admin' ? '#DBEAFE' : '#F1F5F9', color: user.role === 'admin' ? '#1D4ED8' : '#475569', fontSize: 12, fontWeight: 700 }}>
                        {user.role === 'admin' ? 'Admin' : 'Team member'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>{user.role === 'admin' ? 'All sections' : (user.unlockedSections?.join(', ') || 'None')}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <button type="button" onClick={() => onEdit(user)} style={tableActionStyle}><Pencil size={14} /></button>
                      <button type="button" onClick={() => !isSoleAdmin && onDelete(user.id)} disabled={isSoleAdmin} style={{ ...tableActionStyle, opacity: isSoleAdmin ? 0.35 : 1 }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingUser && (
        <Modal title={editingUser.id ? 'Edit user' : 'Add user'} onClose={onClose}>
          <UserForm user={editingUser} users={users} onSave={onSave} onCancel={onClose} onDelete={editingUser.id ? () => onDelete(editingUser.id) : undefined} adminCount={adminCount} />
        </Modal>
      )}
    </div>
  );
}

function UserForm({ user, users, onSave, onCancel, onDelete, adminCount }: { user: User; users: User[]; onSave: (_user: User) => void; onCancel: () => void; onDelete?: () => void; adminCount: number; }) {
  const [form, setForm] = useState<User>({ ...user, unlockedSections: user.unlockedSections || ['dashboard'] });
  const [error, setError] = useState('');
  const isNew = !user.id;
  const isSoleAdmin = user.role === 'admin' && adminCount <= 1;
  const update = (field: keyof User) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.value;
    if (field === 'unlockedSections') return;
    setForm({ ...form, [field]: value } as User);
  };

  const toggleSection = (sectionId: string) => {
    if (form.role === 'admin') return;
    const next = form.unlockedSections?.includes(sectionId)
      ? form.unlockedSections.filter((id) => id !== sectionId)
      : [...(form.unlockedSections || []), sectionId];
    setForm({ ...form, unlockedSections: next });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }

    const duplicate = users.some((existing) => existing.id !== form.id && existing.email.toLowerCase() === form.email.toLowerCase());
    if (duplicate) {
      setError('That email is already in use.');
      return;
    }

    onSave({ ...form, unlockedSections: form.role === 'admin' ? SECTION_IDS : form.unlockedSections || ['dashboard'] });
  };

  return (
    <form onSubmit={submit}>
      <Field label="Name"><input required value={form.name} onChange={update('name')} style={inputStyle} /></Field>
      <Field label="Email"><input required type="email" value={form.email} onChange={update('email')} style={inputStyle} /></Field>
      <Field label="Role">
        <select value={form.role} onChange={update('role')} style={inputStyle}>
          <option value="user">Team member</option>
          <option value="admin">Admin</option>
        </select>
      </Field>
      {form.role === 'user' ? (
        <Field label="Unlocked sections">
          <div style={{ display: 'grid', gap: 10 }}>
            {SECTIONS.map((section) => (
              <label key={section.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', padding: 10, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <input type="checkbox" checked={form.unlockedSections?.includes(section.id)} onChange={() => toggleSection(section.id)} />
                <section.icon size={14} /> {section.label}
              </label>
            ))}
          </div>
        </Field>
      ) : (
        <div style={{ color: '#475569', marginBottom: 14 }}>Admins automatically see every section plus the admin panel.</div>
      )}
      {error && (
        <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: 12, borderRadius: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 20 }}>
        {onDelete ? (
          <button type="button" onClick={onDelete} disabled={isSoleAdmin} style={{ ...pillButtonStyle, background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', opacity: isSoleAdmin ? 0.4 : 1 }}>
            Remove user
          </button>
        ) : <div />}
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" onClick={onCancel} style={{ ...pillButtonStyle, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }}>Cancel</button>
          <button type="submit" style={{ ...pillButtonStyle, background: '#2563EB', color: '#fff', border: 'none' }}>{isNew ? 'Create user' : 'Save user'}</button>
        </div>
      </div>
    </form>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #E2E8F0',
  background: '#F8FAFC',
  outline: 'none',
  fontSize: 14,
};

const textareaStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #E2E8F0',
  background: '#F8FAFC',
  outline: 'none',
  fontSize: 14,
  minHeight: 120,
};
