# Testowy vault (dev-vault)

Vault do testowania pluginu — **nie** prawdziwe fiszki. Można tu wszystko psuć.

- `Fiszki/` — fiszki we wszystkich formatach, które plugin musi obsługiwać.
- `Notatki/` — notatki bez fiszek i z mieszanymi tagami (przypadki brzegowe).
- `_config/data.json` — startowe ustawienia pluginu (tagi `#ENG`/`#ESP`, czytanie na głos).

Instalacja / aktualizacja pluginu w tym vaulcie:
```
pnpm build
node scripts/dev-vault-install.mjs
```
Skrypt kopiuje `main.js`, `styles.css`, `manifest.json` do `dev-vault/.obsidian/plugins/obsidian-spaced-repetition/`,
przy pierwszym razie wgrywa `_config/data.json` i tworzy plik `.hotreload` (dla pluginu Hot Reload).
Folder `dev-vault/.obsidian/` nie trafia do gita.
