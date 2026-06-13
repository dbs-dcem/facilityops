import { API_BASE_URL, API_KEY } from '@/constants/api';
import type { CompletedRunRecord } from '@/types';

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
};

function serialize(run: CompletedRunRecord) {
  return {
    ...run,
    completedAt: run.completedAt.toISOString(),
    log: run.log.map(e => ({ ...e, ts: e.ts.toISOString() })),
  };
}

export async function syncRuns(runs: CompletedRunRecord[]): Promise<{ synced: number; skipped: number }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/runs/sync`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ runs: runs.map(serialize) }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => res.statusText)) || `HTTP ${res.status}`);
  return res.json();
}

export async function syncEscalations(runs: CompletedRunRecord[]): Promise<{ notified: number }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/escalations/sync`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ runs: runs.map(serialize) }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => res.statusText)) || `HTTP ${res.status}`);
  return res.json();
}

export async function resolveEscalation(
  runId: string,
  resolvedBy: string,
  notes?: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/escalations/${runId}/resolve`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ resolved_by: resolvedBy, notes }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => res.statusText)) || `HTTP ${res.status}`);
}
