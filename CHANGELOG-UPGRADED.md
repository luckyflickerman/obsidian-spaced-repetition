# Changelog — Upgraded Spaced Repetition

Changes in this fork, on top of [Obsidian Spaced Repetition](https://github.com/st3v3nmw/obsidian-spaced-repetition) 1.15.4.
The release workflow uses the section whose heading matches the git tag as the release description.

## 0.9.5

A calmer, nicer look: your own photo behind the review.

- **Background photo** (Settings → Appearance → Background photo, off by default): a photo from your vault behind the deck list and the cards, with see-through glass panels. Optional separate photo for phones, the visible part (top / middle / bottom), and sliders for the panel cover, darkening and blur.
- **Colours taken from the photo** (70 / 20 / 10): the panels get the photo's main colour, the text a light tint of it, and one accent colour picked from the photo is used only in a few key places (today's counts, the daily goal, the main answer button, the hourglass sand). A lake at golden hour gives teal with gold, a purple dusk violet with pink. Text always keeps a readable contrast.
- **Answer buttons in one colour family** with the background on: see-through buttons, only the main answer ("Good" / "Got it") in the accent colour. Deck counts as plain numbers instead of coloured pills.
- **The card in a book-like serif** with the background on (fonts already on your device).
- **Endless: three answers** — "Error" (resets the score), "Hard" (comes back later) and "Got it" (+1 to the score).

## 0.9.4

Endless, part 2.

- **"Error" instead of "Again" in Endless**: the red button says "Error · resets score". The card comes back after 3 cards and the Endless score drops to 0. The normal review still shows "Again".
- **Endless score and records**: the score counts answers without an error in a row (also with Speed Streak off). Its own records: all-time and today's best, top 5 runs, last 5 sessions and totals. Shown above the deck list ("🏆 Record: 112 · Today: 37", tap for details), in the badge above the card ("Score 37" with 🏆 on a new record) and as a summary when the session ends.
- **Cards of one note are kept apart**: the two directions of a `:::` / `??` card are at least 5 % of the pool apart (100 cards → 5, 400 → 20), also across rounds and after "Error" / "Hard". The last card of a round rated "Error" / "Hard" no longer comes back right away.
- **Warning below 100 cards** before an Endless session, with "Start anyway", "Back to the decks" and "Don't show again".
- **New Speed Streak style "Hourglass"**, the default in Endless (Settings → Speed Streak → Display → "Style in Endless mode"): a grain for each correct answer, a turn-over every 100 (the score stays, a gold star is added), the sand pours out on "Error".
- **Phone**: the Speed Streak bar shows "Session: 27" on one line.

## 0.9.3

- **Endless mode** (new item in the mode menu of the deck list, also a command): tick the decks you want, press **Start Endless**, and their cards repeat without end in shuffled rounds. "Again" brings a card back after 3 cards, "Hard" after 7, "Good" / "Easy" finish it for the round. **Nothing is scheduled and the notes are never changed.** Ticked decks are remembered.
- **Speed Streak in Endless**: its own all-time record of cards in a row (kept apart from the normal review records) and "This session: N cards" in the bar.
- **Options window**: the puzzle "Add-ons" button in the deck list header is now an **Options** button (gear). Like Obsidian's settings, the window lists **Options** (every settings page of the plugin, opened right in the window) and **Built-in plugins** (review calendar, daily goal, read aloud, Speed Streak — each with its on/off switch and settings). The main settings page uses the same two groups.
- **Daily goal**: a » button minimizes the block to a small "🎯 4/10" badge on the right of the deck list; tap the badge to show it again. Remembered between sessions.
- **Readability and touch fixes** (from the 0.9.2 screenshot measurements): readable "Resume" button on the pause screen, darker green numbers in the review calendar in the light theme, 44 px tap areas for the card icons and schedule icon in the editor and for words read aloud, the settings back button has a name for screen readers, clearer Polish text for the file menu review option.

## 0.9.2

Design pass after the visual review: easier to read, easier to tap, fully in Polish.

- **Rating buttons** show the name and the full interval on every device ("Hard / 6 min" instead of "6m"), so they are never told apart by colour alone.
- **Readable colours**: white text on the rating buttons and the deck counts has a contrast of at least 4.5:1. Coloured text has separate shades for light and dark themes.
- **One accent colour**: "Show answer" and the deck badge use your vault's accent colour.
- **Pause**: rating buttons are greyed out and inactive while the Speed Streak pause screen is shown; a big "Resume" button.
- **Bigger cards**: new options in Settings → Appearance → Card in the review: card text size (normal / large / extra large) and centering of short cards.
- **Schedule comments**: in Live Preview `<!--SR:…-->` is shown as a small calendar icon with the next review date. The note is not changed (Settings → Card authoring).
- **Trail above the card**: readable, one line; tap to see all of it.
- **Speed Streak bar**: bigger labels in the timer ring, "Free" instead of the cut-off "Free card", described rating trail, clearer badges and boost diamonds.
- **Touch**: every icon button is at least 44×44 px on phones and tablets.
- **Phone deck list**: the calendar shows the last half year without sideways scrolling; statistics centred.
- **Polish translation**: about 170 missing texts translated (deck list, modes, settings, messages); "Again" and the old "Średnio Trudne" now show as "Ponownie" and "Dobre" (your own button names are kept).

## 0.9.1

- **Faster loading on phones and tablets**: `main.js` is about 3 times smaller (3.4 MB → 1.2 MB). The release build no longer contains debugging data (source map) and the code is minified. Styles are unchanged.

## 0.9.0

First beta of **Upgraded Spaced Repetition**: an extended version of Obsidian Spaced Repetition with its own plugin id, so it can be installed with BRAT next to (or instead of) the original.

### Add-ons

- **Speed Streak**: a timer game with streaks, ported from the Anki add-on.
    - Two timers (question / answer), streak counter, points mode, special timer rules per tag or deck.
    - **Time Boost**: earn a +10 s boost every 10 cards (can be turned off).
    - **Records**: all-time and today's best, "pure" streaks, top 5, details of every run, new-record celebration.
    - **Panel**: compact bar or side panel (automatic switch on resize, iPad rotation and Split View), pause curtain with session stats.
    - **Themes and styles**: Fusion Rings, Singularity, Crystal Reactor and Minimal styles; 10 color themes; performance levels and reduced motion.
- **Read aloud**: reads the foreign word or sentence after the answer is shown, with system voices (works offline). Mark words with `<u>…</u>`, language rules per tag or deck, voice choice and diagnostics.
- **Card authoring**: fast flashcard entry right in the note.
    - Templates (`#ENG |:::`), Tab to jump to the translation, Ctrl+Enter to finish a card.
    - Live preview icon next to every card in the editor, warning for unfinished cards.
    - Duplicate warning with a link to the original card.
    - Images from the clipboard, file picker, gallery or camera, named after the word and resized.
- **Daily goal**: "New today: 4/10" counter and a goal bar above the calendar.
- **Review calendar**: a year heatmap of reviews below the deck list with statistics (pace, time, streak of days); collapsible to a progress ring.
- **Review window**: full-screen toggle, move the window by dragging its header, position remembered.
- **Add-ons window**: turn each add-on on or off and open its settings from the deck list.

### Plugin

- New identity: id `upgraded-spaced-repetition`, name "Upgraded Spaced Repetition", releases from `luckyflickerman/obsidian-spaced-repetition`. Views and icons have unique names, so both plugins can be installed at the same time.
- **Import from the original plugin**: on first start the plugin offers to copy settings, Speed Streak records and data from the original Spaced Repetition (Yes / No / Later). Also available as the command "Import data from the original Spaced Repetition". The original's files are never changed.
- The "update available" status bar item checks this fork's releases.
- Requires Obsidian 1.11.0 or newer.
