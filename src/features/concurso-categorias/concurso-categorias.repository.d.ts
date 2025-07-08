import { ConcursoCategoriaDTO } from '../../types/concurso-categorias.dto.js';
export declare class ConcursoCategoriasRepository {
    findAll(): Promise<ConcursoCategoriaDTO[]>;
    findById(): Promise<ConcursoCategoriaDTO | null>;
    insert(): Promise<ConcursoCategoriaDTO>;
    update(): Promise<ConcursoCategoriaDTO | null>;
    remove(): Promise<boolean>;
}
//# sourceMappingURL=concurso-categorias.repository.d.ts.map