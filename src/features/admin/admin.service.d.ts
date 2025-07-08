import { AdminDTO } from '../../types/admin.dto.js';
export declare class AdminService {
    getAll(): Promise<AdminDTO[]>;
    getById(): Promise<AdminDTO | null>;
    create(): Promise<AdminDTO>;
    update(): Promise<AdminDTO | null>;
    delete(): Promise<boolean>;
    clearCache(): Promise<boolean>;
    validateSchema(): Promise<boolean>;
    getDatabaseUsage(): Promise<unknown>;
}
//# sourceMappingURL=admin.service.d.ts.map