export type SupportedLanguage = 'en' | 'hi' | 'or' | 'bn' | 'ta';

export type TicketStatus =
  | 'warranty_failure'
  | 'under_audit'
  | 'rti_escalated'
  | 'verified_repaired';

export interface CityLocation {
  id: string;
  name: string;
  state: string;
  pinCode: string;
  lat: number;
  lng: number;
  label: string;
}

export interface EvidencePreset {
  id: string;
  label: string;
  shortLabel: string;
  imageUrl: string;
  description: string;
  sampleTicketId: string;
  hazardHint: string;
}

export interface AuditResultData {
  title: string;
  safetyScore: number;
  hazardCategory: string;
  engineeringFindings: string;
  immediateRisk: string;
  projectWorkId: string;
  contractorName: string;
  sanctionedAmount: string;
  sanctionedLakhs: number;
  completionDate: string;
  warrantyExpiryDate: string;
  dlpMonths: number;
  daysSinceCompletion: number;
  violationClause: string;
  departmentName: string;
  pioDesignation: string;
  pioOfficeAddress: string;
  appellateAuthority: string;
  statutorySlaDays: number;
  wardLabel: string;
  defectSummaryForLegal: string;
}

export interface ClosureAuditResult {
  verdict: 'APPROVED_REPAIR' | 'REJECTED_FAKE_CLOSURE';
  confidenceScore: number;
  landmarkMatch: boolean;
  geometryMatch: boolean;
  defectResolved: boolean;
  headline: string;
  detailedAnalysis: string;
  recommendedAction: string;
  checkedAt: string;
  afterImageUrl: string;
}

export interface CivicTicket {
  id: string;
  createdAt: string;
  city: string;
  state: string;
  pinCode: string;
  lat: number;
  lng: number;
  imageUrl: string;
  description: string;
  ignoredTicketId?: string;
  status: TicketStatus;
  upvotes: number;
  daysIgnored: number;
  audit: AuditResultData;
  closureAudit?: ClosureAuditResult;
}

export interface LanguagePack {
  code: SupportedLanguage;
  nativeLabel: string;
  speechLocale: string;
  brandSubtitle: string;
  searchPlaceholder: string;
  searchButton: string;
  leftPanelTitle: string;
  uploadLabel: string;
  uploadSubtext: string;
  presetsHeading: string;
  voicePlaceholder: string;
  voiceStart: string;
  voiceStop: string;
  ticketIdLabel: string;
  runAuditBtn: string;
  auditingBtn: string;
  step1Title: string;
  step2Title: string;
  step3Title: string;
  activeWarrantyBanner: string;
  mapTitle: string;
  confirmIssueBtn: string;
  massPetitionLabel: string;
  shareCardBtn: string;
  tabRti: string;
  tabDemand: string;
  tabClosure: string;
  bplLabel: string;
  listenBtn: string;
  stopAudioBtn: string;
  copyBtn: string;
  copiedBtn: string;
  downloadBtn: string;
  escalateRtiBtn: string;
  runClosureBtn: string;
  statusLabels: Record<TicketStatus, string>;
}
