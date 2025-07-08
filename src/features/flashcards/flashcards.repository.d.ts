import { FlashcardDTO } from '../../types/flashcards.dto.js';
export declare class FlashcardsRepository {
    findAll(): Promise<FlashcardDTO[]>;
    findById(): Promise<FlashcardDTO | null>;
    insert(): Promise<FlashcardDTO>;
    update(): Promise<FlashcardDTO | null>;
    remove(): Promise<boolean>;
}
//# sourceMappingURL=flashcards.repository.d.ts.map