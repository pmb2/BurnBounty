import { ActiveBoardBackdrop } from '@/components/ActiveBoardBackdrop';
import { UserSettingsPanel } from '@/components/UserSettingsPanel';

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <section className="bounty-board-bg relative mb-6 rounded-3xl px-6 py-8">
        <ActiveBoardBackdrop density="low" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">Hunter Settings</h1>
          <p className="mt-2 text-zinc-200">Profile, linked wallets, and session security controls.</p>
        </div>
      </section>
      <UserSettingsPanel />
    </main>
  );
}
