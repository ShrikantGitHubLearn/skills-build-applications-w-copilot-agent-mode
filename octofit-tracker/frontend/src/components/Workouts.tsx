import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = {
  title: string;
  focus: string;
  reason?: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await getJson<{ suggestions: WorkoutSuggestion[] }>('/api/workouts/suggestions/mona@example.com');
        if (!active) return;
        setSuggestions(response.suggestions ?? []);
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load suggestions');
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
    return <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns."><p role="status">Loading workout suggestions...</p></CapabilityCard>;
  }

  if (error) {
    return <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns."><div role="alert">Unable to load workout suggestions.</div></CapabilityCard>;
  }

  if (!suggestions.length) {
    return <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns."><p>No workout suggestions</p></CapabilityCard>;
  }

  return <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns."><ul className="list-group list-group-flush">
    {suggestions.map((suggestion) => (
      <li key={suggestion.title} className="list-group-item">
        <strong>{suggestion.title}</strong> — {suggestion.focus}
        {suggestion.reason ? <div>{suggestion.reason}</div> : null}
      </li>
    ))}
  </ul></CapabilityCard>;
}
