const { Client, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const { einrichten } = require('./setup');

try {
  process.loadEnvFile('.env');
} catch {
  // Keine .env-Datei – dann muss DISCORD_TOKEN anders gesetzt sein
}

const { DISCORD_TOKEN, GUILD_ID } = process.env;
if (!DISCORD_TOKEN) {
  console.error('❌ Kein Token gefunden. Kopiere .env.example zu .env und trag deinen Bot-Token ein.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Eingeloggt als ${client.user.tag}`);

  const guild = GUILD_ID ? client.guilds.cache.get(GUILD_ID) : client.guilds.cache.size === 1 ? client.guilds.cache.first() : null;
  if (!guild) {
    const liste = client.guilds.cache.map((g) => `  - ${g.name} (${g.id})`).join('\n') || '  (keiner)';
    console.error(`❌ Server nicht gefunden. Trag die richtige GUILD_ID in .env ein.\nDer Bot ist auf:\n${liste}`);
    process.exit(1);
  }

  try {
    await einrichten(guild, client.user.id);
    console.log('🟢 Der Bot bleibt online, damit die Buttons in #regeln und #rollen funktionieren. (Strg+C beendet ihn)');
  } catch (err) {
    console.error('❌ Fehler beim Einrichten:', err.message);
    process.exit(1);
  }
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

client.login(DISCORD_TOKEN).catch((err) => {
  console.error('❌ Login fehlgeschlagen – ist der Token richtig?', err.message);
  process.exit(1);
});
