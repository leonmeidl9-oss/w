module.exports = {
  // ═════════════════════════════════════════════════════════════
  //  ✏️  HIER AUSFÜLLEN
  // ═════════════════════════════════════════════════════════════

  // Bot-Token aus dem Discord Developer Portal (Bot → Reset Token).
  // ⚠️ Niemals teilen und diese Datei mit Token nie auf GitHub hochladen!
  token: 'HIER_DEIN_BOT_TOKEN',

  // ID deines Discord-Servers. Leer lassen, wenn der Bot nur auf einem Server ist.
  // (Discord-Einstellungen → Erweitert → Entwicklermodus an, dann Rechtsklick
  //  auf deinen Server → "Server-ID kopieren")
  serverId: '',

  // Link zu deinem Roblox-Spiel – steht dann in #willkommen. Leer lassen = kein Link.
  spielLink: '',

  // true  = Neue Leute sehen nur START und müssen erst in #regeln auf
  //         "Regeln akzeptieren" klicken. Dafür muss der Bot DAUERHAFT online sein.
  // false = Alle sehen sofort alles. Der Bot muss nur für die Ping-Buttons laufen.
  regelnBestaetigen: true,

  // ═════════════════════════════════════════════════════════════
  //  Ab hier optional: Namen, Farben, Texte anpassen.
  //  Der Bot erstellt nur, was noch fehlt – du kannst ihn also
  //  gefahrlos mehrmals starten.
  // ═════════════════════════════════════════════════════════════

  // Diese Rolle bekommt man durch das Akzeptieren der Regeln
  mitgliedRolle: 'Bladeborn',

  // Reihenfolge = Reihenfolge in Discord (oben = höchste Rolle)
  // team: darf in den Nur-Lesen-Kanälen schreiben
  // separat: wird in der Mitgliederliste extra angezeigt
  rollen: [
    { name: 'Owner', farbe: 0x8b0000, rechte: 'admin', team: true, separat: true },
    { name: 'Admin', farbe: 0xc0392b, rechte: 'admin', team: true, separat: true },
    { name: 'Moderator', farbe: 0xe67e22, rechte: 'moderator', team: true, separat: true },
    { name: 'Content Creator', farbe: 0x9b59b6, separat: true },
    { name: 'Bladeborn', farbe: 0xb8a77a },
    // Ping-Rollen: kann sich jeder in #rollen selbst geben
    { name: 'Update-Ping', ping: true, emoji: '🔔', beschreibung: 'Neue Updates' },
    { name: 'Event-Ping', ping: true, emoji: '🎉', beschreibung: 'Events & Giveaways' },
    { name: 'LFG-Ping', ping: true, emoji: '⚔️', beschreibung: 'Wenn jemand Mitspieler sucht', erwaehnbar: true },
  ],

  // zugriff:
  //   'alle-lesen'       = jeder sieht es, nur das Team schreibt
  //   'mitglieder-lesen' = nur Bladeborn sehen es, nur das Team schreibt
  //   'mitglieder'       = nur Bladeborn sehen es und dürfen schreiben
  // slowmode in Sekunden, limit = max. Leute im Voice-Kanal
  kategorien: [
    {
      name: '📜 START',
      zugriff: 'alle-lesen',
      kanaele: [
        { name: 'willkommen', thema: 'Willkommen bei Bladebound – Forge. Fight. Ascend.', nachricht: 'willkommen' },
        { name: 'regeln', thema: 'Bitte lesen!', nachricht: 'regeln' },
        { name: 'rollen', thema: 'Ping-Rollen selbst auswählen', nachricht: 'rollen', zugriff: 'mitglieder-lesen' },
      ],
    },
    {
      name: '📢 NEWS',
      zugriff: 'mitglieder-lesen',
      kanaele: [
        { name: 'ankündigungen', thema: 'Wichtige News zu Bladebound' },
        { name: 'updates', thema: 'Patch Notes' },
        { name: 'events', thema: 'Events & Giveaways' },
      ],
    },
    {
      name: '💬 BLADE HAVEN',
      zugriff: 'mitglieder',
      kanaele: [
        { name: 'chat', thema: 'Allgemeiner Chat' },
        { name: 'rare-drops', thema: 'Zeig deine Mythic-, Divine- und Secret-Drops!' },
        { name: 'screenshots-clips', thema: 'Screenshots und Clips aus Bladebound' },
        { name: 'bot-befehle', thema: 'Hier Bot-Befehle benutzen' },
      ],
    },
    {
      name: '⚔️ LOOKING FOR GROUP',
      zugriff: 'mitglieder',
      kanaele: [
        { name: 'lfg-dungeons', thema: 'Format: Dungeon + Schwierigkeit + Blade Power + Roblox-Name', slowmode: 30 },
        { name: 'lfg-bosse', thema: 'Format: Realm Guardian + Blade Power + Roblox-Name', slowmode: 30 },
        { name: 'lfg-arena', thema: 'Format: Modus + Blade Power + Roblox-Name', slowmode: 30 },
        { name: 'order-suche', thema: 'Orders suchen Mitglieder – oder du suchst eine Order', slowmode: 30 },
      ],
    },
    {
      name: '💰 HANDEL',
      zugriff: 'mitglieder',
      kanaele: [
        { name: 'blade-exchange', thema: 'Biete / Suche – Trades nur im Spiel abschließen. Kein Scam!', slowmode: 30 },
      ],
    },
    {
      name: '🛠️ SUPPORT',
      zugriff: 'mitglieder',
      kanaele: [
        { name: 'fragen', thema: 'Fragen zum Spiel' },
        { name: 'bug-reports', thema: 'Was ist passiert? Wo? Screenshot oder Video?' },
        { name: 'vorschläge', thema: 'Ideen für Bladebound' },
      ],
    },
    {
      name: '🔊 VOICE',
      zugriff: 'mitglieder',
      kanaele: [
        { name: 'Chat', voice: true },
        { name: 'Party 1', voice: true, limit: 4 },
        { name: 'Party 2', voice: true, limit: 4 },
        { name: 'Party 3', voice: true, limit: 4 },
      ],
    },
  ],

  // Texte der Bot-Nachrichten. {#kanalname} wird zu einem klickbaren Kanal-Link.
  farbe: 0x8b1a1a,
  nachrichten: {
    willkommen: {
      titel: '⚔️ Willkommen bei Bladebound!',
      text: [
        '**Forge. Fight. Ascend.**',
        '',
        'Das ist der Community-Server zu Bladebound auf Roblox.',
        '',
        '**So geht\'s los:**',
        '1️⃣ Lies die Regeln in {#regeln}',
        '2️⃣ Hol dir Ping-Rollen in {#rollen}',
        '3️⃣ Such dir Mitspieler in {#lfg-dungeons}',
        '',
        'Viel Spaß, Bladeborn! 🗡️',
      ].join('\n'),
    },
    regeln: {
      titel: '📜 Regeln',
      text: [
        '**1.** Sei respektvoll – kein Beleidigen, kein Mobbing, kein Hate.',
        '**2.** Kein Spam und keine Werbung (auch nicht per DM).',
        '**3.** Kein Scam, keine Exploits, keine Cheats.',
        '**4.** Nutze die Kanäle für ihren Zweck.',
        '**5.** Keine NSFW-Inhalte.',
        '**6.** Halte dich an die Regeln von Roblox und Discord.',
        '**7.** Das Team hat das letzte Wort.',
      ].join('\n'),
      // Wird nur angehängt, wenn regelnBestaetigen = true
      button: 'Klick unten auf **Regeln akzeptieren**, um den Server freizuschalten.',
    },
    rollen: {
      titel: '🔔 Ping-Rollen',
      text: 'Klick auf einen Button, um eine Rolle zu bekommen – nochmal klicken entfernt sie wieder.',
    },
  },
};
