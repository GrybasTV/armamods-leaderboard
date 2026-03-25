export interface Mod {
  id: string; // The modId from workshop
  name: string;
  author: string | null;
  thumbnail: string | null;
  serverCount: number;
  totalPlayers: number;
  playerRank: number;
  serverRank: number;
}

export interface Server {
  id: string;
  name: string;
  ip: string | null;
  port: number | null;
  players: number;
  maxPlayers: number;
  modCount: number;
  mods: Array<{
    id: string;
    name: string;
    playerRank: number;
    serverRank: number;
    serverCount: number;
    totalPlayers: number;
  }>;
}

export interface ApiResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface TrendingMod {
  id: string;
  name: string;
  serverCount: number;
  totalPlayers: number;
  playerRank: number;
  serverRank: number;
  changePlayers?: number;
  changeServers?: number;
  prevRank?: number;
  currentRank?: number;
}

export interface TrendingData {
  rising: TrendingMod[];
  falling: TrendingMod[];
  new: TrendingMod[];
}

export interface TrendingResponse {
  data: TrendingData;
  meta: {
    lastUpdated: string | null;
    snapshotDate?: string;
    error?: string;
  };
}
