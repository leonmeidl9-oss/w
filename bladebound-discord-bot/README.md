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

**2. Ausfüllen**

Öffne `config.js`. Ganz oben unter **HIER AUSFÜLLEN** steht alles, was du eintragen musst:

| Feld | Was rein muss |
|---|---|
| `token` | Dein Bot-Token (Pflicht) |
| `serverId` | ID deines Servers (nur nötig, wenn der Bot auf mehreren Servern ist) |
| `spielLink` | Link zu deinem Roblox-Spiel (optional) |
| `regelnBestaetigen` | `true` = Regeln per Button akzeptieren, `false` = alle sehen sofort alles |

⚠️ Den Token nie teilen und `config.js` mit Token nie auf GitHub hochladen.

**3. Starten**

1. [Node.js](https://nodejs.org) installieren (LTS-Version).
2. **`start.bat` doppelklicken.** Beim ersten Start installiert sie die nötigen Pakete.
3. Wenn der Bot noch nicht auf deinem Server ist, zeigt das Fenster einen
   Einladungslink. Öffne ihn und wähle deinen Server aus. Danach richtet der
   Bot alles automatisch ein.

Das Fenster muss offen bleiben, solange der Bot laufen soll.

## Gut zu wissen

- **Mehrmals starten ist kein Problem.** Der Bot erstellt nur, was noch fehlt.
  Bereits vorhandene Kanäle und Rollen werden nicht verändert.
- **Der Bot läuft nur, solange dein PC an ist und das Fenster offen ist.**
  Bei `regelnBestaetigen: true` kann in der Zeit, in der er aus ist, niemand die
  Regeln akzeptieren. Neue Leute sehen dann nur START. Wenn dein PC nicht
  dauerhaft läuft, setz `regelnBestaetigen: false`, **bevor** du den Bot zum
  ersten Mal startest.
- **Automatisch mit Windows starten:** `Win + R` → `shell:startup` eingeben →
  eine Verknüpfung zu `start.bat` in den Ordner legen.
- **Gib dir selbst die Rolle „Owner“** (Servereinstellungen → Mitglieder).
- Die alten Standard-Kanäle (`#general` usw.) kannst du danach von Hand löschen.
- Wenn die Buttons „Das hat nicht geklappt“ sagen, zieh die Bot-Rolle in
  Servereinstellungen → Rollen ganz nach oben.

## Anpassen

Unter dem Ausfüll-Bereich in `config.js` stehen Kanalnamen, Rollen, Farben, Slowmode und die Texte
für Willkommen, Regeln und Ping-Rollen.
