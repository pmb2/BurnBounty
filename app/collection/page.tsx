import { redirect } from 'next/navigation';

export default function CollectionRedirectPage() {
  redirect('/armory?tab=inventory');
}
