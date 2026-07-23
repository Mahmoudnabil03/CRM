import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const idx = line.indexOf('=');
        const key = line.slice(0, idx);
        let value = line.slice(idx + 1);
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        return [key, value];
      })
  );
}

function getEnv() {
  const root = path.dirname(new URL(import.meta.url).pathname);
  const envPath = path.resolve(root, '..', '.env.local');
  const fallbackPath = path.resolve(root, '..', '.env');
  const envFile = fs.existsSync(envPath) ? loadEnvFile(envPath) : loadEnvFile(fallbackPath);
  return { ...process.env, ...envFile };
}

const env = getEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = env.CRM_ADMIN_EMAIL;
const adminPassword = env.CRM_ADMIN_PASSWORD;
const adminName = env.CRM_ADMIN_NAME || 'VisionGuard Admin';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

if (!adminEmail || !adminPassword) {
  console.error('Missing CRM_ADMIN_EMAIL or CRM_ADMIN_PASSWORD in environment.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log('Creating admin user:', adminEmail);

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { name: adminName },
  });

  if (error) {
    if (error.message?.toLowerCase().includes('already exists')) {
      console.warn('Admin user already exists in Supabase Auth.');
      process.exit(0);
    }

    console.error('Failed to create admin user:', error.message || error);
    process.exit(1);
  }

  console.log('Admin user created successfully.');
  console.log('User ID:', data.user?.id || 'unknown');
  console.log('Make sure your Supabase callback URL is set to https://crm.visionguardeg.com');
}

main().catch((error) => {
  console.error('Error seeding admin user:', error);
  process.exit(1);
});
