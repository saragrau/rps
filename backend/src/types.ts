// ---------------------------------------------------------------------------
// Core domain types for the Rock-Paper-Scissors league
// ---------------------------------------------------------------------------

export type Move = 'ROCK' | 'PAPER' | 'SCISSORS';

export type WinnerSide = 'A' | 'B' | 'TIE';

export interface Player {
  name: string;
  played: Move;
}

/** Raw shape returned by the external Reaktor API */
export interface GameResult {
  type: 'GAME_RESULT';
  gameId: string;
  /** Unix timestamp in milliseconds */
  time: number;
  playerA: Player;
  playerB: Player;
}

/** Paginated response from GET /history */
export interface HistoryPage {
  data: GameResult[];
  cursor?: string;
}

// ---------------------------------------------------------------------------
// Computed / enriched types used internally and exposed by our API
// ---------------------------------------------------------------------------

/** GameResult with the computed winner attached */
export interface MatchResult {
  gameId: string;
  /** ISO-8601 date-time string derived from `time` */
  playedAt: string;
  playerA: Player;
  playerB: Player;
  /** 'A' | 'B' | 'TIE' */
  winner: WinnerSide;
  /** Name of the winning player, or null on a tie */
  winnerName: string | null;
}

export interface LeaderboardEntry {
  playerName: string;
  wins: number;
  losses: number;
  ties: number;
  /** Total games played */
  played: number;
  /** Win rate as a value between 0 and 1 */
  winRate: number;
}

// ---------------------------------------------------------------------------
// RPS game logic utility
// ---------------------------------------------------------------------------

/**
 * Determine which side wins a single round.
 *
 * Rules:
 *   ROCK     beats SCISSORS
 *   SCISSORS beats PAPER
 *   PAPER    beats ROCK
 */
export function determineWinner(moveA: Move, moveB: Move): WinnerSide {
  if (moveA === moveB) return 'TIE';

  const beats: Record<Move, Move> = {
    ROCK: 'SCISSORS',
    SCISSORS: 'PAPER',
    PAPER: 'ROCK',
  };

  return beats[moveA] === moveB ? 'A' : 'B';
}

/**
 * Convert a raw GameResult into a MatchResult by computing the winner.
 */
export function toMatchResult(game: GameResult): MatchResult {
  const winner = determineWinner(game.playerA.played, game.playerB.played);
  return {
    gameId: game.gameId,
    playedAt: new Date(game.time).toISOString(),
    playerA: game.playerA,
    playerB: game.playerB,
    winner,
    winnerName:
      winner === 'A'
        ? game.playerA.name
        : winner === 'B'
        ? game.playerB.name
        : null,
  };
}

/**
 * Aggregate an array of MatchResults into leaderboard entries, one per
 * unique player name.  Results are sorted by wins descending, then by
 * win-rate descending.
 */
export function buildLeaderboard(matches: MatchResult[]): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>();

  const getEntry = (name: string): LeaderboardEntry => {
    if (!map.has(name)) {
      map.set(name, { playerName: name, wins: 0, losses: 0, ties: 0, played: 0, winRate: 0 });
    }
    // Non-null assertion is safe: we just set it above.
    return map.get(name)!;
  };

  for (const match of matches) {
    const a = getEntry(match.playerA.name);
    const b = getEntry(match.playerB.name);

    a.played += 1;
    b.played += 1;

    if (match.winner === 'A') {
      a.wins += 1;
      b.losses += 1;
    } else if (match.winner === 'B') {
      b.wins += 1;
      a.losses += 1;
    } else {
      a.ties += 1;
      b.ties += 1;
    }
  }

  const entries = Array.from(map.values()).map((e) => ({
    ...e,
    winRate: e.played > 0 ? e.wins / e.played : 0,
  }));

  return entries.sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);
}
