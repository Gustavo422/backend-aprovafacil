import { describe, it, expect } from 'vitest';
import { Validator } from './validator.js';
import { UserSchema, LoginSchema, RegisterSchema, ResetPasswordSchema } from './schemas.js';
import { z } from 'zod';
describe('Validation System', () => {
    describe('Validator.validate', () => {
        it('deve validar dados válidos com sucesso', () => {
            const validUser = {
                email: 'test@example.com',
                nome: 'Test User',
                senha: 'password123'
            };
            const result = Validator.validate(UserSchema, validUser);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(validUser);
            expect(result.errors).toBeUndefined();
        });
        it('deve retornar erro para dados inválidos', () => {
            const invalidUser = {
                email: 'invalid-email',
                nome: '',
                senha: '123' // muito curto
            };
            const result = Validator.validate(UserSchema, invalidUser);
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors?.length).toBeGreaterThan(0);
            expect(result.data).toBeUndefined();
        });
        it('deve validar email corretamente', () => {
            const validEmails = [
                'test@example.com',
                'user.name@domain.co.uk',
                'user+tag@example.org'
            ];
            const invalidEmails = [
                'invalid-email',
                '@example.com',
                'user@',
                'user@.com'
            ];
            validEmails.forEach(email => {
                const result = Validator.validate(UserSchema, { email, nome: 'Test', senha: 'password123' });
                expect(result.success).toBe(true);
            });
            invalidEmails.forEach(email => {
                const result = Validator.validate(UserSchema, { email, nome: 'Test', senha: 'password123' });
                expect(result.success).toBe(false);
            });
        });
        it('deve validar senha com requisitos mínimos', () => {
            const validPasswords = [
                'password123',
                'MySecurePass123!',
                '1234567890abcdef'
            ];
            const invalidPasswords = [
                '123', // muito curto (menos de 8 caracteres)
                'pass', // muito curto (menos de 8 caracteres)
                '1234567' // muito curto (menos de 8 caracteres)
            ];
            validPasswords.forEach(senha => {
                const result = Validator.validate(UserSchema, {
                    email: 'test@example.com',
                    nome: 'Test',
                    senha
                });
                expect(result.success).toBe(true);
            });
            invalidPasswords.forEach(senha => {
                const result = Validator.validate(UserSchema, {
                    email: 'test@example.com',
                    nome: 'Test',
                    senha
                });
                expect(result.success).toBe(false);
            });
        });
        it('should handle complex nested objects', () => {
            const schema = z.object({
                user: z.object({
                    profile: z.object({
                        preferences: z.record(z.unknown())
                    })
                })
            });
            const data = {
                user: {
                    profile: {
                        preferences: {
                            theme: 'dark',
                            language: 'pt-BR'
                        }
                    }
                }
            };
            const result = Validator.validate(schema, data);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(data);
        });
    });
    describe('Validator.validateAndSanitize', () => {
        it('deve validar e sanitizar dados com sucesso', () => {
            const dirtyValidData = {
                email: 'test@example.com',
                nome: 'Test User',
                senha: 'password123'
            };
            const result = Validator.validateAndSanitize(UserSchema, dirtyValidData);
            expect(result.success).toBe(true);
            expect(result.data?.email).toBe('test@example.com');
            expect(result.data?.nome).toBe('Test User');
            expect(result.data?.senha).toBe('password123');
        });
        it('deve retornar erro para dados inválidos mesmo após sanitização', () => {
            const dirtyInvalidData = {
                email: 'invalid-email',
                nome: 'Test User',
                senha: '123' // muito curto
            };
            const result = Validator.validateAndSanitize(UserSchema, dirtyInvalidData);
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
        });
    });
    describe('Schemas de Validação', () => {
        describe('UserSchema', () => {
            it('deve validar usuário completo', () => {
                const validUser = {
                    email: 'test@example.com',
                    nome: 'Test User',
                    senha: 'password123'
                };
                const result = Validator.validate(UserSchema, validUser);
                expect(result.success).toBe(true);
                expect(result.data).toEqual(validUser);
            });
            it('deve validar usuário com campos opcionais', () => {
                const userWithOptionals = {
                    id: '123',
                    email: 'test@example.com',
                    nome: 'Test User',
                    senha: 'password123',
                    token: 'jwt-token'
                };
                const result = Validator.validate(UserSchema, userWithOptionals);
                expect(result.success).toBe(true);
                expect(result.data).toEqual(userWithOptionals);
            });
            it('deve rejeitar usuário sem email', () => {
                const userWithoutEmail = {
                    nome: 'Test User',
                    senha: 'password123'
                };
                const result = Validator.validate(UserSchema, userWithoutEmail);
                expect(result.success).toBe(false);
                expect(result.errors).toBeDefined();
            });
            it('deve rejeitar usuário com email inválido', () => {
                const userWithInvalidEmail = {
                    email: 'invalid-email',
                    nome: 'Test User',
                    senha: 'password123'
                };
                const result = Validator.validate(UserSchema, userWithInvalidEmail);
                expect(result.success).toBe(false);
                expect(result.errors).toBeDefined();
            });
            it('deve rejeitar usuário com senha muito curta', () => {
                const userWithShortPassword = {
                    email: 'test@example.com',
                    nome: 'Test User',
                    senha: '123'
                };
                const result = Validator.validate(UserSchema, userWithShortPassword);
                expect(result.success).toBe(false);
                expect(result.errors).toBeDefined();
            });
        });
        describe('RegisterSchema', () => {
            it('deve validar dados de registro válidos', () => {
                const validRegisterData = {
                    email: 'test@example.com',
                    nome: 'Test User',
                    senha: 'password123'
                };
                const result = Validator.validate(RegisterSchema, validRegisterData);
                expect(result.success).toBe(true);
                expect(result.data).toEqual(validRegisterData);
            });
            it('deve rejeitar dados de registro inválidos', () => {
                const invalidRegisterData = {
                    email: 'invalid-email',
                    nome: 'T', // muito curto
                    senha: '123' // muito curto
                };
                const result = Validator.validate(RegisterSchema, invalidRegisterData);
                expect(result.success).toBe(false);
                expect(result.errors).toBeDefined();
            });
        });
        describe('LoginSchema', () => {
            it('deve validar dados de login válidos', () => {
                const validLoginData = {
                    email: 'test@example.com',
                    senha: 'password123'
                };
                const result = Validator.validate(LoginSchema, validLoginData);
                expect(result.success).toBe(true);
                expect(result.data).toEqual(validLoginData);
            });
            it('deve rejeitar dados de login inválidos', () => {
                const invalidLoginData = {
                    email: 'invalid-email',
                    senha: '' // vazio
                };
                const result = Validator.validate(LoginSchema, invalidLoginData);
                expect(result.success).toBe(false);
                expect(result.errors).toBeDefined();
            });
        });
        describe('ResetPasswordSchema', () => {
            it('deve validar dados de reset de senha válidos', () => {
                const validResetData = {
                    token: 'valid-token',
                    novaSenha: 'newpassword123'
                };
                const result = Validator.validate(ResetPasswordSchema, validResetData);
                expect(result.success).toBe(true);
                expect(result.data).toEqual(validResetData);
            });
            it('deve rejeitar dados de reset de senha inválidos', () => {
                const invalidResetData = {
                    token: '', // vazio
                    novaSenha: '123' // muito curto
                };
                const result = Validator.validate(ResetPasswordSchema, invalidResetData);
                expect(result.success).toBe(false);
                expect(result.errors).toBeDefined();
            });
        });
    });
    describe('Métodos Utilitários', () => {
        describe('validateId', () => {
            it('deve validar IDs válidos', () => {
                expect(Validator.validateId('123')).toBe(true);
                expect(Validator.validateId('user-123')).toBe(true);
                expect(Validator.validateId('a'.repeat(50))).toBe(true);
            });
            it('deve rejeitar IDs inválidos', () => {
                expect(Validator.validateId('')).toBe(false);
                expect(Validator.validateId('a'.repeat(51))).toBe(false);
                expect(Validator.validateId('invalid-id-with-special-chars!@#')).toBe(false);
            });
        });
        describe('validateEmail', () => {
            it('deve validar emails válidos', () => {
                expect(Validator.validateEmail('test@example.com')).toBe(true);
                expect(Validator.validateEmail('user.name@domain.co.uk')).toBe(true);
            });
            it('deve rejeitar emails inválidos', () => {
                expect(Validator.validateEmail('invalid-email')).toBe(false);
                expect(Validator.validateEmail('@example.com')).toBe(false);
                expect(Validator.validateEmail('user@')).toBe(false);
            });
        });
        describe('validatePassword', () => {
            it('deve validar senhas válidas', () => {
                expect(Validator.validatePassword('password123')).toBe(true);
                expect(Validator.validatePassword('MySecurePass123!')).toBe(true);
            });
            it('deve rejeitar senhas inválidas', () => {
                expect(Validator.validatePassword('123')).toBe(false); // muito curto
                expect(Validator.validatePassword('password')).toBe(false); // sem números
                expect(Validator.validatePassword('12345678')).toBe(false); // apenas números
            });
        });
    });
});
//# sourceMappingURL=validator.test.js.map