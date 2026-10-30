# Google Play store listing – draft (English)

Assets in this folder: `icon-512.png` (512×512, 32-bit PNG), `feature-graphic-1024x500.png` (1024×500, no alpha).
Phone screenshots: take them from the running game (portrait, e.g. 1080×1920 or the 390×844 @2x shots from `tools/smoke_test.py`); Play needs at least 2.
Regenerate the icons with `python3 tools/make_icons.py`.

| Field | Value |
|---|---|
| App name (≤30) | **Blue Mold: Containment** (22) |
| Short description (≤80) | **Seal the bulkheads before the blue mold reaches the bridge. 12 case files.** (74) |
| Category | Games › Puzzle |
| Tags (suggestion) | Puzzle, Strategy, Turn-based, Offline, Sci-fi |
| Contains ads | No |
| In-app purchases | No (v1.0) |
| Privacy policy URL | https://kkruk93-ux.github.io/blue-mold/game/privacy.html |
| Website | https://kkruk93-ux.github.io/blue-mold/ |
| Contact e-mail | *(owner: add a contact address – required by Play)* |

## Full description (≤4000)

The freighter *Shadow Spark* is sixteen hours out from Enceladus. In Cargo Hold 3 sits a frozen container from the station Kallichore-7 – and something blue is growing out of its seals.

**Blue Mold: Containment** is a turn-based puzzle game drawn in pencil on graph paper. Every case file is a hand-sketched deck plan of the ship. Each turn you take one action: seal a bulkhead door, seal an air vent, burn the mold with the torch – or wait. Then the mold grows into every open neighbouring compartment. Keep it away from the bridge, the reactor and the crew quarters.

• 12 handcrafted case files from the KALLICHORE-7 incident, from a single door to a ship-wide outbreak
• Simple rules, real decisions: limited seals, connected vents, cold storage that slows the growth, a torch with only one charge
• See where it grows next – plan your containment, undo a move or restart any time
• Earn up to three stars for the smallest infection and unlock recovered incident reports
• A pencil-and-graphite look where the glowing blue mold is the only colour
• Plays offline, portrait, one-handed
• No ads, no accounts, no tracking, no in-app purchases, no data collected

Based on the sci-fi horror novel *Blue Mold* by Cal Rennick.
Do not answer the signal. Do not open Cargo Hold 3.

## Release notes – 1.0.0

First release: 12 case files, offline play, saved progress.

## Questionnaire answers (summary – see android/README.md)

- **Content rating (IARC):** puzzle game; no violence beyond abstract "mold" cells, no blood, no sexual content, no gambling, no user interaction/chat, no sharing of location, no purchases → expected rating: everyone / PEGI 3 (final rating is issued by IARC).
- **Data safety:** "No data collected", "No data shared". Progress is stored only on the device (localStorage) and never transmitted. No encryption-in-transit question applies because nothing is sent; the app only downloads its own static files over HTTPS.
- **Target audience:** 13+ recommended (sci-fi horror theme of the book) – avoids the extra Families-policy requirements. Not designed for children.
- **Ads:** No. **App access:** all functionality available without login.
