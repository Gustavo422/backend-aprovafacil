import { WeakPointDTO } from '../../types/weak-points.dto.js';
export declare class WeakPointsService {
    getAll(): Promise<WeakPointDTO[]>;
    getByUser(): Promise<WeakPointDTO[]>;
    create(): Promise<WeakPointDTO>;
    update(): Promise<WeakPointDTO | null>;
    delete(): Promise<boolean>;
}
//# sourceMappingURL=weak-points.service.d.ts.map