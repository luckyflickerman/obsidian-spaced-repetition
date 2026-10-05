import "src/ui/obsidian-ui-components/content-container/card-container/context-section/context-section.css";

import { Question } from "src/data/data-structures/card/questions/question";
import { Note } from "src/note/note";

export default class ContextSectionComponent {
    private contextSection: HTMLDivElement;

    constructor(parentEl: HTMLDivElement) {
        this.contextSection = parentEl.createDiv();
        this.contextSection.addClass("sr-context");
        // One line with "…"; a tap shows the whole trail (works without hover on touch screens)
        this.contextSection.addEventListener("click", () => {
            this.contextSection.toggleClass(
                "is-expanded",
                !this.contextSection.hasClass("is-expanded"),
            );
        });
    }

    public updateCardContext(
        showContextInCards: boolean,
        currentQuestion: Question,
        currentNote: Note,
    ) {
        if (!showContextInCards) {
            this.contextSection.setText("");
            this.contextSection.addClass("sr-is-hidden");
            return;
        }

        if (this.contextSection.hasClass("sr-is-hidden")) {
            this.contextSection.removeClass("sr-is-hidden");
        }

        const text = this._formatQuestionContextText(currentQuestion.questionContext, currentNote);
        this.contextSection.setText(text);
        this.contextSection.setAttr("title", text);
    }

    private _formatQuestionContextText(questionContext: string[], currentNote: Note): string {
        const separator: string = " > ";
        let result = currentNote.file.basename;
        questionContext.forEach((context) => {
            // Check for links trim [[ ]]
            if (context.startsWith("[[") && context.endsWith("]]")) {
                context = context.replace("[[", "").replace("]]", "");
                // Use replacement text if any
                if (context.contains("|")) {
                    context = context.split("|")[1];
                }
            }
            result += separator + context;
        });
        return result;
    }
}
