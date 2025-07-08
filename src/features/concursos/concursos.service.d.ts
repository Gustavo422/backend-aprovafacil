import { ConcursoDTO } from '../../types/concursos.dto.js';
export declare class ConcursosService {
    getAll(): Promise<ConcursoDTO[]>;
    getById(): Promise<ConcursoDTO | null>;
    create(): Promise<ConcursoDTO>;
    update(): Promise<ConcursoDTO | null>;
    delete(): Promise<boolean>;
}
//# sourceMappingURL=concursos.service.d.ts.map