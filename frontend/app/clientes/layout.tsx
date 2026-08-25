import { AppShell } from '@/components/layout/AppShell';

export default function ClientesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
