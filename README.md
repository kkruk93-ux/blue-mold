# Blue Mold

Companion web app and game for the sci-fi horror novel ***Blue Mold*** by **Cal Rennick**.

- **The ship** – https://kkruk93-ux.github.io/blue-mold/ – a PWA deck plan of the freighter *Shadow Spark* and its crew.
- **Blue Mold: Containment** – https://kkruk93-ux.github.io/blue-mold/game/ – a turn-based containment puzzle (12 case files from the KALLICHORE-7 incident). Offline, no ads, no tracking, no purchases, no data collected ([privacy policy](docs/game/privacy.html)).

## Repository layout

| Path | Published? | What |
|---|---|---|
| `docs/` | **yes** – the only folder deployed to GitHub Pages (`.github/workflows/pages.yml`) | the public site |
| `docs/game/` | yes | the game (vanilla JS/HTML/CSS, own manifest + service worker) |
| `backend/` | no | Google Apps Script for the owner's command feature (setup notes in Polish) |
| `internal/` | no | the owner's private dashboard data and notes |
| `tools/` | no | level solver, icon generator, smoke test |
| `store/` | no | Google Play listing drafts and graphics |
| `android/` | no | Trusted Web Activity / Google Play publishing guide |

> GitHub Pages must use **Settings → Pages → Source: GitHub Actions** so that only `docs/` is published.
> This repository is public: everything outside `docs/` is still readable on GitHub, it is just not served on the site.

## Owner tools in the app (command feature)

The app's *Commands* panel can send a command to the owner's Google Apps Script web app. Neither the web-app URL
nor the token is stored in this repository. On each device, open **Commands → Link settings** and paste the `/exec` URL
(or open `https://kkruk93-ux.github.io/blue-mold/#link=<url-encoded /exec URL>` once), then enter the token when sending.
Both are kept only in that browser's local storage. A private status file can be imported in the dashboard (stored locally only).

## Game development

```bash
node tools/solve.js            # proves every level is solvable and reports the best (fewest infected) result
node tools/test_engine.js      # rule tests (win / lose / vents / cold / torch)
python3 tools/make_icons.py    # regenerates game/app icons and store graphics (Pillow)

# local preview under the same sub-path as GitHub Pages
mkdir -p /tmp/site && ln -sfn "$PWD/docs" /tmp/site/blue-mold && (cd /tmp/site && python3 -m http.server 8765)
# → http://localhost:8765/blue-mold/  and  http://localhost:8765/blue-mold/game/
python3 tools/smoke_test.py /tmp/screens   # headless Chromium at 390×844 (needs: pip install playwright && playwright install chromium)
```

Levels live in `docs/game/js/levels.js` (map legend in `docs/game/js/engine.js`). After changing them run the solver and
update `best`. When releasing changes, bump `CACHE` in `docs/sw.js` (app) and/or `docs/game/sw.js` (game).

## Credits

Story world: *Blue Mold* by Cal Rennick. Code and art are original. Fonts: EB Garamond, IBM Plex Mono, Big Shoulders Display (SIL Open Font License, licences in `docs/fonts/`).
