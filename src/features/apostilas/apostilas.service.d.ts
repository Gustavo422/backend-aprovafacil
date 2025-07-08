import { ApostilaDTO } from '../../types/apostilas.dto.js';
export declare class ApostilasService {
    getAll(): Promise<ApostilaDTO[]>;
    getById(): Promise<ApostilaDTO | null>;
    create(): Promise<ApostilaDTO>;
    update(): Promise<ApostilaDTO | null>;
    delete(): Promise<boolean>;
}
//# sourceMappingURL=apostilas.service.d.ts.map