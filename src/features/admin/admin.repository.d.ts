import { AdminDTO } from '../../types/admin.dto.js';
export declare class AdminRepository {
    findAll(): Promise<AdminDTO[]>;
    findById(): Promise<AdminDTO | null>;
    insert(): Promise<AdminDTO>;
    update(): Promise<AdminDTO | null>;
    remove(): Promise<boolean>;
    clearCache(): Promise<boolean>;
    validateSchema(): Promise<boolean>;
    getDatabaseUsage(): Promise<unknown>;
}
//# sourceMappingURL=admin.repository.d.ts.map