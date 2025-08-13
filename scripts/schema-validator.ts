#!/usr/bin/env tsx

/**
 * 🗄️ VALIDADOR DE SCHEMA DO BANCO DE DADOS
 * 
 * Script para validar a estrutura do banco de dados Supabase,
 * comparando com as definições de tipos do código.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

interface TableInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface SchemaValidationResult {
  table: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

class SchemaValidator {
  private readonly supabase: any;
  private readonly essentialTables: string[];
  private readonly schemaReferencePath: string;
  private readonly tableColumns: Map<string, TableInfo[]> = new Map();

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    this.essentialTables = [
      'usuarios', 'concursos', 'categorias_concursos',
      'simulados', 'questoes_semanais', 'cartoes_memorizacao', 'apostilas',
      'conteudo_apostila', 'progresso_usuario_simulado', 'respostas_questoes_semanais',
      'progresso_usuario_flashcard', 'progresso_usuario_apostila', 'progresso_usuario_mapa_assuntos',
      'preferencias_usuario_concurso'
    ];
    this.schemaReferencePath = join(PROJECT_ROOT, '..', 'z_sqls', 'schema', 'tables', 'schema_public.sql');
  }

  private async getTableSchema(): Promise<void> {
    try {
      // Consultar information_schema.columns para obter estrutura completa
      const { data, error } = await this.supabase
        .from('information_schema.columns')
        .select('table_name, column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .order('table_name, ordinal_position');

      if (error) throw error;

      // Organizar por tabela
      data?.forEach((column: TableInfo) => {
        if (!this.tableColumns.has(column.table_name)) {
          this.tableColumns.set(column.table_name, []);
        }
        this.tableColumns.get(column.table_name)!.push(column);
      });

    } catch (error) {
      throw new Error(`Erro ao obter schema: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private validateEssentialTables(): SchemaValidationResult[] {
    const results: SchemaValidationResult[] = [];
    const existingTables = Array.from(this.tableColumns.keys());

    for (const table of this.essentialTables) {
      if (existingTables.includes(table)) {
        results.push({
          table,
          status: 'success',
          message: 'Tabela encontrada',
          details: {
            columns: this.tableColumns.get(table)?.length || 0
          }
        });
      } else {
        results.push({
          table,
          status: 'error',
          message: 'Tabela essencial ausente'
        });
      }
    }

    return results;
  }

  private validateTableStructure(): SchemaValidationResult[] {
    const results: SchemaValidationResult[] = [];

    for (const [tableName, columns] of this.tableColumns) {
      const validation = this.validateSingleTable(tableName, columns);
      results.push(validation);
    }

    return results;
  }

  private compareWithReference(): SchemaValidationResult[] {
    const results: SchemaValidationResult[] = [];
    try {
      if (!existsSync(this.schemaReferencePath)) {
        return [{
          table: 'schema_reference',
          status: 'warning',
          message: 'Arquivo de referência schema_public.sql não encontrado'
        }];
      }
      const refSql = readFileSync(this.schemaReferencePath, 'utf-8');
      // Extração simples de nomes de tabelas no arquivo de referência
      const tableRegex = /CREATE\s+TABLE\s+public\.([a-zA-Z0-9_]+)/gi;
      const referenceTables: string[] = [];
      let match: RegExpExecArray | null;
       
      while ((match = tableRegex.exec(refSql)) !== null) {
        const tableName = match[1];
        if (typeof tableName === 'string' && tableName.length > 0) {
          referenceTables.push(tableName);
        }
      }
      const existingTables = Array.from(this.tableColumns.keys());

      // Tabelas faltando vs extras
      const missingInDb = referenceTables.filter(t => !existingTables.includes(t));
      const extraInDb = existingTables.filter(t => !referenceTables.includes(t));

      if (missingInDb.length > 0) {
        results.push({
          table: 'schema_drift',
          status: 'warning',
          message: `Tabelas presentes na referência mas ausentes no DB: ${missingInDb.join(', ')}`
        });
      }
      if (extraInDb.length > 0) {
        results.push({
          table: 'schema_drift',
          status: 'warning',
          message: `Tabelas extras no DB não listadas na referência: ${extraInDb.join(', ')}`
        });
      }

      // Checagem focal nas tabelas do módulo guru
      const guruTables = [
        'progresso_usuario_simulado',
        'respostas_questoes_semanais',
        'progresso_usuario_flashcard',
        'progresso_usuario_apostila',
        'progresso_usuario_mapa_assuntos',
        'conteudo_apostila',
        'simulados',
        'cartoes_memorizacao'
      ];
      for (const table of guruTables) {
        const dbCols = (this.tableColumns.get(table) || []).map(c => c.column_name).sort();
        // Extrair colunas da referência por parsing simples
        const tableBlockRegex = new RegExp(`CREATE\\s+TABLE\\s+public\\.${table}\\s*\\(([^;]+?)\\);`, 'is');
        const blockMatch = tableBlockRegex.exec(refSql);
        if (!blockMatch) {
          results.push({ table, status: 'warning', message: 'Tabela não encontrada na referência' });
          continue;
        }
        const block = String(blockMatch[1] ?? '');
        const colsRaw = Array.from(block.matchAll(/\n\s*([a-zA-Z0-9_]+)\s+[a-zA-Z]/g)).map(m => m[1]);
        const colsInRef = colsRaw.filter((n): n is string => typeof n === 'string' && n !== 'CONSTRAINT');
        const missingCols = colsInRef.filter((c) => !dbCols.includes(c));
        const extraCols = dbCols.filter((c) => !colsInRef.includes(c));
        if (missingCols.length > 0 || extraCols.length > 0) {
          results.push({
            table,
            status: 'warning',
            message: `Possível drift de colunas. Faltando no DB: ${missingCols.join(', ') || '-'}; Extras no DB: ${extraCols.join(', ') || '-'}`
          });
        } else {
          results.push({ table, status: 'success', message: 'Estrutura alinhada com referência' });
        }
      }

      return results;
    } catch (error) {
      return [{
        table: 'schema_reference',
        status: 'warning',
        message: `Falha ao comparar com referência: ${error instanceof Error ? error.message : String(error)}`
      }];
    }
  }

  private validateSingleTable(tableName: string, columns: TableInfo[]): SchemaValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Verificar se tem colunas essenciais
    const essentialColumns = this.getEssentialColumnsForTable(tableName);
    for (const essentialCol of essentialColumns) {
      const found = columns.find(col => col.column_name === essentialCol.name);
      if (!found) {
        issues.push(`Coluna essencial ausente: ${essentialCol.name}`);
      } else if (found.data_type !== essentialCol.type) {
        warnings.push(`Tipo de coluna diferente: ${essentialCol.name} (esperado: ${essentialCol.type}, encontrado: ${found.data_type})`);
      }
    }

    // Verificar se tem chave primária
    const hasIdColumn = columns.some(col => col.column_name === 'id');
    if (!hasIdColumn) {
      issues.push('Coluna "id" (chave primária) ausente');
    }

    // Verificar se tem timestamps
    const hasCreatedAt = columns.some(col => col.column_name === 'created_at');
    const hasUpdatedAt = columns.some(col => col.column_name === 'updated_at');
    
    if (!hasCreatedAt) {
      warnings.push('Coluna "created_at" ausente');
    }
    if (!hasUpdatedAt) {
      warnings.push('Coluna "updated_at" ausente');
    }

    if (issues.length > 0) {
      return {
        table: tableName,
        status: 'error',
        message: `Problemas estruturais: ${issues.join(', ')}`,
        details: { issues, warnings }
      };
    } else if (warnings.length > 0) {
      return {
        table: tableName,
        status: 'warning',
        message: `Avisos: ${warnings.join(', ')}`,
        details: { warnings }
      };
    } 
      return {
        table: tableName,
        status: 'success',
        message: 'Estrutura válida',
        details: { columnCount: columns.length }
      };
    
  }

  private getEssentialColumnsForTable(tableName: string): Array<{name: string, type: string}> {
    const columnMap: Record<string, Array<{name: string, type: string}>> = {
      usuarios: [
        { name: 'id', type: 'uuid' },
        { name: 'email', type: 'character varying' },
        { name: 'nome', type: 'character varying' },
        { name: 'role', type: 'character varying' }
      ],
      concursos: [
        { name: 'id', type: 'uuid' },
        { name: 'nome', type: 'character varying' },
        { name: 'orgao', type: 'character varying' },
        { name: 'ano', type: 'integer' }
      ],
      categorias: [
        { name: 'id', type: 'uuid' },
        { name: 'nome', type: 'character varying' },
        { name: 'descricao', type: 'text' }
      ],
      disciplinas: [
        { name: 'id', type: 'uuid' },
        { name: 'nome', type: 'character varying' },
        { name: 'categoria_id', type: 'uuid' }
      ],
      simulados: [
        { name: 'id', type: 'uuid' },
        { name: 'titulo', type: 'character varying' },
        { name: 'concurso_id', type: 'uuid' },
        { name: 'questoes', type: 'jsonb' }
      ],
      questoes: [
        { name: 'id', type: 'uuid' },
        { name: 'enunciado', type: 'text' },
        { name: 'alternativas', type: 'jsonb' },
        { name: 'resposta_correta', type: 'character varying' }
      ],
      flashcards: [
        { name: 'id', type: 'uuid' },
        { name: 'frente', type: 'text' },
        { name: 'verso', type: 'text' },
        { name: 'disciplina_id', type: 'uuid' }
      ],
      apostilas: [
        { name: 'id', type: 'uuid' },
        { name: 'titulo', type: 'character varying' },
        { name: 'conteudo', type: 'text' },
        { name: 'disciplina_id', type: 'uuid' }
      ]
    };

    return columnMap[tableName] || [];
  }

  private async validateForeignKeys(): Promise<SchemaValidationResult[]> {
    const results: SchemaValidationResult[] = [];

    try {
      // Consultar constraints de chave estrangeira
      const { data, error } = await this.supabase
        .from('information_schema.table_constraints')
        .select(`
          constraint_name,
          table_name,
          constraint_type
        `)
        .eq('table_schema', 'public')
        .eq('constraint_type', 'FOREIGN KEY');

      if (error) throw error;

      // Verificar se as FK essenciais existem
      const essentialFKs = [
        { table: 'disciplinas', column: 'categoria_id', references: 'categorias' },
        { table: 'simulados', column: 'concurso_id', references: 'concursos' },
        { table: 'flashcards', column: 'disciplina_id', references: 'disciplinas' },
        { table: 'apostilas', column: 'disciplina_id', references: 'disciplinas' }
      ];

      for (const fk of essentialFKs) {
        const hasFK = data?.some((constraint: any) => 
          constraint.table_name === fk.table
        );

        if (hasFK) {
          results.push({
            table: fk.table,
            status: 'success',
            message: `FK ${fk.column} -> ${fk.references} válida`
          });
        } else {
          results.push({
            table: fk.table,
            status: 'warning',
            message: `FK ${fk.column} -> ${fk.references} ausente`
          });
        }
      }

    } catch (error) {
      results.push({
        table: 'foreign_keys',
        status: 'error',
        message: `Erro ao validar FKs: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    return results;
  }

  async validateSchema(): Promise<SchemaValidationResult[]> {
    console.log('🗄️ Validando schema do banco de dados...\n');

    try {
      const results: SchemaValidationResult[] = [];

      let introspectionOk = false;
      try {
        // Tentar obter estrutura do banco (introspecção)
        await this.getTableSchema();
        introspectionOk = true;
      } catch (e) {
        results.push({
          table: 'db_introspection',
          status: 'warning',
          message: 'Introspecção do DB indisponível (executando em modo referência apenas)'
        });
      }

      if (introspectionOk) {
        // Validar tabelas essenciais
        const essentialResults = this.validateEssentialTables();
        results.push(...essentialResults);

        // Validar estrutura das tabelas
        const structureResults = this.validateTableStructure();
        results.push(...structureResults);

        // Validar chaves estrangeiras
        const fkResults = await this.validateForeignKeys();
        results.push(...fkResults);
      }

      // Comparar com referência de schema (read-only)
      const refResults = this.compareWithReference();
      results.push(...refResults);

      return results;

    } catch (error) {
      throw new Error(`Erro na validação do schema: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  generateReport(results: SchemaValidationResult[]): void {
    console.log('📊 RELATÓRIO DE VALIDAÇÃO DO SCHEMA');
    console.log('===================================');

    const total = results.length;
    const success = results.filter(r => r.status === 'success').length;
    const error = results.filter(r => r.status === 'error').length;
    const warning = results.filter(r => r.status === 'warning').length;

    console.log(`Total de validações: ${total}`);
    console.log(`✅ Sucessos: ${success}`);
    console.log(`❌ Erros: ${error}`);
    console.log(`⚠️  Avisos: ${warning}`);

    if (error > 0) {
      console.log('\n🚨 ERROS CRÍTICOS:');
      results
        .filter(r => r.status === 'error')
        .forEach(r => {
          console.log(`  • ${r.table}: ${r.message}`);
        });
    }

    if (warning > 0) {
      console.log('\n⚠️  AVISOS:');
      results
        .filter(r => r.status === 'warning')
        .forEach(r => {
          console.log(`  • ${r.table}: ${r.message}`);
        });
    }

    console.log('\n📋 ESTRUTURA DETALHADA:');
    for (const [tableName, columns] of this.tableColumns) {
      console.log(`\n${tableName}:`);
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' (NOT NULL)' : ''}`);
      });
    }
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SchemaValidator();
  validator.validateSchema()
    .then(results => {
      validator.generateReport(results);
      
      const hasErrors = results.some(r => r.status === 'error');
      if (hasErrors) {
        console.log('\n❌ Validação do schema FALHOU');
        process.exit(1);
      } else {
        console.log('\n✅ Validação do schema PASSOU');
      }
    })
    .catch(error => {
      console.error('❌ Erro fatal na validação:', error);
      process.exit(1);
    });
}

export { SchemaValidator };