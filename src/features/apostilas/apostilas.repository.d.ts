import { ApostilaDTO } from '../../types/apostilas.dto.js';
export declare class ApostilasRepository {
    findAll(): Promise<ApostilaDTO[]>;
    findById(): Promise<ApostilaDTO | null>;
    insert(): Promise<ApostilaDTO>;
    update(): Promise<ApostilaDTO | null>;
    remove(): Promise<boolean>;
}
//# sourceMappingURL=apostilas.repository.d.ts.map