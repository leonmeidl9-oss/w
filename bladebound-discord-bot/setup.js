const {
  ChannelType,
  PermissionFlagsBits: P,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const config = require('./config');

const ROLLEN_RECHTE = {
  admin: [P.Administrator],
  moderator: [
    P.KickMembers, P.BanMembers, P.ModerateMembers, P.ManageMessages, P.ManageThreads,
    P.ManageNicknames, P.MuteMembers, P.DeafenMembers, P.MoveMembers, P.MentionEveryone, P.ViewAuditLog,
  ],
};

const NUR_LESEN = [P.SendMessages, P.SendMessagesInThreads, P.CreatePublicThreads, P.CreatePrivateThreads];

// Erstellt alles, was laut config.js noch fehlt.
async function einrichten(guild, botId) {
  if (!guild.members.me.permissions.has(P.Administrator)) {
    throw new Error('Der Bot braucht Administrator-Rechte. Lade ihn mit dem Link aus der README neu ein.');
  }

  console.log(`\n⚔️  Richte "${guild.name}" ein …\n`);

  const rollen = {};
  for (const r of config.rollen) {
    rollen[r.name] = await rolleHolen(guild, r);
  }

  const ctx = {
    everyone: guild.roles.everyone,
    mitglied: rollen[config.mitgliedRolle],
    team: config.rollen.filter((r) => r.team).map((r) => rollen[r.name]),
  };

  const kanaele = {};
  const nachrichten = [];
  for (const k of config.kategorien) {
    const kategorie = await kanalHolen(guild, {
      name: k.name,
      type: ChannelType.GuildCategory,
      permissionOverwrites: rechte(k.zugriff, ctx, false),
    });

    for (const c of k.kanaele) {
      const zugriff = c.zugriff ?? k.zugriff;
      kanaele[c.name] = await kanalHolen(guild, {
        name: c.name,
        type: c.voice ? ChannelType.GuildVoice : ChannelType.GuildText,
        parent: kategorie.id,
        topic: c.thema,
        rateLimitPerUser: c.slowmode,
        userLimit: c.limit,
        permissionOverwrites: rechte(zugriff, ctx, c.voice),
      });
      if (c.nachricht) nachrichten.push([kanaele[c.name], c.nachricht]);
    }
  }

  for (const [kanal, art] of nachrichten) {
    await nachrichtPosten(kanal, art, { kanaele, rollen, ctx, botId });
  }

  console.log('\n✅ Fertig!');
}

async function rolleHolen(guild, r) {
  const vorhanden = guild.roles.cache.find((x) => x.name === r.name);
  if (vorhanden) {
    console.log(`  ⏭️  Rolle "${r.name}" gibt es schon`);
    return vorhanden;
  }
  const rolle = await guild.roles.create({
    name: r.name,
    colors: r.farbe ? { primaryColor: r.farbe } : undefined,
    hoist: Boolean(r.separat),
    mentionable: Boolean(r.erwaehnbar),
    permissions: ROLLEN_RECHTE[r.rechte] ?? [],
  });
  console.log(`  ✅ Rolle "${r.name}" erstellt`);
  return rolle;
}

async function kanalHolen(guild, daten) {
  // Discord schreibt Textkanäle klein und mit Bindestrichen ("Rare Drops" → "rare-drops")
  const name = daten.type === ChannelType.GuildText ? daten.name.toLowerCase().replace(/\s+/g, '-') : daten.name;
  const vorhanden = guild.channels.cache.find(
    (c) => c.name === name && c.type === daten.type && (c.parentId ?? undefined) === daten.parent,
  );
  if (vorhanden) {
    console.log(`  ⏭️  "${daten.name}" gibt es schon`);
    return vorhanden;
  }
  const kanal = await guild.channels.create(daten);
  console.log(`  ✅ "${daten.name}" erstellt`);
  return kanal;
}

// Baut die Kanal-Rechte für eine Zugriffsstufe.
function rechte(zugriff, { everyone, mitglied, team }, voice) {
  // Ohne Regel-Bestätigung ist jeder automatisch Mitglied
  if (!config.regelnBestaetigen) zugriff = zugriff.replace('mitglieder', 'alle');

  const sehen = voice ? [P.ViewChannel, P.Connect, P.Speak] : [P.ViewChannel, P.ReadMessageHistory];
  const teamSchreibt = team.map((r) => ({ id: r.id, allow: [P.ViewChannel, ...NUR_LESEN] }));

  switch (zugriff) {
    case 'alle-lesen':
      return [{ id: everyone.id, allow: sehen, deny: NUR_LESEN }, ...teamSchreibt];
    case 'mitglieder-lesen':
      return [
        { id: everyone.id, deny: [P.ViewChannel] },
        { id: mitglied.id, allow: sehen, deny: NUR_LESEN },
        ...teamSchreibt,
      ];
    case 'mitglieder':
      return [
        { id: everyone.id, deny: [P.ViewChannel] },
        { id: mitglied.id, allow: voice ? sehen : [...sehen, P.SendMessages] },
      ];
    default: // 'alle'
      return [];
  }
}

async function nachrichtPosten(kanal, art, { kanaele, rollen, ctx, botId }) {
  const alt = await kanal.messages.fetch({ limit: 20 });
  if (alt.some((m) => m.author.id === botId)) {
    console.log(`  ⏭️  Nachricht in #${kanal.name} gibt es schon`);
    return;
  }

  const n = config.nachrichten[art];
  let text = n.text.replace(/\{#([^}]+)\}/g, (_, name) => (kanaele[name] ? `<#${kanaele[name].id}>` : `#${name}`));
  const buttons = [];

  if (art === 'willkommen' && config.spielLink) {
    text += `\n\n🎮 **Jetzt spielen:** ${config.spielLink}`;
  }

  if (art === 'regeln' && config.regelnBestaetigen) {
    text += `\n\n${n.button}`;
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`bb:regeln:${ctx.mitglied.id}`)
        .setLabel('Regeln akzeptieren')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
    );
  }

  if (art === 'rollen') {
    const pings = config.rollen.filter((r) => r.ping);
    text += '\n\n' + pings.map((r) => `${r.emoji} **${r.name}** – ${r.beschreibung}`).join('\n');
    for (const r of pings) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`bb:rolle:${rollen[r.name].id}`)
          .setLabel(r.name)
          .setEmoji(r.emoji)
          .setStyle(ButtonStyle.Secondary),
      );
    }
  }

  const embed = new EmbedBuilder().setTitle(n.titel).setDescription(text).setColor(config.farbe);
  const zeilen = [];
  for (let i = 0; i < buttons.length; i += 5) {
    zeilen.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }

  await kanal.send({ embeds: [embed], components: zeilen });
  console.log(`  ✅ Nachricht in #${kanal.name} gepostet`);
}

module.exports = { einrichten };
