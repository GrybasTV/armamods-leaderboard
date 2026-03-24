export interface Mod {
  modId: string;
  name: string;
  author: string | null;
  thumbnail: string | null;
  server_count: number;
  total_players: number;
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
