// Service de Flashcards - refatoração SOLID
import { FlashcardDTO } from '../../types/flashcards.dto';

export class FlashcardsService {
  async getAll(): Promise<FlashcardDTO[]> {
    // TODO: Implementar lógica de listagem
    return [];
  }

  async getById(): Promise<FlashcardDTO | null> {
    // TODO: Implementar lógica de busca por ID
    return null;
  }

  async create(): Promise<FlashcardDTO> {
    // TODO: Implementar lógica de criação
    throw new Error('Not implemented');
  }

  async update(): Promise<FlashcardDTO | null> {
    // TODO: Implementar lógica de atualização
    throw new Error('Not implemented');
  }

  async delete(): Promise<boolean> {
    // TODO: Implementar lógica de remoção
    throw new Error('Not implemented');
  }
} 