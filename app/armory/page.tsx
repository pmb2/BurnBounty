import ArmoryClientPage from './armory-client';

type ArmoryPageProps = {
  searchParams?: {
    tab?: string;
  };
};

export default function ArmoryPage({ searchParams }: ArmoryPageProps) {
  return <ArmoryClientPage initialTab={searchParams?.tab || null} />;
}
