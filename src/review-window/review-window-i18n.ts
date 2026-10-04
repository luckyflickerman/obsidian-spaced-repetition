import { isPolish } from "src/speed-streak/speed-streak-i18n";

const EN = {
    FULLSCREEN: "Full screen",
    EXIT_FULLSCREEN: "Exit full screen",
    CMD_FULLSCREEN: "Review window: full screen on / off",
};

type Keys = keyof typeof EN;

const PL: Record<Keys, string> = {
    FULLSCREEN: "Pełny ekran",
    EXIT_FULLSCREEN: "Wyjdź z pełnego ekranu",
    CMD_FULLSCREEN: "Okno powtórek: pełny ekran wł. / wył.",
};

export function rw(key: Keys): string {
    return (isPolish() ? PL[key] : EN[key]) ?? EN[key];
}
