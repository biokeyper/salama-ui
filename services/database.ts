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
        user_id TEXT,
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

        await runDatabaseMigrations();
        await migrateFromAsyncStorage();
    } catch (error) {
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

        // Note: Add migrations here as needed
        // Example:
        // const tableInfo = await database.getAllAsync("PRAGMA table_info(reports)");
        // if column exists, do migration
    } catch (error) {
    }
}

/**
 * Migrate data from AsyncStorage to SQLite (one-time migration)
 */
async function migrateFromAsyncStorage(): Promise<void> {
    try {
        // Check if already migrated
        const migrationComplete = await AsyncStorage.getItem(MIGRATION_KEY);
        if (migrationComplete === 'true') {
            return;
        }

        // Get old data from AsyncStorage if it exists
        const oldData = await AsyncStorage.getItem('safegirls_reports');
        if (oldData) {
            const storage: ReportStorage = JSON.parse(oldData);
            if (storage.reports && Array.isArray(storage.reports)) {
                for (const report of storage.reports) {
                    await dbSaveReport(report);
                }
            }
        }

        // Mark migration as complete
        await AsyncStorage.setItem(MIGRATION_KEY, 'true');
    } catch (error) {
    }
}

/**
 * Get database instance (for internal use)
 */
function getDb(): SQLite.SQLiteDatabase {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

/**
 * Delete all reports and health logs (for debugging/reset)
 */
export async function resetDatabase(): Promise<void> {
    try {
        const database = getDb();
        await database.execAsync(`
            DELETE FROM reports;
            DELETE FROM health_logs;
        `);
    } catch (error) {
        throw error;
    }
}

/**
 * Delete a specific report
 */
export async function dbDeleteReport(reportId: string): Promise<void> {
    try {
        const database = getDb();
        await database.runAsync('DELETE FROM reports WHERE id = ?', [reportId]);
    } catch (error) {
        throw error;
    }
}

/**
 * Get reports database (filtered by user if userId provided)
 */
export async function dbGetAllReports(userId?: string): Promise<Report[]> {
    try {
        const database = getDb();
        let result: any[];

        if (userId) {
            // If userId provided, filter by that user
            result = await database.getAllAsync<any>('SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        } else {
            // If no userId (not logged in), load all reports
            result = await database.getAllAsync<any>('SELECT * FROM reports WHERE user_id IS NULL ORDER BY created_at DESC');
        }
        return result ? result.map(rowToReport) : [];
    } catch (error) {
        throw error;
    }
}

/**
 * Get a single report by ID
 */
export async function dbGetReportById(reportId: string): Promise<Report | null> {
    try {
        const database = getDb();
        const result = await database.getFirstAsync<any>('SELECT * FROM reports WHERE id = ?', [reportId]);
        return result ? rowToReport(result) : null;
    } catch (error) {
        throw error;
    }
}

/**
 * Save or update a report
 */
export async function dbSaveReport(report: Report): Promise<void> {
    try {
        const database = getDb();

        // Check if report exists
        const existing = await dbGetReportById(report.id);

        if (existing) {
            // Update existing report
            await database.runAsync(
                `UPDATE reports SET
                    type = ?,
                    status = ?,
                    updated_at = ?,
                    audio_uri = ?,
                    audio_duration = ?,
                    text_content = ?,
                    metadata = ?,
                    submitted_at = ?,
                    submission_id = ?,
                    submission_error = ?,
                    confirmations = ?,
                    tx_hash = ?,
                    ipfs_hash = ?,
                    is_archived = ?,
                    archived_at = ?,
                    archived_reason = ?
                WHERE id = ?`,
                [
                    report.type,
                    report.status,
                    report.updatedAt,
                    report.audioUri || null,
                    report.audioDuration || null,
                    report.textContent || null,
                    report.metadata ? JSON.stringify(report.metadata) : null,
                    report.submittedAt || null,
                    report.submissionId || null,
                    report.submissionError || null,
                    report.confirmations || null,
                    report.txHash || null,
                    report.ipfsHash || null,
                    report.isArchived ? 1 : 0,
                    report.archivedAt || null,
                    report.archivedReason || null,
                    report.id,
                ]
            );
        } else {
            // Insert new report
            await database.runAsync(
                `INSERT INTO reports (
                    id, user_id, type, status, created_at, updated_at,
                    audio_uri, audio_duration, text_content, metadata,
                    submitted_at, submission_id, submission_error,
                    confirmations, tx_hash, ipfs_hash,
                    is_archived, archived_at, archived_reason
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    report.id,
                    report.userId,
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
                    report.confirmations || null,
                    report.txHash || null,
                    report.ipfsHash || null,
                    report.isArchived ? 1 : 0,
                    report.archivedAt || null,
                    report.archivedReason || null,
                ]
            );
        }
    } catch (error) {
        throw error;
    }
}

/**
 * Convert database row to Report object
 */
function rowToReport(row: any): Report {
    return {
        id: row.id,
        userId: row.user_id,
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

// Export wrapper functions to maintain existing API
export async function saveReport(report: Report): Promise<Report> {
    await waitForDatabaseInit();
    await dbSaveReport(report);
    return report;
}

export async function getReportById(reportId: string): Promise<Report | null> {
    await waitForDatabaseInit();
    return dbGetReportById(reportId);
}

export async function deleteReport(reportId: string): Promise<void> {
    await waitForDatabaseInit();
    await dbDeleteReport(reportId);
}

export async function getAllReports(userId?: string): Promise<Report[]> {
    await waitForDatabaseInit();
    return dbGetAllReports(userId);
}

export async function updateReportStatus(reportId: string, status: string, submissionId?: string, error?: string): Promise<void> {
    const report = await getReportById(reportId);
    if (report) {
        await saveReport({
            ...report,
            status: status as any,
            submissionId: submissionId || report.submissionId,
            submissionError: error || report.submissionError,
        });
    }
}

/**
 * Get reports by status (filtered by user)
 */
export async function dbGetReportsByStatus(userId: string, status: string): Promise<Report[]> {
    try {
        const database = getDb();
        const result = await database.getAllAsync<any>('SELECT * FROM reports WHERE user_id = ? AND status = ? ORDER BY created_at DESC', [userId, status]);
        return result ? result.map(rowToReport) : [];
    } catch (error) {
        throw error;
    }
}

/**
 * Get reports by type (filtered by user)
 */
export async function dbGetReportsByType(userId: string, type: string): Promise<Report[]> {
    try {
        const database = getDb();
        const result = await database.getAllAsync<any>('SELECT * FROM reports WHERE user_id = ? AND type = ? ORDER BY created_at DESC', [userId, type]);
        return result ? result.map(rowToReport) : [];
    } catch (error) {
        throw error;
    }
}

/**
 * Delete all reports
 */
export async function dbDeleteAllReports(): Promise<void> {
    try {
        const database = getDb();
        await database.runAsync('DELETE FROM reports');
    } catch (error) {
        throw error;
    }
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
        throw error;
    }
}

/**
 * Save or update a health log
 */
export async function dbSaveHealthLog(log: HealthLog): Promise<void> {
    try {
        const database = getDb();

        const existing = await database.getFirstAsync<any>('SELECT * FROM health_logs WHERE id = ?', [log.id]);

        if (existing) {
            await database.runAsync(
                `UPDATE health_logs SET
                    date = ?,
                    flow = ?,
                    mood = ?,
                    pain = ?,
                    notes = ?,
                    updated_at = ?
                WHERE id = ?`,
                [
                    log.date,
                    log.flow || null,
                    log.mood || null,
                    log.pain ? JSON.stringify(log.pain) : null,
                    log.notes || null,
                    log.updatedAt,
                    log.id,
                ]
            );
        } else {
            await database.runAsync(
                `INSERT INTO health_logs (
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
    } catch (error) {
        throw error;
    }
}

/**
 * Delete a health log
 */
export async function dbDeleteHealthLog(logId: string): Promise<void> {
    try {
        const database = getDb();
        await database.runAsync('DELETE FROM health_logs WHERE id = ?', [logId]);
    } catch (error) {
        throw error;
    }
}

/**
 * Delete all health logs
 */
export async function dbDeleteAllHealthLogs(): Promise<void> {
    try {
        const database = getDb();
        await database.runAsync('DELETE FROM health_logs');
    } catch (error) {
        throw error;
    }
}
