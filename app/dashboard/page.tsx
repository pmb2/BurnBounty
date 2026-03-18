import { redirect } from 'next/navigation';

export default function DashboardRedirectPage() {
  redirect('/armory?tab=ledger');
}
