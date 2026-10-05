# Upgraded Spaced Repetition — dodatki

Opis dodatków pluginu **Upgraded Spaced Repetition** (rozszerzona wersja _Spaced Repetition_ 1.15.4): Speed Streak, czytanie na głos, tworzenie fiszek, cel dzienny, kalendarz i okno powtórek.

## Instalacja

Plugin instaluje się przez **BRAT** — krok po kroku w [README.md](README.md#po-polsku) (komputer, iPad, telefon).

- Plugin ma własny identyfikator (`upgraded-spaced-repetition`) i własny folder `.obsidian/plugins/upgraded-spaced-repetition/`, więc aktualizacja oryginalnego Spaced Repetition ze sklepu niczego nie nadpisze.
- Przy pierwszym uruchomieniu plugin proponuje przeniesienie ustawień, rekordów Speed Streak i historii z oryginału (Tak / Nie / Później). Później: komenda „Importuj dane z oryginalnego Spaced Repetition”.
- Po przeniesieniu **wyłącz oryginalny plugin** (Ustawienia → Wtyczki społeczności), żeby fiszki nie były liczone podwójnie.
- Ustawienia dodatków: Ustawienia → **Upgraded Spaced Repetition**.

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

Naciśnij **Wznów** albo dotknij zasłony w dowolnym miejscu, żeby wrócić do nauki. W czasie pauzy przyciski ocen są przygaszone i nie da się nimi (ani klawiszami) ocenić karty.

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
Używa głosów zainstalowanych w systemie, więc działa bez internetu i bez kont. Ustawienia → Upgraded Spaced Repetition → **Czytanie na głos**.

### Jak oznaczać słowa

Podkreśl fragment znacznikiem `<u>…</u>`:

```
el gato::Este es un <u>gato</u>
```

- Kilka podkreśleń w jednej karcie jest czytanych po kolei.
- Pojedynczemu słowu możesz nadać inny język: `<u lang="en">computer</u>`.
- Nie używaj `==…==`, bo plugin zamienia je w luki.
- Podkreślenia są szukane w pytaniu i w odpowiedzi.
- Gdy nic nie jest podkreślone, czytane jest **pytanie** (np. w `#ENG forestalled:: uprzedzić` lektor czyta „forestalled”). Można to zmienić w ustawieniach („Gdy nic nie jest podkreślone, czytaj”).

Najszybciej podkreślisz słowo komendą **„Podkreśl do czytania”** (zaznacz słowo i użyj komendy):

- na komputerze: skrót **Ctrl+Shift+U** (na Macu Cmd+Shift+U) albo prawy przycisk myszy → „Podkreśl do czytania”,
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

## Karta w powtórce

Ustawienia → Upgraded Spaced Repetition → **Wygląd** → **Karta w powtórce**:

- **Rozmiar tekstu karty**: normalny, duży (domyślnie) albo bardzo duży. Krótkie fiszki (słowo i tłumaczenie) dostają pełne powiększenie, dłuższe (zdania, listy, obrazki) tylko lekkie, żeby mieściły się na telefonie.
- **Wyśrodkuj krótkie fiszki** (domyślnie włączone): słowo i tłumaczenie stoją na środku okna. Ścieżka „notatka > nagłówek” zostaje u góry. Jest w jednej linii, a dotknięcie pokazuje ją całą.

Przyciski ocen pokazują nazwę i czas następnej powtórki, np. **Trudne** / 6 min, na każdym urządzeniu. Kolory mają mocniejszy kontrast, a „Pokaż odpowiedź” i plakietka talii mają kolor akcentu Twojego motywu (Ustawienia → Wygląd w Obsidianie).

## Komentarze harmonogramu w edytorze

Po ocenie fiszki plugin zapisuje pod nią komentarz `<!--SR:…-->` z datą następnej powtórki. W podglądzie na żywo zamiast tego długiego tekstu widać małą ikonkę kalendarza, a w dymku datę („Następna powtórka: 8 paź 2026”).

- Notatka się **nie zmienia**: komentarz jest w pliku dokładnie tak jak wcześniej, zmienia się tylko wyświetlanie.
- Gdy kursor jest w tej linii (albo dotkniesz ikonki), widać zwykły tekst.
- W trybie źródłowym zawsze widać pełny tekst.
- Wyłączysz to w Ustawieniach → Tworzenie fiszek → **Zwijaj komentarze harmonogramu w edytorze**.

## Okno powtórek: pełny ekran i przesuwanie

- Przycisk **⛶** w nagłówku (na liście talii i podczas powtórki) włącza i wyłącza pełny ekran. Możesz też przypisać skrót do komendy „Okno powtórek: pełny ekran wł. / wył.”.
- Okno przesuwasz, chwytając pasek u góry (nagłówek listy talii albo pasek karty) i przeciągając je w dowolne miejsce. Przyciski na pasku działają normalnie.
- Okno zapamiętuje miejsce do następnego otwarcia. Dwuklik na pasku wyśrodkowuje je z powrotem.
- Okno nie ucieknie za krawędź ekranu, bo pasek zawsze zostaje widoczny. Pełny ekran nie zmienia zapisanego rozmiaru okna.

## Tryb Endless

Ćwiczenie wybranych talii bez końca, bez zmieniania harmonogramu.

1. Na liście talii, w menu trybu (tam, gdzie „Tryb powtórek”), wybierz **Endless**. Możesz też użyć polecenia „Endless: ćwicz wybrane talie bez końca”.
2. Przy każdej talii pojawia się kwadrat. Zaznacz talie, które chcesz ćwiczyć: dotknij wiersza albo kwadratu. Zaznaczenie talii obejmuje też jej podtalie. „Wszystkie talie” zaznacza wszystko. Plugin pamięta wybór na następny raz.
3. Naciśnij **Zacznij Endless**. Na przycisku widać, ile fiszek jest w wybranych taliach.

**Mało fiszek:** gdy wybrane talie mają mniej niż **100 fiszek**, plugin najpierw pokazuje ostrzeżenie. Przy małej liczbie te same karty wracają bardzo często i łatwo zapamiętać ich kolejność zamiast słów. Możesz zacząć mimo to albo wrócić do wyboru talii. Opcja „Nie pokazuj więcej” wyłącza ostrzeżenie. Włączysz je z powrotem w Ustawieniach → Speed Streak → Tryb Endless.

Jak to działa:

- Fiszki idą w rundach: w każdej rundzie każda fiszka pojawia się w losowej kolejności. Po ostatniej zaczyna się nowa runda i tak bez końca. Nad kartą widać postęp rundy, np. „6/20”.
- **Błąd** (czerwony przycisk, w zwykłej powtórce „Ponownie”): fiszka wraca po 3 kartach, a **wynik spada do 0**. **Trudne**: fiszka wraca po 7 kartach. **Dobre** i **Łatwe**: fiszka jest zaliczona w tej rundzie. „Reset” z paska nad kartą działa jak „Błąd”.
- **Karty z jednej fiszki są od siebie daleko.** Fiszka z `:::` albo `??` daje dwie karty (np. „forestalled → uprzedzić” i „uprzedzić → forestalled”). Takie karty pojawiają się w odstępie co najmniej 5% wszystkich kart: przy 100 kartach co najmniej co 5, przy 400 co 20, przy małej puli co najmniej co 2. Obowiązuje to też na przełomie rund i po „Błąd” i „Trudne”. Gdy kart jest za mało, plugin rozsuwa je najlepiej, jak się da.
- Gdy ostatnia karta rundy dostanie „Błąd” albo „Trudne”, nie wraca od razu: zaczyna się nowa runda, a ta karta przychodzi po co najmniej 3 (albo 7) innych.
- **Endless nic nie zapisuje w notatkach.** Komentarze `<!--SR:…-->` i terminy powtórek zostają takie, jakie były. Do kalendarza powtórek liczy się tylko czas nauki i liczba kart.
- Strzałka w lewo wraca do listy talii.

### Wynik i rekordy Endless

**Wynik** to liczba odpowiedzi bez błędu z rzędu: „Trudne”, „Dobre” i „Łatwe” dodają 1, „Błąd” zeruje. Wynik działa także przy wyłączonym Speed Streak. Przekroczenie czasu w Speed Streak go nie zeruje.

> Bądź ze sobą szczery — rekord ma sens tylko wtedy, gdy przyznajesz się do błędów.

- Nad kartą, w plakietce talii, widać **„Wynik 37”**, a przy pobiciu rekordu 🏆.
- Na ekranie wyboru talii jest pasek **„🏆 Rekord: 112 · Dziś: 37”**. Dotknij go, żeby zobaczyć najlepsze 5 wyników, ostatnie 5 sesji (data, talie, liczba ocen, najlepszy wynik, błędy, czas) i sumy.
- Po powrocie do listy talii widać podsumowanie sesji: „Wynik najlepszy w sesji: 54 · Błędy: 3 · Oceny: 120”, a przy nowym rekordzie wyróżnienie.

### Speed Streak w Endless

Speed Streak działa jak zwykle (timer, Boosty, pauza), ale ma:

- **własny rekord serii** w Endless (🏆 w pasku), osobny od rekordów zwykłych powtórek i od wyniku Endless,
- licznik **„Sesja: 27”**, czyli ile kart oceniono od startu sesji,
- osobną listę „Najlepsze 5 w Endless” (dotknij pucharu),
- **własny styl**, domyślnie **Klepsydrę**. Zmienisz go w Ustawieniach → Speed Streak → Wygląd → „Styl w trybie Endless”. Opcja „Taki sam jak w powtórce” daje styl zwykłej powtórki.

**Klepsydra:**

- Każda poprawna odpowiedź dosypuje jedno ziarnko piasku do dolnej bańki. W dolnej bańce jest tyle ziaren, ile wynosi wynik ponad pełne setki. Pod klepsydrą widać cały wynik.
- **Co 100 ziaren** klepsydra przewraca się z błyskiem, a dolna bańka jest znowu pusta. Wynik się nie zeruje. Każda pełna setka zostawia złotą gwiazdkę (★, a przy wielu „★×3”).
- **Błąd**: szkło na chwilę pęka, piasek się wysypuje, a wynik spada do 0.
- **Przekroczenie czasu** tylko lekko porusza klepsydrą, piasek zostaje.
- Przy ustawieniu wydajności „Minimalna” albo „Ogranicz animacje” klepsydra jest nieruchomym rysunkiem, a zamiast przewracania jest krótki błysk.

## Opcje (przycisk z kołem zębatym)

W nagłówku listy talii, obok X, jest przycisk **Opcje** (koło zębate). Otwiera okno „Opcje Upgraded Spaced Repetition”, ułożone jak ustawienia Obsidiana:

- **Opcje**: wszystkie strony ustawień pluginu (Fiszki, Tworzenie fiszek, Notatki, Harmonogram, Wygląd, Dane, Statystyki). Dotknij wiersza, żeby otworzyć stronę. Strzałka w lewo wraca do listy.
- **Wbudowane wtyczki**: kalendarz powtórek, cel dzienny, czytanie na głos i Speed Streak. Przełącznik włącza i wyłącza wtyczkę, a koło zębate otwiera jej ustawienia.

Ten sam podział jest na głównej stronie Ustawienia → Upgraded Spaced Repetition.

- Wyłączony kalendarz dalej zapisuje historię w tle, więc po ponownym włączeniu nie ma w nim dziur.

## Kalendarz powtórek

Pod listą talii jest kalendarz całego roku: jeden kwadrat to jeden dzień. Im więcej kart tego dnia powtórzysz, tym mocniejszy kolor.

- **Kolor** (zielony, niebieski, czerwony) wybierasz w Ustawieniach → **Kalendarz powtórek** albo w oknie Opcje (koło zębate przy kalendarzu w „Wbudowanych wtyczkach”).
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

Ustawienia → Upgraded Spaced Repetition → **Tworzenie fiszek** → **Talie fiszek**. Każda talia to tag, plik i język czytania, np. `#ENG → Fiszki/Angielski.md → en-GB`.

- Nowe fiszki trafiają na koniec pliku talii. Plugin tylko dopisuje: istniejące linie i ich komentarze `<!--SR:…-->` się nie zmieniają.
- Ostatnio używana talia jest zapamiętywana. Zmienisz ją komendą „Nowa fiszka: zmień język”.
- Język talii działa jak reguła czytania na głos, więc nie trzeba go wpisywać drugi raz.
- Plugin czyta tylko notatki z tagiem fiszek (np. `#flashcards`). Jeśli tagu talii nie ma na tej liście, nowy plik talii zaczyna się od `#flashcards`.
- **Od razu drugi kierunek** (domyślnie włączone): nowe fiszki mają separator `:::`, więc słowo jest odpytywane w obie strony. Twoje stare fiszki z `::` zostają bez zmian.

### Podgląd

Przy każdej fiszce w edytorze jest ikonka podglądu (zaokrąglony kwadrat z panelem), a przy niedokończonej żółta ikonka z wykrzyknikiem i żółte podkreślenie. Dotknij ikonki, żeby zobaczyć:

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
- Na liście talii cel ma własny blok nad kalendarzem. Przycisk **»** po jego prawej stronie zwija go do małej plakietki „🎯 4/10” przy prawej krawędzi. Dotknij plakietki, żeby rozwinąć blok. Plugin pamięta zwinięcie także po zamknięciu Obsidiana.

### Obrazki

- „**Dodaj obrazek do fiszki**”: na komputerze wkleja obraz ze schowka (a gdy schowek jest pusty, otwiera wybór pliku). Na telefonie i iPadzie otwiera galerię albo aparat.
- Plik dostaje nazwę od słowa, np. `forestalled.png`. Embed `![[forestalled.png]]` trafia na koniec odpowiedzi.
- Gdy sama wkleisz obraz (Ctrl+V) w linii fiszki, „Pasted image …” dostaje nazwę od słowa. Można to wyłączyć.
- Duże zdjęcia są zmniejszane do 800 px szerokości, żeby vault nie puchł. Też można to wyłączyć.

## Pominięte z oryginału (specyficzne dla Anki/Windows)

Wizualizacje 3D (Fusion Rings, Crystal Reactor…), osobne okno, wibracje pada, flagi „Review Later”/„Time Drain”, cofanie (OSR nie ma undo), własne pliki dźwiękowe.
