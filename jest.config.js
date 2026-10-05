import process from "process";
process.env.TZ = "UTC";

/** @type {import('@ts-jest/dist/types').InitialOptionsTsJest} */
export default {
    verbose: true,
    preset: "ts-jest",
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["jest-expect-message"],
    moduleNameMapper: {
        "src/(.*)": "<rootDir>/src/$1",
    },
    moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json", "node", "d.ts"],
    roots: ["<rootDir>/src/", "<rootDir>/tests/unit/"],
    collectCoverageFrom: ["src/**"],
    coveragePathIgnorePatterns: [
        // node modules & build output
        "build/",
        "node_modules/",

        // GUI & Obsidian coupled code
        "src/data/core.ts",
        "src/data/data-structures/file/",
        "src/ui/",
        "src/icons/",
        "src/main.ts",
        "src/lang/locale-manager.ts",
        "src/command-manager.ts",
        "src/scheduling/reminder-manager.ts",
        "src/data/data-manager.ts",
        "src/data/debug-logger.ts",
        "src/data/plugin-data-manager.ts",
        "src/data/settings-manager.ts",
        "src/data/data-store/.*/.*-file-modifier.ts",
        "src/data/data-store/.*/.*file-modifier.ts",
        "src/note/next-note-review-handler.ts",
        "src/data/plugin-data.ts",
        "src/utils/renderers.ts",
        "src/scheduling/algorithms/osr/obsidian-vault-notelink-info-finder.ts",
        "src/scheduling/algorithms/osr/serialized-schedule-data.ts",
        "src/scheduling/algorithms/fsrs/serialized-schedule-data.ts",
        "src/data/data-store/base/idata-store-algorithm.ts",

        // debugging utils
        "src/utils/debug.ts",

        // don't include in results
        "src/declarations.d.ts",
        "src/lang/",

        // Speed Streak UI / audio glue
        "src/speed-streak/speed-streak-controller.ts",
        "src/speed-streak/speed-streak-audio.ts",
        "src/speed-streak/speed-streak-i18n.ts",
        "src/speed-streak/speed-streak.css",
        // drawing (Canvas 2D) and HUD DOM
        "src/speed-streak/visuals/canvas-visual.ts",
        "src/speed-streak/visuals/.*-visual.ts",
        "src/speed-streak/layouts/",

        // Read aloud (TTS) UI glue
        "src/tts/tts-controller.ts",
        "src/tts/tts-i18n.ts",
        "src/tts/tts.css",

        // Review calendar UI glue
        "src/heatmap/heatmap-view.ts",
        "src/heatmap/heatmap-i18n.ts",
        "src/heatmap/heatmap.css",

        // Add-ons window texts
        "src/addons/addons-i18n.ts",

        // Card authoring UI glue (CodeMirror, Obsidian commands, preview)
        "src/card-authoring/card-authoring-controller.ts",
        "src/card-authoring/editor-extension.ts",
        "src/card-authoring/card-preview.ts",
        "src/card-authoring/card-authoring-i18n.ts",
        "src/card-authoring/card-authoring.css",
        "src/card-authoring/daily-goal-view.ts",
        "src/card-authoring/daily-goal.css",

        // Review window DOM glue
        "src/review-window/review-window-controller.ts",
        "src/review-window/review-window-i18n.ts",

        // Endless mode UI glue (review view, windows, plugin data, texts);
        // its logic (queue, records, settings) is tested
        "src/endless/endless-sequencer.ts",
        "src/endless/endless-store.ts",
        "src/endless/endless-records-modal.ts",
        "src/endless/few-cards-modal.ts",
        "src/endless/endless-i18n.ts",
        "src/endless/endless.css",

        // Import from the original plugin: window, command and texts
        "src/migration/legacy-import-controller.ts",
        "src/migration/legacy-import-i18n.ts",
        "src/migration/legacy-import.css",
    ],
    coverageDirectory: "coverage",
    collectCoverage: true,
    coverageProvider: "v8",
    coverageThreshold: {
        global: {
            // TODO: Bring coverage back up to 98%+
            // TODO: Figure out why coverage on the GitHub runner
            // is lower than the local coverage
            statements: 92,
            branches: 88,
        },
    },
};
