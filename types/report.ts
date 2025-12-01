/**
 * Report data model for storing incident reports
 */

export type ReportType = 'audio' | 'text' | 'mixed';

export type ReportStatus = 'draft' | 'saved' | 'submitted' | 'failed';

export interface Report {
  id: string;
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
}

export interface ReportStorage {
  reports: Report[];
  lastSyncAt?: string; // ISO 8601 timestamp
}

