import { redirect } from 'next/navigation';

export default function TradingRedirectPage() {
  redirect('/dashboard?tab=market');
}
