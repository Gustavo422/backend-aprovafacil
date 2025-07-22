import bcrypt from 'bcrypt';

/**
 * Utility class for secure password handling
 */
export class PasswordUtils {
  /**
   * Default number of salt rounds for bcrypt
   * Higher values increase security but also increase computation time
   * 12 is a good balance between security and performance
   */
  private static readonly DEFAULT_SALT_ROUNDS = 12;

  /**
   * Hashes a password using bcrypt
   * @param password - Plain text password to hash
   * @param saltRounds - Number of salt rounds (default: 12)
   * @returns Hashed password
   */
  static async hashPassword(password: string, saltRounds: number = this.DEFAULT_SALT_ROUNDS): Promise<string> {
    if (!password) {
      throw new Error('Password is required');
    }

    try {
      // Generate a salt
      const salt = await bcrypt.genSalt(saltRounds);
      
      // Hash the password with the salt
      const hashedPassword = await bcrypt.hash(password, salt);
      
      return hashedPassword;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Compares a plain text password with a hashed password
   * @param password - Plain text password
   * @param hashedPassword - Hashed password to compare against
   * @returns True if passwords match, false otherwise
   */
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    if (!password || !hashedPassword) {
      return false;
    }

    try {
      // Compare the password with the hash
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('Error comparing passwords:', error);
      return false;
    }
  }

  /**
   * Validates a password against security requirements
   * @param password - Password to validate
   * @returns Object with validation result and error message
   */
  static validatePassword(password: string): { isValid: boolean; message?: string } {
    if (!password) {
      return { isValid: false, message: 'Senha é obrigatória' };
    }

    if (password.length < 8) {
      return { isValid: false, message: 'A senha deve ter pelo menos 8 caracteres' };
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'A senha deve conter pelo menos uma letra maiúscula' };
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'A senha deve conter pelo menos uma letra minúscula' };
    }

    // Check for at least one number
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: 'A senha deve conter pelo menos um número' };
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"|,.<>/?]/.test(password)) {
      return { isValid: false, message: 'A senha deve conter pelo menos um caractere especial' };
    }

    return { isValid: true };
  }
}