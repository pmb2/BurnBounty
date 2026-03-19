import { redirect } from 'next/navigation';

export default function CommitRedirectPage() {
  redirect('/dashboard?tab=play');
}
