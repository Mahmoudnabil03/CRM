import { AuthGate } from '@/components/AuthGate';
import { CrmShell } from '@/components/CrmShell';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <AuthGate>
      <CrmShell />
    </AuthGate>
  );
}
