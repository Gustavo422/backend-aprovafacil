// Utilitários compartilhados para o backend

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return items.slice(offset, offset + pageSize);
}

export function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
} 