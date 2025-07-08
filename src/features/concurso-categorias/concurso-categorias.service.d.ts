import { ConcursoCategoriaDTO } from '../../types/concurso-categorias.dto.js';
export declare class ConcursoCategoriasService {
    getAll(): Promise<ConcursoCategoriaDTO[]>;
    getById(): Promise<ConcursoCategoriaDTO | null>;
    create(): Promise<ConcursoCategoriaDTO>;
    update(): Promise<ConcursoCategoriaDTO | null>;
    delete(): Promise<boolean>;
}
//# sourceMappingURL=concurso-categorias.service.d.ts.map