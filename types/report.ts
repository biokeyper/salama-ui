export type ReportType = "audio" | "text" | "mixed";

export type ReportStatus =
  | "draft"
  | "saved"
  | "pending"
  | "submitted"
  | "failed";

export interface Report {
  id: string;
  userId?: string; 
  type: ReportType;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;

  audioUri?: string;
  audioDuration?: number; 

  textContent?: string;

  metadata?: {
    location?: string;
    timestamp?: string; 
    tags?: string[];
    notes?: string;
  };

  submittedAt?: string;
  submissionId?: string; 
  submissionError?: string;

  confirmations?: number; // 0-12+
  txHash?: string; // Blockchain transaction hash
  ipfsHash?: string; // IPFS location
  audioIpfsHash?: string; // IPFS hash for audio file
  audioGatewayUrl?: string; // IPFS gateway URL for audio playback

  // Archive flag (soft delete for blockchain records)
  isArchived?: boolean;
  archivedAt?: string;
  archivedReason?: string; 
}

export interface ReportStorage {
  reports: Report[];
  healthLogs?: HealthLog[];
  lastSyncAt?: string;
}

export type CycleFlow = "light" | "medium" | "heavy" | "spotting";
export type CycleMood = "happy" | "sad" | "anxious" | "angry" | "neutral";
export type CyclePain = "cramps" | "headache" | "backache" | "nausea" | "none";

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
