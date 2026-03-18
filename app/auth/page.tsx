import { WalletAuthPanel } from '@/components/WalletAuthPanel';

export default function AuthPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold">Hunter Authentication</h1>
      <p className="mt-2 text-zinc-300">Sign in with your BCH wallet. No passwords. No custody. Signature-only login.</p>
      <div className="mt-6">
        <WalletAuthPanel />
      </div>
    </main>
  );
}
