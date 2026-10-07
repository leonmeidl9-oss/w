const readline = require('node:readline/promises');
const { Client, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const { einrichten, zuruecksetzen } = require('./setup');
const config = require('./config');

// reset.bat startet den Bot mit --reset: erst alles löschen, dann neu aufbauen
const RESET = process.argv.includes('--reset');

const { token } = config;
if (!token || token === 'HIER_DEIN_BOT_TOKEN') {
  console.error('❌ Kein Token gefunden. Trag deinen Bot-Token ganz oben in config.js ein.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let gestartet = false;

function passenderServer() {
  if (config.serverId) return client.guilds.cache.get(config.serverId);
  return client.guilds.cache.size === 1 ? client.guilds.cache.first() : null;
}

async function bestaetigt(guild) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(`\n⚠️  ACHTUNG: ALLE Kanäle auf "${guild.name}" werden gelöscht – mit allen Nachrichten!`);
  const antwort = await rl.question('   Zum Bestätigen JA eintippen und Enter drücken: ');
  rl.close();
  return antwort.trim().toUpperCase() === 'JA';
}

async function starten(guild) {
  gestartet = true;
  try {
    if (RESET) {
      if (!(await bestaetigt(guild))) {
        console.log('Abgebrochen – es wurde nichts gelöscht.');
        process.exit(0);
      }
      await zuruecksetzen(guild, client.user.id);
    } else {
      await einrichten(guild, client.user.id);
    }
    console.log('🟢 Der Bot bleibt online, damit die Buttons in #rules und #roles funktionieren. (Fenster schließen beendet ihn)');
  } catch (err) {
    console.error('❌ Fehler beim Einrichten:', err.message);
    process.exit(1);
  }
}

client.once(Events.ClientReady, () => {
  console.log(`🤖 Eingeloggt als ${client.user.tag}`);

  const guild = passenderServer();
  if (guild) return starten(guild);

  if (!config.serverId && client.guilds.cache.size > 1) {
    const liste = client.guilds.cache.map((g) => `  - ${g.name} (${g.id})`).join('\n');
    console.error(`❌ Der Bot ist auf mehreren Servern. Trag oben in config.js die richtige serverId ein:\n${liste}`);
    process.exit(1);
  }

  console.log('\n📨 Der Bot ist noch nicht auf deinem Server. Lade ihn mit diesem Link ein:');
  console.log(`   https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=8`);
  console.log('   Sobald er drin ist, geht es automatisch los …');
});

// Bot wurde gerade eingeladen → jetzt einrichten
client.on(Events.GuildCreate, () => {
  if (gestartet) return;
  const guild = passenderServer();
  if (guild) starten(guild);
});

// Buttons in #rules und #roles
client.on(Events.InteractionCreate, async (i) => {
  if (!i.isButton() || !i.customId.startsWith('bb:')) return;
  const [, art, rolleId] = i.customId.split(':');
  const rolle = i.guild.roles.cache.get(rolleId);
  const a = config.antworten;
  const antworten = (content) => i.reply({ content, flags: MessageFlags.Ephemeral });

  try {
    if (!rolle) throw new Error('Rolle existiert nicht mehr');

    if (art === 'regeln') {
      if (i.member.roles.cache.has(rolleId)) {
        return await antworten(a.regelnSchon);
      }
      await i.member.roles.add(rolle);
      return await antworten(a.regelnOk);
    }

    if (art === 'rolle') {
      if (i.member.roles.cache.has(rolleId)) {
        await i.member.roles.remove(rolle);
        return await antworten(a.rolleWeg.replace('{rolle}', rolle.name));
      }
      await i.member.roles.add(rolle);
      return await antworten(a.rolleDazu.replace('{rolle}', rolle.name));
    }
  } catch (err) {
    console.error('❌ Button-Fehler:', err.message);
    console.error('   Tipp: Zieh die Bot-Rolle in Servereinstellungen → Rollen ganz nach oben.');
    if (!i.replied) await antworten(a.fehler).catch(() => {});
  }
});

client.login(token).catch((err) => {
  console.error('❌ Login fehlgeschlagen – ist der Token richtig?', err.message);
  process.exit(1);
});
