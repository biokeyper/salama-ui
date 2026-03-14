/**
 * Report data model for storing incident reports
 */

export type ReportType = 'audio' | 'text' | 'mixed';

export type ReportStatus = 'draft' | 'saved' | 'pending' | 'submitted' | 'failed';

export interface Report {
  id: string;
  userId?: string; // User who created this report (for multi-user devices) - optional if not logged in
  type: ReportType;
  status: ReportStatus;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp

  // Audio report data
  audioUri?: string;
  audioDuration?: number; // in seconds

  // Text report data
  textContent?: string;

  // Metadata
  metadata?: {
    location?: string;
    timestamp?: string; // When the incident occurred
    tags?: string[];
    notes?: string;
  };

  // Backend submission
  submittedAt?: string; // ISO 8601 timestamp
  submissionId?: string; // ID from backend after successful submission
  submissionError?: string; // Error message if submission failed

  // Blockchain details
  confirmations?: number; // 0-12+
  txHash?: string; // Blockchain transaction hash
  ipfsHash?: string; // IPFS location
  audioIpfsHash?: string; // IPFS hash for audio file
  audioGatewayUrl?: string; // IPFS gateway URL for audio playback

  // Archive flag (soft delete for blockchain records)
  isArchived?: boolean;
  archivedAt?: string; // ISO 8601 timestamp
  archivedReason?: string; // Why archived
}

export interface ReportStorage {
  reports: Report[];
  healthLogs?: HealthLog[]; // New: Store health logs separately
  lastSyncAt?: string; // ISO 8601 timestamp
}

// Health Tracker Types
export type CycleFlow = 'light' | 'medium' | 'heavy' | 'spotting';
export type CycleMood = 'happy' | 'sad' | 'anxious' | 'angry' | 'neutral';
export type CyclePain = 'cramps' | 'headache' | 'backache' | 'nausea' | 'none';

export interface HealthLog {
  id: string;
  date: string; // YYYY-MM-DD
  flow?: CycleFlow;
  mood?: CycleMood;
  pain?: CyclePain[]; // Array of symptoms
  notes?: string; // The "secret" evidence field
  createdAt: string;
  updatedAt: string;
}


