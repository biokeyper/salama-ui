import { HealthLog, Report, ReportStorage } from '@/types/report';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'safegirls.db';
const MIGRATION_KEY = '@safegirls:migration_complete';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the SQLite database
 */
export async function initDatabase(): Promise<void> {
    // If already initializing, wait for it
    if (initPromise) {
        return initPromise;
    }

    // Start initialization
    initPromise = initDatabaseAsync();
    return initPromise;
}

/**
 * Wait for database to be initialized
 */
export async function waitForDatabaseInit(): Promise<void> {
    if (initPromise) {
        await initPromise;
    } else {
        throw new Error('Database initialization not started');
    }
}

/**
 * Actual database initialization logic
 */
async function initDatabaseAsync(): Promise<void> {
    try {
        db = await SQLite.openDatabaseAsync(DATABASE_NAME);

        // Create tables
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        audio_uri TEXT,
        audio_duration INTEGER,
        text_content TEXT,
        metadata TEXT,
        submitted_at TEXT,
        submission_id TEXT,
        submission_error TEXT,
        blockchain_status TEXT,
        confirmations INTEGER,
        tx_hash TEXT,
        ipfs_hash TEXT,
        is_archived BOOLEAN DEFAULT 0,
        archived_at TEXT,
        archived_reason TEXT
      );

      CREATE TABLE IF NOT EXISTS health_logs (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        flow TEXT,
        mood TEXT,
        pain TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
      CREATE INDEX IF NOT EXISTS idx_health_logs_date ON health_logs(date);
    `);

        console.log('Database initialized successfully');
        await runDatabaseMigrations();
        await migrateFromAsyncStorage();
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

/**
 * Run database migrations to update schema
 */
async function runDatabaseMigrations(): Promise<void> {
    try {
        const database = db;
        if (!database) return;

        console.log('Running database migrations...');

        // Migration 1: Add missing columns to reports table
        const columnDefinitions = [
            { name: 'blockchain_status', type: 'TEXT' },
            { name: 'confirmations', type: 'INTEGER' },
            { name: 'tx_hash', type: 'TEXT' },
            { name: 'ipfs_hash', type: 'TEXT' },
            { name: 'is_archived', type: 'BOOLEAN DEFAULT 0' },
            { name: 'archived_at', type: 'TEXT' },
            { name: 'archived_reason', type: 'TEXT' },
        ];

        for (const column of columnDefinitions) {
            try {
                await database.execAsync(
                    `ALTER TABLE reports ADD COLUMN ${column.name} ${column.type};`
                );
                console.log(`Added column: ${column.name}`);
            } catch (error: any) {
                // Column probably already exists, that's fine
                if (!error.message?.includes('duplicate column')) {
                    console.log(`Column ${column.name} already exists or skipped`);
                }
            }
        }

        console.log('Database migrations completed');
    } catch (error) {
        console.error('Error running migrations:', error);
        // Don't throw - migrations are optional
    }
}

/**
 * Migrate data from AsyncStorage to SQLite
 */
async function migrateFromAsyncStorage(): Promise<void> {
    try {
        // Check if migration already completed
        const migrationComplete = await AsyncStorage.getItem(MIGRATION_KEY);
        if (migrationComplete === 'true') {
            console.log('Migration already completed');
            return;
        }

        console.log('Starting migration from AsyncStorage...');

        // Read old data
        const data = await AsyncStorage.getItem('@safegirls:reports');
        if (!data) {
            console.log('No data to migrate');
            await AsyncStorage.setItem(MIGRATION_KEY, 'true');
            return;
        }

        const storage: ReportStorage = JSON.parse(data);

        // Migrate reports
        if (storage.reports && storage.reports.length > 0) {
            for (const report of storage.reports) {
                await insertReport(report);
            }
            console.log(`Migrated ${storage.reports.length} reports`);
        }

        // Migrate health logs
        if (storage.healthLogs && storage.healthLogs.length > 0) {
            for (const log of storage.healthLogs) {
                await insertHealthLog(log);
            }
            console.log(`Migrated ${storage.healthLogs.length} health logs`);
        }

        // Mark migration as complete
        await AsyncStorage.setItem(MIGRATION_KEY, 'true');
        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Error during migration:', error);
        throw error;
    }
}

/**
 * Get database instance
 */
function getDb(): SQLite.SQLiteDatabase {
    if (!db) {
        console.error('Database not initialized. Initialization status:', {
            initPromise: !!initPromise,
            db: !!db,
        });
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

// ============ REPORTS ============

/**
 * Insert a report into the database
 */
async function insertReport(report: Report): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `INSERT OR REPLACE INTO reports (
      id, type, status, created_at, updated_at, audio_uri, audio_duration,
      text_content, metadata, submitted_at, submission_id, submission_error,
      blockchain_status, confirmations, tx_hash, ipfs_hash, is_archived, archived_at, archived_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            report.id,
            report.type,
            report.status,
            report.createdAt,
            report.updatedAt,
            report.audioUri || null,
            report.audioDuration || null,
            report.textContent || null,
            report.metadata ? JSON.stringify(report.metadata) : null,
            report.submittedAt || null,
            report.submissionId || null,
            report.submissionError || null,
            report.blockchainStatus || null,
            report.confirmations || null,
            report.txHash || null,
            report.ipfsHash || null,
            report.isArchived ? 1 : 0,
            report.archivedAt || null,
            report.archivedReason || null,
        ]
    );
}

/**
 * Get all reports
 */
export async function dbGetAllReports(): Promise<Report[]> {
    try {
        const database = getDb();
        const result = await database.getAllAsync<any>('SELECT * FROM reports ORDER BY created_at DESC');
        return result ? result.map(rowToReport) : [];
    } catch (error) {
        console.error('Error fetching all reports:', error);
        throw error;
    }
}

/**
 * Get report by ID
 */
export async function dbGetReportById(id: string): Promise<Report | null> {
    try {
        const database = getDb();
        const result = await database.getFirstAsync<any>('SELECT * FROM reports WHERE id = ?', [id]);
        return result ? rowToReport(result) : null;
    } catch (error) {
        console.error('Error fetching report by ID:', error);
        throw error;
    }
}

/**
 * Save or update a report
 */
export async function dbSaveReport(report: Partial<Report>): Promise<Report> {
    const database = getDb();

    let finalReport: Report;
    if (report.id) {
        const existing = await dbGetReportById(report.id);
        if (existing) {
            finalReport = {
                ...existing,
                ...report,
                updatedAt: new Date().toISOString(),
            };
        } else {
            finalReport = {
                id: report.id,
                type: report.type || 'text',
                status: report.status || 'saved',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...report,
            } as Report;
        }
    } else {
        finalReport = {
            id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: report.type || 'text',
            status: report.status || 'saved',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...report,
        } as Report;
    }

    await insertReport(finalReport);
    return finalReport;
}

/**
 * Delete a report
 */
export async function dbDeleteReport(id: string): Promise<boolean> {
    try {
        const database = getDb();
        await database.runAsync('DELETE FROM reports WHERE id = ?', [id]);
        return true;
    } catch (error) {
        console.error('Error deleting report:', error);
        return false;
    }
}

/**
 * Delete all reports
 */
export async function dbDeleteAllReports(): Promise<boolean> {
    try {
        const database = getDb();
        await database.runAsync('DELETE FROM reports');
        return true;
    } catch (error) {
        console.error('Error deleting all reports:', error);
        return false;
    }
}

/**
 * Get reports by status
 */
export async function dbGetReportsByStatus(status: Report['status']): Promise<Report[]> {
    try {
        const database = getDb();
        const result = await database.getAllAsync<any>(
            'SELECT * FROM reports WHERE status = ? ORDER BY created_at DESC',
            [status]
        );
        return result ? result.map(rowToReport) : [];
    } catch (error) {
        console.error('Error fetching reports by status:', error);
        throw error;
    }
}

/**
 * Get reports by type
 */
export async function dbGetReportsByType(type: Report['type']): Promise<Report[]> {
    try {
        const database = getDb();
        const result = await database.getAllAsync<any>(
            'SELECT * FROM reports WHERE type = ? ORDER BY created_at DESC',
            [type]
        );
        return result ? result.map(rowToReport) : [];
    } catch (error) {
        console.error('Error fetching reports by type:', error);
        throw error;
    }
}

// ============ HEALTH LOGS ============

/**
 * Insert a health log into the database
 */
async function insertHealthLog(log: HealthLog): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `INSERT OR REPLACE INTO health_logs (
      id, date, flow, mood, pain, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            log.id,
            log.date,
            log.flow || null,
            log.mood || null,
            log.pain ? JSON.stringify(log.pain) : null,
            log.notes || null,
            log.createdAt,
            log.updatedAt,
        ]
    );
}

/**
 * Get all health logs
 */
export async function dbGetHealthLogs(): Promise<HealthLog[]> {
    try {
        const database = getDb();
        const result = await database.getAllAsync<any>('SELECT * FROM health_logs ORDER BY date DESC');
        return result ? result.map(rowToHealthLog) : [];
    } catch (error) {
        console.error('Error fetching health logs:', error);
        throw error;
    }
}

/**
 * Save or update a health log
 */
export async function dbSaveHealthLog(log: Partial<HealthLog>): Promise<HealthLog> {
    const database = getDb();

    let finalLog: HealthLog;
    if (log.id) {
        const existing = await database.getFirstAsync<any>(
            'SELECT * FROM health_logs WHERE id = ?',
            [log.id]
        );
        if (existing) {
            finalLog = {
                ...rowToHealthLog(existing),
                ...log,
                updatedAt: new Date().toISOString(),
            };
        } else {
            finalLog = {
                id: log.id,
                date: log.date || new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...log,
            } as HealthLog;
        }
    } else {
        finalLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            date: log.date || new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...log,
        } as HealthLog;
    }

    await insertHealthLog(finalLog);
    return finalLog;
}

/**
 * Delete a health log
 */
export async function dbDeleteHealthLog(id: string): Promise<boolean> {
    try {
        const database = getDb();
        await database.runAsync('DELETE FROM health_logs WHERE id = ?', [id]);
        return true;
    } catch (error) {
        console.error('Error deleting health log:', error);
        return false;
    }
}

/**
 * Delete all health logs
 */
export async function dbDeleteAllHealthLogs(): Promise<boolean> {
    try {
        const database = getDb();
        await database.runAsync('DELETE FROM health_logs');
        return true;
    } catch (error) {
        console.error('Error deleting all health logs:', error);
        return false;
    }
}

// ============ UTILITY FUNCTIONS ============

/**
 * Convert database row to Report object
 */
function rowToReport(row: any): Report {
    return {
        id: row.id,
        type: row.type,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        audioUri: row.audio_uri,
        audioDuration: row.audio_duration,
        textContent: row.text_content,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        submittedAt: row.submitted_at,
        submissionId: row.submission_id,
        submissionError: row.submission_error,
        blockchainStatus: row.blockchain_status,
        confirmations: row.confirmations,
        txHash: row.tx_hash,
        ipfsHash: row.ipfs_hash,
        isArchived: row.is_archived === 1,
        archivedAt: row.archived_at,
        archivedReason: row.archived_reason,
    };
}

/**
 * Convert database row to HealthLog object
 */
function rowToHealthLog(row: any): HealthLog {
    return {
        id: row.id,
        date: row.date,
        flow: row.flow,
        mood: row.mood,
        pain: row.pain ? JSON.parse(row.pain) : undefined,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
