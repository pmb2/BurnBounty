import { WalletAuthPanel } from '@/components/WalletAuthPanel';
import { ActiveBoardBackdrop } from '@/components/ActiveBoardBackdrop';

type AuthPageProps = {
  searchParams?: {
    mode?: string;
    next?: string;
  };
};

export default function AuthPage({ searchParams }: AuthPageProps) {
  const mode = searchParams?.mode === 'external' || searchParams?.mode === 'snap' ? searchParams.mode : 'embedded';
  const nextPath = searchParams?.next?.startsWith('/') ? searchParams.next : '/play';

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="bounty-board-bg relative rounded-3xl px-6 py-8">
        <ActiveBoardBackdrop density="medium" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">Hunter Access Hub</h1>
          <p className="mt-2 text-zinc-200">
            Embedded wallet is the default path for fastest activation. External BCH wallet signature login is available for power users.
          </p>
        </div>
      </div>
      <div className="bounty-panel mt-6 rounded-2xl p-4">
        <WalletAuthPanel defaultMode={mode} nextPath={nextPath} />
      </div>
    </main>
  );
}
