import { redirect } from 'next/navigation';

export default function CommitRedirectPage() {
  redirect('/play?step=commit');
}
