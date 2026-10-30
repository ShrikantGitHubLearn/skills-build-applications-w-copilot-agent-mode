import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = {
  teamName: string;
  totalPoints: number;
  rank: number;
};

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard');
        if (!active) return;
        setEntries(response.leaderboard ?? []);
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load leaderboard');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <CapabilityCard title="Leaderboard" description="Compare team point totals."><p role="status">Loading leaderboard...</p></CapabilityCard>;
  }

  if (error) {
    return <CapabilityCard title="Leaderboard" description="Compare team point totals."><div role="alert">Unable to load leaderboard.</div></CapabilityCard>;
  }

  if (!entries.length) {
    return <CapabilityCard title="Leaderboard" description="Compare team point totals."><p>No leaderboard</p></CapabilityCard>;
  }

  return <CapabilityCard title="Leaderboard" description="Compare team point totals."><ol>
    {entries.map((entry) => (
      <li key={`${entry.teamName}-${entry.rank}`}>
        #{entry.rank} {entry.teamName}: {entry.totalPoints} points
      </li>
    ))}
  </ol></CapabilityCard>;
}
