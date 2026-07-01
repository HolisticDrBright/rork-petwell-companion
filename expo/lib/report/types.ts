/** Vet-ready report — the compiled data model rendered on-screen and to HTML. */

export interface ReportPet {
  name: string;
  species: string;
  breed: string;
  ageYears: number;
  sex: string;
  weightLb: number;
  photo: string;
  status: string;
  statusNote: string;
}

export interface ReportTriage {
  concernLabel: string;
  urgencyKey: string;
  urgencyLabel: string;
  confidence: string;
  causes: { name: string; note?: string }[];
  answers: { question: string; answer: string }[];
  summary: string | null;
}

export interface ReportScan {
  type: string;
  score: string | null;
  urgency: string | null;
  date: string;
  note: string | null;
}

export interface ReportTimelineItem {
  date: string;
  title: string;
  detail?: string;
  category: string;
  /** A photo is attached to this entry in the app (not embedded in the PDF). */
  hasPhoto?: boolean;
}

export interface ReportMedication {
  name: string;
  purpose?: string | null;
  status?: string | null;
}

export interface ReportData {
  generatedAt: string;
  pet: ReportPet;
  allergies: string[];
  conditions: string[];
  concernSummary: string | null;
  triage: ReportTriage | null;
  redFlagsPresent: string[];
  redFlagsAbsent: string[];
  scans: ReportScan[];
  foodChanges: ReportTimelineItem[];
  medications: ReportMedication[];
  timeline: ReportTimelineItem[];
  /** Factual last-7-days logging line, e.g. "8 entries · 2 with photos". */
  loggingSummary: string | null;
  questions: string[];
}
