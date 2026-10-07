# Bladebound – Thumbnails & Icon

Artwork für das Roblox-Schwertkampfspiel **Bladebound**, komplett als 3D-Szenen gebaut. Alle Bilder haben
denselben Stil (dramatisches Licht, leuchtende Schwerter, Blockfiguren im Roblox-Look) und dasselbe Logo,
zeigen aber jeweils einen anderen Teil des Spiels.

| Datei | Motiv |
| --- | --- |
| `Bladebound_Thumbnail_1_Titan.png` | Der Held mit lila Blitz-Schwert vor Burg, Lava-Titan und roter Sonnenfinsternis |
| `Bladebound_Thumbnail_2_Monument.png` | Der Hub bei Nacht: das leuchtende Schwert-Monument, Laternen, versiegelte Welt-Tore, Polarlicht |
| `Bladebound_Thumbnail_3_Schmiede.png` | Der Blade Smith schmiedet eine glühende Klinge („Forge · Upgrade“), Schwerter in Seltenheitsfarben |
| `Bladebound_Thumbnail_4_Portale.png` | Der Held auf dem Weg zum Eisportal, dahinter die versiegelten Welt-Tore |
| `Bladebound_Thumbnail_5_Duell.png` | Duell im Steinkreis bei Sonnenuntergang |
| `Bladebound_Thumbnail_1_Titan_ohne_Logo.png` | Bild 1 ohne Logo, z. B. für eigene Texte |
| `Bladebound_Icon.png` | Spiel-Icon (512 × 512) |

Alle Thumbnails sind 1920 × 1080 groß. Hochladen kannst du sie im Roblox Creator Hub in den Einstellungen
deines Spiels (Icon und Thumbnails); mehrere Thumbnails zeigt Roblox nacheinander an.

## Neu rendern oder anpassen

Die Szenen liegen in `source/` (Three.js). Zum Neu-Rendern brauchst du Node.js:

```bash
cd bladebound/source
npm install
npx playwright install chromium
npm run render              # alle Bilder
npm run render -- schmiede  # nur Bilder, deren Dateiname „schmiede“ enthält
```

Die PNGs werden direkt in `bladebound/` überschrieben.

Wo was steckt:

- `js/scenes/`: je eine Datei pro Bild (`titan`, `monument`, `forge`, `portals`, `duel`) mit Kamera, Licht und Aufbau
- `js/avatar.js`: Roblox-Figuren (Gesicht, Frisur, Kleidung, Pose)
- `js/village.js`: Bausteine aus dem Spiel (Tannen, Klippen, Laternen, Häuser, Marktstand, Portale, Monument, Gras)
- `js/forge.js`: Schmiede, Amboss, Esse, Waffenständer
- `js/hero.js`, `js/titan.js`, `js/castle.js`, `js/bridge.js`, `js/islands.js`, `js/props.js`: Szene 1
- `js/sky.js`, `js/sky2.js`: Himmel (Finsternis, Nacht mit Mond und Polarlicht, Sonnenuntergang)
- `js/logo.js`: das BLADEBOUND-Logo

Zum Ausprobieren im Browser startest du in `source/` einen lokalen Server (z. B. `npx http-server`) und öffnest
`scene.html` mit Parametern, z. B. `?scene=forge`, `?scene=duel&logo=0` oder `?mode=icon`.

Schriften: Cinzel und Cinzel Decorative (SIL Open Font License, siehe `source/fonts/`).
