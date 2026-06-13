export type SystemKey = 'power' | 'cooling' | 'fire' | 'env';
export type IntervalKey = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type StepKind = 'ack' | 'reading' | 'photo' | 'scan';
export type RunStatus = 'in_progress' | 'complete' | 'abandoned';
export type DueState = 'ok' | 'due' | 'overdue';

interface StepBase {
  id: string;
  procedureId: string;
  order: number;
  title: string;
  detail: string;
  hard: boolean;
}

export interface AckStep extends StepBase { kind: 'ack'; ackLabel: string; }
export interface ReadingStep extends StepBase { kind: 'reading'; unit: string; expectedRange: [number, number] | null; }
export interface PhotoStep extends StepBase { kind: 'photo'; }
export interface ScanStep extends StepBase { kind: 'scan'; expectedTag: string; }
export type Step = AckStep | ReadingStep | PhotoStep | ScanStep;

export interface Asset {
  id: string;
  name: string;
  system: SystemKey;
  location: string;
}

export interface Procedure {
  id: string;
  title: string;
  assetLabel: string;
  system: SystemKey;
  interval: IntervalKey;
  riskStatement: string;
  version: number;
  steps: Step[];
}

export interface Run {
  id: string;
  procedureId: string;
  techId: string;
  startedAt: Date;
  completedAt: Date | null;
  status: RunStatus;
}

// append-only — enforced server-side in Phase 1 backend
export interface RunEntry {
  stepId: string;
  stepTitle: string;
  kind: StepKind;
  value: string;
  flagged: boolean;
  ts: Date;
}

export interface DueStatus {
  state: DueState;
  remaining: number;
}
