import { redirect } from 'next/navigation';

export default function TradingRedirectPage() {
  redirect('/armory?tab=market');
}
