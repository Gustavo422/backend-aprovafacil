import { UserDTO } from '../../types/user.dto.js';
export declare class UserService {
    getAll(): Promise<UserDTO[]>;
    getById(): Promise<UserDTO | null>;
    create(): Promise<UserDTO>;
    update(): Promise<UserDTO | null>;
    delete(): Promise<boolean>;
}
//# sourceMappingURL=user.service.d.ts.map