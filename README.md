# Blue Mold – centrum dowodzenia RoviHere (PWA)
Czysty HTML/CSS/JS + canvas, bez build i bez bibliotek. Działa offline (service worker), da się dodać do ekranu telefonu.
Wygląd: akta incydentu KALLICHORE-7 z książki *Blue Mold* (granat + turkus, czerwone pieczątki). Marka kont: **RoviHere / Rovi**; **Blue Mold** to statek i świat w aplikacji.
Wersja 4 (18.10.2026): z akt załogi zrobione **centrum dowodzenia** – pulpit, polecenia do arkusza Google, ustawienia łącza. Statek, akta i kanał UFO zostają.

## Architektura
```
 telefon / komputer                       Google (Twoje konto, darmowo)                 agenci (Grok Bot)
┌──────────────────────────┐  POST text/plain (JSON+token)  ┌──────────────────────────┐   Google Drive connector:
│ PWA Blue Mold            │ ─────────────────────────────▶ │ Apps Script web app      │   czytają arkusz (CSV)
│ GitHub Pages /blue-mold/ │  GET ?akcja=lista&token=…      │ backend/Code.gs (/exec)  │ ◀──────────────────────
│ pulpit · polecenia       │ ◀───────────── JSON ────────── │ arkusz „RoviHere         │   status/odpowiedź:
│ data/stan.json (pliki)   │                                │ Polecenia”: Polecenia,Stan│ ◀── POST akcja=status
└──────────────────────────┘                                └──────────────────────────┘
        ▲ python3 aktualizuj_stan.py (box) ← /workspace/rovihere/koordynacja/*.md + daty plików działów
```
1. **Front (statyczny)** – ten folder. Hosting docelowo GitHub Pages w podkatalogu (`https://<login>.github.io/blue-mold/`): wszystkie ścieżki względne, `manifest` ma `start_url`/`scope` = `./`, service worker liczy swój katalog z własnego adresu.
   Service worker **nie dotyka** backendu (inna domena, POST, adresy z `token=`); `data/*` – najpierw sieć, cache tylko offline.
2. **Backend poleceń** – Google Apps Script przypięty do arkusza „RoviHere Polecenia” (`backend/Code.gs`, instrukcja: `backend/INSTRUKCJA.md`).
   Zakładka **Polecenia**: `id | czas (Europe/Berlin) | dzial | tresc | priorytet | status | odpowiedz | zrodlo`. Nowe wiersze mają status `nowe`.
   Każde żądanie musi mieć token = właściwość skryptu `TOKEN` (funkcja `ustawToken()`); bez tego odpowiedź `{"ok":false}`.
   CORS: POST jako `text/plain` (żądanie proste, bez preflight), GET zwykły; oba przez przekierowanie 302 Google (fetch `redirect:"follow"`).
3. **Stan firmy** – `aktualizuj_stan.py` (na boxie) buduje `data/stan.json` + `data/stan.js` z dat plików działów oraz z plików Mostka
   `koordynacja/KALENDARZ.md`, `PRZEPLYW.md`, `BLOKADY.md` (tylko to, co w nich jest – sekcje, tabele, punkty 1:1).

## Co jest w aplikacji
- **Pulpit** (przycisk z kafelkami w nagłówku): plan publikacji na dziś z odliczaniem do następnej pozycji i na 6 kolejnych dni
  (YouTube: Shorty codziennie 21:00, długie filmy śr i nd 18:00; TikTok: pakiet 8:00, post 19:00 – czas Europe/Berlin; plan ustalony 18.10.2026, stała `PLAN` w `centrum.js`),
  blokady (otwarte + najnowszy status dnia + decyzje użytkownika z BLOKADY.md), kalendarz Mostka (dziś, najbliższe dni, zasady, stały rytm),
  przepływ zadań (treści cykliczne, projekty, zasady), status działów (z akt), konta: TikTok @roviheree, YouTube @RoviHere, X @RoviHere, Suno @kkruk93.
- **Polecenia** (ikona terminala): dział (12 działów z `data/zaloga.js` wg `ZESPOL.md`), priorytet (niski/normalny/wysoki/pilne), treść (max 2000 znaków) → **Wyślij polecenie**.
  Poniżej rejestr: ostatnie 50 poleceń z arkusza ze statusem i odpowiedzią, przycisk **Odśwież**. Ostatnia lista jest zapamiętana lokalnie (`bm-cmd-cache`).
  Bez łącza albo przy błędzie: **Kopiuj do czatu** – stary kanał UFO (schowek + animacja), tekst z dopiskiem `[POLECENIE · priorytet: …]`.
- **Ustawienia łącza** (z Poleceń albo Protokół ⚙ → „Łącze z bazą poleceń”): adres `/exec` + token, **Testuj połączenie** (ping). Zapis w `localStorage` (`bm-api-url`, `bm-api-token`) – nigdy w plikach.

## Jak agenci odbierają polecenia
1. **Odczyt (Google Drive connector):** `search` z `exactName: "RoviHere Polecenia"` → `fileId`, potem `read_file(fileId)` – arkusz przychodzi jako CSV (wszystkie zakładki).
   Agent bierze wiersze ze `status = nowe` i swoim działem w kolumnie `dzial` (nazwy jak w aplikacji: Rovi Here, Novi, Mostek, Pomysły, Profesor, TikTok, X, YouTube, Książka Blue Mold, Suno Rap, Jedzenie, Technika i Studio).
   Uwaga: connector ma uprawnienie *drive.file* – widzi pliki utworzone przez aplikację-connector albo otwarte przez użytkownika z jej poziomu. Jeśli `search` nie znajdzie arkusza, najprościej: agent tworzy arkusz connectorem (`create_file`, CSV z nagłówkami → `targetMimeType` spreadsheet, nazwa „RoviHere Polecenia”), a użytkownik w tym arkuszu robi kroki z INSTRUKCJA.md (od „Rozszerzenia → Apps Script”).
2. **Zapis statusu:** connector Drive nie edytuje pojedynczych komórek (`update_file_content` nadpisałby cały arkusz – nie używać). Dlatego `Code.gs` ma akcję `status`:
   ```
   curl -sL -H 'Content-Type: text/plain' \
     -d '{"token":"…","akcja":"status","id":"P-261018-134500-AB1","status":"zrobione","odpowiedz":"Gotowe: youtube/shorts/…"}' \
     'https://script.google.com/macros/s/…/exec'
   ```
   (`curl -L` idzie za przekierowaniem 302 Google). Statusy: `nowe`, `w toku`, `zrobione`, `odrzucone`. Odpowiedź widać w aplikacji po „Odśwież”.
   Token dla agentów użytkownik przekazuje świadomie (np. w czacie lub w pliku na boxie poza tym folderem); bez tokenu agenci tylko czytają przez connector, a odpowiadają w czacie albo komentarzem connectora (`add_comment` do arkusza).
3. Zakładkę **Stan** (`klucz | wartosc | zmieniono`) można uzupełniać ręcznie; `doGet` ją zwraca (pole `stan`).

## Pliki (nowe w v4)
- `centrum.js` – pulpit, polecenia, ustawienia łącza, klient backendu.
- `backend/Code.gs` – Apps Script (`doPost`, `doGet`, `przygotujArkusz()`, `ustawToken()`, akcja `status`).
- `backend/INSTRUKCJA.md` – kroki dla użytkownika: arkusz, skrypt, autoryzacja („Google hasn’t verified this app” → Zaawansowane → Przejdź do…), wdrożenie, GitHub.
- `data/nadpisania.json` – STOP **zdjęty** (`stop: false`, historia w `stop_historia`), notatki działów, `pomin_okno_mtime` (18.10 ok. 12:07–12:09 cały `/workspace/rovihere` skopiowano – daty z tego okna nie liczą się jako praca; w pulpicie „data kopii”).
- Testy (poza folderem publikacji): `/workspace/rovihere/aplikacja-test/test_centrum.py` + `mock_backend.py` (atrapa Apps Script z przekierowaniem 302, bez obsługi OPTIONS).

## Testy
`python3 /workspace/rovihere/aplikacja-test/test_centrum.py` – kopiuje aplikację do `/tmp/srv/blue-mold/`, serwuje na `http://127.0.0.1:18777/blue-mold/`,
uruchamia atrapę backendu na porcie 18790, przechodzi: pulpit, polecenie bez łącza (schowek), ustawienia + ping, wysyłka, zmiana statusu „jak agent”, lista, zły token, brak backendu, cache SW, błędy konsoli; robi zrzuty `podglad-*-2026-10-18.png` (1280 px i 390 px).

## Statek i akta (z wersji 3)
### Pliki
- `index.html`, `style.css`, `app.js` – aplikacja (silnik: pokoje, chodzenie korytarzami, sceny, dymki, radio, akta, kanał UFO).
- `data/zaloga.js` – 12 działów wg `/workspace/rovihere/ZESPOL.md` (persony, sekcje, cechy, relacje) + pula dialogów (`SCENY`, tryb „praca”/„pauza”) i myśli (`MYSLI`). Tu dopisujesz nowe rozmowy.
- `data/stan.json` + `data/stan.js` – aktualny stan działów (generowane).
- `data/nadpisania.json` – ręczny STOP i wyjątki (np. Pomysły/Profesor „na prośbę”) + notatki.
- `aktualizuj_stan.py` – przebudowuje stan z dat modyfikacji plików w /workspace/rovihere/<foldery działów>.
- `grafika/` – grafiki z książki (Enceladus z okładki, KALLICHORE-7, gejzer, schemat, okładka PL – zoptymalizowane webp), skan avatara Rovi, pnącza pleśni (svg), ziarno pieczątek.
- `manifest.webmanifest`, `sw.js`, `ikony/`, `fonts/` (Big Shoulders Display, IBM Plex Mono, EB Garamond – wszystkie OFL).

### Załoga (od 08.10.2026)
Rovi (kapitan) · Novi (nadzór załogi: scalanie, optymalizacja, zatrudnianie) · **Mostek** (połączone Koordynacja + Odprawa + Energia; jedna poranna odprawa) · Pomysły · Profesor · TikTok · X · YouTube · Książka · Suno · **Jedzenie** (prywatny, tylko na prośbę) · Studio.
Na statku: Mostek siedzi na mostku obok Rovi i zapala Węzeł oraz Reaktor; Jedzenie ma Kambuz. `aktualizuj_stan.py` liczy Mostek z folderów `mostek`, `koordynacja`, `odprawa`, `energia`.

### Odświeżenie stanu
1. (opcjonalnie) zmień `data/nadpisania.json` (STOP, wyjątki, notatki, okno dat kopii).
2. `python3 aktualizuj_stan.py`
3. Wgraj folder ponownie na hosting. Przy zmianie plików aplikacji podbij `CACHE` w `sw.js` (teraz `bluemold-v6-centrum`) i dopisz nowe pliki do `PLIKI`.

### Uruchomienie lokalne
`cd aplikacja && python3 -m http.server 8000` → http://localhost:8000/ (test w podkatalogu jak na GitHub Pages: patrz „Testy”)
PWA (instalacja, offline) wymaga https albo localhost – plik otwarty bezpośrednio (file://) pokaże mapę (dane z `data/*.js`), ale bez instalacji i bez service workera.

### Wygląd (wersja 3 – „akta Blue Mold”)
- Paleta z książki: granat/prawie czerń `#030e16`, lodowy turkus `#3fe0e6`, pleśń `#24bed2`, czerwień pieczątek `#c43e34`.
- Ekran startowy jak okładka: „KALLICHORE-7 · RAPORT INCYDENTU”, „KWARANTANNA POZIOM 5”, pieczątka ODTAJNIONO, log rozruchu.
- Statek: schemat pokładów KX7-2189 na tle Enceladusa z okładki, cyjanowe ramki z narożnikami, dymki jak wpisy transkryptu.
- Akta osobowe działu (jak karty postaci z książki): sygnatura AO-2189-00N, skan portretu z kodem kreskowym, pieczątka statusu, wiersze Status/Stanowisko/Tryb/Teraz, Zakres obowiązków, Profil, Cechy, Relacje, ostatni ślad w plikach, cytat, stopka „DOSTĘP: POZIOM 2 · JAWNE”.
- Rejestr załogi (sekcje: Dowództwo, Media, Rozwój i nauka, Technika, Prywatne), Protokół (informacje + ustawienia), kompozytor transmisji.
- Animacje (linie skanowania, poświata, wbijanie pieczątki) wyłączają się przy systemowym `prefers-reduced-motion`; linie skanowania można też wyłączyć (Filtr CRT).
- Na komputerze (≥900 px) obok sceny stały panel rejestru i kanał radiowy.

### Sterowanie
- Przeciągnij = przesuń, szczypnij / kółko myszy = zoom, podwójne stuknięcie w pokój = zbliżenie, stuknięcie w postać = kamera śledzi + pasek postaci → „Akta”. Przycisk ⛶ = cały statek.
- Protokół (ikona „i”): tryb symulacji (podgląd pracy mimo STOP, nie zmienia danych), dźwięk (WebAudio, domyślnie wyciszony), filtr CRT.

### Wiadomość do Rovi (kanał UFO)
- Przycisk „Nadaj do Rovi” (dolny róg sceny; także w aktach działu) otwiera kompozytor: odbiorca (Rovi lub dział), szybkie rozkazy, treść, podgląd.
- „Nadaj transmisję” kopiuje do schowka tekst w formacie:
  `🛸 TRANSMISJA DO ROVI (→ odbiorca)` / treść / `— z aplikacji Blue Mold, data godzina (Berlin)`.
  Kolejność prób: navigator.clipboard → ukryte pole + execCommand("copy") → okienko z zaznaczonym tekstem i przyciskiem „Kopiuj”.
- Na statku: pieczątka NADANO, UFO przylatuje, świeci promieniem nad mostkiem i opuszcza kapsułę; Rovi potwierdza odbiór i przekazuje do Mostka lub wybranego działu.
- Kanał UFO niczego nie wysyła w sieć i nie udaje odpowiedzi Rovi – odpowiedź przychodzi w czacie. (Do sieci idą tylko polecenia z formularza „Polecenia”, gdy ustawione jest łącze.)
- Dziennik transmisji jest tylko lokalny (localStorage `bm-tx`, max 40 wpisów), widoczny w radiu i w kompozytorze.

## Kopie poprzednich wersji
- `/workspace/rovihere/aplikacja-bak-2026-10-18/` – wersja 3 „akta Blue Mold” sprzed centrum dowodzenia.
- `/workspace/rovihere/aplikacja-bak-2026-10-08/` – wersja 2 sprzed przeprojektowania.
