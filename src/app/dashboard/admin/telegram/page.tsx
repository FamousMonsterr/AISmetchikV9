import { redirect } from 'next/navigation';

export default function LegacyTelegramAdminPage() {
  redirect('/dashboard/admin/bots?tab=telegram');
}
