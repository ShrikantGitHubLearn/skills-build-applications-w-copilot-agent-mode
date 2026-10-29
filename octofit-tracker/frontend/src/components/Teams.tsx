import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type TeamRecord = {
  name: string;
  members: string[];
};

export default function Teams() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await getJson<{ teams: TeamRecord[] }>('/api/teams');
        if (!active) return;
        setTeams(response.teams ?? []);
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load teams');
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
    return <CapabilityCard title="Teams" description="Manage teams and members."><p role="status">Loading teams...</p></CapabilityCard>;
  }

  if (error) {
    return <CapabilityCard title="Teams" description="Manage teams and members."><div role="alert">Unable to load teams.</div></CapabilityCard>;
  }

  if (!teams.length) {
    return <CapabilityCard title="Teams" description="Manage teams and members."><p>No teams</p></CapabilityCard>;
  }

  return <CapabilityCard title="Teams" description="Manage teams and members."><ul className="list-group list-group-flush">
    {teams.map((team) => (
      <li key={team.name} className="list-group-item">
        <strong>{team.name}</strong>
        <div>{team.members.join(', ') || 'No members yet'}</div>
      </li>
    ))}
  </ul></CapabilityCard>;
}
