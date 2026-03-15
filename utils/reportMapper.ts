/**
 * Report Mapper
 * Maps local Report objects to backend format
 */

import { Report } from "../types/report";

export function mapReportToResponses(report: Report): string[] {
  const responses: string[] = [];

  if (report.textContent) {
    const chunks = chunkString(report.textContent, 1000);
    responses.push(...chunks);
  }

  if (report.audioUri) {
    const durationSeconds = report.audioDuration
      ? Math.round(report.audioDuration / 1000)
      : 0;
    responses.push(`Audio recording: ${durationSeconds} seconds`);
  }

  if (report.metadata?.notes) {
    responses.push(report.metadata.notes);
  }

  if (report.metadata?.location) {
    responses.push(`Location: ${report.metadata.location}`);
  }

  if (report.metadata?.timestamp) {
    responses.push(`When: ${report.metadata.timestamp}`);
  }

  return responses;
}

function chunkString(str: string, maxLength: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += maxLength) {
    chunks.push(str.substring(i, i + maxLength));
  }
  return chunks;
}

/**
 * Prepare report metadata for backend submission
 * Maps local report metadata to backend expected format
 */
export function prepareReportMetadata(report: Report) {
  return {
    location: report.metadata?.location || "Unknown",
    timestamp: report.metadata?.timestamp || report.createdAt,
    ...(report.audioDuration && { audioDuration: report.audioDuration }),
    ...(report.audioUri && { hasAudio: true }),
  };
}
