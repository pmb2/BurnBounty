import { WalletAuthPanel } from '@/components/WalletAuthPanel';

export default function AuthPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold">Hunter Access Hub</h1>
      <p className="mt-2 text-zinc-300">
        Hybrid onboarding: quick-start embedded wallet for new players, external BCH wallet signature login for power users,
        and optional MetaMask Snap compatibility.
      </p>
      <div className="mt-6">
        <WalletAuthPanel />
      </div>
    </main>
  );
}
