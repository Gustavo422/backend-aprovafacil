// Utilitários compartilhados para o backend
export function paginate(items, page, pageSize) {
    const offset = (page - 1) * pageSize;
    return items.slice(offset, offset + pageSize);
}
export function formatError(error) {
    if (error instanceof Error)
        return error.message;
    return String(error);
}
//# sourceMappingURL=shared.utils.js.map