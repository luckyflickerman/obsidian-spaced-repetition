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
- **Time Boost**: za co 10 kart dostajesz Boost (bank max 5, start 3). Boost dodaje +10 s do bieżącego timera. Klawisz **C**. Boosty można wyłączyć (Ustawienia → Speed Streak → Time Boost → **Boosty**). Wtedy liczy się tylko timer.
- **Pauza**: klawisz **P**, przycisk lub kliknięcie w pierścień. Karta jest wtedy zasłonięta. Automatyczna pauza, gdy wychodzisz z Obsidiana, edytujesz kartę lub skaczesz do notatki.
- **Pierwsza karta gratis**: rozgrzewka bez limitu po wejściu w powtórkę.
- **Rekordy**: wszech czasów i dzisiejszy, „Czyste” serie (bez pauz i Boostów), top 5 (więcej niżej).
- **Ostrzeżenie „kończy się czas”**: pulsowanie (i tykanie) przez ostatnie 3 s.
- **Dźwięki** (syntezowane, domyślnie wyłączone), **wibracje** na telefonie, **podsumowanie sesji** po wyjściu.
- **Tryb Punkty** (klasyczny): punkty × mnożnik serii.

## Style wizualne

Ustawienia → Speed Streak → Wygląd → **Styl wizualny**. Obok listy widać mały, animowany podgląd wybranego stylu w wybranych kolorach.

- **Fusion Rings** (domyślny): świecąca kula z liczbą serii. Wokół niej są pierścienie, które wypełniają się kolorami Twoich ocen, a dookoła krążą satelity. Każda oceniona karta dokłada kawałek pierścienia i satelitę. Od 48 kart wszystkie pierścienie są pełne („scalają się”).
- **Osobliwość (Singularity)**: ciemny środek ze świecącym pierścieniem. Cząstki są wciągane do środka, a siatka w tle wygina się ku niemu. Im dłuższa seria, tym więcej cząstek i jaśniejsza poświata.
- **Reaktor kryształu (Crystal Reactor)**: kryształ, któremu z każdą oceną wyrasta nowy odłamek w kolorze tej oceny.
- **Minimalny**: tylko pierścień timera i liczba. Zużywa najmniej baterii.

Każdy styl pokazuje:

- utratę serii po przekroczeniu czasu: satelity się rozpraszają, osobliwość się zapada, kryształ pęka,
- impuls przy użyciu Boosta,
- celebrację nowego rekordu (można ją wyłączyć w grupie Rekordy).

## Układy

Ustawienia → Speed Streak → Wygląd → **Układ**.

- **Automatyczny** (domyślny): panel boczny, gdy widok powtórki ma co najmniej 900 px szerokości, w przeciwnym razie pasek. Przełącza się sam przy zmianie rozmiaru okna, obrocie iPada i w Split View.
- **Kompaktowy pasek**: jeden wiersz nad kartą z timerem, małą sceną stylu, rekordem, Boostami i pauzą. Na telefon i iPada pionowo.
- **Panel boczny (lewy albo prawy)**: od góry timer z fazą, Boosty i postęp do następnego, rekord i bieżąca seria, lista top 5, duża scena stylu, a na dole pauza i Boost. Przycisk ze strzałkami zwija panel do wąskiego paska i rozwija go z powrotem.

Wszystkie przyciski mają co najmniej 44×44 px, więc łatwo w nie trafić palcem. Nic nie wymaga najechania myszą.

## Rekordy

Ustawienia → Speed Streak → **Rekordy**:

- **Widok**: tylko rekord, pasek serii (jak blisko jesteś rekordu) albo top 5.
- **Zakres**: wszech czasów albo dziś.
- **Lista top 5**: ranking (najdłuższe serie) albo ostatnie serie.
- **Filtr**: wszystkie serie albo tylko „Czyste”.
- **Celebracja nowego rekordu**: animacja i dźwięk.

Plakietki: **Czysta** oznacza serię bez ręcznych pauz i bez Boostów. **Przerwy** oznacza, że była pauza albo Boost. Pauza na czas czytania na głos się nie liczy.

Dotknij rekordu albo wiersza listy, żeby zobaczyć szczegóły serii: datę, czas aktywny, liczbę kart, pauzy, Boosty, talię i to, jak się skończyła.

## Pauza

Po zatrzymaniu (klawisz **P**, przycisk albo dotknięcie timera) zasłona nad kartą pokazuje:

- czas sesji,
- liczbę kart,
- **tempo** (karty na minutę i sekundy na kartę),
- bieżącą serię,
- sumę ocen (Ponownie / Trudne / Dobre / Łatwe) z kolorowym paskiem.

Dotknij zasłony, żeby wrócić do nauki.

## Wydajność

Ustawienia → Speed Streak → Wygląd → **Wydajność**:

- **Pełna**: 60 klatek na sekundę i wszystkie cząstki.
- **Lekka**: 30 klatek na sekundę i ok. 40% cząstek. Dobra do sesji dłuższych niż 10 minut na telefonie.
- **Minimalna**: bez ciągłej animacji. Scena rysuje się tylko wtedy, gdy coś się zmienia.
- **Automatyczna** (domyślna): Pełna na komputerze, Lekka na telefonie i tablecie.

Animacja w ogóle nie działa, gdy jest zbędna: kiedy scena jest niewidoczna (np. zwinięty panel), gdy aplikacja jest w tle i podczas pauzy.
Opcja **Ogranicz animacje** wyłącza ruch, a plugin sam respektuje też systemowe ustawienie „ogranicz ruch”.

## Motywy kolorów

Ustawienia → Speed Streak → Wygląd → **Motyw**. Do wyboru:

- **Domyślny dla stylu** (każdy styl ma swoje kolory),
- Obsidian (jak motyw vaulta),
- Klasyczny, Jak karta, Grafit, Północ, Las, Żar, Fiolet, Ocean.

Każdy styl działa z każdym motywem, bo bierze kolory tylko z motywu. Timer przechodzi płynnie przez kolory motywu: dobre → trudne → ponownie.

**Nowy motyw**: dopisz jeden obiekt do listy `SPEED_STREAK_THEMES` w `src/speed-streak/speed-streak-themes.ts` (instrukcja jest na górze pliku). Wystarczy podać tylko kolory, które chcesz zmienić. Reszta bierze się z motywu Obsidiana.

**Nowy styl wizualny**:

1. Utwórz plik `src/speed-streak/visuals/<nazwa>-visual.ts` z klasą dziedziczącą po `CanvasVisual` i napisz w niej `draw()`. Klasa bazowa sama zajmuje się rozmiarem płótna, pętlą animacji, poziomami wydajności i kolorami motywu.
2. Dopisz identyfikator stylu do `SPEED_STREAK_VISUAL_IDS` w `speed-streak-settings.ts`.
3. Dopisz jeden wpis do `SPEED_STREAK_VISUALS` w `src/speed-streak/visuals/visual-registry.ts`.

Szczegółowa instrukcja krok po kroku jest na górze `visual-registry.ts`.

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
- Podkreślenia są szukane w pytaniu i w odpowiedzi.
- Gdy nic nie jest podkreślone, czytane jest **pytanie** (np. w `#ENG forestalled:: uprzedzić` lektor czyta

Oznacz„Oznacz do czytania na głos”**:

- na komputerze: skrót **Ctrl+Shift+U** (na Macu Cmd+Shift+U) Oznacz„Oznacz do czytania na głos”,
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

## Okno powtórek: pełny ekran i przesuwanie

- Przycisk **⛶** w nagłówku (na liście talii i podczas powtórki) włącza i wyłącza pełny ekran. Możesz też przypisać skrót do komendy „Okno powtórek: pełny ekran wł. / wył.”.
- Okno przesuwasz, chwytając pasek u góry (nagłówek listy talii albo pasek karty) i przeciągając je w dowolne miejsce. Przyciski na pasku działają normalnie.
- Okno zapamiętuje miejsce do następnego otwarcia. Dwuklik na pasku wyśrodkowuje je z powrotem.
- Okno nie ucieknie za krawędź ekranu, bo pasek zawsze zostaje widoczny. Pełny ekran nie zmienia zapisanego rozmiaru okna.

## Dodatki (przycisk z puzzlem)

W nagłówku listy talii, obok X, jest przycisk **Dodatki** (ikona puzzla). Pokazuje wszystkie dodatki do zwykłego Spaced Repetition: kalendarz powtórek, czytanie na głos i Speed Streak.

- Przełącznik przy dodatku włącza go i wyłącza.
- Koło zębate otwiera wszystkie ustawienia dodatku, te same co w Ustawieniach → Spaced Repetition. Strzałka w lewo wraca do listy.
- Wyłączony kalendarz dalej zapisuje historię w tle, więc po ponownym włączeniu nie ma w nim dziur.

## Kalendarz powtórek

Pod listą talii jest kalendarz całego roku: jeden kwadrat to jeden dzień. Im więcej kart tego dnia powtórzysz, tym mocniejszy kolor.

- **Kolor** (zielony, niebieski, czerwony) wybierasz w Ustawieniach → **Kalendarz powtórek** albo w oknie Dodatki (koło zębate przy kalendarzu).
- **Zwijanie**: przycisk po prawej nad kalendarzem zwija go do małego bloku pod kolumnami Due / Nowe / Seen / Total. Zostaje tylko koło w kolorze kalendarza (pokazuje, jaka część zaplanowanych na dziś kart jest już zrobiona, a w środku liczbę kart, które zostały) i bieżący miesiąc. Dotknij bloku, żeby rozwinąć kalendarz. Zwinięcie można też włączyć w Ustawieniach → Kalendarz powtórek.
- Strzałki przełączają rok, kółko wraca do bieżącego roku. Po najechaniu na kwadrat (albo przytrzymaniu na telefonie) widać datę i liczbę kart.
- Statystyki: karty i czas dzisiaj, średnie tempo (karty na minutę), szacowany czas na pozostałe karty, łączny czas nauki i czas z ostatniego tygodnia, średnio kart dziennie, procent dni z nauką, najdłuższa i obecna seria dni.
- Historia zbiera się od pierwszej powtórki w tej wersji pluginu. Wcześniejszych dni nie da się odtworzyć, bo plugin zapisywał tylko termin następnej powtórki.
- Czas jednej karty liczy się od pokazania pytania do oceny, maksymalnie 2 minuty (gdy odejdziesz od komputera, nie zawyża statystyk).

## Tworzenie fiszek

Dodawanie słówek z książki ma zajmować kilka sekund. Wszystko dzieje się w notatce, bez dodatkowych okienek.

### Skróty

- **Ctrl+Shift+N** (na Macu Cmd+Shift+N): **nowa fiszka**. Gdy jesteś w pliku talii, na końcu pliku pojawia się szablon `#ENG |::: `, a kursor stoi przed separatorem. Gdy jesteś w innej notatce, plugin otwiera plik talii (albo go tworzy) i wstawia szablon na końcu.
- Wpisz słowo i naciśnij **Tab**: kursor przeskakuje do tłumaczenia. Tab działa tak tylko w linii niedokończonej fiszki. Działa też w starych liniach typu `#ENG ushering`: dopisuje separator.
- Wpisz tłumaczenie i naciśnij **Ctrl+Enter** (Cmd+Enter): **zakończ fiszkę**. Plugin:
    1. sprawdza, czy jest słowo i tłumaczenie,
    2. ostrzega o duplikacie (przycisk „Pokaż” przenosi do oryginału),
    3. czyta słowo na głos,
    4. podbija licznik dnia,
    5. wstawia w następnej linii kolejny pusty szablon.
- **Ctrl+Shift+U**: podkreśl zaznaczony fragment do czytania (`<u>…</u>`), też pod prawym przyciskiem myszy.
- Inne komendy z palety: „Nowa fiszka ze zdaniem” (wersja wieloliniowa ze zdaniem i `?`), „Nowa fiszka: zmień język”, „Dodaj obrazek do fiszki”, „Pokaż duplikaty w talii”.
- Na telefonie i iPadzie wszystkie komendy są w palecie komend. Możesz je też dodać do paska narzędzi edytora. Przycisk „Nowa fiszka” jest też na wstążce.

### Talie

Ustawienia → Spaced Repetition → **Tworzenie fiszek** → **Talie fiszek**. Każda talia to tag, plik i język czytania, np. `#ENG → Fiszki/Angielski.md → en-GB`.

- Nowe fiszki trafiają na koniec pliku talii. Plugin tylko dopisuje: istniejące linie i ich komentarze `<!--SR:…-->` się nie zmieniają.
- Ostatnio używana talia jest zapamiętywana. Zmienisz ją komendą „Nowa fiszka: zmień język”.
- Język talii działa jak reguła czytania na głos, więc nie trzeba go wpisywać drugi raz.
- Plugin czyta tylko notatki z tagiem fiszek (np. `#flashcards`). Jeśli tagu talii nie ma na tej liście, nowy plik talii zaczyna się od `#flashcards`.
- **Od razu drugi kierunek** (domyślnie włączone): nowe fiszki mają separator `:::`, więc słowo jest odpytywane w obie strony. Twoje stare fiszki z `::` zostają bez zmian.

### Podgląd

Przy każdej fiszce w edytorze jest ikonka 🃏, a przy niedokończonej ⚠ i żółte podkreślenie. Dotknij ikonki, żeby zobaczyć:

- fiszkę wyglądającą tak jak w powtórce,
- przycisk 🔊,
- status (nowa albo data następnej powtórki), talię i język,
- ostrzeżenie o możliwym duplikacie z linkiem,
- dla `:::` zakładki w obie strony.

Na komputerze podgląd otwiera się obok ikonki, a na telefonie w okienku. Ikonki wyłączysz w ustawieniach.

### Licznik

„**Nowe dziś: 4/10**” widać na pasku stanu, a na telefonie w podglądzie i po zakończeniu fiszki.

- Liczą się wszystkie nowe fiszki, także dopisane ręcznie, w dniu, w którym plugin pierwszy raz je zobaczył.
- Fiszki istniejące przed aktualizacją nie są liczone.
- Dzień zaczyna się o godzinie z ustawienia „Początek dnia”, tak jak powtórki.
- Cel dzienny ustawisz w ustawieniach (domyślnie 10).

### Obrazki

- „**Dodaj obrazek do fiszki**”: na komputerze wkleja obraz ze schowka (a gdy schowek jest pusty, otwiera wybór pliku). Na telefonie i iPadzie otwiera galerię albo aparat.
- Plik dostaje nazwę od słowa, np. `forestalled.png`. Embed `![[forestalled.png]]` trafia na koniec odpowiedzi.
- Gdy sama wkleisz obraz (Ctrl+V) w linii fiszki, „Pasted image …” dostaje nazwę od słowa. Można to wyłączyć.
- Duże zdjęcia są zmniejszane do 800 px szerokości, żeby vault nie puchł. Też można to wyłączyć.

## Pominięte z oryginału (specyficzne dla Anki/Windows)

Wizualizacje 3D (Fusion Rings, Crystal Reactor…), osobne okno, wibracje pada, flagi „Review Later”/„Time Drain”, cofanie (OSR nie ma undo), własne pliki dźwiękowe.
