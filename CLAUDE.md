# CLAUDE.md — zasady projektu

Fork pluginu **Obsidian Spaced Repetition** (1.15.4) rozwijany pod jedną użytkowniczkę, wydawany na GitHubie (`luckyflickerman/obsidian-spaced-repetition`) i instalowany przez BRAT.
Użytkowniczka nie programuje — rozmawiaj z nią **po polsku, prostym językiem**, bez żargonu.

## Tożsamość pluginu

- Identyfikator: **`upgraded-spaced-repetition`** — stały, **nigdy go nie zmieniaj** (zmiana = nowy plugin, utrata ustawień).
- Nazwa: **`Fishcards`** (od 0.9.11; wcześniej „Upgraded Spaced Repetition”). Zmienia się tylko `name` w manifeście i teksty — identyfikator zostaje.
- Folder w vaulcie: `.obsidian/plugins/upgraded-spaced-repetition/`. Oryginał (`obsidian-spaced-repetition`) może być zainstalowany równolegle, więc globalne nazwy (widoki, ikony) mają prefiks `usr-`.
- Adres repozytorium w kodzie: stałe `PLUGIN_REPO` / `PLUGIN_REPO_URL` w `src/data/constants.ts`.

## Urządzenia (najważniejsza zasada)

Plugin musi działać na **Windows, iPadzie, iPhonie i Androidzie**.

- Tylko API Obsidiana i przeglądarki. **Żadnych** API Node/Electron (`fs`, `path`, `require`, `electron`). `manifest.json` → `isDesktopOnly: false`.
- Dotyk: elementy klikalne min. **44×44 px**, nic tylko na hover, wszystko osiągalne bez klawiatury (komendy z palety komend działają na telefonie).
- iOS: `env(safe-area-inset-*)`, mowa i audio odblokowywane gestem użytkownika.
- Animacje: `requestAnimationFrame` tylko gdy widoczne, stop w tle (`document.hidden`) i na pauzie; respektuj `prefers-reduced-motion`.
- `Platform.isMobile` / `Platform.isPhone` / `Platform.isTablet` z `obsidian` do różnic między urządzeniami.

## Dane użytkowniczki (nie wolno zepsuć)

- **Nigdy** nie zmieniaj ani nie przestawiaj istniejących fiszek i komentarzy harmonogramu `<!--SR:…-->`. Nowy kod tylko dopisuje.
- Nowe ustawienia zawsze z wartościami domyślnymi i funkcją `normalize…Settings()` — stary `data.json` bez nowych pól musi się poprawnie wczytać.
- Jej format fiszek: `#ENG słowo:: tłumaczenie` (jedna linia), `:::` = oba kierunki, czasem wieloliniowe z `?`. Tag języka/talii na początku linii.

## Architektura

Oryginalny kod pluginu: `src/data`, `src/note`, `src/scheduling` (algorytmy SM-2 i FSRS), `src/ui`, `src/parser.ts`. Zmieniaj go tylko gdy trzeba; nowe funkcje jako osobne moduły:

| Moduł                  | Co robi                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/speed-streak/`    | gra z timerem i serią (silnik, rekordy, motywy `speed-streak-themes.ts`, style `visuals/`, układy `layouts/`)                     |
| `src/tts/`             | czytanie na głos (Web Speech API, dostawcy w `providers/`)                                                                        |
| `src/card-authoring/`  | tworzenie fiszek: szablony, wykrywanie, podgląd w edytorze (CodeMirror 6), duplikaty, licznik, obrazki, cel dzienny               |
| `src/heatmap/`         | kalendarz aktywności                                                                                                              |
| `src/review-window/`   | okno powtórek                                                                                                                     |
| `src/addons/addons.ts` | rejestr „wbudowanych wtyczek” (przełączniki w oknie „Opcje” i na głównej stronie Ustawień)                                        |
| `src/endless/`         | tryb Endless: kolejka z rozsuwaniem kart jednej fiszki, wynik i rekordy (`endless.records`), sekwencer bez zapisu harmonogramu    |
| `src/appearance/`      | tło: wbudowane motywy ze zdjęciem (`background-themes.ts`), paleta 70/20/10 (`photo-palette.ts`), szklane panele pod `.usr-bg-on` |
| `src/migration/`       | jednorazowy import danych z oryginalnego pluginu (okno Tak/Nie/Później + komenda)                                                 |

Wzorzec każdego modułu:

- **czysta logika bez DOM** w osobnych plikach + testy jest,
- **kontroler** jako cienki „klej” z UI,
- ustawienia w `*-settings.ts` z `normalize…`, strona w `src/ui/.../settings-page/*-page.tsx`,
- teksty **PL i EN** w `*-i18n.ts` (nigdy na sztywno w kodzie UI),
- **rejestry z instrukcją na górze pliku** tam, gdzie rzeczy się dokłada (motywy, style, dostawcy głosu, dodatki). Nowy element = nowy plik / jeden wpis.
- Kolory tylko przez zmienne CSS (`--ss-*` w Speed Streak, zmienne Obsidiana gdzie indziej) — działa w jasnym i ciemnym motywie.
- `@codemirror/state` i `@codemirror/view` są `external` w esbuild (Obsidian dostarcza je w runtime).

## Polecenia

```
pnpm install
pnpm build      # tsc + esbuild → main.js / styles.css
pnpm test       # jest (progi pokrycia w jest.config.js — nie obniżaj)
pnpm lint       # na Windowsie Prettier zgłasza CRLF — liczą się błędy ESLint
npx prettier --check --end-of-line auto .   # to samo co lint na GitHubie (Linux), bez fałszywych CRLF
node scripts/dev-vault-install.mjs   # kopiuje zbudowany plugin do dev-vault/.obsidian/plugins/upgraded-spaced-repetition/
node scripts/dev-vault-install.mjs --bez-danych   # bez startowego data.json (test importu z oryginału)
```

## Wydania

Historia wydań dla przyszłych sesji (decyzje, pułapki środowiska, otwarte sprawy): `docs/wydania/<wersja>.md` — **przeczytaj najnowszy plik przed pracą nad wydaniem**. Po każdym wydaniu dopisz nowy.

- Wersja jest w `manifest.json`, `package.json` i `versions.json` (`"wersja": "minAppVersion"`) — zmieniaj wszystkie trzy.
- Opis wydania: sekcja `## <wersja>` w `CHANGELOG-UPGRADED.md`.
- Wydanie robi GitHub Actions (`.github/workflows/release.yml`) po wysłaniu taga **równego wersji, bez `v`** (np. `0.9.0`). Workflow przerywa, gdy tag ≠ wersja w manifeście. Publikuje `main.js`, `manifest.json`, `styles.css` (dla BRAT) i zip.
- `minAppVersion` = najniższa wersja Obsidiana z wszystkimi używanymi API (sprawdzaj `@since` w `node_modules/obsidian/obsidian.d.ts`). Teraz `1.11.0` przez `SettingGroup`.

## Testowanie w prawdziwym Obsidianie

- **`dev-vault/`** — testowy vault z przykładowymi fiszkami we wszystkich formatach. Testuj na nim, **nigdy** na vaulcie użytkowniczki.
- Po `pnpm build` uruchom `node scripts/dev-vault-install.mjs`; z pluginem **Hot Reload** w dev-vault Obsidian sam przeładuje plugin.
- **Zrzuty ekranu (obowiązkowo przy zmianach wizualnych):**
    1. Obsidian uruchomiony z debugowaniem: `"%LOCALAPPDATA%\Programs\Obsidian\Obsidian.exe" --remote-debugging-port=9222` (poproś użytkowniczkę, jeśli nie działa).
    2. Połącz się Playwrightem: `chromium.connectOverCDP("http://localhost:9222")`, wybierz stronę Obsidiana, `page.screenshot()`.
    3. Tryb telefonu: `page.evaluate(() => app.emulateMobile(true))`, potem zrzut; powrót `app.emulateMobile(false)`. Sprawdź też wąskie okno (np. 390×844) i iPada (1024×768, 768×1024).
    4. **Obejrzyj zrzuty przed i po zmianie**, popraw, dopiero wtedy przejdź dalej. Pokaż użytkowniczce zrzut „po”.
- Jeśli nie da się połączyć z Obsidianem — zbuduj mały harness HTML z mockiem `obsidian` i zmiennymi CSS motywu, i zrzucaj Playwrightem.

## Zrzuty ekranu przy każdym wydaniu

Przed wysłaniem taga **każdej** wersji (także poprawkowej) zrób komplet zrzutów i obejrzyj go. Nie wydawaj, dopóki coś odstaje.

**Narzędzie:** `node scripts/release-screenshots.mjs <wersja>` (Obsidian musi działać z `--remote-debugging-port=9222`, a plugin być zbudowany i zainstalowany w `dev-vault`).

**Bezpieczeństwo:**

- Tylko okno, którego tytuł zawiera „- dev-vault - Obsidian” — skrypt przerywa, jeśli go nie ma, i dodatkowo sprawdza `app.vault.getName()`.
- Jeśli Obsidian działa bez portu debugowania (np. z vaultem użytkowniczki „cała wiedza”), **nie zamykaj go** — poproś ją o zamknięcie. Po uruchomieniu z portem otwórz `dev-vault` przez `obsidian://open?path=…`, jej vaultu nie dotykaj.
- Oryginalny plugin `obsidian-spaced-repetition` na czas zrzutów wyłączony przez `disablePluginAndSave` (te same nazwy klas CSS — po przeładowaniu w trybie telefonu inaczej wraca i miesza style), na koniec `enablePluginAndSave`.
- Powtórki oceniają fiszki testowe: skrypt sam przywraca pliki `dev-vault/Fiszki/*.md` po zrzutach (gdyby przerwał — `git checkout -- dev-vault/Fiszki`).

**Tryby (7):**

| Tryb             | Jak                                                            |
| ---------------- | -------------------------------------------------------------- |
| komputer-ciemny  | okno 1024×800, motyw `obsidian`                                |
| komputer-jasny   | okno 1024×800, motyw `moonstone`                               |
| komputer-szeroki | `Emulation.setDeviceMetricsOverride` 1440×900, `mobile: false` |
| ipad-pionowo     | 768×1024, `mobile: true` + `app.emulateMobile(true)`           |
| ipad-poziomo     | 1024×768, `mobile: true` + `app.emulateMobile(true)`           |
| telefon-ciemny   | 390×844, `mobile: true` + `app.emulateMobile(true)`            |
| telefon-jasny    | 390×844, motyw `moonstone`                                     |

`app.emulateMobile()` przeładowuje aplikację — po przełączeniu czekaj na `app.workspace.layoutReady` i `isInitialized` pluginu. Na koniec: motyw `system`, `emulateMobile(false)`, `Emulation.clearDeviceMetricsOverride`.

**Ekrany w każdym trybie** (numer w nazwie pliku = kolejność):

1. lista talii (z celem dziennym i kalendarzem),
2. okno Opcji (przycisk z kołem zębatym; „Opcje” + „Wbudowane wtyczki”),
3. powtórka — pytanie (druga karta: pierwsza to „gratis” bez timera),
4. powtórka — odpowiedź (przyciski ocen),
5. pauza Speed Streak,
6. edytor: notatka `Fiszki/Angielski.md` z podglądem fiszki i ikonką komentarza harmonogramu,
7. ustawienia: strony Speed Streak, Czytanie na głos, Tworzenie fiszek, Wygląd (tylko komputer).

Na iPadzie i w szerokim oknie wystarczą 1, 3, 4; w jasnym telefonie 1, 3, 4. Zrzut okna ustawień przez CDP bywa pusty — wtedy zanotuj to w raporcie zamiast udawać, że jest.

**Pomiary przy każdym ekranie** (skrypt zapisuje je w `metrics.json`): przyciski mniejsze niż 44×44 px na dotyku, tekst z kontrastem poniżej 4,5:1, przyciski bez nazwy (aria-label/tekst), błędy i ostrzeżenia w konsoli.

**Wynik:**

- Pliki w `Claude outputs/zrzuty/<wersja>/<tryb>-<nr>-<ekran>.png` + `metrics.json` (folder poza gitem).
- Porównaj z zestawem poprzedniej wersji: wszystko, co się zmieniło bez zamiaru, to błąd do poprawy przed wydaniem.
- Pokaż użytkowniczce najważniejsze zrzuty (telefon, iPad, komputer) i napisz, co sprawdzić ręcznie na urządzeniach.
- Gdy zmienił się wygląd: podmień zrzuty w `docs/screenshots/` (README).
- Zapisz w `docs/wydania/<wersja>.md`, że zrzuty są zrobione, i wszystkie znalezione problemy.

## Praca z gałęziami i commitami

- Każde zadanie na nowej gałęzi z najnowszej gałęzi roboczej; małe commity z opisem.
- Nie commituj: `zadania/`, `Claude outputs/`, `ZADANIE-*.md`, `dev-vault/.obsidian/`, plików z vaulta użytkowniczki.
- Użytkowniczka sama robi push przez GitHub Desktop — na końcu powiedz jej prostymi słowami, co kliknąć.
- Zlecenia są w `zadania/<nazwa>/ZADANIE.md`.

## Na koniec każdego zadania

1. `pnpm build` i `pnpm test` przechodzą.
2. Zrzuty ekranu (komputer + `emulateMobile`) dla zmian wizualnych.
3. Krótkie podsumowanie po polsku: co zrobione, co przetestować ręcznie na iPadzie/telefonie, gdzie jest zbudowany plugin.
4. Zaktualizuj `SPEED-STREAK-README.md`, jeśli zmieniło się coś widocznego dla użytkowniczki.
