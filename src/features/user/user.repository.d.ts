import { UserDTO } from '../../types/user.dto.js';
export declare class UserRepository {
    findAll(): Promise<UserDTO[]>;
    findById(): Promise<UserDTO | null>;
    insert(): Promise<UserDTO>;
    update(): Promise<UserDTO | null>;
    remove(): Promise<boolean>;
}
//# sourceMappingURL=user.repository.d.ts.map