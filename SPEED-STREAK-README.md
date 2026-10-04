# Speed Streak dla Obsidian Spaced Repetition

Port dodatku Anki **Speed Streak** wbudowany w plugin _Spaced Repetition_ (wersja 1.15.4).

## Instalacja

1. Zamknij Obsidiana (albo wyłącz plugin Spaced Repetition).
2. Rozpakuj `obsidian-spaced-repetition-speed-streak.zip` i skopiuj `main.js`, `styles.css`, `manifest.json` do
   `<twój vault>/.obsidian/plugins/obsidian-spaced-repetition/` (zastąp istniejące pliki; `data.json` zostaw).
3. Uruchom Obsidiana. Ustawienia → Spaced Repetition → **Speed Streak**.

> Uwaga: nie aktualizuj tego pluginu ze sklepu społeczności — aktualizacja nadpisze wersję z Speed Streak.

## Jak działa

- **Dwa timery**: czas na pytanie (domyślnie 12 s) i na odpowiedź (8 s). Pierścień i pasek zmieniają kolor z zielonego na czerwony.
- **Seria**: każda karta skończona w czasie zwiększa serię (każda ocena się liczy, także „Ponownie”, jak w oryginale; można to zmienić).
  Przekroczenie czasu = seria stracona, karta zostaje i oceniasz ją uczciwie.
- **Time Boost**: za co 10 kart dostajesz Boost (bank max 5, start 3). Boost dodaje +10 s do bieżącego timera. Klawisz **C**.
- **Pauza**: klawisz **P**, przycisk lub kliknięcie w pierścień. Karta jest wtedy zasłonięta. Automatyczna pauza, gdy wychodzisz z Obsidiana, edytujesz kartę lub skaczesz do notatki.
- **Pierwsza karta gratis**: rozgrzewka bez limitu po wejściu w powtórkę.
- **Rekordy**: wszech czasów i dzisiejszy, „Czyste” serie (bez pauz i Boostów), top 5 / ostatnie 5 w ustawieniach.
- **Ostrzeżenie „kończy się czas”**: pulsowanie (i tykanie) przez ostatnie 3 s.
- **Dźwięki** (syntezowane, domyślnie wyłączone), **wibracje** na telefonie, **podsumowanie sesji** po wyjściu.
- **Tryb Punkty** (klasyczny): punkty × mnożnik serii.

## Motywy

Ustawienia → Speed Streak → Wygląd → **Motyw**. Do wyboru: Obsidian (jak motyw vaulta), Klasyczny, Jak karta, Grafit, Północ, Las, Żar, Fiolet, Ocean (8 ostatnich przeniesione z dodatku do Anki).
Timer przechodzi płynnie przez kolory motywu: dobre → trudne → ponownie.

**Nowy motyw**: dopisz jeden obiekt do listy `SPEED_STREAK_THEMES` w `src/speed-streak/speed-streak-themes.ts` (instrukcja na górze pliku). Wystarczy podać tylko kolory, które chcesz zmienić — reszta bierze się z motywu Obsidiana.

## Specjalne reguły timera

Jedna reguła na linię, dopasowanie do tagu notatki lub ścieżki talii:

```
#anatomia = 30/15      pytanie 30 s, odpowiedź 15 s
#dlugie = +10/+5       dodatkowe sekundy do domyślnych
#slowka = untimed      bez limitu
farma = -/untimed      pytanie domyślnie, odpowiedź bez limitu
```

## Komendy (do przypisania własnych skrótów)

- Speed Streak: użyj Boosta
- Speed Streak: pauza / wznów timer
- Speed Streak: włącz / wyłącz

## Czytanie na głos

Po odsłonięciu odpowiedzi plugin może przeczytać na głos obce słowo albo zdanie, z wymową dla języka karty.
Używa głosów zainstalowanych w systemie, więc działa bez internetu i bez kont. Ustawienia → Spaced Repetition → **Czytanie na głos**.

### Jak oznaczać słowa

Podkreśl fragment znacznikiem `<u>…</u>`:

```
el gato::Este es un <u>gato</u>
```

- Kilka podkreśleń w jednej karcie jest czytanych po kolei.
- Pojedynczemu słowu możesz nadać inny język: `<u lang="en">computer</u>`.
- Nie używaj `==…==`, bo plugin zamienia je w luki.
- Gdy w odpowiedzi nic nie jest podkreślone, czytana jest cała odpowiedź, bez formatowania, linków, obrazków i tagów. Możesz to wyłączyć.

Najprościej jest zaznaczyć słowo i użyć komendy **„Oznacz do czytania na głos”**:

- na komputerze: skrót **Ctrl+Shift+U** (na Macu Cmd+Shift+U) albo prawy przycisk myszy → „Oznacz do czytania na głos”,
- na telefonie: paleta komend albo przycisk na pasku narzędzi edytora (Ustawienia → Pasek narzędzi mobilnych → dodaj komendę).

Ponowne użycie komendy na podkreślonym słowie zdejmuje podkreślenie.

### Kiedy plugin czyta

- Automatycznie po odsłonięciu odpowiedzi. Można to wyłączyć.
- Jeszcze raz, gdy:
    - dotkniesz albo klikniesz podkreślone słowo (czyta tylko to słowo),
    - naciśniesz przycisk 🔊 pod odpowiedzią,
    - naciśniesz klawisz **R** na komputerze (klawisz można zmienić).
- Komendę „Czytanie na głos: przeczytaj ponownie” możesz przypisać do własnego skrótu.
- Przejście do następnej karty, pominięcie karty albo zamknięcie powtórki od razu przerywa czytanie.
- Gdy działa Speed Streak, timer odpowiedzi stoi w czasie czytania („Wstrzymaj timer podczas czytania”). Taka przerwa nie liczy się jako pauza, więc seria zostaje „Czysta”.

### Reguły języków

Plugin musi wiedzieć, w jakim języku jest karta. Wpisz reguły, jedna na linię. Każda reguła pasuje do tagu notatki albo do ścieżki talii:

```
#hiszpanski = es-ES
#angielski = en-GB
#niemiecki = de-DE
#chinski = zh-CN
```

- Reguła pasuje też do tagów zagnieżdżonych, np. `#hiszpanski/czasowniki`.
- Karta bez pasującej reguły nie jest czytana. Możesz ustawić **język domyślny** dla takich kart.
- Dla każdego języka z reguł możesz wybrać głos. Przycisk „Test” odtwarza przykładowe zdanie. „Automatycznie” wybiera najlepszy głos, czyli najpierw głosy naturalne („Natural”, „Neural”, „Premium”, „Enhanced”).
- Sekcja **Diagnostyka** pokazuje, czy czytanie działa na tym urządzeniu i ile głosów jest dla każdego języka.

### Jak doinstalować głosy

- **Windows**: Ustawienia → Czas i język → Mowa → **Dodaj głosy**. Wybierz np. „Hiszpański (Hiszpania)”, a potem uruchom ponownie Obsidiana.
  Głosy „Natural” brzmią najlepiej. Jeśli ich nie ma na liście, plugin użyje zwykłych.
- **iOS / iPadOS**: Ustawienia → Dostępność → Treść mówiona → **Głosy** → wybierz język i pobierz głos (najlepiej „Rozszerzony” lub „Premium”).
- **Android**: Ustawienia → Ułatwienia dostępu → **Zamiana tekstu na mowę** → silnik (np. Usługi mowy Google) → ikona ustawień → Zainstaluj dane głosowe → wybierz język.
  Nazwy menu różnią się trochę u różnych producentów telefonów.
- **macOS**: Ustawienia systemowe → Dostępność → Treść mówiona → Głos systemowy → Zarządzaj głosami.

Po instalacji otwórz stronę „Czytanie na głos” jeszcze raz. Diagnostyka pokaże nowe głosy.

### Znane ograniczenia na Androidzie

- Na części Androidów Obsidian nie ma dostępu do syntezy mowy. Diagnostyka pokazuje wtedy „❌”. Czytanie jest wyłączone, a reszta pluginu działa normalnie.
- Lista głosów czasem pojawia się dopiero po kilku sekundach albo po ponownym otwarciu ustawień.
- Niektóre telefony podają tylko jeden głos na język, bez wyboru. Czasem zamiast wybranego głosu i tempa używają ustawień systemowych.
- Gdy telefon jest wyciszony albo aplikacja przechodzi w tło, czytanie może się nie odezwać lub zostać przerwane.

### Dla programistów

Kod jest w `src/tts/`. Czysta logika (bez DOM, z testami) jest w `tts-text.ts` i `tts-settings.ts`. Głosy dostarcza „dostawca” (`TtsProvider`).
Na górze `tts-provider.ts` jest instrukcja krok po kroku, jak dodać nowego dostawcę, np. głosy AI.

## Dodatki (przycisk z puzzlem)

W nagłówku listy talii, obok X, jest przycisk **Dodatki** (ikona puzzla). Pokazuje wszystkie dodatki do zwykłego Spaced Repetition: kalendarz powtórek, czytanie na głos i Speed Streak.

- Przełącznik przy dodatku włącza go i wyłącza.
- Koło zębate otwiera wszystkie ustawienia dodatku, te same co w Ustawieniach → Spaced Repetition. Strzałka w lewo wraca do listy.
- Wyłączony kalendarz dalej zapisuje historię w tle, więc po ponownym włączeniu nie ma w nim dziur.

## Kalendarz powtórek

Pod listą talii jest kalendarz całego roku: jeden kwadrat to jeden dzień. Im więcej kart tego dnia powtórzysz, tym mocniejszy kolor.

- **Kolor** (zielony, niebieski, czerwony) zmienisz kropkami obok kalendarza albo w Ustawieniach → **Kalendarz powtórek**.
- Strzałki przełączają rok, kółko wraca do bieżącego roku. Po najechaniu na kwadrat (albo przytrzymaniu na telefonie) widać datę i liczbę kart.
- Statystyki: karty i czas dzisiaj, średnie tempo (karty na minutę), szacowany czas na pozostałe karty, łączny czas nauki i czas z ostatniego tygodnia, średnio kart dziennie, procent dni z nauką, najdłuższa i obecna seria dni.
- Historia zbiera się od pierwszej powtórki w tej wersji pluginu. Wcześniejszych dni nie da się odtworzyć, bo plugin zapisywał tylko termin następnej powtórki.
- Czas jednej karty liczy się od pokazania pytania do oceny, maksymalnie 2 minuty (gdy odejdziesz od komputera, nie zawyża statystyk).

## Pominięte z oryginału (specyficzne dla Anki/Windows)

Wizualizacje 3D (Fusion Rings, Crystal Reactor…), osobne okno, wibracje pada, flagi „Review Later”/„Time Drain”, cofanie (OSR nie ma undo), własne pliki dźwiękowe.
