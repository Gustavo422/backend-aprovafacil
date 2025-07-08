import { SimuladoDTO } from '../../types/simulados.dto.js';
export declare class SimuladosRepository {
    findAll(): Promise<SimuladoDTO[]>;
    findById(): Promise<SimuladoDTO | null>;
    insert(): Promise<SimuladoDTO>;
    update(): Promise<SimuladoDTO | null>;
    remove(): Promise<boolean>;
    corrigir(): Promise<string | number | boolean | undefined>;
}
//# sourceMappingURL=simulados.repository.d.ts.map