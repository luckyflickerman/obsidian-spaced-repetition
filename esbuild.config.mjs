import console from "console";
import esbuild from "esbuild";
import fs from "fs";
import { builtinModules } from "node:module";
import path from "path";
import prettier from "prettier";
import process from "process";

const prod = process.argv[2] === "production";

// The published plugin expects CSS at the repository root, not under build/.
// We also normalize the generated stylesheet through Prettier so CI does not
// fail on formatting differences introduced by the bundler output.
const moveToRootPlugin = {
    name: "move-to-root",
    setup(build) {
        build.onEnd(async (_) => {
            const cssFile = path.join("build", "main.css");
            const targetFile = "styles.css";

            if (fs.existsSync(cssFile)) {
                let contents = fs.readFileSync(cssFile, "utf8");
                // Remove source map comment
                contents = contents.replace(/\/\*#\s*sourceMappingURL=.*?\*\/\s*$/s, "");
                contents = await prettier.format(contents, { filepath: targetFile });
                fs.writeFileSync(targetFile, contents);
                fs.rmSync(cssFile);

                console.log(`✓ CSS bundled to ${targetFile}`);
            }
        });
    },
};

// Release build: minify only main.js. The CSS is NOT minified, because esbuild rewrites nested
// rules (`& > .x` → `> .x`) into a form older iOS Safari (before 17.2) does not understand.
// Function names are kept, so error messages stay readable.
const minifyJsPlugin = {
    name: "minify-js",
    setup(build) {
        build.onEnd(async (result) => {
            if (result.errors.length > 0) return;
            const jsFile = path.join("build", "main.js");
            const code = fs.readFileSync(jsFile, "utf8");
            const out = await esbuild.transform(code, {
                loader: "js",
                format: "cjs",
                target: "es2018",
                minify: true,
                keepNames: true,
            });
            fs.writeFileSync(jsFile, out.code);
            console.log(
                `✓ main.js minified: ${Math.round(code.length / 1024)} KB → ${Math.round(out.code.length / 1024)} KB`,
            );
        });
    },
};

const context = await esbuild.context({
    entryPoints: ["src/main.ts"],
    bundle: true,
    // CodeMirror is provided by Obsidian at runtime (editor extensions must use its copy)
    external: ["obsidian", "electron", "@codemirror/state", "@codemirror/view", ...builtinModules],
    format: "cjs",
    target: "es2018",
    logLevel: "info",
    // The release build has no source map (main.js is downloaded and parsed on phones too)
    sourcemap: prod ? false : "inline",
    sourcesContent: !prod,
    treeShaking: true,
    outfile: "build/main.js",
    loader: {
        ".css": "css",
    },
    plugins: prod ? [moveToRootPlugin, minifyJsPlugin] : [moveToRootPlugin],
});

if (prod) {
    try {
        // Production mode must await rebuild/dispose so async post-processing of
        // styles.css has finished before the process exits.
        await context.rebuild();
    } catch {
        process.exit(1);
    } finally {
        await context.dispose();
    }
} else {
    context.watch().catch(() => process.exit(1));
}
