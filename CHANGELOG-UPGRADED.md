# Changelog — Upgraded Spaced Repetition

Changes in this fork, on top of [Obsidian Spaced Repetition](https://github.com/st3v3nmw/obsidian-spaced-repetition) 1.15.4.
The release workflow uses the section whose heading matches the git tag as the release description.

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
