import Link from 'next/link';
import PlayClientPage from '@/app/play/play-client';
import ArmoryClientPage from '@/app/armory/armory-client';
import { ActiveBoardBackdrop } from '@/components/ActiveBoardBackdrop';
import { UserSettingsPanel } from '@/components/UserSettingsPanel';
import { cn } from '@/lib/utils';

type DashboardPageProps = {
  searchParams?: {
    tab?: string;
  };
};

type DashboardTab = 'play' | 'inventory' | 'market' | 'ledger' | 'settings';

const tabs: Array<{ id: DashboardTab; label: string }> = [
  { id: 'play', label: 'Play' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'market', label: 'Market' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'settings', label: 'Settings' }
];

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  const selected = (searchParams?.tab || 'play') as DashboardTab;
  const tab: DashboardTab = tabs.some((entry) => entry.id === selected) ? selected : 'play';

  return (
    <main>
      <section className="bounty-board-bg relative mx-auto mt-6 max-w-6xl rounded-2xl px-5 py-4">
        <ActiveBoardBackdrop density="low" />
        <div className="relative z-10 flex flex-wrap gap-2">
          {tabs.map((entry) => (
            <Link
              key={entry.id}
              href={`/dashboard?tab=${entry.id}`}
              className={cn(
                'rounded-md border px-3 py-2 text-sm',
                tab === entry.id
                  ? 'border-amber-400/60 bg-amber-500/20 text-amber-100'
                  : 'border-border/70 bg-black/20 text-zinc-200 hover:bg-black/30'
              )}
            >
              {entry.label}
            </Link>
          ))}
        </div>
      </section>

      {tab === 'play' && <PlayClientPage />}
      {(tab === 'inventory' || tab === 'market' || tab === 'ledger') && <ArmoryClientPage initialTab={tab} />}
      {tab === 'settings' && (
        <main className="mx-auto max-w-5xl px-6 py-10">
          <UserSettingsPanel />
        </main>
      )}
    </main>
  );
}
