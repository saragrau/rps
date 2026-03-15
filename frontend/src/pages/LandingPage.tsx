import React from 'react';
import { Leaderboard } from '../components/Leaderboard';
import { MatchList } from '../components/MatchList';

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="site-header">
        <h1>RPS League</h1>
        <p className="site-subtitle">Rock · Paper · Scissors</p>
      </header>

      <div className="panels">
        <Leaderboard />
        <MatchList />
      </div>
    </main>
  );
}
