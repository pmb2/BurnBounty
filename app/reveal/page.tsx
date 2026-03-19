import { redirect } from 'next/navigation';

export default function RevealRedirectPage() {
  redirect('/dashboard?tab=play');
}
