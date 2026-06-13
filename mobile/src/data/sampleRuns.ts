import type { CompletedRunRecord, RunEntry } from '../types';

// Pre-seeded run history for demonstration and testing.
// Simulates ~6 months of PM activity across multiple technicians.

function d(daysAgo: number, hour = 9, minute = 0): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  dt.setHours(hour, minute, 0, 0);
  return dt;
}

function ts(base: Date, minsBefore: number): Date {
  return new Date(base.getTime() - minsBefore * 60_000);
}

type E = Omit<RunEntry, 'ts'> & { min: number };

function run(
  procedureId: string,
  procedureTitle: string,
  daysAgo: number,
  durationMins: number,
  techName: string,
  entries: E[],
  hour = 9,
  minute = 0,
): CompletedRunRecord {
  const completedAt = d(daysAgo, hour, minute);
  const log: RunEntry[] = entries.map(e => ({
    stepId: e.stepId, stepTitle: e.stepTitle, kind: e.kind,
    value: e.value, flagged: e.flagged, ts: ts(completedAt, e.min),
  }));
  return {
    id: `${procedureId}-s${daysAgo}`,
    procedureId, procedureTitle, completedAt, durationMins,
    flaggedCount: log.filter(e => e.flagged).length,
    log, techName,
  };
}

export const SAMPLE_RUNS: CompletedRunRecord[] = [

  // ── Today / very recent ──────────────────────────────────────────────────────

  run('PM-ENV-DAILY', 'Temp & Humidity Walk — Hot/Cold Aisles', 0, 7, 'J. Ramirez', [
    { stepId: 'PM-ENV-DAILY-0', stepTitle: 'Begin environmental walk',  kind: 'ack',     value: 'Ready to begin',   flagged: false, min: 7 },
    { stepId: 'PM-ENV-DAILY-1', stepTitle: 'Cold-aisle supply temp',    kind: 'reading', value: '71.2 °F',          flagged: false, min: 5 },
    { stepId: 'PM-ENV-DAILY-2', stepTitle: 'Hot-aisle return temp',     kind: 'reading', value: '89.4 °F',          flagged: false, min: 3 },
    { stepId: 'PM-ENV-DAILY-3', stepTitle: 'Relative humidity',         kind: 'reading', value: '49 %',             flagged: false, min: 2 },
    { stepId: 'PM-ENV-DAILY-4', stepTitle: 'Note anomalies',            kind: 'ack',     value: 'Walk complete',    flagged: false, min: 0 },
  ], 7, 55),

  run('PM-PWR-UPS-DAILY', 'UPS Status & Alarm Check', 1, 9, 'A. Singh', [
    { stepId: 'PM-PWR-UPS-DAILY-0', stepTitle: 'Confirm UPS-A',            kind: 'scan',    value: 'tag UPS-A verified', flagged: false, min: 9 },
    { stepId: 'PM-PWR-UPS-DAILY-1', stepTitle: 'Check display for alarms', kind: 'ack',     value: 'No active alarms',   flagged: false, min: 7 },
    { stepId: 'PM-PWR-UPS-DAILY-2', stepTitle: 'Battery string voltage',   kind: 'reading', value: '456 V',              flagged: false, min: 5 },
    { stepId: 'PM-PWR-UPS-DAILY-3', stepTitle: 'Output load',              kind: 'reading', value: '44 %',               flagged: false, min: 2 },
    { stepId: 'PM-PWR-UPS-DAILY-4', stepTitle: 'Log status',               kind: 'ack',     value: 'Status logged',      flagged: false, min: 0 },
  ], 8, 30),

  // ── Flagged: battery voltage below minimum ───────────────────────────────────
  run('PM-PWR-UPS-DAILY', 'UPS Status & Alarm Check', 2, 11, 'J. Ramirez', [
    { stepId: 'PM-PWR-UPS-DAILY-0', stepTitle: 'Confirm UPS-A',            kind: 'scan',    value: 'tag UPS-A verified', flagged: false, min: 11 },
    { stepId: 'PM-PWR-UPS-DAILY-1', stepTitle: 'Check display for alarms', kind: 'ack',     value: 'No active alarms',   flagged: false, min: 9 },
    { stepId: 'PM-PWR-UPS-DAILY-2', stepTitle: 'Battery string voltage',   kind: 'reading', value: '428 V',              flagged: true,  min: 6 },
    { stepId: 'PM-PWR-UPS-DAILY-3', stepTitle: 'Output load',              kind: 'reading', value: '65 %',               flagged: false, min: 2 },
    { stepId: 'PM-PWR-UPS-DAILY-4', stepTitle: 'Log status',               kind: 'ack',     value: 'Status logged',      flagged: false, min: 0 },
  ], 9, 14),

  run('PM-ENV-DAILY', 'Temp & Humidity Walk — Hot/Cold Aisles', 5, 8, 'D. Chen', [
    { stepId: 'PM-ENV-DAILY-0', stepTitle: 'Begin environmental walk',  kind: 'ack',     value: 'Ready to begin',   flagged: false, min: 8 },
    { stepId: 'PM-ENV-DAILY-1', stepTitle: 'Cold-aisle supply temp',    kind: 'reading', value: '69.8 °F',          flagged: false, min: 6 },
    { stepId: 'PM-ENV-DAILY-2', stepTitle: 'Hot-aisle return temp',     kind: 'reading', value: '91.1 °F',          flagged: false, min: 4 },
    { stepId: 'PM-ENV-DAILY-3', stepTitle: 'Relative humidity',         kind: 'reading', value: '52 %',             flagged: false, min: 2 },
    { stepId: 'PM-ENV-DAILY-4', stepTitle: 'Note anomalies',            kind: 'ack',     value: 'Walk complete',    flagged: false, min: 0 },
  ], 7, 30),

  // ── Generator — weekly ───────────────────────────────────────────────────────
  run('PM-PWR-GEN-WEEKLY', 'Generator Inspection — No-Load', 6, 18, 'M. Okafor', [
    { stepId: 'PM-PWR-GEN-WEEKLY-0', stepTitle: 'Confirm GEN-1',             kind: 'scan',    value: 'tag GEN-1 verified',  flagged: false, min: 18 },
    { stepId: 'PM-PWR-GEN-WEEKLY-1', stepTitle: 'Verify exhaust path clear', kind: 'ack',     value: 'Exhaust path clear',  flagged: false, min: 15 },
    { stepId: 'PM-PWR-GEN-WEEKLY-2', stepTitle: 'Fuel level',                kind: 'reading', value: '87 %',                flagged: false, min: 11 },
    { stepId: 'PM-PWR-GEN-WEEKLY-3', stepTitle: 'Coolant temperature',       kind: 'reading', value: '72 °F',               flagged: false, min: 8 },
    { stepId: 'PM-PWR-GEN-WEEKLY-4', stepTitle: 'Photo of control panel',    kind: 'photo',   value: '1 image captured',    flagged: false, min: 5 },
    { stepId: 'PM-PWR-GEN-WEEKLY-5', stepTitle: 'Confirm normal shutdown',   kind: 'ack',     value: 'Returned to standby', flagged: false, min: 0 },
  ], 10, 0),

  // ── Flagged: fuel level low ──────────────────────────────────────────────────
  run('PM-PWR-GEN-WEEKLY', 'Generator Inspection — No-Load', 13, 20, 'A. Singh', [
    { stepId: 'PM-PWR-GEN-WEEKLY-0', stepTitle: 'Confirm GEN-1',             kind: 'scan',    value: 'tag GEN-1 verified',  flagged: false, min: 20 },
    { stepId: 'PM-PWR-GEN-WEEKLY-1', stepTitle: 'Verify exhaust path clear', kind: 'ack',     value: 'Exhaust path clear',  flagged: false, min: 17 },
    { stepId: 'PM-PWR-GEN-WEEKLY-2', stepTitle: 'Fuel level',                kind: 'reading', value: '44 %',                flagged: true,  min: 13 },
    { stepId: 'PM-PWR-GEN-WEEKLY-3', stepTitle: 'Coolant temperature',       kind: 'reading', value: '68 °F',               flagged: false, min: 9 },
    { stepId: 'PM-PWR-GEN-WEEKLY-4', stepTitle: 'Photo of control panel',    kind: 'photo',   value: '1 image captured',    flagged: false, min: 4 },
    { stepId: 'PM-PWR-GEN-WEEKLY-5', stepTitle: 'Confirm normal shutdown',   kind: 'ack',     value: 'Returned to standby', flagged: false, min: 0 },
  ], 10, 45),

  run('PM-ENV-DAILY', 'Temp & Humidity Walk — Hot/Cold Aisles', 14, 7, 'A. Singh', [
    { stepId: 'PM-ENV-DAILY-0', stepTitle: 'Begin environmental walk',  kind: 'ack',     value: 'Ready to begin',   flagged: false, min: 7 },
    { stepId: 'PM-ENV-DAILY-1', stepTitle: 'Cold-aisle supply temp',    kind: 'reading', value: '70.4 °F',          flagged: false, min: 5 },
    { stepId: 'PM-ENV-DAILY-2', stepTitle: 'Hot-aisle return temp',     kind: 'reading', value: '88.7 °F',          flagged: false, min: 3 },
    { stepId: 'PM-ENV-DAILY-3', stepTitle: 'Relative humidity',         kind: 'reading', value: '47 %',             flagged: false, min: 2 },
    { stepId: 'PM-ENV-DAILY-4', stepTitle: 'Note anomalies',            kind: 'ack',     value: 'Walk complete',    flagged: false, min: 0 },
  ], 7, 55),

  // ── CRAC filter monthly ──────────────────────────────────────────────────────
  run('PM-COOL-CRAC-MONTHLY', 'CRAC-3 Filter & Airflow Verification', 21, 35, 'D. Chen', [
    { stepId: 'PM-COOL-CRAC-MONTHLY-0', stepTitle: 'Verify work authorization', kind: 'ack',     value: 'Authorization confirmed',       flagged: false, min: 35 },
    { stepId: 'PM-COOL-CRAC-MONTHLY-1', stepTitle: 'Confirm correct unit',       kind: 'scan',    value: 'tag CRAC-3 verified',           flagged: false, min: 32 },
    { stepId: 'PM-COOL-CRAC-MONTHLY-2', stepTitle: 'Return-air temp (pre)',      kind: 'reading', value: '74 °F',                         flagged: false, min: 28 },
    { stepId: 'PM-COOL-CRAC-MONTHLY-3', stepTitle: 'Inspect filter condition',   kind: 'ack',     value: 'Filters inspected',             flagged: false, min: 24 },
    { stepId: 'PM-COOL-CRAC-MONTHLY-4', stepTitle: 'Capture filter condition',   kind: 'photo',   value: '1 image captured',              flagged: false, min: 20 },
    { stepId: 'PM-COOL-CRAC-MONTHLY-5', stepTitle: 'Replace filters',            kind: 'ack',     value: 'Filters replaced & seated',     flagged: false, min: 12 },
    { stepId: 'PM-COOL-CRAC-MONTHLY-6', stepTitle: 'Return-air temp (post)',     kind: 'reading', value: '72 °F',                         flagged: false, min: 5 },
    { stepId: 'PM-COOL-CRAC-MONTHLY-7', stepTitle: 'Confirm normal operation',   kind: 'ack',     value: 'Unit nominal — work complete',  flagged: false, min: 0 },
  ], 14, 0),

  // ── Flagged: PDU phase C over limit ─────────────────────────────────────────
  run('PM-PWR-PDU-MONTHLY', 'PDU Voltage & Phase Balance', 22, 14, 'J. Ramirez', [
    { stepId: 'PM-PWR-PDU-MONTHLY-0', stepTitle: 'Confirm PDU-B4',    kind: 'scan',    value: 'tag PDU-B4 verified', flagged: false, min: 14 },
    { stepId: 'PM-PWR-PDU-MONTHLY-1', stepTitle: 'Phase A current',   kind: 'reading', value: '68 A',                flagged: false, min: 10 },
    { stepId: 'PM-PWR-PDU-MONTHLY-2', stepTitle: 'Phase B current',   kind: 'reading', value: '71 A',                flagged: false, min: 7 },
    { stepId: 'PM-PWR-PDU-MONTHLY-3', stepTitle: 'Phase C current',   kind: 'reading', value: '98 A',                flagged: true,  min: 4 },
    { stepId: 'PM-PWR-PDU-MONTHLY-4', stepTitle: 'Assess balance',    kind: 'ack',     value: 'Balance assessed',    flagged: false, min: 0 },
  ], 13, 30),

  run('PM-FIRE-MONTHLY', 'Fire Suppression — Cylinder & Detector Check', 29, 22, 'R. Patel', [
    { stepId: 'PM-FIRE-MONTHLY-0', stepTitle: 'Place panel in test mode',  kind: 'ack',     value: 'Panel in test mode',    flagged: false, min: 22 },
    { stepId: 'PM-FIRE-MONTHLY-1', stepTitle: 'Agent cylinder pressure',   kind: 'reading', value: '418 psi',               flagged: false, min: 16 },
    { stepId: 'PM-FIRE-MONTHLY-2', stepTitle: 'Detector functional check', kind: 'ack',     value: 'Detectors verified',    flagged: false, min: 10 },
    { stepId: 'PM-FIRE-MONTHLY-3', stepTitle: 'Photo of cylinder gauge',   kind: 'photo',   value: '1 image captured',      flagged: false, min: 5 },
    { stepId: 'PM-FIRE-MONTHLY-4', stepTitle: 'Restore panel to normal',   kind: 'ack',     value: 'Panel restored & armed',flagged: false, min: 0 },
  ], 9, 0),

  // ── New procedures sample runs ────────────────────────────────────────────────

  run('PM-PWR-ATS-MONTHLY', 'Automatic Transfer Switch Monthly Test', 34, 45, 'R. Patel', [
    { stepId: 'PM-PWR-ATS-MONTHLY-0', stepTitle: 'Confirm ATS-1',                      kind: 'scan',    value: 'tag ATS-1 verified',      flagged: false, min: 45 },
    { stepId: 'PM-PWR-ATS-MONTHLY-1', stepTitle: 'Verify ATS is in auto mode',         kind: 'ack',     value: 'ATS in auto mode',         flagged: false, min: 40 },
    { stepId: 'PM-PWR-ATS-MONTHLY-2', stepTitle: 'Notify operations manager',          kind: 'ack',     value: 'Manager notified',         flagged: false, min: 36 },
    { stepId: 'PM-PWR-ATS-MONTHLY-3', stepTitle: 'Initiate simulated utility failure', kind: 'ack',     value: 'Transfer initiated',       flagged: false, min: 30 },
    { stepId: 'PM-PWR-ATS-MONTHLY-4', stepTitle: 'Transfer time',                      kind: 'reading', value: '8 s',                      flagged: false, min: 25 },
    { stepId: 'PM-PWR-ATS-MONTHLY-5', stepTitle: 'Confirm generator assumed load',     kind: 'ack',     value: 'Gen load confirmed',       flagged: false, min: 20 },
    { stepId: 'PM-PWR-ATS-MONTHLY-6', stepTitle: 'Initiate retransfer to utility',     kind: 'ack',     value: 'Retransfer complete',      flagged: false, min: 10 },
    { stepId: 'PM-PWR-ATS-MONTHLY-7', stepTitle: 'Capture ATS control panel',          kind: 'photo',   value: '1 image captured',         flagged: false, min: 5 },
    { stepId: 'PM-PWR-ATS-MONTHLY-8', stepTitle: 'Confirm ATS returned to auto',       kind: 'ack',     value: 'ATS normal — test complete',flagged: false, min: 0 },
  ], 10, 0),

  run('PM-FIRE-PANEL-MONTHLY', 'Fire Detection Panel Monthly Test', 26, 28, 'M. Okafor', [
    { stepId: 'PM-FIRE-PANEL-MONTHLY-0', stepTitle: 'Notify central monitoring station', kind: 'ack',     value: 'Station notified — test mode',    flagged: false, min: 28 },
    { stepId: 'PM-FIRE-PANEL-MONTHLY-1', stepTitle: 'Place FACP in test mode',           kind: 'ack',     value: 'Panel in test mode',              flagged: false, min: 24 },
    { stepId: 'PM-FIRE-PANEL-MONTHLY-2', stepTitle: 'Test each detector zone',           kind: 'ack',     value: 'All zones verified',              flagged: false, min: 18 },
    { stepId: 'PM-FIRE-PANEL-MONTHLY-3', stepTitle: 'Test audible/visual devices',       kind: 'ack',     value: 'Notification devices verified',   flagged: false, min: 12 },
    { stepId: 'PM-FIRE-PANEL-MONTHLY-4', stepTitle: 'Panel battery voltage',             kind: 'reading', value: '26.1 V',                          flagged: false, min: 8 },
    { stepId: 'PM-FIRE-PANEL-MONTHLY-5', stepTitle: 'Capture panel status',              kind: 'photo',   value: '1 image captured',                flagged: false, min: 5 },
    { stepId: 'PM-FIRE-PANEL-MONTHLY-6', stepTitle: 'Restore panel to normal',           kind: 'ack',     value: 'Panel restored & armed',          flagged: false, min: 2 },
    { stepId: 'PM-FIRE-PANEL-MONTHLY-7', stepTitle: 'Notify monitoring station — clear', kind: 'ack',     value: 'Station cleared — test closed',   flagged: false, min: 0 },
  ], 9, 30),

  // ── Older runs ───────────────────────────────────────────────────────────────

  // Flagged: humidity spike
  run('PM-ENV-DAILY', 'Temp & Humidity Walk — Hot/Cold Aisles', 31, 8, 'M. Okafor', [
    { stepId: 'PM-ENV-DAILY-0', stepTitle: 'Begin environmental walk',  kind: 'ack',     value: 'Ready to begin',   flagged: false, min: 8 },
    { stepId: 'PM-ENV-DAILY-1', stepTitle: 'Cold-aisle supply temp',    kind: 'reading', value: '70.1 °F',          flagged: false, min: 6 },
    { stepId: 'PM-ENV-DAILY-2', stepTitle: 'Hot-aisle return temp',     kind: 'reading', value: '90.2 °F',          flagged: false, min: 4 },
    { stepId: 'PM-ENV-DAILY-3', stepTitle: 'Relative humidity',         kind: 'reading', value: '61 %',             flagged: true,  min: 2 },
    { stepId: 'PM-ENV-DAILY-4', stepTitle: 'Note anomalies',            kind: 'ack',     value: 'Walk complete',    flagged: false, min: 0 },
  ], 7, 45),

  run('PM-PWR-GEN-WEEKLY', 'Generator Inspection — No-Load', 27, 19, 'M. Okafor', [
    { stepId: 'PM-PWR-GEN-WEEKLY-0', stepTitle: 'Confirm GEN-1',             kind: 'scan',    value: 'tag GEN-1 verified',  flagged: false, min: 19 },
    { stepId: 'PM-PWR-GEN-WEEKLY-1', stepTitle: 'Verify exhaust path clear', kind: 'ack',     value: 'Exhaust path clear',  flagged: false, min: 15 },
    { stepId: 'PM-PWR-GEN-WEEKLY-2', stepTitle: 'Fuel level',                kind: 'reading', value: '82 %',                flagged: false, min: 11 },
    { stepId: 'PM-PWR-GEN-WEEKLY-3', stepTitle: 'Coolant temperature',       kind: 'reading', value: '71 °F',               flagged: false, min: 7 },
    { stepId: 'PM-PWR-GEN-WEEKLY-4', stepTitle: 'Photo of control panel',    kind: 'photo',   value: '1 image captured',    flagged: false, min: 4 },
    { stepId: 'PM-PWR-GEN-WEEKLY-5', stepTitle: 'Confirm normal shutdown',   kind: 'ack',     value: 'Returned to standby', flagged: false, min: 0 },
  ], 10, 30),

  run('PM-COOL-CRAC-MONTHLY', 'CRAC-3 Filter & Airflow Verification', 55, 38, 'A. Singh', [
    { stepId: 'PM-COOL-CRAC-MONTHLY-0', stepTitle: 'Verify work authorization', kind: 'ack',     value: 'Authorization confirmed',      flagged: false, min: 38 },
    { stepId: 'PM-COOL-CRAC-MONTHLY-1', stepTitle: 'Confirm correct unit',       kind: 'scan',    value: 'tag CRAC-3 verified',          flagged: false, min: 35 },
    { stepId: 'PM-COOL-CRAC-MONTHLY-2', stepTitle: 'Return-air temp (pre)',      kind: 'reading', value: '76 °F',                        flagged: false, min: 30 },
    { stepId: 'PM-COOL-CRAC-MONTHLY-3', stepTitle: 'Inspect filter condition',   kind: 'ack',     value: 'Filters inspected',            flagged: false, min: 25 },
    { stepId: 'PM-COOL-CRAC-MONTHLY-4', stepTitle: 'Capture filter condition',   kind: 'photo',   value: '1 image captured',             flagged: false, min: 20 },
    { stepId: 'PM-COOL-CRAC-MONTHLY-5', stepTitle: 'Replace filters',            kind: 'ack',     value: 'Filters replaced & seated',    flagged: false, min: 10 },
    { stepId: 'PM-COOL-CRAC-MONTHLY-6', stepTitle: 'Return-air temp (post)',     kind: 'reading', value: '73 °F',                        flagged: false, min: 4 },
    { stepId: 'PM-COOL-CRAC-MONTHLY-7', stepTitle: 'Confirm normal operation',   kind: 'ack',     value: 'Unit nominal — work complete', flagged: false, min: 0 },
  ], 14, 0),

  // Flagged: fire suppression cylinder pressure slightly low
  run('PM-FIRE-MONTHLY', 'Fire Suppression — Cylinder & Detector Check', 61, 24, 'R. Patel', [
    { stepId: 'PM-FIRE-MONTHLY-0', stepTitle: 'Place panel in test mode',  kind: 'ack',     value: 'Panel in test mode',     flagged: false, min: 24 },
    { stepId: 'PM-FIRE-MONTHLY-1', stepTitle: 'Agent cylinder pressure',   kind: 'reading', value: '345 psi',                flagged: true,  min: 17 },
    { stepId: 'PM-FIRE-MONTHLY-2', stepTitle: 'Detector functional check', kind: 'ack',     value: 'Detectors verified',     flagged: false, min: 10 },
    { stepId: 'PM-FIRE-MONTHLY-3', stepTitle: 'Photo of cylinder gauge',   kind: 'photo',   value: '1 image captured',       flagged: false, min: 5 },
    { stepId: 'PM-FIRE-MONTHLY-4', stepTitle: 'Restore panel to normal',   kind: 'ack',     value: 'Panel restored & armed', flagged: false, min: 0 },
  ], 9, 15),

  run('PM-COOL-CRAC-QTR', 'CRAC Coil Cleaning & Sensor Calibration', 62, 55, 'D. Chen', [
    { stepId: 'PM-COOL-CRAC-QTR-0', stepTitle: 'Confirm redundancy maintained', kind: 'ack',     value: 'N+1 maintained',      flagged: false, min: 55 },
    { stepId: 'PM-COOL-CRAC-QTR-1', stepTitle: 'Confirm unit under service',    kind: 'scan',    value: 'tag CRAC-1 verified', flagged: false, min: 48 },
    { stepId: 'PM-COOL-CRAC-QTR-2', stepTitle: 'Clean condenser/evap coils',   kind: 'ack',     value: 'Coils cleaned',        flagged: false, min: 25 },
    { stepId: 'PM-COOL-CRAC-QTR-3', stepTitle: 'Post-clean supply temp',        kind: 'reading', value: '61 °F',               flagged: false, min: 10 },
    { stepId: 'PM-COOL-CRAC-QTR-4', stepTitle: 'Calibrate T/RH sensor',        kind: 'ack',     value: 'Sensor calibrated',    flagged: false, min: 0 },
  ], 8, 0),

  run('PM-PWR-PDU-MONTHLY', 'PDU Voltage & Phase Balance', 55, 13, 'J. Ramirez', [
    { stepId: 'PM-PWR-PDU-MONTHLY-0', stepTitle: 'Confirm PDU-B4',    kind: 'scan',    value: 'tag PDU-B4 verified', flagged: false, min: 13 },
    { stepId: 'PM-PWR-PDU-MONTHLY-1', stepTitle: 'Phase A current',   kind: 'reading', value: '62 A',                flagged: false, min: 10 },
    { stepId: 'PM-PWR-PDU-MONTHLY-2', stepTitle: 'Phase B current',   kind: 'reading', value: '65 A',                flagged: false, min: 7 },
    { stepId: 'PM-PWR-PDU-MONTHLY-3', stepTitle: 'Phase C current',   kind: 'reading', value: '67 A',                flagged: false, min: 3 },
    { stepId: 'PM-PWR-PDU-MONTHLY-4', stepTitle: 'Assess balance',    kind: 'ack',     value: 'Balance assessed',    flagged: false, min: 0 },
  ], 13, 0),

  // ── Legionella sample run (with flag) ────────────────────────────────────────
  run('PM-COOL-LEGIONELLA-MONTHLY', 'Cooling Tower Legionella Control Check', 32, 25, 'R. Patel', [
    { stepId: 'PM-COOL-LEGIONELLA-MONTHLY-0', stepTitle: 'Don PPE',                     kind: 'ack',     value: 'PPE confirmed',        flagged: false, min: 25 },
    { stepId: 'PM-COOL-LEGIONELLA-MONTHLY-1', stepTitle: 'Confirm cooling tower CT-1',  kind: 'scan',    value: 'tag CT-1 verified',    flagged: false, min: 22 },
    { stepId: 'PM-COOL-LEGIONELLA-MONTHLY-2', stepTitle: 'Basin water temperature',     kind: 'reading', value: '86 °F',                flagged: false, min: 18 },
    { stepId: 'PM-COOL-LEGIONELLA-MONTHLY-3', stepTitle: 'Free chlorine concentration', kind: 'reading', value: '0.7 ppm',              flagged: true,  min: 13 },
    { stepId: 'PM-COOL-LEGIONELLA-MONTHLY-4', stepTitle: 'Water pH',                    kind: 'reading', value: '7.4 pH',               flagged: false, min: 8 },
    { stepId: 'PM-COOL-LEGIONELLA-MONTHLY-5', stepTitle: 'Confirm biocide dosing current', kind: 'ack', value: 'Biocide confirmed',     flagged: false, min: 5 },
    { stepId: 'PM-COOL-LEGIONELLA-MONTHLY-6', stepTitle: 'Capture chemical test strip', kind: 'photo',   value: '1 image captured',     flagged: false, min: 3 },
    { stepId: 'PM-COOL-LEGIONELLA-MONTHLY-7', stepTitle: 'Log results to LWMP',         kind: 'ack',     value: 'LWMP log updated',     flagged: false, min: 0 },
  ], 10, 30),

  run('PM-PWR-LOAD-WEEKLY', 'IT Load & PUE Weekly Recording', 7, 12, 'D. Chen', [
    { stepId: 'PM-PWR-LOAD-WEEKLY-0', stepTitle: 'Access power monitoring dashboard', kind: 'ack',     value: 'Dashboard open',    flagged: false, min: 12 },
    { stepId: 'PM-PWR-LOAD-WEEKLY-1', stepTitle: 'Total IT load',                     kind: 'reading', value: '218 kW',            flagged: false, min: 9 },
    { stepId: 'PM-PWR-LOAD-WEEKLY-2', stepTitle: 'Total facility power',              kind: 'reading', value: '295 kW',            flagged: false, min: 6 },
    { stepId: 'PM-PWR-LOAD-WEEKLY-3', stepTitle: 'Power Usage Effectiveness (PUE)',  kind: 'reading', value: '1.35 PUE',          flagged: false, min: 4 },
    { stepId: 'PM-PWR-LOAD-WEEKLY-4', stepTitle: 'Flag if PUE exceeds target',       kind: 'ack',     value: 'PUE reviewed',      flagged: false, min: 2 },
    { stepId: 'PM-PWR-LOAD-WEEKLY-5', stepTitle: 'Capture EPMS dashboard',           kind: 'photo',   value: '1 image captured',  flagged: false, min: 0 },
  ], 8, 0),

  // ── Annual ───────────────────────────────────────────────────────────────────
  run('PM-PWR-UPS-ANNUAL', 'UPS Load Bank Test (80% / 30 min)', 290, 67, 'J. Ramirez', [
    { stepId: 'PM-PWR-UPS-ANNUAL-0', stepTitle: 'Verify approved MOP & backup path', kind: 'ack',     value: 'MOP & backup confirmed',    flagged: false, min: 67 },
    { stepId: 'PM-PWR-UPS-ANNUAL-1', stepTitle: 'Confirm UPS-A',                     kind: 'scan',    value: 'tag UPS-A verified',        flagged: false, min: 60 },
    { stepId: 'PM-PWR-UPS-ANNUAL-2', stepTitle: 'Load bank target',                  kind: 'reading', value: '80 %',                      flagged: false, min: 45 },
    { stepId: 'PM-PWR-UPS-ANNUAL-3', stepTitle: 'Sustained duration',                kind: 'reading', value: '32 min',                    flagged: false, min: 10 },
    { stepId: 'PM-PWR-UPS-ANNUAL-4', stepTitle: 'Confirm transfer integrity',        kind: 'ack',     value: 'Transfer verified clean',    flagged: false, min: 5 },
    { stepId: 'PM-PWR-UPS-ANNUAL-5', stepTitle: 'Capture test record',               kind: 'photo',   value: '1 image captured',          flagged: false, min: 0 },
  ], 10, 0),
];
