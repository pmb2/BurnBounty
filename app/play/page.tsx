import PlayClientPage from './play-client';

type PlayPageProps = {
  searchParams?: {
    step?: string;
  };
};

export default function PlayPage({ searchParams }: PlayPageProps) {
  return <PlayClientPage initialStep={searchParams?.step || null} />;
}
