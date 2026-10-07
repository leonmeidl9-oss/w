const { Client, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const { einrichten } = require('./setup');
const config = require('./config');

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

async function starten(guild) {
  gestartet = true;
  try {
    await einrichten(guild, client.user.id);
    console.log('🟢 Der Bot bleibt online, damit die Buttons in #regeln und #rollen funktionieren. (Fenster schließen beendet ihn)');
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

// Buttons in #regeln und #rollen
client.on(Events.InteractionCreate, async (i) => {
  if (!i.isButton() || !i.customId.startsWith('bb:')) return;
  const [, art, rolleId] = i.customId.split(':');
  const rolle = i.guild.roles.cache.get(rolleId);

  try {
    if (!rolle) throw new Error('Rolle existiert nicht mehr');

    if (art === 'regeln') {
      if (i.member.roles.cache.has(rolleId)) {
        return await i.reply({ content: 'Du hast die Regeln schon akzeptiert. ✅', flags: MessageFlags.Ephemeral });
      }
      await i.member.roles.add(rolle);
      return await i.reply({ content: `Willkommen, ${rolle.name}! Der Server ist jetzt freigeschaltet. ⚔️`, flags: MessageFlags.Ephemeral });
    }

    if (art === 'rolle') {
      if (i.member.roles.cache.has(rolleId)) {
        await i.member.roles.remove(rolle);
        return await i.reply({ content: `**${rolle.name}** entfernt.`, flags: MessageFlags.Ephemeral });
      }
      await i.member.roles.add(rolle);
      return await i.reply({ content: `**${rolle.name}** hinzugefügt.`, flags: MessageFlags.Ephemeral });
    }
  } catch (err) {
    console.error('❌ Button-Fehler:', err.message);
    const text = 'Das hat nicht geklappt. Ein Admin muss die Bot-Rolle in den Servereinstellungen über die anderen Rollen ziehen.';
    if (!i.replied) await i.reply({ content: text, flags: MessageFlags.Ephemeral }).catch(() => {});
  }
});

client.login(token).catch((err) => {
  console.error('❌ Login fehlgeschlagen – ist der Token richtig?', err.message);
  process.exit(1);
});
