# Bladebound Discord-Bot

Erstellt den kompletten Bladebound-Community-Server (auf Englisch):
Rollen, Kategorien, Kanäle, Rechte, Community, eine Willkommensnachricht,
die Regeln mit Bestätigungs-Button und die Ping-Rollen mit Buttons.

```
「📜」ɪɴꜰᴏ               👋・ᴡᴇʟᴄᴏᴍᴇ  📜・ʀᴜʟᴇꜱ  🎭・ʀᴏʟᴇꜱ
「📢」ɴᴇᴡꜱ               📢・ᴀɴɴᴏᴜɴᴄᴇᴍᴇɴᴛꜱ  📝・ᴜᴘᴅᴀᴛᴇꜱ  🎉・ᴇᴠᴇɴᴛꜱ
「💬」ʙʟᴀᴅᴇ ʜᴀᴠᴇɴ        💬・ɢᴇɴᴇʀᴀʟ  💎・ʀᴀʀᴇ-ᴅʀᴏᴘꜱ  📸・ᴍᴇᴅɪᴀ  🤖・ʙᴏᴛ-ᴄᴏᴍᴍᴀɴᴅꜱ
「⚔️」ʟᴏᴏᴋɪɴɢ ꜰᴏʀ ɢʀᴏᴜᴘ   🏰・ʟꜰɢ-ᴅᴜɴɢᴇᴏɴꜱ  🐉・ʟꜰɢ-ʙᴏꜱꜱᴇꜱ  ⚔️・ʟꜰɢ-ᴀʀᴇɴᴀ  🛡️・ᴏʀᴅᴇʀ-ʀᴇᴄʀᴜɪᴛᴍᴇɴᴛ
「💰」ᴛʀᴀᴅɪɴɢ            💰・ʙʟᴀᴅᴇ-ᴇxᴄʜᴀɴɢᴇ
「🛠️」ꜱᴜᴘᴘᴏʀᴛ            ❓・ʜᴇʟᴘ  🐛・ʙᴜɢ-ʀᴇᴘᴏʀᴛꜱ  💡・ꜱᴜɢɢᴇꜱᴛɪᴏɴꜱ
「🔒」ꜱᴛᴀꜰꜰ              🔒・ꜱᴛᴀꜰꜰ-ᴄʜᴀᴛ  📡・ᴅɪꜱᴄᴏʀᴅ-ᴜᴘᴅᴀᴛᴇꜱ   (nur Team)
「🔊」ᴠᴏɪᴄᴇ              🔊・ɢᴇɴᴇʀᴀʟ  ⚔️・ᴘᴀʀᴛʏ 1–3 (je max. 4)

Rollen: Owner, Admin, Moderator, Content Creator, Bladeborn,
        Update-Ping, Event-Ping, LFG-Ping
```

## Einrichtung

**1. Bot erstellen**
1. Geh auf <https://discord.com/developers/applications> → **New Application** → Name eingeben.
2. Links auf **Bot** → **Reset Token** → Token kopieren.

**2. Ausfüllen**

Öffne `config.js`. Ganz oben unter **HIER AUSFÜLLEN** steht alles, was du eintragen kannst:

| Feld | Was rein muss |
|---|---|
| `token` | Dein Bot-Token (Pflicht) |
| `serverId` | ID deines Servers (nur nötig, wenn der Bot auf mehreren Servern ist) |
| `spielLink` | Link zu deinem Roblox-Spiel (optional) |
| `regelnBestaetigen` | `true` = Regeln per Button akzeptieren, `false` = alle sehen sofort alles |
| `communityAktivieren` | `true` = Community wird automatisch aktiviert |
| `schrift` | `'smallcaps'` (ᴡᴇʟᴄᴏᴍᴇ), `'bold'` (𝘄𝗲𝗹𝗰𝗼𝗺𝗲) oder `'normal'` (welcome) |

⚠️ Den Token nie teilen und `config.js` mit Token nie auf GitHub hochladen.

**3. Starten**

1. [Node.js](https://nodejs.org) installieren (LTS-Version).
2. Eine der beiden Dateien doppelklicken:

| Datei | Was sie macht |
|---|---|
| **`reset.bat`** | ⚠️ Löscht **alle** Kanäle (mit allen Nachrichten), aktiviert Community und baut alles neu auf. Fragt vorher nach: zum Bestätigen `JA` eintippen. |
| **`start.bat`** | Erstellt nur, was fehlt, und lässt den Bot laufen. Für jeden normalen Start. |

Beim ersten Start werden die nötigen Pakete installiert. Wenn der Bot noch
nicht auf deinem Server ist, zeigt das Fenster einen Einladungslink. Öffne ihn
und wähle deinen Server aus. Danach geht es automatisch los.

Das Fenster muss offen bleiben, solange der Bot laufen soll.

## Gut zu wissen

- **`reset.bat` nur einmal benutzen**, zum Beispiel um einen alten Server
  komplett neu aufzusetzen. Danach immer `start.bat`.
- **Der Bot läuft nur, solange dein PC an ist und das Fenster offen ist.**
  Bei `regelnBestaetigen: true` kann in der Zeit, in der er aus ist, niemand die
  Regeln akzeptieren. Neue Leute sehen dann nur INFO. Wenn dein PC nicht
  dauerhaft läuft, setz `regelnBestaetigen: false`, **bevor** du den Bot zum
  ersten Mal startest.
- **Automatisch mit Windows starten:** `Win + R` → `shell:startup` eingeben →
  eine Verknüpfung zu `start.bat` in den Ordner legen.
- **Gib dir selbst die Rolle „Owner“** (Servereinstellungen → Mitglieder).
- Rollen werden nie gelöscht. Vorhandene Rollen mit gleichem Namen werden weiterbenutzt.
- Community stellt die Sicherheitsstufe auf mindestens „Niedrig“ (verifizierte
  E-Mail) und schaltet den Filter für anstößige Medien für alle ein. Das
  verlangt Discord für Community-Server.
- Wenn die Buttons „Something went wrong“ sagen, zieh die Bot-Rolle in
  Servereinstellungen → Rollen ganz nach oben.

## Anpassen

Unter dem Ausfüll-Bereich in `config.js` stehen Kanalnamen, Emojis, Rollen,
Farben, Slowmode und alle Texte, die der Bot postet.
