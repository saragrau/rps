import React, { useState, useMemo } from 'react';
import { useAsync } from '../hooks/useAsync';
import { getTodayLeaderboard, getLeaderboardByDate } from '../api/client';
import type { LeaderboardEntry } from '../api/types';

const TODAY = new Date().toISOString().slice(0, 10);
const TOP_N = 20;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LeaderboardRow({
  entry,
  rank,
}: {
  entry: LeaderboardEntry;
  rank: number;
}) {
  return (
    <tr className={rank <= 3 ? `rank-${rank}` : undefined}>
      <td className="rank">{rank}</td>
      <td className="player-name">{entry.playerName}</td>
      <td className="stat wins">{entry.wins}</td>
      <td className="stat losses">{entry.losses}</td>
      <td className="stat ties">{entry.ties}</td>
      <td className="stat played">{entry.played}</td>
      <td className="stat win-rate">{(entry.winRate * 100).toFixed(1)}%</td>
    </tr>
  );
}

function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return <p className="empty-state">No matches found for this day.</p>;
  }
  return (
    <table className="leaderboard-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>W</th>
          <th>L</th>
          <th>T</th>
          <th>Played</th>
          <th>Win %</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, i) => (
          <LeaderboardRow key={entry.playerName} entry={entry} rank={i + 1} />
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function Leaderboard() {
  const [selectedDate, setSelectedDate] = useState(TODAY);

  const isToday = selectedDate === TODAY;

  const { data, loading, error } = useAsync<LeaderboardEntry[]>(
    () => (isToday ? getTodayLeaderboard() : getLeaderboardByDate(selectedDate)),
    [selectedDate, isToday],
  );

  const displayedEntries = useMemo(() => {
    if (!data) return [];
    return data.slice(0, TOP_N);
  }, [data]);

  return (
    <section className="panel leaderboard-panel">
      <h2 className="panel-title">
        Leaderboard
        {isToday ? ' — Today' : ` — ${selectedDate}`}
      </h2>

      <div className="filter-bar">
        <div className="filter-group">
          <label htmlFor="lb-date">Day</label>
          <input
            id="lb-date"
            type="date"
            value={selectedDate}
            max={TODAY}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {loading && <p className="loading-state">Loading leaderboard…</p>}
      {error && <p className="error-state">Error: {error}</p>}
      {!loading && !error && <LeaderboardTable entries={displayedEntries} />}
    </section>
  );
}
