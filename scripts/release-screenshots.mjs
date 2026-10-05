// Release screenshots: every plugin screen in 7 device modes + measurements (CLAUDE.md,
// "Zrzuty ekranu przy każdym wydaniu").
//
// Usage: node scripts/release-screenshots.mjs <version>
//   Obsidian must run with --remote-debugging-port=9222 and have the dev-vault window open;
//   the plugin must be built and installed (node scripts/dev-vault-install.mjs).
// Output: Claude outputs/zrzuty/<version>/<mode>-<nr>-<screen>.png + metrics.json (not in git).
//
// Safety: only the window titled "… - dev-vault - Obsidian" is touched (and the vault name is
// checked). The original plugin is turned off for the run and back on at the end. The test notes
// in dev-vault/Fiszki are restored afterwards (reviews change their schedule comments).
import fs from "node:fs";
import path from "node:path";

const version = process.argv[2];
if (!version) {
    console.error("Usage: node scripts/release-screenshots.mjs <version>");
    process.exit(1);
}
const ID = "upgraded-spaced-repetition";
const ORIGINAL = "obsidian-spaced-repetition";
const OUT = path.join(process.cwd(), "Claude outputs", "zrzuty", version);
const NOTES_DIR = path.join(process.cwd(), "dev-vault", "Fiszki");
fs.mkdirSync(OUT, { recursive: true });

// MARK: CDP connection (dev-vault window only)

let list;
try {
    list = await (await fetch("http://localhost:9222/json/list")).json();
} catch {
    console.error("✗ Obsidian is not running with --remote-debugging-port=9222");
    process.exit(2);
}
const page = list.find(
    (p) =>
        p.type === "page" &&
        p.url.startsWith("app://obsidian.md") &&
        / - dev-vault - Obsidian/.test(p.title),
);
if (!page) {
    console.error("✗ No dev-vault window. Open it with obsidian://open?path=<dev-vault>.");
    process.exit(2);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();
const consoleProblems = [];
ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) return pending.get(m.id)(m);
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type)) {
        const text = m.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
        consoleProblems.push(`[console.${m.params.type}] ${text.split("\n")[0].slice(0, 300)}`);
    }
    if (m.method === "Runtime.exceptionThrown") {
        const d = m.params.exceptionDetails;
        consoleProblems.push(`[exception] ${(d.exception?.description ?? d.text).split("\n")[0]}`);
    }
};
const send = (method, params = {}) =>
    new Promise((res) => {
        const i = ++msgId;
        pending.set(i, res);
        ws.send(JSON.stringify({ id: i, method, params }));
    });
await new Promise((r) => (ws.onopen = r));
await send("Runtime.enable");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = async (js, timeoutMs = 15000) => {
    const r = await Promise.race([
        send("Runtime.evaluate", {
            expression: `(async () => { ${js} })()`,
            awaitPromise: true,
            returnByValue: true,
            userGesture: true,
        }),
        sleep(timeoutMs).then(() => null),
    ]);
    if (!r) return undefined;
    if (r.result?.exceptionDetails)
        console.log(
            "  eval error:",
            r.result.exceptionDetails.exception?.description?.split("\n")[0],
        );
    return r.result?.result?.value;
};
const shot = async (name) => {
    await sleep(800);
    const r = await Promise.race([
        send("Page.captureScreenshot", { format: "png" }),
        sleep(12000).then(() => null),
    ]);
    if (!r?.result?.data) {
        console.log("  ✗ screenshot timeout:", name);
        return false;
    }
    fs.writeFileSync(path.join(OUT, name), Buffer.from(r.result.data, "base64"));
    console.log("  ✓", name);
    return true;
};

/**
 * Obsidian 1.13 opens Settings in a separate window ("Ustawienia - dev-vault - Obsidian"), which is
 * a separate CDP target: connect to it briefly to take the screenshot and the measurements.
 */
const inSettingsWindow = async (file, measureJs) => {
    let target = null;
    for (let i = 0; i < 20 && !target; i++) {
        const targets = await (await fetch("http://localhost:9222/json/list")).json();
        target = targets.find(
            (t) =>
                t.type === "page" && /^(Ustawienia|Settings) - dev-vault - Obsidian/.test(t.title),
        );
        if (!target) await sleep(250);
    }
    if (!target) return { ok: false };
    const sw = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r) => (sw.onopen = r));
    let n = 0;
    const waiting = new Map();
    sw.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.id && waiting.has(m.id)) waiting.get(m.id)(m);
    };
    const call = (method, params = {}) =>
        Promise.race([
            new Promise((res) => {
                const i = ++n;
                waiting.set(i, res);
                sw.send(JSON.stringify({ id: i, method, params }));
            }),
            sleep(12000).then(() => null),
        ]);
    try {
        await sleep(600);
        const img = await call("Page.captureScreenshot", { format: "png" });
        if (!img?.result?.data) return { ok: false };
        fs.writeFileSync(path.join(OUT, file), Buffer.from(img.result.data, "base64"));
        console.log("  ✓", file);
        const r = await call("Runtime.evaluate", {
            expression: `(() => { ${measureJs} })()`,
            returnByValue: true,
        });
        return { ok: true, metrics: r?.result?.result?.value };
    } finally {
        sw.close();
    }
};

if ((await run(`return app.vault.getName()`)) !== "dev-vault") {
    console.error("✗ The connected window is not dev-vault — stopping.");
    process.exit(2);
}

// MARK: Measurements inside the page

const MEASURE = `
const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity !== 0 && r.bottom > 0 && r.top < innerHeight; };
const parse = (c) => {
    // rgb()/rgba(), and color(srgb r g b / a) with 0–1 channels (what color-mix() computes to)
    let m = c.match(/rgba?\\(([^)]+)\\)/);
    if (m) { const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    m = c.match(/color\\(srgb ([^)]+)\\)/);
    if (m) { const p = m[1].split(/[ \\/]+/).filter(Boolean).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 }; }
    return null; };
const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const bgOf = (e) => { const layers = []; for (let n = e; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.backgroundImage && s.backgroundImage !== 'none') return null; const c = parse(s.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } }
    let base = { r: 255, g: 255, b: 255, a: 1 }; if (document.body.classList.contains('theme-dark')) { const c = parse(getComputedStyle(document.body).backgroundColor); if (c) base = c; }
    for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i], base); return base; };
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const roots = [...document.querySelectorAll('.modal-container, .mod-settings, .popover, .status-bar, .cm-content')];
const label = (e) => { const t = (e.getAttribute('aria-label') || e.innerText || e.className || '').toString().replace(/\\s+/g, ' ').trim(); return (e.className.toString().split(' ').find(c => c.startsWith('sr-') || c.startsWith('usr-')) || e.tagName.toLowerCase()) + ' «' + t.slice(0, 32) + '»'; };
const touch = document.body.classList.contains('is-mobile');
const small = []; const seen = new Set();
for (const root of roots) for (const e of root.querySelectorAll('button, [role=button], .clickable-icon, input, select, .sr-response-button, [class*=-btn]')) {
    if (!vis(e) || seen.has(e)) continue; seen.add(e); const r = e.getBoundingClientRect();
    if (touch && (r.width < 44 || r.height < 44)) small.push(label(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
const low = []; const seenT = new Set();
for (const root of roots) { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const e = n.parentElement; if (!e || seenT.has(e) || !n.textContent.trim() || !vis(e)) continue; seenT.add(e);
        if (!/sr-|usr-/.test((e.closest('[class*=sr-]')||e).className.toString())) continue;
        const s = getComputedStyle(e); const fg = parse(s.color); const bg = bgOf(e); if (!fg || !bg) continue;
        const rt = ratio(blend(fg, bg), bg); const size = parseFloat(s.fontSize); const bold = +s.fontWeight >= 700;
        const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
        if (rt < need) low.push(label(e) + ' ' + rt.toFixed(2) + ':1 (min ' + need + ', ' + Math.round(size) + 'px)'); } }
const noName = [];
for (const root of roots) for (const e of root.querySelectorAll('button, [role=button], .clickable-icon')) {
    if (!vis(e)) continue; const name = (e.getAttribute('aria-label') || e.innerText || e.title || '').trim(); if (!name) noName.push(label(e)); }
return { small: [...new Set(small)].slice(0, 40), lowContrast: [...new Set(low)].slice(0, 40), noName: [...new Set(noName)].slice(0, 20) };
`;
const metrics = { version, date: new Date().toISOString(), screens: {}, notes: [] };
const measure = async (key) => {
    metrics.screens[key] = (await run(MEASURE)) ?? { error: "measurement timed out" };
};

// MARK: Helpers

const esc = async () => {
    for (let i = 0; i < 3; i++) {
        for (const type of ["keyDown", "keyUp"])
            await send("Input.dispatchKeyEvent", {
                type,
                key: "Escape",
                code: "Escape",
                windowsVirtualKeyCode: 27,
            });
        await sleep(250);
    }
};
const waitReady = async () => {
    for (let i = 0; i < 80; i++) {
        if (
            await run(
                `return !!(window.app && app.workspace?.layoutReady && app.plugins.plugins['${ID}']?.isInitialized)`,
                3000,
            )
        )
            return;
        await sleep(250);
    }
};
const clean = `document.querySelectorAll('.notice').forEach(n=>n.remove());`;
const openNote = `const f=app.vault.getAbstractFileByPath('Fiszki/Angielski.md'); await app.workspace.getLeaf(false).openFile(f);`;
const clickText = (re) =>
    `const b=[...document.querySelectorAll('.modal-container button')].find(b=>${re}.test(b.innerText)); b&&b.click(); return !!b`;
const setSize = async (w, h, mobile) => {
    if (w)
        await send("Emulation.setDeviceMetricsOverride", {
            width: w,
            height: h,
            deviceScaleFactor: mobile ? 2 : 1,
            mobile: !!mobile,
        });
    else await send("Emulation.clearDeviceMetricsOverride");
};
const setMobile = async (on) => {
    if ((await run(`return app.isMobile`)) === on) return;
    await run(`setTimeout(()=>app.emulateMobile(${on}), 50); return 1`);
    await sleep(2500);
    await waitReady();
    await sleep(1200);
};
const theme = async (t) => {
    await run(`app.changeTheme('${t}'); return 1`);
    await sleep(700);
};

// MARK: Screens

const SETTINGS_PAGES = ["Speed Streak", "Czytanie na głos", "Tworzenie fiszek", "Wygląd"];

const capture = async (mode, which) => {
    const has = (k) => which.includes(k);
    console.log(`— ${mode}`);
    await esc();
    await run(`${clean} ${openNote} return 1`);
    await sleep(800);
    if (has("deck")) {
        await run(
            `${clean} app.commands.executeCommandById('${ID}:srs-review-flashcards'); return 1`,
        );
        await sleep(2000);
        await shot(`${mode}-1-talie.png`);
        await measure(`${mode} · lista talii`);
        if (has("options")) {
            await run(
                `document.querySelector('.modal-container .sr-options-button')?.click(); return 1`,
            );
            await sleep(1200);
            await shot(`${mode}-2-opcje.png`);
            await measure(`${mode} · Opcje`);
        }
        await esc();
    }
    if (has("review")) {
        await run(
            `${clean} ${openNote} app.commands.executeCommandById('${ID}:srs-review-flashcards-in-note'); return 1`,
        );
        await sleep(2200);
        // the first card is a free warm-up: go to the second one so the timer runs
        await run(clickText(`/Pokaż odpowiedź|Show answer/i`));
        await sleep(700);
        await run(`document.querySelector('.modal-container .sr-good-button')?.click(); return 1`);
        await sleep(1500);
        await shot(`${mode}-3-pytanie.png`);
        await measure(`${mode} · powtórka (pytanie)`);
        if (has("answer")) {
            await run(clickText(`/Pokaż odpowiedź|Show answer/i`));
            await sleep(1200);
            await shot(`${mode}-4-odpowiedz.png`);
            await measure(`${mode} · powtórka (odpowiedź)`);
        }
        if (has("pause")) {
            await run(
                `document.querySelector('.modal-container .sr-ss-pause-btn')?.click(); return 1`,
            );
            await sleep(1200);
            await shot(`${mode}-5-pauza.png`);
            await measure(`${mode} · pauza`);
            await run(
                `document.querySelector('.modal-container .sr-ss-paused-overlay')?.click(); return 1`,
            );
        }
        await esc();
    }
    if (has("editor")) {
        await run(`${clean} ${openNote} return 1`);
        await sleep(1200);
        const r =
            await run(`const ic=[...document.querySelectorAll('.workspace-leaf.mod-active .cm-content .sr-ca-icon-card')].find(e=>e.getBoundingClientRect().width>0);
            if (!ic) return null; const b = ic.getBoundingClientRect(); return {x: b.x + b.width/2, y: b.y + b.height/2}`);
        if (r)
            for (const type of ["mousePressed", "mouseReleased"])
                await send("Input.dispatchMouseEvent", {
                    type,
                    x: r.x,
                    y: r.y,
                    button: "left",
                    clickCount: 1,
                });
        await sleep(1500);
        await shot(`${mode}-6-edytor.png`);
        await measure(`${mode} · edytor + podgląd fiszki`);
        await esc();
    }
    if (has("settings")) {
        for (const [i, name] of SETTINGS_PAGES.entries()) {
            await run(`app.commands.executeCommandById('app:open-settings'); return 1`);
            await sleep(900);
            await run(`app.setting.openTabById('${ID}'); return 1`);
            await sleep(900);
            await run(`const root = app.setting.activeTab?.containerEl; if (!root) return false;
                const row=[...root.querySelectorAll('.setting-item')].find(e=>e.querySelector('.setting-item-name')?.innerText.trim()===${JSON.stringify(name)});
                if (row) setTimeout(()=>row.click(), 0); return !!row`);
            await sleep(1800);
            const visible = await run(
                `const m=document.querySelector('.modal.mod-settings'); return !!m && m.getBoundingClientRect().width>0`,
            );
            const file = `${mode}-7${String.fromCharCode(97 + i)}-ustawienia-${name.split(" ")[0].toLowerCase()}.png`;
            if (visible) {
                // older Obsidian: settings as a modal in the main window
                await shot(file);
                await measure(`${mode} · ustawienia: ${name}`);
            } else {
                // Obsidian 1.13+: settings in their own window
                const r = await inSettingsWindow(file, MEASURE);
                if (r.ok) metrics.screens[`${mode} · ustawienia: ${name}`] = r.metrics;
                else {
                    metrics.notes.push(`${file}: settings window not found`);
                    console.log(`  ✗ settings window not found: ${name}`);
                }
            }
        }
        await run(`app.setting.close(); return 1`);
        await esc();
    }
};

// MARK: Run

const notesBackup = new Map();
for (const f of fs.readdirSync(NOTES_DIR)) {
    if (f.endsWith(".md")) notesBackup.set(f, fs.readFileSync(path.join(NOTES_DIR, f)));
}
let originalWasOn = false;
consoleProblems.length = 0;
try {
    originalWasOn = !!(await run(`return !!app.plugins.plugins['${ORIGINAL}']`));
    if (originalWasOn) await run(`await app.plugins.disablePluginAndSave('${ORIGINAL}'); return 1`);
    await sleep(600);

    await setMobile(false);
    await setSize(null);
    await theme("obsidian");
    await capture("komputer-ciemny", [
        "deck",
        "options",
        "review",
        "answer",
        "pause",
        "editor",
        "settings",
    ]);
    await theme("moonstone");
    await capture("komputer-jasny", ["deck", "options", "review", "answer", "editor", "settings"]);
    await theme("obsidian");
    await setSize(1440, 900, false);
    await capture("komputer-szeroki", ["deck", "review", "answer"]);
    await setSize(null);

    await setSize(768, 1024, true);
    await setMobile(true);
    await capture("ipad-pionowo", ["deck", "review", "answer"]);
    await setSize(1024, 768, true);
    await sleep(800);
    await capture("ipad-poziomo", ["deck", "review", "answer"]);

    await setSize(390, 844, true);
    await sleep(800);
    await capture("telefon-ciemny", ["deck", "options", "review", "answer", "pause", "editor"]);
    await theme("moonstone");
    await capture("telefon-jasny", ["deck", "review", "answer"]);
} finally {
    await esc();
    await theme("system");
    await setMobile(false);
    await setSize(null);
    if (originalWasOn) await run(`await app.plugins.enablePluginAndSave('${ORIGINAL}'); return 1`);
    for (const [f, content] of notesBackup) fs.writeFileSync(path.join(NOTES_DIR, f), content);
    metrics.console = consoleProblems;
    fs.writeFileSync(path.join(OUT, "metrics.json"), JSON.stringify(metrics, null, 1));
    console.log(
        `\nSaved to ${path.relative(process.cwd(), OUT)} — console problems: ${consoleProblems.length}`,
    );
    for (const p of consoleProblems) console.log(" ", p);
    ws.close();
}
