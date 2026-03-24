export interface Mod {
  id: string; // The modId from workshop
  name: string;
  author: string | null;
  thumbnail: string | null;
  serverCount: number;
  totalPlayers: number;
  overallRank: number;
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
    modId: string;
    name: string;
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
