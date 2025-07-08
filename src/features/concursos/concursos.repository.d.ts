import { ConcursoDTO } from '../../types/concursos.dto.js';
export declare class ConcursosRepository {
    findAll(): Promise<ConcursoDTO[]>;
    findById(): Promise<ConcursoDTO | null>;
    insert(): Promise<ConcursoDTO>;
    update(): Promise<ConcursoDTO | null>;
    remove(): Promise<boolean>;
}
//# sourceMappingURL=concursos.repository.d.ts.map