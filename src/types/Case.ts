export type MediaType = 'image' | 'video' | 'audio';
export type CaseStatus = 'analyzing' | 'completed' | 'failed';
export type VerdictBand = 'manipulated' | 'authentic' | 'inconclusive';

export interface Case {
  id: string;
  mediaType: MediaType;
  status: CaseStatus;
  band?: VerdictBand;         // 'manipulated' | 'authentic' | 'inconclusive'
  needsReview?: boolean;      // true for 'inconclusive' cases awaiting human review
  confidence: number;
  submittedAt: string;
  completedAt?: string;
  faceScore?: number;
  voiceScore?: number;
  lipsyncScore?: number;
  verdict: string;
  caption?: string;           // model-generated description of what the media shows
  explanation?: string;       // grounded reason for the verdict (real numbers, no fabrication)
  mediaUrl?: string;
  heatmapUrl?: string;
}

export interface CaseDetails extends Case {
  workerId?: string;
  processingTimeMs?: number;
  metadata?: Record<string, any>;
}