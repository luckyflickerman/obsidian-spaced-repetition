# Third-party notices

## Speed Streak (Anki add-on)

The Speed Streak game in `src/speed-streak/` is a port of the Anki add-on
**Speed Streak** by **henbitdeathmetal**:
https://github.com/henbitdeathmetal/anki-speed-streak (AnkiWeb: https://ankiweb.net/shared/info/1237336370).

- Game rules (question / answer timers, streak, Time Boost, legacy points),
  the eight color themes in `speed-streak-themes.ts` and the design of the
  visual styles Fusion Rings, Singularity and Crystal Reactor and of the side
  panel come from that add-on (version 2.04).
- The visual styles in `src/speed-streak/visuals/` were redrawn for this plugin
  with the Canvas 2D API (the add-on uses WebGL), after the add-on's look and
  screenshots.

The add-on is distributed under the MIT License:

```
MIT License

Copyright (c) 2026 henbitdeathmetal

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
