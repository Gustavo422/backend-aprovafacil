import { CategoriaDisciplinasDTO } from '../../types/categoria-disciplinas.dto.js';
export declare class CategoriaDisciplinasRepository {
    findAll(): Promise<CategoriaDisciplinasDTO[]>;
    findById(): Promise<CategoriaDisciplinasDTO | null>;
    insert(): Promise<CategoriaDisciplinasDTO>;
    update(): Promise<CategoriaDisciplinasDTO | null>;
    remove(): Promise<boolean>;
}
//# sourceMappingURL=categoria-disciplinas.repository.d.ts.map