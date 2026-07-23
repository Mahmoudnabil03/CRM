import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users, Briefcase, CheckSquare, Mail, LayoutDashboard, Plus, X,
  Phone, Building2, Search, Trash2, Pencil, Clock, TrendingUp,
  ChevronRight, Circle, CheckCircle2, AlertCircle,
  ShieldCheck, Lock, LogOut, Eye, EyeOff, KeyRound
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "deals", label: "Deals", icon: Briefcase },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "emails", label: "Email Log", icon: Mail },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
const STAGE_COLOR = {
  Lead: "#8B93A0",
  Qualified: "#5AA6E0",
  Proposal: "#2E86D6",
  Negotiation: "#1B5FA0",
  Won: "#3F8F5F",
  Lost: "#B23A3A",
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const fmtMoney = (n) => "$" + Number(n || 0).toLocaleString("en-US");
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const isOverdue = (d) => d && new Date(d + "T00:00:00") < new Date(new Date().toDateString());
const todayStr = () => new Date().toISOString().slice(0, 10);

// --- Lightweight client-side credential hashing -----------------------------
// This is NOT real server-side auth (there is no server). It exists so plain-text
// passwords aren't sitting directly in storage, but anyone with access to this
// artifact's code/storage can still see the hashes. Never reuse a real, sensitive
// password here.
const randomSalt = () => Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
async function sha256Hex(text) {
  try {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Fallback if SubtleCrypto isn't available in this context — still not real security.
    let h = 0;
    for (let i = 0; i < text.length; i++) { h = (Math.imul(31, h) + text.charCodeAt(i)) | 0; }
    return "fallback-" + (h >>> 0).toString(16);
  }
}
const hashPassword = (password, salt) => sha256Hex(`${salt}::${password}`);
const normEmail = (e) => (e || "").trim().toLowerCase();

async function loadKey(key, fallback, shared = false) {
  try {
    const res = await window.storage.get(key, shared);
    return res && res.value ? JSON.parse(res.value) : fallback;
  } catch {
    return fallback;
  }
}
async function saveKey(key, value, shared = false) {
  try {
    await window.storage.set(key, JSON.stringify(value), shared);
  } catch (e) {
    console.error("storage save failed", key, e);
  }
}

function useEntity(key, shared = false) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    loadKey(key, [], shared).then(setItems);
  }, [key]);
  const persist = useCallback((next) => {
    setItems(next);
    saveKey(key, next, shared);
  }, [key]);
  return [items, persist];
}

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');`;

function Field({ label, children }) {
  return (
    <label className="crm-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="crm-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="crm-modal">
        <div className="crm-modal-head">
          <h3>{title}</h3>
          <button className="crm-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="crm-modal-body">{children}</div>
      </div>
    </div>
  );
}

function LoginPage({ users, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    const match = (users || []).find((u) => normEmail(u.email) === normEmail(email));
    if (!match) {
      setError("Incorrect email or password.");
      setBusy(false);
      return;
    }
    const hash = await hashPassword(password, match.passwordSalt);
    setBusy(false);
    if (hash !== match.passwordHash) {
      setError("Incorrect email or password.");
      return;
    }
    onLogin(match.id);
  };

  return (
    <div className="crm-login-screen">
      <form className="crm-login-card" onSubmit={submit}>
        <div className="crm-login-logo">Vision<span>Guard</span></div>
        <p className="crm-login-sub">Sign in with the email and password your admin set up for you.</p>
        <Field label="Email">
          <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </Field>
        <Field label="Password">
          <div className="crm-password-row">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button type="button" className="crm-password-toggle" onClick={() => setShowPassword((s) => !s)} tabIndex={-1}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>
        {error && <div className="crm-login-error"><AlertCircle size={13} /> {error}</div>}
        <button type="submit" className="crm-btn crm-btn-gold" style={{ width: "100%", justifyContent: "center" }} disabled={busy}>
          <KeyRound size={14} /> {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div className="crm-empty">
      <Icon size={28} strokeWidth={1.4} />
      <p className="crm-empty-title">{title}</p>
      <p className="crm-empty-sub">{sub}</p>
    </div>
  );
}

const DEFAULT_ADMIN_ID = "admin-root";
const DEFAULT_ADMIN_EMAIL = "admin@ledgercrm.local";
const DEFAULT_ADMIN_PASSWORD = "admin123";

export default function App() {
  const [contacts, setContacts] = useEntity("crm-contacts");
  const [deals, setDeals] = useEntity("crm-deals");
  const [tasks, setTasks] = useEntity("crm-tasks");
  const [emails, setEmails] = useEntity("crm-emails");
  // Team/user directory is shared so every visitor sees the same roster the admin manages.
  const [users, setUsers] = useEntity("crm-users", true);
  const [view, setView] = useState("dashboard");
  const [query, setQuery] = useState("");

  const [editingContact, setEditingContact] = useState(null);
  const [editingDeal, setEditingDeal] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingEmail, setEditingEmail] = useState(null);

  // Which user THIS browser is logged in as — personal, not shared, and only ever set
  // after a successful email+password check against that user's stored hash.
  const [sessionUserId, setSessionUserIdRaw] = useState(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  useEffect(() => {
    loadKey("crm-session-user-id", null, false).then((id) => {
      setSessionUserIdRaw(id);
      setSessionLoaded(true);
    });
  }, []);
  const persistSession = (id) => {
    setSessionUserIdRaw(id);
    saveKey("crm-session-user-id", id, false);
  };
  const logOut = () => persistSession(null);

  // Bootstrap a default admin the first time the roster is empty.
  useEffect(() => {
    if (users !== null && users.length === 0) {
      (async () => {
        const passwordSalt = randomSalt();
        const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD, passwordSalt);
        setUsers([{
          id: DEFAULT_ADMIN_ID, name: "Admin", email: DEFAULT_ADMIN_EMAIL,
          passwordHash, passwordSalt, role: "admin", unlockedSections: [...SECTION_IDS],
        }]);
      })();
    }
  }, [users]);

  // If a persisted session no longer maps to a real user (deleted, storage reset), sign out.
  useEffect(() => {
    if (users && sessionLoaded && sessionUserId && !users.find((u) => u.id === sessionUserId)) {
      persistSession(null);
    }
  }, [users, sessionLoaded, sessionUserId]);

  const ready = contacts !== null && deals !== null && tasks !== null && emails !== null && users !== null && sessionLoaded;

  const contactName = (id) => contacts?.find((c) => c.id === id)?.name || "—";
  const dealTitle = (id) => deals?.find((d) => d.id === id)?.title || "—";

  const currentUser = (users && users.find((u) => u.id === sessionUserId)) || null;
  const loggedIn = !!currentUser;
  const isAdmin = currentUser?.role === "admin";
  const allowedSectionSet = new Set(isAdmin ? SECTION_IDS : (currentUser?.unlockedSections || []));

  const nav = [
    ...SECTIONS.filter((s) => allowedSectionSet.has(s.id)),
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  // If the active view isn't allowed for the current user (e.g. after a role/section change), bounce to the first allowed one.
  useEffect(() => {
    if (!ready || !loggedIn) return;
    const allowedIds = nav.map((n) => n.id);
    if (!allowedIds.includes(view)) {
      setView(allowedIds[0] || "dashboard");
    }
  }, [ready, loggedIn, sessionUserId, currentUser && currentUser.role, JSON.stringify(currentUser?.unlockedSections || [])]);

  if (!ready) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "Inter, sans-serif", color: "#8C93A6" }}>
        Loading your CRM…
      </div>
    );
  }

  return (
    <div className="crm-root">
      <style>{`
        ${FONT_IMPORT}
        .crm-root {
          --ink: #0B0F14;
          --ink-soft: #5B6572;
          --paper: #F0F2F4;
          --panel: #FFFFFF;
          --line: #DBDFE3;
          --gold: #2E86D6;
          --gold-soft: #D9EAFA;
          --sage: #3F8F5F;
          --sage-soft: #DEEEE2;
          --rust: #B23A3A;
          --rust-soft: #F5DEDE;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          background: var(--paper);
          height: 100%;
          min-height: 640px;
          display: flex;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--line);
        }
        .crm-root * { box-sizing: border-box; }
        .crm-sidebar {
          width: 216px;
          flex-shrink: 0;
          background: var(--ink);
          color: #E7E8EA;
          display: flex;
          flex-direction: column;
          padding: 20px 12px;
        }
        .crm-logo {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 20px;
          font-weight: 700;
          padding: 4px 10px 20px;
          letter-spacing: 0.2px;
          text-transform: uppercase;
        }
        .crm-logo span { color: #9AA1AC; }
        .crm-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 8px; font-size: 13.5px;
          color: #B9BCC6; cursor: pointer; margin-bottom: 2px;
          background: transparent; border: none; width: 100%; text-align: left;
          font-family: inherit;
        }
        .crm-nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .crm-nav-item.active { background: rgba(46,134,214,0.2); color: #9CCBF2; }
        .crm-main {
          flex: 1; display: flex; flex-direction: column; min-width: 0;
        }
        .crm-topbar {
          padding: 18px 28px 14px; display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid var(--line); background: var(--panel);
        }
        .crm-topbar h1 { font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 600; margin: 0; }
        .crm-content { flex: 1; overflow-y: auto; padding: 24px 28px 40px; }
        .crm-search {
          display: flex; align-items: center; gap: 8px; background: var(--paper);
          border: 1px solid var(--line); border-radius: 8px; padding: 7px 11px; width: 240px;
        }
        .crm-search input { border: none; background: transparent; outline: none; font-size: 13px; width: 100%; color: var(--ink); }
        .crm-btn {
          display: inline-flex; align-items: center; gap: 6px; background: var(--ink); color: #fff;
          border: none; padding: 9px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
          cursor: pointer; font-family: inherit;
        }
        .crm-btn:hover { background: #2a2f3b; }
        .crm-btn-gold { background: var(--gold); }
        .crm-btn-gold:hover { background: #256FB3; }
        .crm-icon-btn {
          background: transparent; border: none; cursor: pointer; color: var(--ink-soft);
          padding: 5px; border-radius: 6px; display: flex;
        }
        .crm-icon-btn:hover { background: var(--paper); color: var(--ink); }
        .crm-card {
          background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 16px;
        }
        .crm-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
        .crm-kpi-label { font-size: 11.5px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .crm-kpi-value { font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 500; }
        .crm-section-title {
          font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 600; margin: 0 0 12px;
        }
        .crm-two-col { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; }
        .crm-list-row {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 9px 0; border-bottom: 1px solid var(--line); font-size: 13px;
        }
        .crm-list-row:last-child { border-bottom: none; }
        table.crm-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        table.crm-table th {
          text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--ink-soft); font-weight: 600; padding: 8px 12px; border-bottom: 1px solid var(--line);
        }
        table.crm-table td { padding: 11px 12px; border-bottom: 1px solid var(--line); vertical-align: middle; }
        table.crm-table tr:hover td { background: rgba(0,0,0,0.015); }
        .crm-pill {
          display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px;
          font-size: 11.5px; font-weight: 600;
        }
        .crm-row-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.1s; }
        table.crm-table tr:hover .crm-row-actions { opacity: 1; }
        .crm-board { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 8px; }
        .crm-stage-col { min-width: 232px; flex-shrink: 0; }
        .crm-stage-head {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 12.5px; font-weight: 600; padding: 0 2px 10px;
        }
        .crm-stage-line { height: 3px; border-radius: 2px; margin-bottom: 10px; }
        .crm-deal-card {
          background: var(--panel); border: 1px solid var(--line); border-radius: 8px;
          padding: 11px 12px; margin-bottom: 9px; cursor: pointer; border-left-width: 3px; border-left-style: solid;
        }
        .crm-deal-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .crm-deal-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
        .crm-deal-meta { font-size: 11.5px; color: var(--ink-soft); display: flex; justify-content: space-between; }
        .crm-field { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: var(--ink-soft); margin-bottom: 12px; }
        .crm-field input, .crm-field select, .crm-field textarea {
          font-family: inherit; font-size: 13.5px; color: var(--ink); border: 1px solid var(--line);
          border-radius: 7px; padding: 8px 10px; outline: none; background: #fff;
        }
        .crm-field textarea { resize: vertical; min-height: 60px; }
        .crm-field input:focus, .crm-field select:focus, .crm-field textarea:focus { border-color: var(--gold); }
        .crm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
        .crm-modal-backdrop {
          position: fixed; inset: 0; background: rgba(20,20,24,0.4); display: flex;
          align-items: center; justify-content: center; z-index: 50;
        }
        .crm-modal {
          background: #fff; border-radius: 12px; width: 460px; max-width: 92vw; max-height: 86vh;
          display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.25);
        }
        .crm-modal-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--line); }
        .crm-modal-head h3 { font-family: 'Space Grotesk', sans-serif; font-size: 17px; margin: 0; }
        .crm-modal-body { padding: 18px 20px 20px; overflow-y: auto; }
        .crm-modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
        .crm-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--ink-soft); text-align: center; }
        .crm-empty-title { font-size: 14px; font-weight: 600; color: var(--ink); margin: 10px 0 3px; }
        .crm-empty-sub { font-size: 12.5px; }
        .crm-task-row { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--line); }
        .crm-task-row:last-child { border-bottom: none; }
        .crm-check-btn { background: none; border: none; cursor: pointer; padding: 2px; color: var(--ink-soft); flex-shrink: 0; margin-top: 1px; }
        .crm-check-btn.done { color: var(--sage); }
        .crm-overdue { color: var(--rust); font-weight: 600; }
        .crm-account-footer {
          margin-top: auto; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.09);
          display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-left: 10px; padding-right: 4px;
        }
        .crm-account-info { min-width: 0; }
        .crm-account-name { font-size: 13px; font-weight: 600; color: #E7E8EA; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .crm-account-role { display: flex; align-items: center; gap: 4px; font-size: 10.5px; color: #8B93A0; margin-top: 1px; }
        .crm-logout-btn {
          background: transparent; border: none; color: #B9BCC6; cursor: pointer; padding: 7px; border-radius: 7px; display: flex; flex-shrink: 0;
        }
        .crm-logout-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .crm-login-screen {
          width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--paper);
        }
        .crm-login-card {
          width: 340px; max-width: 90vw; background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
          padding: 30px 28px 26px; box-shadow: 0 20px 50px rgba(0,0,0,0.06);
        }
        .crm-login-logo { font-family: 'Space Grotesk', sans-serif; font-size: 21px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2px; margin-bottom: 4px; }
        .crm-login-logo span { color: var(--ink-soft); }
        .crm-login-sub { font-size: 12.5px; color: var(--ink-soft); margin: 0 0 22px; }
        .crm-password-row { position: relative; }
        .crm-password-row input { width: 100%; padding-right: 34px; }
        .crm-password-toggle {
          position: absolute; right: 8px; top: 50%; transform: translateY(-4px); background: none; border: none;
          color: var(--ink-soft); cursor: pointer; padding: 4px; display: flex;
        }
        .crm-login-error {
          display: flex; align-items: center; gap: 6px; background: var(--rust-soft); color: var(--rust);
          font-size: 12.5px; padding: 8px 10px; border-radius: 7px; margin: -2px 0 14px;
        }
        .crm-section-checks { display: flex; flex-direction: column; gap: 8px; }
        .crm-check-row {
          display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--ink);
          background: var(--paper); border: 1px solid var(--line); border-radius: 7px; padding: 8px 10px; cursor: pointer;
        }
        .crm-check-row input { cursor: pointer; }
        .crm-icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .crm-icon-btn:disabled:hover { background: transparent; color: var(--ink-soft); }
      `}</style>

      {!loggedIn ? (
        <LoginPage users={users} onLogin={persistSession} />
      ) : (
        <>
          <aside className="crm-sidebar">
            <div className="crm-logo">Vision<span>Guard</span></div>
            {nav.map((n) => (
              <button key={n.id} className={"crm-nav-item" + (view === n.id ? " active" : "")} onClick={() => setView(n.id)}>
                <n.icon size={16} /> {n.label}
              </button>
            ))}
            <div className="crm-account-footer">
              <div className="crm-account-info">
                <div className="crm-account-name">{currentUser.name}</div>
                <div className="crm-account-role">
                  {isAdmin ? <><ShieldCheck size={11} /> Admin</> : <><Lock size={11} /> {nav.length} of {SECTIONS.length} sections</>}
                </div>
              </div>
              <button className="crm-logout-btn" title="Log out" onClick={logOut}><LogOut size={16} /></button>
            </div>
          </aside>

          <div className="crm-main">
            {view === "dashboard" && (
              <Dashboard contacts={contacts} deals={deals} tasks={tasks} emails={emails} setView={setView} contactName={contactName} />
            )}
            {view === "contacts" && (
              <ContactsView
                contacts={contacts} setContacts={setContacts} deals={deals}
                query={query} setQuery={setQuery}
                editingContact={editingContact} setEditingContact={setEditingContact}
              />
            )}
            {view === "deals" && (
              <DealsView
                deals={deals} setDeals={setDeals} contacts={contacts}
                editingDeal={editingDeal} setEditingDeal={setEditingDeal} contactName={contactName}
              />
            )}
            {view === "tasks" && (
              <TasksView
                tasks={tasks} setTasks={setTasks} contacts={contacts} deals={deals}
                editingTask={editingTask} setEditingTask={setEditingTask}
                contactName={contactName} dealTitle={dealTitle}
              />
            )}
            {view === "emails" && (
              <EmailsView
                emails={emails} setEmails={setEmails} contacts={contacts}
                editingEmail={editingEmail} setEditingEmail={setEditingEmail} contactName={contactName}
              />
            )}
            {view === "admin" && isAdmin && (
              <AdminView users={users} setUsers={setUsers} currentUserId={sessionUserId} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Dashboard ---------------- */
function Dashboard({ contacts, deals, tasks, emails, setView, contactName }) {
  const openDeals = deals.filter((d) => d.stage !== "Won" && d.stage !== "Lost");
  const pipelineValue = openDeals.reduce((s, d) => s + Number(d.value || 0), 0);
  const wonThisMonth = deals.filter((d) => {
    if (d.stage !== "Won" || !d.closeDate) return false;
    const dt = new Date(d.closeDate + "T00:00:00");
    const now = new Date();
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  }).reduce((s, d) => s + Number(d.value || 0), 0);
  const upcomingTasks = tasks.filter((t) => !t.completed).sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const weekOut = new Date(); weekOut.setDate(weekOut.getDate() + 7);
  const dueThisWeek = tasks.filter((t) => !t.completed && t.dueDate && new Date(t.dueDate + "T00:00:00") <= weekOut);

  const stageData = STAGES.filter((s) => s !== "Lost").map((s) => ({
    stage: s,
    value: deals.filter((d) => d.stage === s).reduce((sum, d) => sum + Number(d.value || 0), 0),
  }));

  const recentEmails = [...emails].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);

  return (
    <>
      <div className="crm-topbar"><h1>Dashboard</h1></div>
      <div className="crm-content">
        <div className="crm-kpis">
          <div className="crm-card">
            <div className="crm-kpi-label">Open pipeline value</div>
            <div className="crm-kpi-value">{fmtMoney(pipelineValue)}</div>
          </div>
          <div className="crm-card">
            <div className="crm-kpi-label">Open deals</div>
            <div className="crm-kpi-value">{openDeals.length}</div>
          </div>
          <div className="crm-card">
            <div className="crm-kpi-label">Won this month</div>
            <div className="crm-kpi-value">{fmtMoney(wonThisMonth)}</div>
          </div>
          <div className="crm-card">
            <div className="crm-kpi-label">Tasks due in 7 days</div>
            <div className="crm-kpi-value">{dueThisWeek.length}</div>
          </div>
        </div>

        <div className="crm-two-col">
          <div className="crm-card">
            <p className="crm-section-title">Pipeline value by stage</p>
            {deals.length === 0 ? (
              <EmptyState icon={Briefcase} title="No deals yet" sub="Add a deal to see it charted here." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stageData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DEDFD8" vertical={false} />
                  <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "#565C6B" }} axisLine={{ stroke: "#DEDFD8" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#565C6B" }} axisLine={false} tickLine={false} tickFormatter={(v) => "$" + v / 1000 + "k"} />
                  <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #DEDFD8" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {stageData.map((entry) => <Cell key={entry.stage} fill={STAGE_COLOR[entry.stage]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="crm-card">
            <p className="crm-section-title">Upcoming tasks</p>
            {upcomingTasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="Nothing pending" sub="You're all caught up." />
            ) : (
              upcomingTasks.slice(0, 6).map((t) => (
                <div className="crm-list-row" key={t.id}>
                  <span>{t.title}</span>
                  <span className={isOverdue(t.dueDate) ? "crm-overdue" : ""}>{fmtDate(t.dueDate)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="crm-card" style={{ marginTop: 16 }}>
          <p className="crm-section-title">Recent email activity</p>
          {recentEmails.length === 0 ? (
            <EmptyState icon={Mail} title="No logged emails" sub="Log a customer email to track it here." />
          ) : (
            recentEmails.map((e) => (
              <div className="crm-list-row" key={e.id}>
                <span>{e.subject} — <span style={{ color: "var(--ink-soft)" }}>{contactName(e.contactId)}</span></span>
                <span style={{ color: "var(--ink-soft)" }}>{fmtDate(e.date)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------- Contacts ---------------- */
function ContactsView({ contacts, setContacts, deals, query, setQuery, editingContact, setEditingContact }) {
  const filtered = contacts.filter((c) =>
    (c.name + c.company + c.email).toLowerCase().includes(query.toLowerCase())
  );
  const dealCount = (id) => deals.filter((d) => d.contactId === id).length;

  const save = (data) => {
    if (data.id) setContacts(contacts.map((c) => (c.id === data.id ? data : c)));
    else setContacts([...contacts, { ...data, id: uid() }]);
    setEditingContact(null);
  };
  const remove = (id) => setContacts(contacts.filter((c) => c.id !== id));

  return (
    <>
      <div className="crm-topbar">
        <h1>Contacts</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <div className="crm-search"><Search size={14} /><input placeholder="Search contacts" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <button className="crm-btn crm-btn-gold" onClick={() => setEditingContact({})}><Plus size={15} /> Add contact</button>
        </div>
      </div>
      <div className="crm-content">
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="No contacts found" sub="Add your first contact to get started." />
        ) : (
          <table className="crm-table">
            <thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Deals</th><th></th></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.company || "—"}</td>
                  <td>{c.email || "—"}</td>
                  <td>{c.phone || "—"}</td>
                  <td>{dealCount(c.id)}</td>
                  <td>
                    <div className="crm-row-actions">
                      <button className="crm-icon-btn" onClick={() => setEditingContact(c)}><Pencil size={14} /></button>
                      <button className="crm-icon-btn" onClick={() => remove(c.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingContact && (
        <Modal title={editingContact.id ? "Edit contact" : "Add contact"} onClose={() => setEditingContact(null)}>
          <ContactForm initial={editingContact} onSave={save} onCancel={() => setEditingContact(null)} />
        </Modal>
      )}
    </>
  );
}

function ContactForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState({ name: "", company: "", email: "", phone: "", title: "", notes: "", ...initial });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (f.name.trim()) onSave(f); }}>
      <Field label="Name"><input required value={f.name} onChange={set("name")} placeholder="Jordan Kim" /></Field>
      <div className="crm-form-grid">
        <Field label="Company"><input value={f.company} onChange={set("company")} placeholder="Acme Co." /></Field>
        <Field label="Title"><input value={f.title} onChange={set("title")} placeholder="VP Ops" /></Field>
      </div>
      <div className="crm-form-grid">
        <Field label="Email"><input type="email" value={f.email} onChange={set("email")} placeholder="jordan@acme.com" /></Field>
        <Field label="Phone"><input value={f.phone} onChange={set("phone")} placeholder="(555) 010-0000" /></Field>
      </div>
      <Field label="Notes"><textarea value={f.notes} onChange={set("notes")} placeholder="Context, preferences, history…" /></Field>
      <div className="crm-modal-footer">
        <button type="button" className="crm-btn" style={{ background: "#EEF0EC", color: "var(--ink)" }} onClick={onCancel}>Cancel</button>
        <button type="submit" className="crm-btn crm-btn-gold">Save contact</button>
      </div>
    </form>
  );
}

/* ---------------- Deals ---------------- */
function DealsView({ deals, setDeals, contacts, editingDeal, setEditingDeal, contactName }) {
  const save = (data) => {
    if (data.id) setDeals(deals.map((d) => (d.id === data.id ? data : d)));
    else setDeals([...deals, { ...data, id: uid() }]);
    setEditingDeal(null);
  };
  const remove = (id) => { setDeals(deals.filter((d) => d.id !== id)); setEditingDeal(null); };

  return (
    <>
      <div className="crm-topbar">
        <h1>Deals</h1>
        <button className="crm-btn crm-btn-gold" onClick={() => setEditingDeal({})}><Plus size={15} /> Add deal</button>
      </div>
      <div className="crm-content">
        {deals.length === 0 ? (
          <EmptyState icon={Briefcase} title="No deals yet" sub="Add a deal to start building your pipeline." />
        ) : (
          <div className="crm-board">
            {STAGES.map((stage) => {
              const stageDeals = deals.filter((d) => d.stage === stage);
              const total = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0);
              return (
                <div className="crm-stage-col" key={stage}>
                  <div className="crm-stage-head">
                    <span>{stage} · {stageDeals.length}</span>
                    <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}>{fmtMoney(total)}</span>
                  </div>
                  <div className="crm-stage-line" style={{ background: STAGE_COLOR[stage] }} />
                  {stageDeals.map((d) => (
                    <div className="crm-deal-card" key={d.id} style={{ borderLeftColor: STAGE_COLOR[stage] }} onClick={() => setEditingDeal(d)}>
                      <div className="crm-deal-title">{d.title}</div>
                      <div className="crm-deal-meta">
                        <span>{contactName(d.contactId)}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtMoney(d.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingDeal && (
        <Modal title={editingDeal.id ? "Edit deal" : "Add deal"} onClose={() => setEditingDeal(null)}>
          <DealForm initial={editingDeal} contacts={contacts} onSave={save} onCancel={() => setEditingDeal(null)} onDelete={editingDeal.id ? () => remove(editingDeal.id) : null} />
        </Modal>
      )}
    </>
  );
}

function DealForm({ initial, contacts, onSave, onCancel, onDelete }) {
  const [f, setF] = useState({ title: "", contactId: contacts[0]?.id || "", value: "", stage: "Lead", closeDate: "", notes: "", ...initial });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (f.title.trim()) onSave(f); }}>
      <Field label="Deal title"><input required value={f.title} onChange={set("title")} placeholder="Acme — annual contract" /></Field>
      <div className="crm-form-grid">
        <Field label="Contact">
          <select value={f.contactId} onChange={set("contactId")}>
            <option value="">Unassigned</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Value ($)"><input type="number" min="0" value={f.value} onChange={set("value")} placeholder="12000" /></Field>
      </div>
      <div className="crm-form-grid">
        <Field label="Stage">
          <select value={f.stage} onChange={set("stage")}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Expected close date"><input type="date" value={f.closeDate} onChange={set("closeDate")} /></Field>
      </div>
      <Field label="Notes"><textarea value={f.notes} onChange={set("notes")} placeholder="Key details, next steps…" /></Field>
      <div className="crm-modal-footer" style={{ justifyContent: onDelete ? "space-between" : "flex-end" }}>
        {onDelete && <button type="button" className="crm-btn" style={{ background: "var(--rust-soft)", color: "var(--rust)" }} onClick={onDelete}>Delete deal</button>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="crm-btn" style={{ background: "#EEF0EC", color: "var(--ink)" }} onClick={onCancel}>Cancel</button>
          <button type="submit" className="crm-btn crm-btn-gold">Save deal</button>
        </div>
      </div>
    </form>
  );
}

/* ---------------- Tasks ---------------- */
function TasksView({ tasks, setTasks, contacts, deals, editingTask, setEditingTask, contactName, dealTitle }) {
  const save = (data) => {
    if (data.id) setTasks(tasks.map((t) => (t.id === data.id ? data : t)));
    else setTasks([...tasks, { ...data, id: uid(), completed: false }]);
    setEditingTask(null);
  };
  const remove = (id) => setTasks(tasks.filter((t) => t.id !== id));
  const toggle = (id) => setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));

  const sorted = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
  });

  return (
    <>
      <div className="crm-topbar">
        <h1>Tasks</h1>
        <button className="crm-btn crm-btn-gold" onClick={() => setEditingTask({})}><Plus size={15} /> Add task</button>
      </div>
      <div className="crm-content">
        <div className="crm-card">
          {sorted.length === 0 ? (
            <EmptyState icon={CheckSquare} title="No tasks yet" sub="Add a task to track your follow-ups." />
          ) : (
            sorted.map((t) => (
              <div className="crm-task-row" key={t.id}>
                <button className={"crm-check-btn" + (t.completed ? " done" : "")} onClick={() => toggle(t.id)}>
                  {t.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, textDecoration: t.completed ? "line-through" : "none", color: t.completed ? "var(--ink-soft)" : "var(--ink)" }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)", display: "flex", gap: 8, marginTop: 2 }}>
                    {t.dueDate && <span className={!t.completed && isOverdue(t.dueDate) ? "crm-overdue" : ""}>{!t.completed && isOverdue(t.dueDate) && <AlertCircle size={11} style={{ display: "inline", marginRight: 3, verticalAlign: -1 }} />}{fmtDate(t.dueDate)}</span>}
                    {t.contactId && <span>· {contactName(t.contactId)}</span>}
                    {t.dealId && <span>· {dealTitle(t.dealId)}</span>}
                  </div>
                </div>
                <div className="crm-row-actions">
                  <button className="crm-icon-btn" onClick={() => setEditingTask(t)}><Pencil size={14} /></button>
                  <button className="crm-icon-btn" onClick={() => remove(t.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editingTask && (
        <Modal title={editingTask.id ? "Edit task" : "Add task"} onClose={() => setEditingTask(null)}>
          <TaskForm initial={editingTask} contacts={contacts} deals={deals} onSave={save} onCancel={() => setEditingTask(null)} />
        </Modal>
      )}
    </>
  );
}

function TaskForm({ initial, contacts, deals, onSave, onCancel }) {
  const [f, setF] = useState({ title: "", dueDate: todayStr(), contactId: "", dealId: "", notes: "", ...initial });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (f.title.trim()) onSave(f); }}>
      <Field label="Task"><input required value={f.title} onChange={set("title")} placeholder="Send proposal follow-up" /></Field>
      <div className="crm-form-grid">
        <Field label="Due date"><input type="date" value={f.dueDate} onChange={set("dueDate")} /></Field>
        <Field label="Related contact">
          <select value={f.contactId} onChange={set("contactId")}>
            <option value="">None</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Related deal">
        <select value={f.dealId} onChange={set("dealId")}>
          <option value="">None</option>
          {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </Field>
      <Field label="Notes"><textarea value={f.notes} onChange={set("notes")} /></Field>
      <div className="crm-modal-footer">
        <button type="button" className="crm-btn" style={{ background: "#EEF0EC", color: "var(--ink)" }} onClick={onCancel}>Cancel</button>
        <button type="submit" className="crm-btn crm-btn-gold">Save task</button>
      </div>
    </form>
  );
}

/* ---------------- Emails ---------------- */
function EmailsView({ emails, setEmails, contacts, editingEmail, setEditingEmail, contactName }) {
  const save = (data) => {
    if (data.id) setEmails(emails.map((e) => (e.id === data.id ? data : e)));
    else setEmails([...emails, { ...data, id: uid() }]);
    setEditingEmail(null);
  };
  const remove = (id) => setEmails(emails.filter((e) => e.id !== id));
  const sorted = [...emails].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <>
      <div className="crm-topbar">
        <h1>Email Log</h1>
        <button className="crm-btn crm-btn-gold" onClick={() => setEditingEmail({})}><Plus size={15} /> Log email</button>
      </div>
      <div className="crm-content">
        {sorted.length === 0 ? (
          <EmptyState icon={Mail} title="No emails logged" sub="Log an email to keep a record with this contact." />
        ) : (
          <table className="crm-table">
            <thead><tr><th>Date</th><th>Subject</th><th>Contact</th><th>Direction</th><th></th></tr></thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id}>
                  <td>{fmtDate(e.date)}</td>
                  <td style={{ fontWeight: 600 }}>{e.subject}</td>
                  <td>{contactName(e.contactId)}</td>
                  <td>
                    <span className="crm-pill" style={{ background: e.direction === "Outbound" ? "var(--gold-soft)" : "var(--sage-soft)", color: e.direction === "Outbound" ? "#1B5FA0" : "var(--sage)" }}>
                      {e.direction}
                    </span>
                  </td>
                  <td>
                    <div className="crm-row-actions">
                      <button className="crm-icon-btn" onClick={() => setEditingEmail(e)}><Pencil size={14} /></button>
                      <button className="crm-icon-btn" onClick={() => remove(e.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingEmail && (
        <Modal title={editingEmail.id ? "Edit email log" : "Log email"} onClose={() => setEditingEmail(null)}>
          <EmailForm initial={editingEmail} contacts={contacts} onSave={save} onCancel={() => setEditingEmail(null)} />
        </Modal>
      )}
    </>
  );
}

/* ---------------- Admin ---------------- */
function AdminView({ users, setUsers, currentUserId }) {
  const [editingUser, setEditingUser] = useState(null);
  const adminCount = users.filter((u) => u.role === "admin").length;

  const save = (data) => {
    const normalized = { ...data, unlockedSections: data.role === "admin" ? [...SECTION_IDS] : (data.unlockedSections || []) };
    if (data.id) setUsers(users.map((u) => (u.id === data.id ? normalized : u)));
    else setUsers([...users, { ...normalized, id: uid() }]);
    setEditingUser(null);
  };
  const remove = (id) => {
    const target = users.find((u) => u.id === id);
    if (target?.role === "admin" && adminCount <= 1) return;
    setUsers(users.filter((u) => u.id !== id));
    setEditingUser(null);
  };

  return (
    <>
      <div className="crm-topbar">
        <h1>Admin</h1>
        <button className="crm-btn crm-btn-gold" onClick={() => setEditingUser({ role: "user", unlockedSections: ["dashboard"] })}>
          <Plus size={15} /> Add user
        </button>
      </div>
      <div className="crm-content">
        <div className="crm-card">
          <p className="crm-section-title">Team & access</p>
          <table className="crm-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Unlocked sections</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => {
                const isSoleAdmin = u.role === "admin" && adminCount <= 1;
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>
                      {u.name}{u.id === currentUserId && <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}> (you)</span>}
                    </td>
                    <td style={{ color: "var(--ink-soft)" }}>{u.email || "—"}</td>
                    <td>
                      <span className="crm-pill" style={{ background: u.role === "admin" ? "var(--gold-soft)" : "#EEF0EC", color: u.role === "admin" ? "#1B5FA0" : "var(--ink-soft)" }}>
                        {u.role === "admin" ? <><ShieldCheck size={11} style={{ marginRight: 3, verticalAlign: -1 }} />Admin</> : "Team member"}
                      </span>
                    </td>
                    <td>
                      {u.role === "admin"
                        ? "All sections"
                        : (u.unlockedSections?.length
                          ? u.unlockedSections.map((id) => SECTIONS.find((s) => s.id === id)?.label).filter(Boolean).join(", ")
                          : <span style={{ color: "var(--ink-soft)" }}>None — locked out</span>)}
                    </td>
                    <td>
                      <div className="crm-row-actions">
                        <button className="crm-icon-btn" onClick={() => setEditingUser(u)}><Pencil size={14} /></button>
                        <button className="crm-icon-btn" disabled={isSoleAdmin} onClick={() => remove(u.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <Modal title={editingUser.id ? "Edit user" : "Add user"} onClose={() => setEditingUser(null)}>
          <UserForm
            initial={editingUser}
            users={users}
            onSave={save}
            onCancel={() => setEditingUser(null)}
            onDelete={editingUser.id ? () => remove(editingUser.id) : null}
            isSoleAdmin={editingUser.role === "admin" && adminCount <= 1}
          />
        </Modal>
      )}
    </>
  );
}

function UserForm({ initial, users, onSave, onCancel, onDelete, isSoleAdmin }) {
  const isNew = !initial.id;
  const [f, setF] = useState({ name: "", email: "", role: "user", unlockedSections: ["dashboard"], ...initial, password: "", confirmPassword: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleSection = (id) => {
    setF((prev) => {
      const has = (prev.unlockedSections || []).includes(id);
      return { ...prev, unlockedSections: has ? prev.unlockedSections.filter((s) => s !== id) : [...(prev.unlockedSections || []), id] };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!f.name.trim() || !f.email.trim()) return;

    const emailTaken = (users || []).some((u) => u.id !== f.id && normEmail(u.email) === normEmail(f.email));
    if (emailTaken) { setFormError("Another user already has that email."); return; }
    if (isNew && !f.password) { setFormError("Set a password for this new user."); return; }
    if (f.password && f.password.length < 6) { setFormError("Password must be at least 6 characters."); return; }
    if (f.password && f.password !== f.confirmPassword) { setFormError("Passwords don't match."); return; }

    setSaving(true);
    let passwordHash = f.passwordHash;
    let passwordSalt = f.passwordSalt;
    if (f.password) {
      passwordSalt = randomSalt();
      passwordHash = await hashPassword(f.password, passwordSalt);
    }
    setSaving(false);

    const { password, confirmPassword, ...rest } = f;
    onSave({ ...rest, email: f.email.trim(), passwordHash, passwordSalt });
  };

  return (
    <form onSubmit={submit}>
      <Field label="Name"><input required value={f.name} onChange={set("name")} placeholder="Jamie Fox" /></Field>
      <Field label="Email (used to log in)"><input type="email" required value={f.email} onChange={set("email")} placeholder="jamie@company.com" /></Field>
      <div className="crm-form-grid">
        <Field label={isNew ? "Password" : "New password (optional)"}>
          <input type="password" value={f.password} onChange={set("password")} placeholder={isNew ? "At least 6 characters" : "Leave blank to keep current"} />
        </Field>
        <Field label="Confirm password">
          <input type="password" value={f.confirmPassword} onChange={set("confirmPassword")} placeholder="Repeat password" />
        </Field>
      </div>
      <Field label="Role">
        <select value={f.role} onChange={set("role")} disabled={isSoleAdmin}>
          <option value="user">Team member</option>
          <option value="admin">Admin</option>
        </select>
      </Field>
      {f.role === "user" ? (
        <Field label="Unlocked sections">
          <div className="crm-section-checks">
            {SECTIONS.map((s) => (
              <label className="crm-check-row" key={s.id}>
                <input type="checkbox" checked={(f.unlockedSections || []).includes(s.id)} onChange={() => toggleSection(s.id)} />
                <s.icon size={14} /> {s.label}
              </label>
            ))}
          </div>
        </Field>
      ) : (
        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 14px" }}>
          Admins automatically see every section, plus this Admin panel.
        </p>
      )}
      {formError && <div className="crm-login-error"><AlertCircle size={13} /> {formError}</div>}
      <div className="crm-modal-footer" style={{ justifyContent: onDelete ? "space-between" : "flex-end" }}>
        {onDelete && (
          <button type="button" className="crm-btn" style={{ background: "var(--rust-soft)", color: "var(--rust)" }} disabled={isSoleAdmin} onClick={onDelete}>
            Remove user
          </button>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="crm-btn" style={{ background: "#EEF0EC", color: "var(--ink)" }} onClick={onCancel}>Cancel</button>
          <button type="submit" className="crm-btn crm-btn-gold" disabled={saving}>{saving ? "Saving…" : "Save user"}</button>
        </div>
      </div>
    </form>
  );
}

function EmailForm({ initial, contacts, onSave, onCancel }) {
  const [f, setF] = useState({ subject: "", contactId: contacts[0]?.id || "", date: todayStr(), direction: "Outbound", summary: "", ...initial });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (f.subject.trim()) onSave(f); }}>
      <Field label="Subject"><input required value={f.subject} onChange={set("subject")} placeholder="Re: Proposal questions" /></Field>
      <div className="crm-form-grid">
        <Field label="Contact">
          <select value={f.contactId} onChange={set("contactId")}>
            {contacts.length === 0 && <option value="">No contacts yet</option>}
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Date"><input type="date" value={f.date} onChange={set("date")} /></Field>
      </div>
      <Field label="Direction">
        <select value={f.direction} onChange={set("direction")}>
          <option>Outbound</option>
          <option>Inbound</option>
        </select>
      </Field>
      <Field label="Summary"><textarea value={f.summary} onChange={set("summary")} placeholder="What was discussed…" /></Field>
      <div className="crm-modal-footer">
        <button type="button" className="crm-btn" style={{ background: "#EEF0EC", color: "var(--ink)" }} onClick={onCancel}>Cancel</button>
        <button type="submit" className="crm-btn crm-btn-gold">Save log</button>
      </div>
    </form>
  );
}
