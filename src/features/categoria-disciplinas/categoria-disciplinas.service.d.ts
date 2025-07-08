import { CategoriaDisciplinasDTO } from '../../types/categoria-disciplinas.dto.js';
export declare class CategoriaDisciplinasService {
    getAll(): Promise<CategoriaDisciplinasDTO[]>;
    getById(): Promise<CategoriaDisciplinasDTO | null>;
    create(): Promise<CategoriaDisciplinasDTO>;
    update(): Promise<CategoriaDisciplinasDTO | null>;
    delete(): Promise<boolean>;
}
//# sourceMappingURL=categoria-disciplinas.service.d.ts.map