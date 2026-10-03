# Speed Streak dla Obsidian Spaced Repetition

Port dodatku Anki **Speed Streak** wbudowany w plugin *Spaced Repetition* (wersja 1.15.4).

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

## Pominięte z oryginału (specyficzne dla Anki/Windows)
Wizualizacje 3D (Fusion Rings, Crystal Reactor…), osobne okno, wibracje pada, flagi „Review Later”/„Time Drain”, cofanie (OSR nie ma undo), własne pliki dźwiękowe.
