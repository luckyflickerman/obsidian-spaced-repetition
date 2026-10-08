# Changelog — Upgraded Spaced Repetition

Changes in this fork, on top of [Obsidian Spaced Repetition](https://github.com/st3v3nmw/obsidian-spaced-repetition) 1.15.4.
The release workflow uses the section whose heading matches the git tag as the release description.

## 0.9.10

- **The plugin opens in the deck list** (the menu) instead of going straight into a review when only one deck has cards today. Reviewing one note still goes straight to its cards.
- **Endless**: no "Today / New / Known / Total" heading row; ticking decks no longer moves or resizes the window (the open decks and the scroll position stay); **"Hard" gives 0 points** (the score stays, it is not reset and nothing is added).
- **Computer**: the Speed Streak side panel no longer covers the card — the glass panel gets wider and the card stays next to the side panel. A side panel chosen in the settings is not used on a phone (no room for it); the bar is used there.
- **Phone**: "New cards today 0/10" looks exactly like "N cards waiting today" (same pill, dot and text).
- **No trophies**: no 🏆 in "Score 39", in the Speed Streak bar (it says "Record" now, as in the design) or in the new-record message at the end of a session.
- **Two new background themes**: **Space** (deep blue night sky with the Milky Way, icy blue accent) and **Aurora** (green aurora over mountains and a lake, green accent). Both pictures are drawn by the plugin's author, built into the plugin.

## 0.9.9

- **Phone: the window is in place again.** On a phone a swipe over the top bar moved the whole window to the left or right (the bar is the handle for moving the window on a computer), and the plugin remembered that spot. Now a window that fills the screen (every phone, an iPad at full size) cannot be moved, and a remembered spot is ignored there.
- **Endless record card** (design "C" from Claude Design): "Best today" in the accent colour on the left, "Record" on the right, and a bar from 0 to the record with a flag at the end, round milestones on the way (25, 50, 100…) and a dot at today's best. Tap it for the details, as before.
- **Time Boosts off**: off by default, and switched off once for everyone with this update (they kept coming back on, e.g. after importing settings from the original plugin again). If you switch them on afterwards, they stay on.

## 0.9.8

Back to the look from the design: everything in the middle.

- **Computer and iPad with a background theme**: the photo fills the window and the deck list and the review are **one glass panel in the middle** (at most 640 px wide), as in the design, instead of bars stretched to the edges. On a computer use the full screen button for the whole-screen look.
- **Phone deck list**: the daily goal is now a slim line under "N cards waiting today" (over the photo), the sheet with the decks starts higher, and the **calendar is right under the decks**, visible as soon as the list opens (its big statistics are gone on the phone; average, study days and streaks stay, the year buttons are below it).
- **Endless**: no "cards waiting today" and no daily goal — they do not belong to Endless. The tick in the deck boxes is in the middle of the box now.
- **Theme tiles**: only the photo and the name of the theme (the sample word and button are gone).
- **Fewer notifications**: no more pop-ups after a review (Speed Streak summary — the pause screen shows it — and "Response received"), while writing cards ("New today: N", "New cards go to…", "Image added", "Image renamed") and technical ones ("Note was opened in a new tab", "Cards count does not match…", "Speed Streak on/off"). Warnings (duplicate card, missing translation, import) stay.

## 0.9.7

The phone layout from the design, and fixes for every device.

- **Phone deck list with a background theme** (as in the design): the photo at the top with "14 cards waiting today", the decks on a sheet that slides up from below (drag it up for the daily goal and the calendar). Two numbers per deck: today (in the accent colour) and all cards. In Endless: the record line and one big "Start Endless" button.
- **Phone header**: the close button was cut off at the right edge and the window could scroll sideways (with a background theme). The full screen button is gone on phones — the window fills the screen anyway — so "Review mode" fits again. Plain icon buttons on the glass bar, no dark squares behind them.
- **Answer buttons**: always the same width, so "Again" no longer pushes "Easy" off a narrow screen. With a background theme: rounded tiles, 60 px high (66 px on phones). On phones and tablets the focus ring no longer stays on "Again" after every answer.
- **Light Obsidian theme with a background photo**: the deck names were dark grey on the dark glass — now light and readable.
- **Short cards with a background theme**: bigger book-like text, the note path as a small caption above, a short line between question and answer.
- **Polish**: intervals in proper Polish — "1 dzień", "3 dni", "1,5 dnia", "2 miesiące", "1 rok", "2 godz." (was "1 dni", "2 hr"); the Speed Streak timer uses a decimal comma ("7,9").
- Tick boxes in Endless are in line with the deck names on touch devices.

## 0.9.6

Two ready background themes instead of picking a photo.

- **Background themes** (Settings → Appearance → Background, and at the top of the "Options" window next to the deck list): **Lake** (a mountain lake at sunrise — teal glass with gold) and **Dusk** (a purple dusk over a city — violet glass with pink), or **No photo**. Each theme is a tile with a small preview; a click changes the review behind it at once.
- The photos are **built into the plugin**: nothing to copy into the vault, works offline on every device. Picking your own photo from the vault is gone (it did not work reliably).
- If the photo was switched on in 0.9.5, you get the Lake theme. The sliders (panel cover, darkening, blur) stay.

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
