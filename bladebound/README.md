# Bladebound – Thumbnail & Icon

Artwork für das Roblox-Schwertkampfspiel **Bladebound**, komplett als 3D-Szene gebaut:
ein Roblox-Held von hinten mit lila Blitz-Schwert, eine gotische Burg auf einer schwebenden Insel,
ein Lava-Titan mit Riesenschwert unter einer roten Sonnenfinsternis und das silberne Logo.

| Datei | Größe | Verwendung |
| --- | --- | --- |
| `Bladebound_Thumbnail.png` | 1920 × 1080 | Thumbnail auf der Spielseite |
| `Bladebound_Thumbnail_ohne_Logo.png` | 1920 × 1080 | zweites Thumbnail oder Hintergrund für eigene Texte |
| `Bladebound_Icon.png` | 512 × 512 | Spiel-Icon |

Hochladen kannst du beides im Roblox Creator Hub in den Einstellungen deines Spiels (Icon und Thumbnails).

## Neu rendern oder anpassen

Die Szene liegt in `source/` (Three.js). Zum Neu-Rendern brauchst du Node.js:

```bash
cd bladebound/source
npm install
npx playwright install chromium
npm run render
```

Die PNGs werden dann direkt in `bladebound/` überschrieben.

Wo was steckt:

- `js/main.js`: Kamera, Lichter, Nebel und wo jedes Objekt im Bild steht
- `js/hero.js`: Held, Umhang, Haare und Schwert
- `js/titan.js`, `js/castle.js`, `js/bridge.js`, `js/islands.js`, `js/props.js`: Kulisse
- `js/sky.js`: Himmel und Sonnenfinsternis
- `js/logo.js`: das BLADEBOUND-Logo

Zum Ausprobieren im Browser startest du in `source/` einen lokalen Server (z. B. `npx http-server`) und öffnest
`scene.html` mit Parametern, z. B. `?logo=0` (ohne Logo), `?mode=icon` (Icon) oder
`?zoom=0.25,0.4,24` (Nahansicht eines Bildausschnitts).

Schriften: Cinzel und Cinzel Decorative (SIL Open Font License, siehe `source/fonts/`).
