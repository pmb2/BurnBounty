import { Card } from '@/components/Card';
import { getProfile } from '@/lib/profile-data';

export default async function ProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const data = await getProfile(address);
  const profile = data?.profile || { address, display_name: 'Unknown Hunter', bio: 'No profile found.', score: 0 };
  const cards = data?.cards || [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold">{profile.display_name}</h1>
      <p className="mt-1 text-zinc-300">{profile.address}</p>
      <p className="mt-2 text-zinc-400">{profile.bio}</p>
      <p className="mt-2 text-sm text-amber-200">Hunter score: {profile.score}</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card: any) => <Card key={card.nftId} card={card} />)}
        {cards.length === 0 && <p className="text-zinc-400">No public cards yet.</p>}
      </div>
    </main>
  );
}
