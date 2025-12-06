import initSqlJs, { Database } from 'sql.js';
import { DATABASE_PATH, APP_DATA_DIR } from '../../shared/constants';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure data directory exists
    if (!fs.existsSync(APP_DATA_DIR)) {
      fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    }

    const SQL = await initSqlJs();

    // Load existing database or create new
    if (fs.existsSync(DATABASE_PATH)) {
      const buffer = fs.readFileSync(DATABASE_PATH);
      this.db = new SQL.Database(buffer);
      logger.info('Database loaded', { path: DATABASE_PATH });
    } else {
      this.db = new SQL.Database();
      logger.info('New database created');
    }

    this.db.run('PRAGMA foreign_keys = ON');
    
    await this.runMigrations();
    this.initialized = true;
    logger.info('Database initialized');
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const migrationsDir = path.join(__dirname, '../../../migrations');
    
    // Create schema_migrations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get applied migrations
    const applied = this.db.exec('SELECT version FROM schema_migrations ORDER BY version');
    const appliedVersions = new Set(
      applied[0]?.values.map((row: any) => row[0] as number) || []
    );

    // Find migration files
    if (!fs.existsSync(migrationsDir)) {
      logger.warn('Migrations directory not found', { path: migrationsDir });
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const version = parseInt(file.split('_')[0]);
      
      if (appliedVersions.has(version)) {
        continue;
      }

      logger.info('Running migration', { version, file });
      
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      
      try {
        // sql.js uses exec() for running SQL statements
        this.db.exec(sql);
        this.db.exec(`INSERT INTO schema_migrations (version) VALUES (${version})`);
        this.save(); // Persist after each migration
        logger.info('Migration completed', { version });
      } catch (error) {
        logger.error('Migration failed', { version, error });
        throw error;
      }
    }
  }

  public getDatabase(): Database {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  public save(): void {
    if (!this.db) return;
    const data = this.db.export();
    fs.writeFileSync(DATABASE_PATH, data);
  }

  public close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      logger.info('Database connection closed');
    }
  }

  public vacuum(): void {
    if (!this.db) return;
    logger.info('Running VACUUM');
    this.db.run('VACUUM');
    this.db.run('ANALYZE');
    this.save();
    logger.info('VACUUM completed');
  }

  public backup(backupPath: string): void {
    if (!this.db) return;
    logger.info('Creating backup', { path: backupPath });
    const data = this.db.export();
    fs.writeFileSync(backupPath, data);
    logger.info('Backup completed');
  }
}

export default DatabaseService.getInstance();
