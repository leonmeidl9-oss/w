# Bladebound Discord-Bot

Erstellt den kompletten Bladebound-Community-Server mit einem Befehl:
Rollen, Kategorien, Kanäle, Rechte, eine Willkommensnachricht, die Regeln mit
Bestätigungs-Button und die Ping-Rollen mit Buttons.

```
📜 START          #willkommen  #regeln  #rollen
📢 NEWS           #ankündigungen  #updates  #events
💬 BLADE HAVEN    #chat  #rare-drops  #screenshots-clips  #bot-befehle
⚔️ LOOKING FOR GROUP  #lfg-dungeons  #lfg-bosse  #lfg-arena  #order-suche
💰 HANDEL         #blade-exchange
🛠️ SUPPORT        #fragen  #bug-reports  #vorschläge
🔊 VOICE          Chat  Party 1–3 (je max. 4)

Rollen: Owner, Admin, Moderator, Content Creator, Bladeborn,
        Update-Ping, Event-Ping, LFG-Ping
```

## Einrichtung

**1. Bot erstellen**
1. Geh auf <https://discord.com/developers/applications> → **New Application** → Name eingeben.
2. Links auf **Bot** → **Reset Token** → Token kopieren.
3. Links auf **General Information** → **Application ID** kopieren.

**2. Bot auf deinen Server einladen**

Ersetze `DEINE_APPLICATION_ID` und öffne den Link:

```
https://discord.com/oauth2/authorize?client_id=DEINE_APPLICATION_ID&scope=bot&permissions=8
```

(`permissions=8` = Administrator, das braucht der Bot zum Erstellen.)

**3. Starten**

Du brauchst [Node.js](https://nodejs.org) (LTS-Version). Dann im Ordner `bladebound-discord-bot`:

```bash
npm install
cp .env.example .env     # unter Windows: copy .env.example .env
```

Öffne `.env` und trag deinen Token bei `DISCORD_TOKEN=` ein. Dann:

```bash
npm start
```

Der Bot erstellt alles und schreibt in die Konsole, was er gemacht hat.

## Gut zu wissen

- **Mehrmals starten ist kein Problem.** Der Bot erstellt nur, was noch fehlt.
  Bereits vorhandene Kanäle und Rollen werden nicht verändert.
- **Der Bot muss online bleiben**, damit die Buttons in `#regeln` und `#rollen`
  funktionieren. Ohne Bot kann niemand die Regeln akzeptieren und neue Leute
  sehen nur START. Wenn du den Bot nicht dauerhaft laufen lassen willst,
  setz in `config.js` `regelnBestaetigen: false`, **bevor** du ihn startest.
  Dann sehen alle sofort alles.
- **Gib dir selbst die Rolle „Owner“** (Servereinstellungen → Mitglieder).
- Die alten Standard-Kanäle (`#general` usw.) kannst du danach von Hand löschen.
- Wenn die Buttons „Das hat nicht geklappt“ sagen, zieh die Bot-Rolle in
  Servereinstellungen → Rollen ganz nach oben.

## Anpassen

Alles steht in `config.js`: Kanalnamen, Rollen, Farben, Slowmode und die Texte
für Willkommen, Regeln und Ping-Rollen.
