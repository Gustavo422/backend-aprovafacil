// Repository de Flashcards - refatoração SOLID
import { FlashcardDTO } from '../../types/flashcards.dto';

export class FlashcardsRepository {
  async findAll(): Promise<FlashcardDTO[]> {
    // TODO: Implementar acesso ao banco
    return [];
  }

  async findById(): Promise<FlashcardDTO | null> {
    // TODO: Implementar acesso ao banco
    return null;
  }

  async insert(): Promise<FlashcardDTO> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }

  async update(): Promise<FlashcardDTO | null> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }

  async remove(): Promise<boolean> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }
} 