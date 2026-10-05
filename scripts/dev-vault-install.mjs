// Copies the built plugin into dev-vault/ for testing in a real Obsidian.
// Usage: pnpm build && node scripts/dev-vault-install.mjs
import fs from "fs";
import path from "path";

const root = process.cwd();
const vault = path.join(root, "dev-vault");
const pluginDir = path.join(vault, ".obsidian", "plugins", "obsidian-spaced-repetition");
fs.mkdirSync(pluginDir, { recursive: true });

const candidates = {
    "main.js": ["build/main.js", "main.js"],
    "styles.css": ["styles.css", "build/styles.css"],
    "manifest.json": ["manifest.json"],
};
for (const [name, sources] of Object.entries(candidates)) {
    const src = sources.map((s) => path.join(root, s)).find((p) => fs.existsSync(p));
    if (!src) {
        console.error(`✗ Nie znaleziono ${name} — najpierw uruchom: pnpm build`);
        process.exit(1);
    }
    fs.copyFileSync(src, path.join(pluginDir, name));
    console.log(`✓ ${name}  ←  ${path.relative(root, src)}`);
}

// Starting settings (only once, so changes made in Obsidian are kept)
const data = path.join(pluginDir, "data.json");
if (!fs.existsSync(data)) {
    fs.copyFileSync(path.join(vault, "_config", "data.json"), data);
    console.log("✓ data.json (ustawienia startowe)");
}

// Marker for the Hot Reload plugin (pjeby/hot-reload)
fs.writeFileSync(path.join(pluginDir, ".hotreload"), "");

// Enable the plugin in the vault
const cp = path.join(vault, ".obsidian", "community-plugins.json");
let enabled = [];
try {
    enabled = JSON.parse(fs.readFileSync(cp, "utf8"));
} catch {
    enabled = [];
}
for (const id of ["obsidian-spaced-repetition", "hot-reload"]) {
    if (!enabled.includes(id)) enabled.push(id);
}
fs.writeFileSync(cp, JSON.stringify(enabled, null, 2));
console.log("✓ Plugin zainstalowany w dev-vault. W Obsidianie: Otwórz folder jako vault → dev-vault");
