import express from 'express';
import cors from 'cors';
import { prisma } from './lib/db.js';
import { CollectorService } from './services/collector.js';
import { getPopularMods, getModDetails } from './api/mods.js';
import { getServers, getServerDetails } from './api/servers.js';
import { getGlobalStats } from './api/stats.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.get('/api/mods', getPopularMods);
app.get('/api/mods/:modId', getModDetails);
app.get('/api/servers', getServers);
app.get('/api/servers/:serverId', getServerDetails);
app.get('/api/stats', getGlobalStats);

// Start server
async function main() {
  await prisma.$connect();
  console.log('✅ Database connected');

  // Start collector
  const collector = new CollectorService();
  collector.startCron();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API docs:`);
    console.log(`   GET  /api/mods        - Popular mods`);
    console.log(`   GET  /api/mods/:modId - Mod details`);
    console.log(`   GET  /api/servers     - Server list`);
  });
}

main().catch(console.error);
