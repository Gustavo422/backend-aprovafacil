import { WeakPointDTO } from '../../types/weak-points.dto.js';
export declare class WeakPointsRepository {
    findAll(): Promise<WeakPointDTO[]>;
    findByUser(): Promise<WeakPointDTO[]>;
    insert(): Promise<WeakPointDTO>;
    update(): Promise<WeakPointDTO | null>;
    remove(): Promise<boolean>;
}
//# sourceMappingURL=weak-points.repository.d.ts.map