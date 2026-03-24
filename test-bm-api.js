// Test BattleMetrics API - patikrinti ar modų info yra
async function testBattleMetrics() {
  console.log('🔍 Testing BattleMetrics API...');

  const response = await fetch('https://api.battlemetrics.com/servers?filter[game]=reforger&page[size]=5');
  const json = await response.json();

  console.log('\n📊 Server count:', json.data.length);
  console.log('\n🔍 Checking first server...');

  const server = json.data[0];
  console.log('\nServer ID:', server.id);
  console.log('Server Name:', server.attributes.name);
  console.log('Players:', server.attributes.players, '/', server.attributes.maxPlayers);

  console.log('\n📦 Details object:');
  console.log(JSON.stringify(server.attributes.details, null, 2));

  console.log('\n🎮 Mods found?');
  if (server.attributes.details?.mods) {
    console.log('✅ YES - Mods array length:', server.attributes.details.mods.length);
    console.log('First mod:', server.attributes.details.mods[0]);
  } else {
    console.log('❌ NO - No mods field in details');
  }

  console.log('\n🔍 All available fields in attributes:');
  console.log(Object.keys(server.attributes).join(', '));
}

testBattleMetrics().catch(console.error);
