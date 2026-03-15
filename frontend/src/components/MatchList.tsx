import React, { useState, useMemo } from 'react';
import { useAsync } from '../hooks/useAsync';
import { useLiveMatches } from '../hooks/useLiveMatches';
import {
  getLatestMatches,
  getMatchesByDay,
  getMatchesByDateRange,
  getMatchesByPlayer,
} from '../api/client';
import type { MatchResult } from '../api/types';

const TODAY = new Date().toISOString().slice(0, 10);

const MOVE_EMOJI: Record<string, string> = {
  ROCK: '🪨',
  PAPER: '📄',
  SCISSORS: '✂️',
};

type FilterMode = 'latest' | 'day' | 'range' | 'player';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MatchRow({ match }: { match: MatchResult }) {
  const { playerA, playerB, winner, winnerName, playedAt } = match;
  const time = new Date(playedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const date = new Date(playedAt).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });

  return (
    <li className="match-row">
      <span className="match-time">
        {date} {time}
      </span>
      <span className={`match-player ${winner === 'A' ? 'winner' : winner === 'TIE' ? 'tie' : ''}`}>
        {playerA.name}
        <span className="move">{MOVE_EMOJI[playerA.played]}</span>
      </span>
      <span className="match-vs">vs</span>
      <span className={`match-player ${winner === 'B' ? 'winner' : winner === 'TIE' ? 'tie' : ''}`}>
        <span className="move">{MOVE_EMOJI[playerB.played]}</span>
        {playerB.name}
      </span>
      <span className="match-result">
        {winner === 'TIE' ? 'Tie' : `${winnerName} wins`}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MatchList() {
  const [filterMode, setFilterMode] = useState<FilterMode>('latest');
  const [singleDate, setSingleDate] = useState(TODAY);
  const [startDate, setStartDate] = useState(TODAY);
  const [endDate, setEndDate] = useState(TODAY);
  const [playerInput, setPlayerInput] = useState('');
  const [submittedPlayer, setSubmittedPlayer] = useState('');

  // Fetch matches based on the active filter.
  const { data: historicalMatches, loading, error } = useAsync<MatchResult[]>(
    () => {
      if (filterMode === 'day') return getMatchesByDay(singleDate);
      if (filterMode === 'range') return getMatchesByDateRange(startDate, endDate);
      if (filterMode === 'player' && submittedPlayer) return getMatchesByPlayer(submittedPlayer);
      return getLatestMatches(50);
    },
    [filterMode, singleDate, startDate, endDate, submittedPlayer],
  );

  // Live matches only shown in "latest" mode — prepended as they arrive.
  const { liveMatches, connected } = useLiveMatches();

  const displayedMatches = useMemo<MatchResult[]>(() => {
    if (filterMode === 'latest') {
      // Merge live matches (newest) with historical, deduplicate by gameId.
      const seen = new Set<string>();
      const merged: MatchResult[] = [];
      for (const m of [...liveMatches, ...(historicalMatches ?? [])]) {
        if (!seen.has(m.gameId)) {
          seen.add(m.gameId);
          merged.push(m);
        }
      }
      return merged.slice(0, 50);
    }
    return historicalMatches ?? [];
  }, [filterMode, liveMatches, historicalMatches]);

  const isRangeValid =
    filterMode !== 'range' || (startDate <= endDate);

  return (
    <section className="panel match-list-panel">
      <h2 className="panel-title">
        Latest Matches
        {filterMode === 'latest' && connected && (
          <span className="live-badge">● LIVE</span>
        )}
      </h2>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-group mode-tabs">
          {(['latest', 'day', 'range', 'player'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              className={`tab-btn ${filterMode === mode ? 'active' : ''}`}
              onClick={() => setFilterMode(mode)}
            >
              {mode === 'latest' ? 'Latest' : mode === 'day' ? 'By Day' : mode === 'range' ? 'Date Range' : 'By Player'}
            </button>
          ))}
        </div>

        {filterMode === 'day' && (
          <div className="filter-group">
            <label htmlFor="ml-date">Date</label>
            <input
              id="ml-date"
              type="date"
              value={singleDate}
              max={TODAY}
              onChange={(e) => setSingleDate(e.target.value)}
            />
          </div>
        )}

        {filterMode === 'range' && (
          <>
            <div className="filter-group">
              <label htmlFor="ml-start">From</label>
              <input
                id="ml-start"
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="ml-end">To</label>
              <input
                id="ml-end"
                type="date"
                value={endDate}
                min={startDate}
                max={TODAY}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {!isRangeValid && (
              <p className="error-state">Start date must be before end date.</p>
            )}
          </>
        )}

        {filterMode === 'player' && (
          <form
            className="filter-group"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmittedPlayer(playerInput.trim());
            }}
          >
            <label htmlFor="ml-player">Player</label>
            <input
              id="ml-player"
              type="text"
              placeholder="Exact name…"
              value={playerInput}
              onChange={(e) => setPlayerInput(e.target.value)}
            />
            <button type="submit" className="tab-btn">Search</button>
          </form>
        )}
      </div>

      {/* Results */}
      {loading && <p className="loading-state">Loading matches…</p>}
      {error && <p className="error-state">Error: {error}</p>}
      {!loading && !error && displayedMatches.length === 0 && (
        <p className="empty-state">No matches found.</p>
      )}
      {!loading && !error && displayedMatches.length > 0 && (
        <ul className="match-list">
          {displayedMatches.map((m) => (
            <MatchRow key={m.gameId} match={m} />
          ))}
        </ul>
      )}
    </section>
  );
}
