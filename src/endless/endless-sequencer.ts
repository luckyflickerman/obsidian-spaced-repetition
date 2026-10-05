/**
 * Endless mode — the review sequencer the card view talks to. Wraps the
 * EndlessQueue: ratings only move cards in the queue, nothing is scheduled and
 * no `<!--SR:…-->` comment is written. Editing / deleting a card from the review
 * works like in the normal review (the user asks for it).
 */

import { Notice } from "obsidian";

import { DataStore } from "src/data/data-store/base/data-store";
import { Card } from "src/data/data-structures/card/card";
import { Question, QuestionText } from "src/data/data-structures/card/questions/question";
import {
    CardFrontBack,
    CardFrontBackUtil,
} from "src/data/data-structures/card/questions/question-type";
import { Deck } from "src/data/data-structures/deck/deck";
import { TopicPath } from "src/data/data-structures/deck/topic-path";
import { SRSettings } from "src/data/settings";
import { EndlessQueue, EndlessRating, EndlessStats } from "src/endless/endless-queue";
import { Note } from "src/note/note";
import { RepItemScheduleInfo } from "src/scheduling/algorithms/base/rep-item-schedule-info";
import { RepItemState, ReviewResponse } from "src/scheduling/algorithms/base/repetition-item";
import { DeckStats, IFlashcardReviewSequencer } from "src/scheduling/flashcard-review-sequencer";

export function responseToEndlessRating(response: ReviewResponse): EndlessRating {
    switch (response) {
        case ReviewResponse.Easy:
            return "easy";
        case ReviewResponse.Good:
            return "good";
        case ReviewResponse.Hard:
            return "hard";
        default:
            return "again";
    }
}

/** Distinct cards of the given decks (with their subdecks). */
export function cardsOfDecks(decks: Deck[]): Card[] {
    const cards = new Set<Card>();
    for (const deck of decks) {
        for (const item of deck.getFlattenedRepItemArray(RepItemState.AnyItem, true))
            cards.add(item);
    }
    return [...cards];
}

export class EndlessReviewSequencer implements IFlashcardReviewSequencer {
    private base: IFlashcardReviewSequencer;
    private queue: EndlessQueue<Card>;
    private settings: SRSettings;
    /** Shown as the deck name above the card */
    readonly sessionDeck: Deck;

    constructor(
        base: IFlashcardReviewSequencer,
        cards: Card[],
        sessionName: string,
        settings: SRSettings,
        random?: () => number,
    ) {
        this.base = base;
        this.settings = settings;
        this.queue = new EndlessQueue(cards, random);
        this.sessionDeck = new Deck(sessionName, null);
    }

    get stats(): EndlessStats {
        return this.queue.stats;
    }

    get hasCurrentCard(): boolean {
        return this.queue.current !== null;
    }

    get hasPendingCards(): boolean {
        return false;
    }

    get currentCard(): Card | null {
        return this.queue.current;
    }

    get currentQuestion(): Question {
        return this.currentCard?.question;
    }

    get currentNote(): Note {
        return this.currentQuestion.note;
    }

    get currentDeck(): Deck | null {
        return this.hasCurrentCard ? this.sessionDeck : null;
    }

    get nextPendingDueUnix(): number | null {
        return null;
    }

    get originalDeckTree(): Deck {
        return this.base.originalDeckTree;
    }

    setDeckTree(): void {
        /* the pool is fixed when the session starts */
    }

    setCurrentDeck(_topicPath: TopicPath): void {
        /* one pool only */
    }

    refreshCurrentDeck(): void {
        /* nothing to refresh */
    }

    /** Progress of the current round (shown as "done / all" above the card). */
    getDeckStats(_topicPath: TopicPath): DeckStats {
        const { poolSize, doneInRound } = this.queue.stats;
        const left = Math.max(0, poolSize - doneInRound);
        return new DeckStats(poolSize, 0, 0, left, 0, 0, left, 0, left > 0 ? 1 : 0);
    }

    getSubDecksWithCardsInQueue(_deck: Deck): Deck[] {
        return [];
    }

    skipCurrentCard(): void {
        this.queue.skip();
    }

    determineCardSchedule(response: ReviewResponse, card: Card): RepItemScheduleInfo {
        // Only for the base view code; Endless never saves it
        return this.base.determineCardSchedule(response, card);
    }

    async processReview(response: ReviewResponse): Promise<void> {
        this.queue.rate(responseToEndlessRating(response));
    }

    async updateCurrentQuestionTextAndCards(text: string): Promise<void> {
        const question = this.currentQuestion;
        const q: QuestionText = question.questionText;
        const cardFrontBackList: CardFrontBack[] = CardFrontBackUtil.expand(
            question.questionType,
            text,
            this.settings,
        );
        q.actualQuestion = text;
        await question.writeQuestion(this.settings);

        if (cardFrontBackList.length !== question.cards.length) {
            new Notice("Cards count does not match cards from question text. Skipping redraw.");
            return;
        }
        question.cards.forEach((card, i) => {
            card.front = cardFrontBackList[i].front;
            card.back = cardFrontBackList[i].back;
        });
    }

    async deleteCurrentCardFromNote(): Promise<void> {
        const question = this.currentQuestion;
        await DataStore.getInstance().delete(question);
        this.base.originalDeckTree.deleteQuestionFromAllDecks(question, false);
        for (const card of question.cards) this.queue.remove(card);
    }
}
