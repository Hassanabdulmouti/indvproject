import ProtectedLayout from '@/components/protectedLayout';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}