# CLAUDE.md — zasady projektu

Fork pluginu **Obsidian Spaced Repetition** (1.15.4) rozwijany pod jedną użytkowniczkę, z planem wydania własnej wersji 1.0 na GitHubie (`luckyflickerman/obsidian-spaced-repetition`).
Użytkowniczka nie programuje — rozmawiaj z nią **po polsku, prostym językiem**, bez żargonu.

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

| Moduł | Co robi |
|---|---|
| `src/speed-streak/` | gra z timerem i serią (silnik, rekordy, motywy `speed-streak-themes.ts`, style `visuals/`, układy `layouts/`) |
| `src/tts/` | czytanie na głos (Web Speech API, dostawcy w `providers/`) |
| `src/card-authoring/` | tworzenie fiszek: szablony, wykrywanie, podgląd w edytorze (CodeMirror 6), duplikaty, licznik, obrazki, cel dzienny |
| `src/heatmap/` | kalendarz aktywności |
| `src/review-window/` | okno powtórek |
| `src/addons/addons.ts` | rejestr dodatków (włącz/wyłącz w oknie „Dodatki”) |

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
node scripts/dev-vault-install.mjs   # kopiuje zbudowany plugin do dev-vault/
```

## Testowanie w prawdziwym Obsidianie
- **`dev-vault/`** — testowy vault z przykładowymi fiszkami we wszystkich formatach. Testuj na nim, **nigdy** na vaulcie użytkowniczki.
- Po `pnpm build` uruchom `node scripts/dev-vault-install.mjs`; z pluginem **Hot Reload** w dev-vault Obsidian sam przeładuje plugin.
- **Zrzuty ekranu (obowiązkowo przy zmianach wizualnych):**
  1. Obsidian uruchomiony z debugowaniem: `"%LOCALAPPDATA%\Programs\Obsidian\Obsidian.exe" --remote-debugging-port=9222` (poproś użytkowniczkę, jeśli nie działa).
  2. Połącz się Playwrightem: `chromium.connectOverCDP("http://localhost:9222")`, wybierz stronę Obsidiana, `page.screenshot()`.
  3. Tryb telefonu: `page.evaluate(() => app.emulateMobile(true))`, potem zrzut; powrót `app.emulateMobile(false)`. Sprawdź też wąskie okno (np. 390×844) i iPada (1024×768, 768×1024).
  4. **Obejrzyj zrzuty przed i po zmianie**, popraw, dopiero wtedy przejdź dalej. Pokaż użytkowniczce zrzut „po”.
- Jeśli nie da się połączyć z Obsidianem — zbuduj mały harness HTML z mockiem `obsidian` i zmiennymi CSS motywu, i zrzucaj Playwrightem.

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
