#!/bin/bash
# Test API endpoints

echo "🧪 Testing API..."
echo ""

# Health check
echo "1️⃣ Health Check:"
curl -s http://localhost:3000/health | jq
echo -e "\n"

# Servers
echo "2️⃣ Servers (first 3):"
curl -s "http://localhost:3000/api/servers?limit=3" | jq '.data[] | {name, players, modCount}'
echo -e "\n"

# Popular mods
echo "3️⃣ Popular Mods (first 5):"
curl -s "http://localhost:3000/api/mods?limit=5" | jq '.data[] | {name, server_count, total_players}'
echo -e "\n"

# Stats
echo "4️⃣ Database Stats:"
echo "Servers:"
curl -s "http://localhost:3000/api/servers?limit=1" | jq '.meta.total'
echo "Mods:"
curl -s "http://localhost:3000/api/mods?limit=1" | jq '.meta.total'
