import { redirect } from 'next/navigation';

export default function CollectionRedirectPage() {
  redirect('/dashboard?tab=inventory');
}
