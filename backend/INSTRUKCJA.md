# Backend poleceń – instrukcja krok po kroku (Google Sheets + Apps Script)

Cel: aplikacja Blue Mold zapisuje polecenia do arkusza Google **„RoviHere Polecenia”**, a agenci je stamtąd odczytują i odpisują status.
Wszystko jest darmowe i działa na Twoim koncie Google. Nic nie jest publiczne poza adresem web app, który bez tokenu odrzuca każde żądanie.

Czas: ok. 10 minut. Potrzebne: komputer z przeglądarką, zalogowane konto Google.

---

## 1. Arkusz
1. Wejdź na https://sheets.new (albo Dysk Google → **Nowy → Arkusze Google**).
2. Kliknij w nazwę „Arkusz bez tytułu” (lewy górny róg) i wpisz: **RoviHere Polecenia** → Enter.
   (Zakładek nie musisz tworzyć – zrobi to skrypt.)

## 2. Skrypt (Apps Script przypięty do arkusza)
1. W arkuszu: menu **Rozszerzenia → Apps Script** (ang. *Extensions → Apps Script*). Otworzy się nowa karta z edytorem.
2. Kliknij nazwę „Projekt bez tytułu” u góry i nazwij go np. **RoviHere Polecenia API**.
3. W pliku `Kod.gs` / `Code.gs` zaznacz wszystko (Ctrl+A) i usuń.
4. Otwórz plik `backend/Code.gs` z tej aplikacji, skopiuj **całą** zawartość i wklej do edytora.
5. Kliknij ikonę dyskietki **Zapisz projekt** (albo Ctrl+S).

> Alternatywa: https://script.google.com → **Nowy projekt** (skrypt samodzielny). Wtedy dodatkowo w **Ustawienia projektu (⚙) → Właściwości skryptu** dodaj właściwość `SHEET_ID` = ID arkusza (część adresu arkusza między `/d/` a `/edit`). Prościej jest jednak przez *Rozszerzenia → Apps Script*.

## 3. Uruchom `przygotujArkusz`
1. Na pasku nad kodem, z listy funkcji (obok przycisku **Debuguj**) wybierz **przygotujArkusz**.
2. Kliknij **▶ Uruchom**.
3. Za pierwszym razem pojawi się okno **Wymagana autoryzacja** → **Sprawdź uprawnienia**.
4. Wybierz swoje konto Google.
5. Pojawi się ekran **„Google hasn’t verified this app” / „Ta aplikacja nie została zweryfikowana przez Google”**. To normalne dla własnego skryptu:
   kliknij **Advanced / Zaawansowane** (mały link na dole) → **Go to RoviHere Polecenia API (unsafe) / Przejdź do: RoviHere Polecenia API (niebezpieczne)**.
6. Kliknij **Allow / Zezwól** (skrypt prosi o dostęp do Twoich arkuszy – używa tylko tego jednego).
7. Na dole „Dziennik wykonywania” pokaże „Gotowe…”. W arkuszu są teraz zakładki **Polecenia** (z nagłówkami: id, czas, dzial, tresc, priorytet, status, odpowiedz, zrodlo) i **Stan**.

## 4. Ustaw token (`ustawToken`)
Token to wspólne hasło między aplikacją a skryptem. Bez niego skrypt odrzuca wszystko.
1. Wersja A (losowy token – polecana): nic nie zmieniaj w kodzie. Wybierz funkcję **ustawToken** → **▶ Uruchom**.
   W „Dzienniku wykonywania” pojawi się linia `TOKEN zapisany… : abc123…` – **skopiuj token** (zapisz w menedżerze haseł).
2. Wersja B (własne hasło): w funkcji `ustawToken` zamień `WPISZ-TUTAJ-DLUGIE-HASLO` na swoje hasło (min. 16 znaków, bez spacji) → Zapisz → Uruchom → **potem przywróć w kodzie `WPISZ-TUTAJ-DLUGIE-HASLO`** i zapisz (hasło zostaje tylko we Właściwościach skryptu).
3. Sprawdzenie: **⚙ Ustawienia projektu → Właściwości skryptu** – jest właściwość `TOKEN`.
   Zmiana tokenu = uruchom `ustawToken` ponownie i wpisz nowy token w aplikacji.

## 5. Wdrożenie jako aplikacja internetowa
1. Prawy górny róg: **Wdróż → Nowe wdrożenie** (ang. *Deploy → New deployment*).
2. Przy „Wybierz typ” kliknij ⚙ → **Aplikacja internetowa** (*Web app*).
3. Opis: np. `v1`.
4. **Wykonaj jako: Ja** (*Execute as: Me*, Twój adres).
5. **Kto ma dostęp: Każdy** (*Who has access: Anyone*) – **nie** „Każdy z kontem Google”, inaczej przeglądarka nie dostanie JSON.
6. **Wdróż**. Jeśli znów pojawi się autoryzacja – powtórz kroki 3.3–3.6 (Zaawansowane → Przejdź do… → Zezwól).
7. Skopiuj **Adres URL aplikacji internetowej** – kończy się na **`/exec`** (np. `https://script.google.com/macros/s/AKfy…/exec`). Nie używaj adresu `/dev`.

Szybki test w przeglądarce (wklej w pasek adresu, z Twoim tokenem):
`https://script.google.com/macros/s/…/exec?akcja=ping&token=TWOJ_TOKEN` → powinno pokazać `{"ok":true,"pong":true,…}`.
Bez tokenu: `{"ok":false,"blad":"brak dostępu…"}` – tak ma być.

## 6. Podłączenie aplikacji
1. Otwórz aplikację Blue Mold → przycisk **Polecenia** (ikona terminala) → **Ustawienia łącza**
   (albo Protokół statku ⚙ → **Łącze z bazą poleceń**).
2. Wklej adres `/exec` i token → **Zapisz** → **Testuj połączenie** → ma się pokazać „Połączono ✓”.
3. Adres i token są zapisane tylko w tej przeglądarce (localStorage). Na telefonie zrób to samo raz.

## 7. Zmiany w kodzie skryptu później
Po edycji `Code.gs`: **Wdróż → Zarządzaj wdrożeniami → ✏ (Edytuj) → Wersja: Nowa wersja → Wdróż**.
Adres `/exec` zostaje ten sam. („Nowe wdrożenie” dałoby nowy adres – wtedy trzeba go wpisać w aplikacji.)

## Jak to działa technicznie (CORS)
- Apps Script nie pozwala ustawiać nagłówków CORS ani obsługiwać zapytań `OPTIONS`. Dlatego aplikacja wysyła POST z `Content-Type: text/plain` (żądanie „proste”, bez preflight), a w treści jest JSON: `{"token","akcja":"dodaj","dzial","tresc","priorytet","zrodlo"}`.
- Google odpowiada przekierowaniem 302 na `script.googleusercontent.com`; `fetch` idzie za nim (`redirect: "follow"`) i dostaje JSON.
- Lista: `GET …/exec?akcja=lista&n=50&token=…` → `{"ok":true,"czas":…,"polecenia":[…najnowsze pierwsze…],"stan":[…zakładka Stan…]}`.
- Agenci mogą zmienić status: `POST {"token","akcja":"status","id":"P-…","status":"w toku|zrobione|odrzucone|nowe","odpowiedz":"…"}`.
- Błędy zawsze wracają jako HTTP 200 z `{"ok":false,"blad":"…"}` (ograniczenie Apps Script).
- Limity darmowego konta Google (Apps Script) są dużo większe niż potrzeby kilku poleceń dziennie.

## Zakładka „Stan” (opcjonalna)
Wiersze `klucz | wartosc | zmieniono` – np. Mostek może tam wpisywać krótkie komunikaty. `doGet` zwraca je w polu `stan`.

---

# Krok GitHub (publikacja aplikacji – robisz Ty)
Aplikacja to statyczne pliki – nadaje się na darmowe **GitHub Pages** pod adresem `https://<login>.github.io/blue-mold/`. Wszystkie ścieżki w aplikacji są względne, service worker działa w podkatalogu.

Logowanie (wybierz jedno):
- **Na boxie (terminal):** `gh auth login` → *GitHub.com* → *HTTPS* → *Login with a web browser* → skopiuj jednorazowy kod, otwórz https://github.com/login/device, wklej kod i zatwierdź. Sprawdzenie: `gh auth status`.
- **W przeglądarce:** zaloguj się na https://github.com (konto darmowe).

Potem (repo i Pages ustawiasz sam/a albo zlecasz to w czacie po zalogowaniu):
1. Repo publiczne `blue-mold` – zawartość folderu `aplikacja/` w katalogu głównym repo (bez plików `podglad-*.png`, jeśli nie chcesz ich publikować).
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root) → Save**.
3. Po 1–2 min aplikacja jest pod `https://<login>.github.io/blue-mold/`.
4. Token i adres `/exec` **nie** trafiają do repo (są tylko w localStorage przeglądarki). `backend/Code.gs` nie zawiera sekretów.
