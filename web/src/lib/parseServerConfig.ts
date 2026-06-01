/**
 * Parse config.json in the browser – extracts only modId + name.
 * The full file is not sent to the server (only this array).
 */

export interface ParsedConfigMod {
  modId: string;
  name: string;
}

export function parseServerConfig(input: unknown): ParsedConfigMod[] {
  let data: unknown = input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) throw new Error('Empty JSON');
    data = JSON.parse(trimmed);
  }

  const root = data as Record<string, unknown>;
  const game = root?.game as Record<string, unknown> | undefined;
  const modsRaw = (game?.mods ?? root?.mods ?? data) as unknown;

  if (!Array.isArray(modsRaw)) {
    throw new Error('Missing mods array (expected path: game.mods)');
  }

  const seen = new Set<string>();
  const out: ParsedConfigMod[] = [];

  for (const m of modsRaw) {
    const row = m as Record<string, unknown>;
    const modId = String(row.modId ?? row.id ?? '')
      .trim()
      .toUpperCase();
    if (!/^[0-9A-F]{16}$/.test(modId) || seen.has(modId)) continue;
    seen.add(modId);
    out.push({
      modId,
      name: String(row.name ?? modId),
    });
  }

  if (!out.length) throw new Error('No valid modId found (expected 16 hex characters)');
  return out;
}
