import { SimuladoDTO } from '../../types/simulados.dto.js';
export declare class SimuladosService {
    getAll(): Promise<SimuladoDTO[]>;
    getById(): Promise<SimuladoDTO | null>;
    create(): Promise<SimuladoDTO>;
    update(): Promise<SimuladoDTO | null>;
    delete(): Promise<boolean>;
    corrigirSimulado(): Promise<string | number | boolean | undefined>;
}
//# sourceMappingURL=simulados.service.d.ts.map