import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * User model interface based on the design document
 */
export interface User {
  id: string;              // Primary key in usuarios table
  auth_user_id: string;    // Foreign key to auth.users table
  email: string;           // User's email address
  nome: string;            // User's name
  senha_hash: string;      // Bcrypt hashed password
  role: 'user' | 'admin';  // User role
  ativo: boolean;          // Account status
  ultimo_login: Date;      // Last login timestamp
  criado_em: Date;         // Creation timestamp
  atualizado_em: Date;     // Last update timestamp
}

/**
 * Interface for auth.users table data
 */
export interface AuthUser {
  id: string;                // Primary key in auth.users table
  email: string;             // User's email address
  encrypted_password: string; // Hashed password
  email_confirmed_at?: Date;  // Email confirmation timestamp
  last_sign_in_at?: Date;     // Last sign in timestamp
  raw_app_meta_data?: unknown;    // App metadata (can contain role information)
  raw_user_meta_data?: unknown;   // User metadata
  created_at: Date;           // Creation timestamp
  updated_at: Date;           // Last update timestamp
  confirmed_at?: Date;        // Confirmation timestamp
  is_super_admin?: boolean;   // Super admin flag
}

/**
 * Repository for user data access
 */
export class UserRepository {
  private supabase: SupabaseClient;

  /**
   * Creates a new instance of UserRepository
   * @param supabaseUrl - Supabase URL
   * @param supabaseKey - Supabase service role key
   */
  constructor(
    supabaseUrl: string = process.env.SUPABASE_URL || '',
    supabaseKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Finds a user by email
   * @param email - User's email
   * @returns User object if found, null otherwise
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      // First, check the public.usuarios table
      const { data: usuario, error: usuarioError } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single();

      if (usuarioError) {
        console.error('Error fetching user from usuarios table:', usuarioError);
        
        // If user not found in public.usuarios, check if they exist in auth.users
        // This allows for automatic linking of users who exist in auth but not in public schema
        const authUser = await this.getAuthUserByEmail(email);
        if (authUser) {
          // Create a new public.usuarios record linked to this auth user
          return await this.linkAuthUserWithPublicUser(authUser.id, { email: authUser.email });
        }
        
        return null;
      }

      if (!usuario) {
        return null;
      }

      // Get the corresponding auth.users record
      const authUser = await this.getAuthUserById(usuario.auth_user_id);
      
      // Ensure data consistency between tables
      await this.ensureUserDataConsistency(usuario.id);
      
      // Return the mapped user model
      return this.mapDatabaseUserToModel(usuario, authUser);
    } catch (error) {
      console.error('Unexpected error in findByEmail:', error);
      return null;
    }
  }

  /**
   * Finds a user by ID
   * @param id - User ID from public.usuarios table
   * @returns User object if found, null otherwise
   */
  async findById(id: string): Promise<User | null> {
    try {
      // First, check the public.usuarios table
      const { data: usuario, error: usuarioError } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .single();

      if (usuarioError) {
        console.error('Error fetching user from usuarios table:', usuarioError);
        return null;
      }

      if (!usuario) {
        return null;
      }

      // Verify user exists in both tables
      const exists = await this.verifyUserExistsInBothTables(id);
      if (!exists) {
        console.warn(`User ${id} exists in public.usuarios but not in auth.users`);
        // We still return the user, but this is a data integrity issue that should be addressed
      }

      // Get the corresponding auth.users record
      const authUser = await this.getAuthUserById(usuario.auth_user_id);
      
      // Ensure data consistency between tables
      await this.ensureUserDataConsistency(id);
      
      // Return the mapped user model
      return this.mapDatabaseUserToModel(usuario, authUser);
    } catch (error) {
      console.error('Unexpected error in findById:', error);
      return null;
    }
  }

  /**
   * Finds a user by auth user ID (from auth.users table)
   * @param authUserId - Auth user ID
   * @returns User object if found, null otherwise
   */
  async findByAuthUserId(authUserId: string): Promise<User | null> {
    try {
      // First, check the public.usuarios table
      const { data: usuario, error: usuarioError } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (usuarioError) {
        console.error('Error fetching user from usuarios table:', usuarioError);
        
        // If user not found in public.usuarios, check if they exist in auth.users
        // This allows for automatic linking of users who exist in auth but not in public schema
        const authUser = await this.getAuthUserById(authUserId);
        if (authUser) {
          // Create a new public.usuarios record linked to this auth user
          return await this.linkAuthUserWithPublicUser(authUserId, { email: authUser.email });
        }
        
        return null;
      }

      if (!usuario) {
        return null;
      }

      // Get the corresponding auth.users record
      const authUser = await this.getAuthUserById(authUserId);
      
      // Ensure data consistency between tables
      await this.ensureUserDataConsistency(usuario.id);
      
      // Return the mapped user model
      return this.mapDatabaseUserToModel(usuario, authUser);
    } catch (error) {
      console.error('Unexpected error in findByAuthUserId:', error);
      return null;
    }
  }

  /**
   * Updates the last login timestamp for a user
   * @param id - User ID
   * @returns True if successful, false otherwise
   */
  async updateLastLogin(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('usuarios')
        .update({ ultimo_login: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error updating last login:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error in updateLastLogin:', error);
      return false;
    }
  }

  /**
   * Retrieves a user from auth.users table by ID
   * @param authUserId - Auth user ID
   * @returns Auth user object if found, null otherwise
   */
  async getAuthUserById(authUserId: string): Promise<AuthUser | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', authUserId)
        .single();

      if (error) {
        console.error('Error fetching auth user by ID:', error);
        return null;
      }

      return data as AuthUser;
    } catch (error) {
      console.error('Unexpected error in getAuthUserById:', error);
      return null;
    }
  }

  /**
   * Retrieves a user from auth.users table by email
   * @param email - User's email
   * @returns Auth user object if found, null otherwise
   */
  async getAuthUserByEmail(email: string): Promise<AuthUser | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        console.error('Error fetching auth user by email:', error);
        return null;
      }

      return data as AuthUser;
    } catch (error) {
      console.error('Unexpected error in getAuthUserByEmail:', error);
      return null;
    }
  }

  /**
   * Links an auth.users record with a public.usuarios record
   * Creates a new public.usuarios record if one doesn't exist
   * @param authUserId - Auth user ID
   * @param userData - User data to create/update
   * @returns User object if successful, null otherwise
   */
  async linkAuthUserWithPublicUser(authUserId: string, userData: Partial<User>): Promise<User | null> {
    try {
      // First, check if the auth user exists
      const authUser = await this.getAuthUserById(authUserId);
      if (!authUser) {
        console.error('Auth user not found:', authUserId);
        return null;
      }

      // Check if a public user already exists with this auth_user_id
      const { data: existingUser, error: findError } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (findError && findError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
        console.error('Error checking for existing user:', findError);
        return null;
      }

      if (existingUser) {
        // Update the existing user
        const updateData = {
          ...userData,
          email: userData.email || authUser.email, // Ensure email consistency
          atualizado_em: new Date().toISOString()
        };

        const { data: updatedUser, error: updateError } = await this.supabase
          .from('usuarios')
          .update(updateData)
          .eq('id', existingUser.id)
          .select('*')
          .single();

        if (updateError) {
          console.error('Error updating user:', updateError);
          return null;
        }

        return this.mapDatabaseUserToModel(updatedUser, authUser);
      } else {
        // Create a new public user
        const newUserData = {
          auth_user_id: authUserId,
          email: userData.email || authUser.email,
          nome: userData.nome || authUser.email.split('@')[0], // Default name if not provided
          senha_hash: userData.senha_hash || authUser.encrypted_password,
          role: userData.role || 'user',
          ativo: userData.ativo !== undefined ? userData.ativo : true,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        };

        const { data: newUser, error: createError } = await this.supabase
          .from('usuarios')
          .insert(newUserData)
          .select('*')
          .single();

        if (createError) {
          console.error('Error creating user:', createError);
          return null;
        }

        return this.mapDatabaseUserToModel(newUser, authUser);
      }
    } catch (error) {
      console.error('Unexpected error in linkAuthUserWithPublicUser:', error);
      return null;
    }
  }

  /**
   * Ensures that user data is consistent between auth.users and public.usuarios tables
   * @param userId - User ID from public.usuarios table
   * @returns True if successful, false otherwise
   */
  async ensureUserDataConsistency(userId: string): Promise<boolean> {
    try {
      // Get the user from public.usuarios
      const { data: usuario, error: usuarioError } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (usuarioError) {
        console.error('Error fetching user from usuarios table:', usuarioError);
        return false;
      }

      if (!usuario || !usuario.auth_user_id) {
        console.error('User not found or missing auth_user_id:', userId);
        return false;
      }

      // Get the corresponding auth user
      const authUser = await this.getAuthUserById(usuario.auth_user_id);
      if (!authUser) {
        console.error('Auth user not found for user:', userId);
        return false;
      }

      // Check for inconsistencies
      const updates: Record<string, unknown> = {};
      let needsUpdate = false;

      // Ensure email consistency
      if (usuario.email !== authUser.email) {
        updates.email = authUser.email;
        needsUpdate = true;
      }

      // Ensure role consistency (if available in auth user metadata)
      if (
        authUser.raw_app_meta_data &&
        typeof authUser.raw_app_meta_data === 'object' &&
        authUser.raw_app_meta_data !== null &&
        'role' in authUser.raw_app_meta_data &&
        usuario.role !== (authUser.raw_app_meta_data as { role: string }).role
      ) {
        updates.role = (authUser.raw_app_meta_data as { role: string }).role;
        needsUpdate = true;
      }

      // Update if needed
      if (needsUpdate) {
        updates.atualizado_em = new Date().toISOString();
        
        const { error: updateError } = await this.supabase
          .from('usuarios')
          .update(updates)
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating user for consistency:', updateError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Unexpected error in ensureUserDataConsistency:', error);
      return false;
    }
  }

  /**
   * Verifies that a user exists in both auth.users and public.usuarios tables
   * @param userId - User ID from public.usuarios table
   * @returns True if user exists in both tables, false otherwise
   */
  async verifyUserExistsInBothTables(userId: string): Promise<boolean> {
    try {
      // Get the user from public.usuarios
      const { data: usuario, error: usuarioError } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (usuarioError) {
        console.error('Error fetching user from usuarios table:', usuarioError);
        return false;
      }

      if (!usuario || !usuario.auth_user_id) {
        console.error('User not found or missing auth_user_id:', userId);
        return false;
      }

      // Check if the auth user exists
      const authUser = await this.getAuthUserById(usuario.auth_user_id);
      return authUser !== null;
    } catch (error) {
      console.error('Unexpected error in verifyUserExistsInBothTables:', error);
      return false;
    }
  }

  /**
   * Maps database user record to User model
   * @param dbUser - Database user record
   * @param authUser - Auth user record (optional)
   * @returns User model
   * @private
   */
  private mapDatabaseUserToModel(dbUser: Record<string, unknown>, authUser?: AuthUser): User {
    return {
      id: dbUser.id as string,
      auth_user_id: dbUser.auth_user_id as string,
      email: dbUser.email as string,
      nome: dbUser.nome as string,
      senha_hash: (dbUser.senha_hash as string) || (authUser?.encrypted_password || ''),
      role: (dbUser.role as 'user' | 'admin') || 'user',
      ativo: dbUser.ativo !== false,
      ultimo_login: dbUser.ultimo_login ? new Date(dbUser.ultimo_login as string) : new Date(),
      criado_em: dbUser.criado_em ? new Date(dbUser.criado_em as string) : new Date(),
      atualizado_em: dbUser.atualizado_em ? new Date(dbUser.atualizado_em as string) : new Date()
    };
  }
}