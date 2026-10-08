# Plan do wersji 1.0 i zgłoszenia do katalogu Obsidiana

Stan na 8.10.2026 (po wydaniu 0.9.10). Źródła: dokumentacja dla twórców Obsidiana z `github.com/obsidianmd/obsidian-developer-docs` (strony „Submit your plugin”, „Submission requirements for plugins”, „Developer policies”, „Plugin guidelines”, „Manifest”, „Set up and claim”) oraz próbne uruchomienie oficjalnych reguł recenzji `eslint-plugin-obsidianmd` 0.3.0 na `src/`.

## Jak dziś wygląda zgłoszenie (2026)

Nie robi się już pull requesta do `obsidian-releases`. Zamiast tego:

1. Konto Obsidiana → **community.obsidian.md** → Sign in → połączenie konta GitHub (Connect).
2. W repozytorium na gałęzi domyślnej: `README.md`, `LICENSE`, poprawny `manifest.json` (katalog czyta manifest z HEAD gałęzi domyślnej).
3. Wydanie na GitHubie z tagiem = `version` z manifestu (np. `1.0.0`) i plikami `main.js`, `manifest.json`, `styles.css` — robi to nasz `release.yml`.
4. W katalogu: Plugins → **New plugin** → adres repozytorium, właściciel, zgoda na Developer policies i deklaracja dalszego wsparcia → Submit.
5. **Automatyczna recenzja** (reguły jak w `eslint-plugin-obsidianmd`); błędy poprawia się nowym wydaniem z wyższą wersją. Dopóki są błędy z automatycznej recenzji, pluginu nie da się zainstalować z Obsidiana.
6. Po publikacji: ogłoszenie na forum (Share & showcase) i Discordzie (#updates).

## Blokada: zasada o forkach

„Developer policies → Forks”: fork **nie jest dopuszczony** do katalogu, chyba że:

- autor oryginału dał **wyraźną, publicznie sprawdzalną zgodę na piśmie**, albo
- autor jest nieosiągalny i projekt nie był aktualizowany od co najmniej 6 miesięcy (plus 30 dni na odpowiedź po kontakcie).

W obu przypadkach autor oryginału musi być wymieniony jako współtwórca.

Oryginał (`st3v3nmw/obsidian-spaced-repetition`, Stephen Mwangi, opiekun Kyle Klus) jest aktywny: wersja 1.15.4, ostatnia aktualizacja w katalogu 14.06.2026, ok. 611 tys. pobrań. Droga „6 miesięcy” odpada — **potrzebna jest publiczna zgoda autorów** (np. wątek w GitHub Discussions albo issue w ich repozytorium). Bez niej plugin zostaje dystrybuowany przez BRAT (działa jak dotąd).

Alternatywy, gdyby zgody nie było: przekazać część dodatków do oryginału (pull requesty) albo napisać plugin od nowa bez kodu oryginału (bardzo duża praca).

## Wymagania formalne — co poprawić

| Sprawa                                | Stan                                                                        | Co zrobić                                                                                                                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `versions.json`                       | zawiera stare wpisy oryginału (`"1.0.0": "0.9.7"`, `"1.4.3"`, `"1.15.0"` …) | usunąć wpisy oryginału przed 1.0.0 — inaczej `1.0.0` wskazuje na minAppVersion 0.9.7                                                                                                                  |
| Nazwa                                 | „Upgraded Spaced Repetition” (tymczasowa)                                   | ostateczna nazwa: unikalna, łacińskie litery, bez „Obsidian” i „Plugin”; „Upgraded …” sugeruje ulepszoną wersję cudzego pluginu — warto wybrać własną                                                 |
| Opis w manifeście                     | zaczyna się od rzeczownika                                                  | zacząć od czasownika, maks. 250 znaków, kropka na końcu, bez emoji, np. „Review flashcards with spaced repetition, plus a timed streak game, read-aloud, quick card authoring and a review calendar.” |
| Domyślne skróty klawiszowe            | 3 komendy (`Ctrl+Shift+N`, `Ctrl+Enter`, `Ctrl+Shift+U`)                    | usunąć z kodu (wymóg recenzji); użytkowniczka ustawi je raz w Ustawieniach → Skróty klawiszowe                                                                                                        |
| README                                | po angielsku, ale nieaktualne (0.9.0, Time Boost, 2 motywy)                 | odświeżyć opis, zrzuty, sekcję o forku i autorach oryginału                                                                                                                                           |
| LICENSE                               | MIT, oba nazwiska                                                           | OK                                                                                                                                                                                                    |
| `isDesktopOnly: false`, brak API Node | OK                                                                          | —                                                                                                                                                                                                     |
| `fundingUrl`                          | brak                                                                        | OK (dodać tylko, jeśli mają być wpłaty)                                                                                                                                                               |

## Automatyczna recenzja — wynik próbny (`eslint-plugin-obsidianmd`, reguły „recommended”)

Ok. 170 uwag, w dużej części odziedziczonych po oryginale:

- 22 × przestarzałe API (`setDynamicTooltip` i inne),
- 12 × `import moment from "moment"` → `import { moment } from "obsidian"`,
- 11 × zapis „Title Case” zamiast „Sentence case” w tekstach UI,
- 10 × `setCssProps` ze stałymi wartościami → klasy CSS,
- 7 × `console.log`/`console.warn` bez potrzeby,
- 3 × domyślne skróty klawiszowe,
- 2 × obsługa wklejania bez sprawdzenia `evt.defaultPrevented`,
- 1 × referencja do widoku trzymana w pluginie (`sidebar-manager.tsx`),
- ok. 55 × typy `any` / obietnice w warunkach (`no-unsafe-*`, `no-misused-promises`),
- dodatkowo z wytycznych: `workspace.activeLeaf` (`ui-manager.tsx`), `detachLeavesOfType` (`review-queue-list-view.tsx`), `vault.modify` zamiast `vault.process` (`sr-file.ts`).

Plan: włączyć `obsidianmd.configs.recommended` w `eslint.config.mjs` (dziś zakomentowane) i poprawić wszystko do zera błędów.

## Pomysły na funkcje przed 1.0 (do wyboru przez użytkowniczkę)

Najważniejsze (bezpieczeństwo danych i codzienna wygoda):

1. **Cofnij ostatnią ocenę** (jak Ctrl+Z w Anki) — przy pomyłce na telefonie dziś nie da się cofnąć.
2. **Kopia zapasowa danych pluginu** — rekordy Speed Streak/Endless, kalendarz i historia są w `data.json`; przy synchronizacji 4 urządzeń jedna kopia może nadpisać drugą. Automatyczna kopia (np. raz dziennie, kilka ostatnich) + przycisk „Eksportuj/Przywróć”.
3. **Scalanie danych z kilku urządzeń** — rekordy i historia łączone zamiast nadpisywane (zależnie od sposobu synchronizacji).
4. **Trudne fiszki („pijawki”)** — lista fiszek, które często dostają „Ponownie”, z możliwością przejrzenia i poprawienia.

Na później / opcjonalnie:

5. Lżejszy `main.js` (dziś ~2,1 MB przez wbudowane zdjęcia; WebP zamiast JPEG ≈ −40%).
6. Pierwsze uruchomienie: krótkie wprowadzenie i przykładowa talia dla nowych osób.
7. Unikalne nazwy klas CSS (dziś te same `sr-*` co oryginał — przy obu pluginach włączonych style się mieszają).
8. Optymalizacja parametrów FSRS na podstawie historii powtórek.
