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

  // Link zu deinem Roblox-Spiel – steht dann in #welcome. Leer lassen = kein Link.
  spielLink: '',

  // true  = Neue Leute sehen nur INFO und müssen erst in #rules auf
  //         "Accept Rules" klicken. Dafür muss der Bot DAUERHAFT online sein.
  // false = Alle sehen sofort alles. Der Bot muss nur für die Ping-Buttons laufen.
  regelnBestaetigen: true,

  // true = Community wird aktiviert (Regel-Kanal, Discord-Updates-Kanal usw.)
  communityAktivieren: true,

  // Schrift der Kanalnamen:
  //   'smallcaps' → 👋・ᴡᴇʟᴄᴏᴍᴇ
  //   'bold'      → 👋・𝘄𝗲𝗹𝗰𝗼𝗺𝗲
  //   'normal'    → 👋・welcome
  schrift: 'smallcaps',

  // Aufbau der Namen. {emoji} und {name} werden ersetzt.
  kategorieFormat: '「{emoji}」{name}',
  kanalFormat: '{emoji}・{name}',

  // ═════════════════════════════════════════════════════════════
  //  Ab hier optional: Namen, Farben, Texte anpassen.
  //  start.bat erstellt nur, was noch fehlt.
  //  reset.bat löscht ALLE Kanäle und baut alles neu auf.
  // ═════════════════════════════════════════════════════════════

  // Diese Rolle bekommt man durch das Akzeptieren der Regeln
  mitgliedRolle: 'Bladeborn',

  // Reihenfolge = Reihenfolge in Discord (oben = höchste Rolle)
  // team: darf in den Nur-Lesen-Kanälen schreiben und sieht STAFF
  // separat: wird in der Mitgliederliste extra angezeigt
  rollen: [
    { name: 'Owner', farbe: 0x8b0000, rechte: 'admin', team: true, separat: true },
    { name: 'Admin', farbe: 0xc0392b, rechte: 'admin', team: true, separat: true },
    { name: 'Moderator', farbe: 0xe67e22, rechte: 'moderator', team: true, separat: true },
    { name: 'Content Creator', farbe: 0x9b59b6, separat: true },
    { name: 'Bladeborn', farbe: 0xb8a77a },
    // Ping-Rollen: kann sich jeder in #roles selbst geben
    { name: 'Update-Ping', ping: true, emoji: '🔔', beschreibung: 'New updates' },
    { name: 'Event-Ping', ping: true, emoji: '🎉', beschreibung: 'Events & giveaways' },
    { name: 'LFG-Ping', ping: true, emoji: '⚔️', beschreibung: 'When someone is looking for a group', erwaehnbar: true },
  ],

  // zugriff:
  //   'alle-lesen'       = jeder sieht es, nur das Team schreibt
  //   'mitglieder-lesen' = nur Bladeborn sehen es, nur das Team schreibt
  //   'mitglieder'       = nur Bladeborn sehen es und dürfen schreiben
  //   'team'             = nur das Team sieht es
  // slowmode in Sekunden, limit = max. Leute im Voice-Kanal
  // community: 'regeln' / 'updates' = Pflicht-Kanäle für Community
  kategorien: [
    {
      name: 'info', emoji: '📜', zugriff: 'alle-lesen',
      kanaele: [
        { name: 'welcome', emoji: '👋', thema: 'Welcome to Bladebound – Forge. Fight. Ascend.', nachricht: 'willkommen' },
        { name: 'rules', emoji: '📜', thema: 'Please read!', nachricht: 'regeln', community: 'regeln' },
        { name: 'roles', emoji: '🎭', thema: 'Pick your ping roles', nachricht: 'rollen', zugriff: 'mitglieder-lesen' },
      ],
    },
    {
      name: 'news', emoji: '📢', zugriff: 'mitglieder-lesen',
      kanaele: [
        { name: 'announcements', emoji: '📢', thema: 'Important Bladebound news' },
        { name: 'updates', emoji: '📝', thema: 'Patch notes' },
        { name: 'events', emoji: '🎉', thema: 'Events & giveaways' },
      ],
    },
    {
      name: 'blade haven', emoji: '💬', zugriff: 'mitglieder',
      kanaele: [
        { name: 'general', emoji: '💬', thema: 'General chat' },
        { name: 'rare-drops', emoji: '💎', thema: 'Show off your Mythic, Divine and Secret drops!' },
        { name: 'media', emoji: '📸', thema: 'Screenshots and clips from Bladebound' },
        { name: 'bot-commands', emoji: '🤖', thema: 'Use bot commands here' },
      ],
    },
    {
      name: 'looking for group', emoji: '⚔️', zugriff: 'mitglieder',
      kanaele: [
        { name: 'lfg-dungeons', emoji: '🏰', thema: 'Format: Dungeon + Difficulty + Blade Power + Roblox username', slowmode: 30 },
        { name: 'lfg-bosses', emoji: '🐉', thema: 'Format: Realm Guardian + Blade Power + Roblox username', slowmode: 30 },
        { name: 'lfg-arena', emoji: '⚔️', thema: 'Format: Mode + Blade Power + Roblox username', slowmode: 30 },
        { name: 'order-recruitment', emoji: '🛡️', thema: 'Orders looking for members – or find an Order to join', slowmode: 30 },
      ],
    },
    {
      name: 'trading', emoji: '💰', zugriff: 'mitglieder',
      kanaele: [
        { name: 'blade-exchange', emoji: '💰', thema: 'Buying / Selling – only complete trades in-game. No scams!', slowmode: 30 },
      ],
    },
    {
      name: 'support', emoji: '🛠️', zugriff: 'mitglieder',
      kanaele: [
        { name: 'help', emoji: '❓', thema: 'Questions about the game' },
        { name: 'bug-reports', emoji: '🐛', thema: 'What happened? Where? Screenshot or video?' },
        { name: 'suggestions', emoji: '💡', thema: 'Ideas for Bladebound' },
      ],
    },
    {
      name: 'staff', emoji: '🔒', zugriff: 'team',
      kanaele: [
        { name: 'staff-chat', emoji: '🔒', thema: 'Staff only' },
        { name: 'discord-updates', emoji: '📡', thema: 'Discord sends community notices here', community: 'updates' },
      ],
    },
    {
      name: 'voice', emoji: '🔊', zugriff: 'mitglieder',
      kanaele: [
        { name: 'General', emoji: '🔊', voice: true },
        { name: 'Party 1', emoji: '⚔️', voice: true, limit: 4 },
        { name: 'Party 2', emoji: '⚔️', voice: true, limit: 4 },
        { name: 'Party 3', emoji: '⚔️', voice: true, limit: 4 },
      ],
    },
  ],

  // Texte der Bot-Nachrichten. {#kanalname} wird zu einem klickbaren Kanal-Link.
  farbe: 0x8b1a1a,
  nachrichten: {
    willkommen: {
      titel: '⚔️ Welcome to Bladebound!',
      text: [
        '**Forge. Fight. Ascend.**',
        '',
        'This is the official community server for Bladebound on Roblox.',
        '',
        '**Get started:**',
        '1️⃣ Read the rules in {#rules}',
        '2️⃣ Pick your ping roles in {#roles}',
        '3️⃣ Find teammates in {#lfg-dungeons}',
        '',
        'Have fun, Bladeborn! 🗡️',
      ].join('\n'),
      spielLink: '🎮 **Play now:**',
    },
    regeln: {
      titel: '📜 Rules',
      text: [
        '**1.** Be respectful – no insults, harassment or hate.',
        '**2.** No spam or advertising (including DMs).',
        '**3.** No scamming, exploits or cheats.',
        '**4.** Use every channel for its purpose.',
        '**5.** No NSFW content.',
        '**6.** Follow the Roblox and Discord Terms of Service.',
        '**7.** Staff has the final say.',
      ].join('\n'),
      // Wird nur angehängt, wenn regelnBestaetigen = true
      button: 'Click **Accept Rules** below to unlock the server.',
      buttonText: 'Accept Rules',
    },
    rollen: {
      titel: '🔔 Ping Roles',
      text: 'Click a button to get a role – click it again to remove it.',
    },
  },

  // Antworten, wenn jemand auf einen Button klickt (nur für die Person sichtbar)
  antworten: {
    regelnSchon: 'You already accepted the rules. ✅',
    regelnOk: 'Welcome, Bladeborn! The server is now unlocked. ⚔️',
    rolleDazu: '**{rolle}** added.',
    rolleWeg: '**{rolle}** removed.',
    fehler: 'Something went wrong. Please contact a staff member.',
  },
};
