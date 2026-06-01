import { readFileSync } from 'fs';

const PATCH_DATE = '2026-05-28'; // Arma Reforger 1.7 Partisan release
const cfg = JSON.parse(readFileSync('c:/Users/GrybasTv/Documents/Arma3/pvp/config.json', 'utf8'));
const configMods = cfg.game.mods.map((m) => ({ id: m.modId.toUpperCase(), name: m.name }));
const configSet = new Set(configMods.map((m) => m.id));

async function fetchJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

// 1) Global trending (falling) from armamods KV
console.log('=== ARMA MODS PROJEKTAS: Krentantys modai (monthly trending) ===\n');
for (const period of ['weekly', 'monthly']) {
  try {
    const t = await fetchJson(`https://reforgermods.com/api/trending/${period}?game=reforger`);
    const falling = t?.data?.falling || [];
    const inConfig = falling.filter((m) => configSet.has((m.id || '').toUpperCase()));
    console.log(`--- ${period} | falling top (iš tavo config) ---`);
    if (inConfig.length === 0) {
      console.log('(nėra tavo config modų tarp top falling)\n');
    } else {
      inConfig.slice(0, 20).forEach((m) => {
        console.log(
          `${m.id} | Δrank ${m.rankDelta} | ${m.prevPlayers ?? '?'}→${m.currentPlayers ?? m.totalPlayers} žaid. | score ${Math.round(m.trendScore)} | ${m.name}`
        );
      });
      console.log('');
    }
  } catch (e) {
    console.log(`[${period}] API klaida: ${e.message}\n`);
  }
}

// 2) Per-mod history: prieš / po 1.7
console.log(`=== ISTORIJA: prieš vs po ${PATCH_DATE} (daily history) ===\n`);

function sumPlayersInRange(history, from, to) {
  const pts = history.filter((h) => {
    const day = h.date || h.time;
    return day >= from && day < to;
  });
  if (!pts.length) return { avg: null, max: 0, n: 0 };
  const vals = pts.map((h) => h.totalPlayers || 0);
  return {
    avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    max: Math.max(...vals),
    n: pts.length,
  };
}

const drops = [];
const noHistory = [];

for (const m of configMods) {
  try {
    const res = await fetchJson(
      `https://reforgermods.com/api/mods/${m.id}/history?game=reforger&days=60`
    );
    const history = res.data || [];
    if (!history.length) {
      noHistory.push(m);
      continue;
    }

    const before = sumPlayersInRange(history, '2026-04-01', PATCH_DATE);
    const after = sumPlayersInRange(history, PATCH_DATE, '2026-12-31');
    const latest = history[history.length - 1];

    if (before.avg === null || after.avg === null) continue;

    const dropPct =
      before.avg > 0 ? Math.round(((before.avg - after.avg) / before.avg) * 100) : before.avg > 0 && after.avg === 0 ? 100 : 0;

    drops.push({
      ...m,
      beforeAvg: before.avg,
      afterAvg: after.avg,
      beforeMax: before.max,
      afterMax: after.max,
      dropPct,
      latest: latest?.totalPlayers ?? 0,
    });
  } catch {
    noHistory.push(m);
  }
  await new Promise((r) => setTimeout(r, 120));
}

drops.sort((a, b) => b.dropPct - a.dropPct || b.beforeAvg - a.beforeAvg);

console.log('--- Didžiausias kritimas % (balandis–gegužė vs po 1.7) ---');
drops
  .filter((d) => d.beforeAvg >= 20 && d.dropPct >= 30)
  .slice(0, 25)
  .forEach((d) => {
    console.log(
      `${d.id} | -${d.dropPct}% | ${d.beforeAvg}→${d.afterAvg} avg žaid. (max ${d.beforeMax}→${d.afterMax}) | dabar ~${d.latest} | ${d.name}`
    );
  });

console.log('\n--- Vis dar OK po 1.7 (augimas arba <20% kritimas, buvo populiarūs) ---');
drops
  .filter((d) => d.beforeAvg >= 50 && d.dropPct < 20)
  .slice(0, 15)
  .forEach((d) => {
    console.log(`${d.id} | ${d.dropPct}% | ${d.beforeAvg}→${d.afterAvg} | ${d.name}`);
  });

if (noHistory.length) {
  console.log(`\n--- Be istorijos API (${noHistory.length} modų) ---`);
  noHistory.slice(0, 10).forEach((m) => console.log(`${m.id} | ${m.name}`));
  if (noHistory.length > 10) console.log(`... ir dar ${noHistory.length - 10}`);
}
