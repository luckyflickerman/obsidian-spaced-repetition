import type { ReviewWindowControls } from "src/review-window/review-window-controller";
import { rw } from "src/review-window/review-window-i18n";
import SRButtonComponent from "src/ui/sr-button";

/** Full screen on/off button for the review window header. */
export default class FullscreenButtonComponent extends SRButtonComponent {
    public constructor(
        container: HTMLElement,
        controls: ReviewWindowControls,
        classNames: string[] = [],
    ) {
        super(container, {
            classNames: ["sr-fullscreen-button", ...classNames],
            onClick: () => controls.toggleFullscreen(),
        });
        const update = (fullscreen: boolean) => {
            this.setIcon(fullscreen ? "minimize-2" : "maximize-2");
            const label = fullscreen ? rw("EXIT_FULLSCREEN") : rw("FULLSCREEN");
            this.setTooltip(label);
            this.buttonEl.setAttribute("aria-label", label);
        };
        update(controls.isFullscreen());
        controls.onFullscreenChange(update);
    }
}
