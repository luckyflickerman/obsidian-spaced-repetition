# Changelog — Upgraded Spaced Repetition

Changes in this fork, on top of [Obsidian Spaced Repetition](https://github.com/st3v3nmw/obsidian-spaced-repetition) 1.15.4.
The release workflow uses the section whose heading matches the git tag as the release description.

## 0.9.3

- **Options window**: the puzzle "Add-ons" button in the deck list header is now an **Options** button (gear). Like Obsidian's settings, the window lists **Options** (every settings page of the plugin, opened right in the window) and **Built-in plugins** (review calendar, daily goal, read aloud, Speed Streak — each with its on/off switch and settings). The main settings page uses the same two groups.
- **Daily goal**: a » button minimizes the block to a small "🎯 4/10" badge on the right of the deck list; tap the badge to show it again. Remembered between sessions.

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
