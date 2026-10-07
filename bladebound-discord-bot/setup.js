const {
  ChannelType,
  PermissionFlagsBits: P,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildFeature,
  GuildVerificationLevel,
  GuildExplicitContentFilter,
  GuildDefaultMessageNotifications,
  Locale,
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

// ── Schrift ──────────────────────────────────────────────────

const ABC = 'abcdefghijklmnopqrstuvwxyz';
const SMALLCAPS = [...'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ'];
const ZURUECK = Object.fromEntries(SMALLCAPS.map((z, i) => [z, ABC[i]]));

const SCHRIFTEN = {
  normal: (text) => text,
  smallcaps: (text) => [...text.toLowerCase()].map((z) => SMALLCAPS[ABC.indexOf(z)] ?? z).join(''),
  bold: (text) =>
    [...text]
      .map((z) => {
        const c = z.codePointAt(0);
        if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d5ee + c - 97); // a-z
        if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d5d4 + c - 65); // A-Z
        if (c >= 48 && c <= 57) return String.fromCodePoint(0x1d7ec + c - 48); // 0-9
        return z;
      })
      .join(''),
};

function anzeigeName(format, emoji, name) {
  const schrift = SCHRIFTEN[config.schrift] ?? SCHRIFTEN.normal;
  return format.replace('{emoji}', emoji ?? '').replace('{name}', schrift(name)).trim();
}

// Macht aus "「📜」ɪɴꜰᴏ" oder "📜 INFO" wieder "info" – so findet der Bot
// seine Kanäle, egal welche Schrift oder welches Format gerade eingestellt ist.
function schluessel(name) {
  return [...name.normalize('NFKC')]
    .map((z) => ZURUECK[z] ?? z)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// ── Einrichten ───────────────────────────────────────────────

function rechtePruefen(guild) {
  if (!guild.members.me.permissions.has(P.Administrator)) {
    throw new Error('Der Bot braucht Administrator-Rechte. Lade ihn mit dem Link aus der README neu ein.');
  }
}

// Löscht alle Kanäle und baut danach alles neu auf.
async function zuruecksetzen(guild, botId) {
  rechtePruefen(guild);
  console.log(`\n🗑️  Lösche alle Kanäle auf "${guild.name}" …\n`);

  // Regel- und Update-Kanal eines Community-Servers lassen sich erst löschen,
  // wenn neue eingetragen sind – die kommen deshalb ganz am Ende dran.
  const spaeter = [];
  for (const kanal of [...guild.channels.cache.values()].filter((c) => !c.isThread())) {
    try {
      await kanal.delete();
      console.log(`  🗑️  "${kanal.name}" gelöscht`);
    } catch {
      spaeter.push(kanal);
    }
  }

  await einrichten(guild, botId);

  for (const kanal of spaeter) {
    await kanal
      .delete()
      .then(() => console.log(`  🗑️  "${kanal.name}" gelöscht`))
      .catch((err) => console.log(`  ⚠️  "${kanal.name}" konnte nicht gelöscht werden: ${err.message}`));
  }
}

// Erstellt alles, was laut config.js noch fehlt.
async function einrichten(guild, botId) {
  rechtePruefen(guild);
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
  const community = {};
  for (const k of config.kategorien) {
    const kategorie = await kanalHolen(guild, {
      name: anzeigeName(config.kategorieFormat, k.emoji, k.name.toUpperCase()),
      type: ChannelType.GuildCategory,
      permissionOverwrites: rechte(k.zugriff, ctx, false),
    });

    for (const c of k.kanaele) {
      const zugriff = c.zugriff ?? k.zugriff;
      const kanal = await kanalHolen(guild, {
        name: anzeigeName(config.kanalFormat, c.emoji, c.name),
        type: c.voice ? ChannelType.GuildVoice : ChannelType.GuildText,
        parent: kategorie.id,
        topic: c.thema,
        rateLimitPerUser: c.slowmode,
        userLimit: c.limit,
        permissionOverwrites: rechte(zugriff, ctx, c.voice),
      });
      kanaele[c.name] = kanal;
      if (c.nachricht) nachrichten.push([kanal, c.nachricht]);
      if (c.community) community[c.community] = kanal;
    }
  }

  if (config.communityAktivieren) await communityAktivieren(guild, community);

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
  const key = schluessel(daten.name);
  const vorhanden = guild.channels.cache.find(
    (c) => c.type === daten.type && (c.parentId ?? undefined) === daten.parent && schluessel(c.name) === key,
  );
  if (vorhanden) {
    console.log(`  ⏭️  "${vorhanden.name}" gibt es schon`);
    return vorhanden;
  }
  const kanal = await guild.channels.create(daten);
  console.log(`  ✅ "${kanal.name}" erstellt`);
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
    case 'team':
      return [
        { id: everyone.id, deny: [P.ViewChannel] },
        ...team.map((r) => ({ id: r.id, allow: voice ? sehen : [...sehen, P.SendMessages] })),
      ];
    default: // 'alle'
      return [];
  }
}

async function communityAktivieren(guild, { regeln, updates }) {
  if (!regeln || !updates) {
    console.log('  ⚠️  Community: In config.js fehlt ein Kanal mit community: \'regeln\' oder \'updates\'');
    return;
  }

  const istAn = guild.features.includes(GuildFeature.Community);
  if (
    istAn &&
    guild.rulesChannelId === regeln.id &&
    guild.publicUpdatesChannelId === updates.id &&
    guild.safetyAlertsChannelId === updates.id
  ) {
    console.log('  ⏭️  Community ist schon aktiv');
    return;
  }

  const daten = { rulesChannel: regeln, publicUpdatesChannel: updates, safetyAlertsChannel: updates };
  if (!istAn) {
    Object.assign(daten, {
      features: [...guild.features, GuildFeature.Community],
      verificationLevel: Math.max(guild.verificationLevel, GuildVerificationLevel.Low),
      explicitContentFilter: GuildExplicitContentFilter.AllMembers,
      defaultMessageNotifications: GuildDefaultMessageNotifications.OnlyMentions,
      preferredLocale: Locale.EnglishUS,
    });
  }

  try {
    await guild.edit(daten);
    console.log(istAn ? '  ✅ Community-Kanäle aktualisiert' : '  ✅ Community aktiviert');
  } catch (err) {
    console.log(`  ⚠️  Community konnte nicht aktiviert werden: ${err.message}`);
    console.log('      Du kannst sie unter Servereinstellungen → Community selbst aktivieren.');
  }
}

async function nachrichtPosten(kanal, art, { kanaele, rollen, ctx, botId }) {
  const alt = await kanal.messages.fetch({ limit: 20 });
  if (alt.some((m) => m.author.id === botId)) {
    console.log(`  ⏭️  Nachricht in "${kanal.name}" gibt es schon`);
    return;
  }

  const n = config.nachrichten[art];
  let text = n.text.replace(/\{#([^}]+)\}/g, (_, name) => (kanaele[name] ? `<#${kanaele[name].id}>` : `#${name}`));
  const buttons = [];

  if (art === 'willkommen' && config.spielLink) {
    text += `\n\n${n.spielLink} ${config.spielLink}`;
  }

  if (art === 'regeln' && config.regelnBestaetigen) {
    text += `\n\n${n.button}`;
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`bb:regeln:${ctx.mitglied.id}`)
        .setLabel(n.buttonText)
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
  console.log(`  ✅ Nachricht in "${kanal.name}" gepostet`);
}

module.exports = { einrichten, zuruecksetzen };
