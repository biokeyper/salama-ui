import { HealthLog } from "@/types/report";

// Expanded keyword list for aggressive detection
const ABUSE_KEYWORDS = [
  // Violence
  "hit",
  "slap",
  "punch",
  "kick",
  "beat",
  "attack",
  "violence",
  "violent",
  // Force/Control
  "forced",
  "made me",
  "wouldn't let",
  "won't let",
  "trapped",
  "locked",
  "grabbed",
  "pushed",
  "shoved",
  "held down",
  "pinned",
  // Threats
  "threatened",
  "threat",
  "gonna hurt",
  "will hurt",
  "warning",
  "warned",
  // Emotional
  "scared",
  "afraid",
  "terrified",
  "fear",
  "unsafe",
  "danger",
  "dangerous",
  // Injury (non-menstrual context)
  "bruise",
  "bruised",
  "injury",
  "injured",
  "hurt",
  "sore",
  "swollen",
  // Coercion
  "no choice",
  "had to",
  "make me",
  "makes me",
  "against my will",
  // Control patterns
  "controlling",
  "controls",
  "manipulate",
  "screaming",
  "yelling",
  "threw",
  "breaking things",
  "broke",
];

/**
 * Checks if a health log entry indicates potential abuse
 * Uses aggressive detection criteria
 */
export function shouldCreateAbuseReport(log: HealthLog): boolean {
  // Criterion 1: Any severe pain + any negative mood
  const hasSeverePain = log.pain && log.pain.length > 0;
  const negativeMoods = ["anxious", "sad", "angry"];
  const hasNegativeMood =
    !!log.mood && negativeMoods.includes(log.mood.toLowerCase());

  if (hasSeverePain && hasNegativeMood) {
    return true;
  }

  // Criterion 2: Multiple pain types (2+)
  if (log.pain && log.pain.length >= 2) {
    return true;
  }

  // Criterion 3: Keyword detection in notes (case-insensitive)
  if (log.notes) {
    const notesLower = log.notes.toLowerCase();
    const foundKeyword = ABUSE_KEYWORDS.some((keyword) =>
      notesLower.includes(keyword.toLowerCase()),
    );

    if (foundKeyword) {
      return true;
    }
  }

  return false;
}

/**
 * Generates a formatted text report from a health log entry
 * that triggered abuse detection
 */
export function generateAbuseReportText(log: HealthLog): string {
  const date = new Date(log.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let report = `Entry Date: ${date}\n\n`;
  report += `Indicators Detected:\n`;

  if (log.flow) {
    report += `- Flow: ${log.flow}\n`;
  }

  if (log.pain && log.pain.length > 0) {
    report += `- Pain: ${log.pain.join(", ")}\n`;
  }

  if (log.mood) {
    report += `- Mood: ${log.mood}\n`;
  }

  if (log.notes) {
    report += `\nNotes:\n${log.notes}\n`;
  }

  report += `\n---\nThis entry was automatically flagged based on indicators that may suggest an unsafe situation. This is stored privately and securely on your device.`;

  return report;
}
