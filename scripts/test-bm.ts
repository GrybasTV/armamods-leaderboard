#!/usr/bin/env node
import { BattleMetricsService } from '../src/services/battlemetrics.js';

async function test() {
  console.log('Testing BattleMetrics API...');
  const bm = new BattleMetricsService();

  try {
    const servers = await bm.fetchAllServers(true);
    console.log(`✅ Success! Fetched ${servers.length} servers`);
    console.log(`First server: ${servers[0]?.attributes?.name}`);
  } catch (err) {
    console.error(`❌ Error: ${err}`);
  }
}

test();
