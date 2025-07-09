import { FlashcardDTO } from '../../types/flashcards.dto.js';
export declare class FlashcardsService {
    getAll(): Promise<FlashcardDTO[]>;
    getById(): Promise<FlashcardDTO | null>;
    create(): Promise<FlashcardDTO>;
    update(): Promise<FlashcardDTO | null>;
    delete(): Promise<boolean>;
}
//# sourceMappingURL=flashcards.service.d.ts.map