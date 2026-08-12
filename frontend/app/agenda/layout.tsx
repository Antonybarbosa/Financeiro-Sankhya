import { AppShell } from '@/components/layout/AppShell';

export default function AgendaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
