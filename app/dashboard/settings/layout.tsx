import { ProtectedPage } from '@/components/protected-page';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedPage permission="settings.company">{children}</ProtectedPage>
  );
}
