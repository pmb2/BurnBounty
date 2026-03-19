import { redirect } from 'next/navigation';

type ArmoryPageProps = {
  searchParams?: {
    tab?: string;
  };
};

export default function ArmoryPage({ searchParams }: ArmoryPageProps) {
  const tab = searchParams?.tab;
  if (tab === 'market' || tab === 'ledger') {
    redirect(`/dashboard?tab=${tab}`);
  }
  redirect('/dashboard?tab=inventory');
}
