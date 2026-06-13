import type { AckStep, PhotoStep, Procedure, ReadingStep, ScanStep, Step } from '../types';

type RawAck     = { kind: 'ack';     title: string; detail: string; hard?: boolean; ackLabel: string };
type RawReading = { kind: 'reading'; title: string; detail: string; hard?: boolean; unit: string; expectedRange: [number, number] | null };
type RawPhoto   = { kind: 'photo';   title: string; detail: string; hard?: boolean };
type RawScan    = { kind: 'scan';    title: string; detail: string; hard?: boolean; expectedTag: string };
type RawStep    = RawAck | RawReading | RawPhoto | RawScan;

function buildSteps(pid: string, raws: RawStep[]): Step[] {
  return raws.map((raw, i) => {
    const base = { id: `${pid}-${i}`, procedureId: pid, order: i, title: raw.title, detail: raw.detail, hard: raw.hard ?? false };
    switch (raw.kind) {
      case 'ack':     return { ...base, kind: 'ack',     ackLabel: raw.ackLabel } satisfies AckStep;
      case 'reading': return { ...base, kind: 'reading', unit: raw.unit, expectedRange: raw.expectedRange } satisfies ReadingStep;
      case 'photo':   return { ...base, kind: 'photo'   } satisfies PhotoStep;
      case 'scan':    return { ...base, kind: 'scan',    expectedTag: raw.expectedTag } satisfies ScanStep;
    }
  });
}

export const CATALOG: Procedure[] = [
  {
    id: 'PM-ENV-DAILY',
    title: 'Temp & Humidity Walk — Hot/Cold Aisles',
    assetLabel: 'Hall B environmental sensors',
    system: 'env', interval: 'daily', version: 1,
    riskStatement: 'Routine walk — no equipment interaction.',
    steps: buildSteps('PM-ENV-DAILY', [
      { kind: 'ack',     title: 'Begin environmental walk',  detail: 'Confirm you have the handheld reader and the aisle map for Hall B.',                            ackLabel: 'Ready to begin' },
      { kind: 'reading', title: 'Cold-aisle supply temp',    detail: 'Record cold-aisle supply temperature at the reference column.',       unit: '°F', expectedRange: [64, 81] },
      { kind: 'reading', title: 'Hot-aisle return temp',     detail: 'Record hot-aisle return temperature at the reference column.',        unit: '°F', expectedRange: [75, 105] },
      { kind: 'reading', title: 'Relative humidity',         detail: 'Record relative humidity at the room reference sensor.',              unit: '%',  expectedRange: [45, 55] },
      { kind: 'ack',     title: 'Note anomalies',            detail: 'Note any hot spots, condensation, or airflow obstructions observed during the walk.',           ackLabel: 'Walk complete' },
    ]),
  },
  {
    id: 'PM-PWR-UPS-DAILY',
    title: 'UPS Status & Alarm Check',
    assetLabel: 'UPS-A / UPS-B (Galaxy VS)',
    system: 'power', interval: 'daily', version: 1,
    riskStatement: 'Live electrical — observation only, no breaker operation.',
    steps: buildSteps('PM-PWR-UPS-DAILY', [
      { kind: 'scan',    title: 'Confirm UPS-A',             detail: 'Scan the asset tag to confirm you are at UPS-A.',                                               expectedTag: 'UPS-A' },
      { kind: 'ack',     title: 'Check display for alarms',  detail: 'Verify the UPS display shows normal operation with no active alarms or warnings.', hard: true,  ackLabel: 'No active alarms' },
      { kind: 'reading', title: 'Battery string voltage',    detail: 'Record battery string voltage from the UPS display.',                                unit: 'V',   expectedRange: [432, 480] },
      { kind: 'reading', title: 'Output load',               detail: 'Record current output load percentage.',                                             unit: '%',   expectedRange: [0, 80] },
      { kind: 'ack',     title: 'Log status',                detail: 'Confirm runtime estimate is within spec and log the status.',                                    ackLabel: 'Status logged' },
    ]),
  },
  {
    id: 'PM-PWR-GEN-WEEKLY',
    title: 'Generator Inspection — No-Load',
    assetLabel: 'GEN-1 (Cat C175 diesel)',
    system: 'power', interval: 'weekly', version: 1,
    riskStatement: 'Rotating equipment & fuel system. Confirm exhaust path clear before start.',
    steps: buildSteps('PM-PWR-GEN-WEEKLY', [
      { kind: 'scan',    title: 'Confirm GEN-1',              detail: 'Scan the asset tag to confirm you are at GEN-1.',                                              expectedTag: 'GEN-1' },
      { kind: 'ack',     title: 'Verify exhaust path clear',  detail: 'Confirm the exhaust path and louvers are clear before any start.',              hard: true,    ackLabel: 'Exhaust path clear' },
      { kind: 'reading', title: 'Fuel level',                 detail: 'Record day-tank fuel level.',                                                   unit: '%',     expectedRange: [50, 100] },
      { kind: 'reading', title: 'Coolant temperature',        detail: 'Record coolant temperature (cold start baseline).',                              unit: '°F',    expectedRange: [60, 120] },
      { kind: 'photo',   title: 'Photo of control panel',     detail: 'Capture the generator control panel showing no fault codes.' },
      { kind: 'ack',     title: 'Confirm normal shutdown',    detail: 'Return unit to auto/standby and confirm normal status.',                         hard: true,    ackLabel: 'Returned to standby' },
    ]),
  },
  {
    id: 'PM-COOL-CRAC-MONTHLY',
    title: 'CRAC-3 Filter & Airflow Verification',
    assetLabel: 'CRAC-3 (Liebert DS105)',
    system: 'cooling', interval: 'monthly', version: 1,
    riskStatement: 'Live floor — no airflow interruption permitted.',
    steps: buildSteps('PM-COOL-CRAC-MONTHLY', [
      { kind: 'ack',     title: 'Verify work authorization',  detail: 'Confirm the change ticket is approved and the CRAC-3 maintenance window is active.', hard: true, ackLabel: 'Authorization confirmed' },
      { kind: 'scan',    title: 'Confirm correct unit',       detail: 'Scan the asset tag to confirm you are at CRAC-3, not an adjacent unit.',                        expectedTag: 'CRAC-3' },
      { kind: 'reading', title: 'Return-air temp (pre)',      detail: 'Read return-air temp from the unit display before any work (baseline).',           unit: '°F',  expectedRange: [68, 80] },
      { kind: 'ack',     title: 'Inspect filter condition',   detail: 'Visually inspect the filter bank for loading, damage, or bypass gaps.',                         ackLabel: 'Filters inspected' },
      { kind: 'photo',   title: 'Capture filter condition',   detail: 'Photograph the filter bank for the record (before replacement).' },
      { kind: 'ack',     title: 'Replace filters',            detail: 'Replace all filters with correct size/MERV. Confirm seating with no bypass gaps.', hard: true, ackLabel: 'Filters replaced & seated' },
      { kind: 'reading', title: 'Return-air temp (post)',     detail: 'Read return-air temp after replacement and 5 min runtime.',                        unit: '°F',  expectedRange: [68, 80] },
      { kind: 'ack',     title: 'Confirm normal operation',   detail: 'Verify unit running, no alarms, airflow restored. Close the window.',              hard: true, ackLabel: 'Unit nominal — work complete' },
    ]),
  },
  {
    id: 'PM-PWR-PDU-MONTHLY',
    title: 'PDU Voltage & Phase Balance',
    assetLabel: 'PDU-B4 (Vertiv 415V)',
    system: 'power', interval: 'monthly', version: 1,
    riskStatement: 'Live electrical metering — no outlet operation under load.',
    steps: buildSteps('PM-PWR-PDU-MONTHLY', [
      { kind: 'scan',    title: 'Confirm PDU-B4',    detail: 'Scan the asset tag to confirm you are at PDU-B4.',            expectedTag: 'PDU-B4' },
      { kind: 'reading', title: 'Phase A current',   detail: 'Record phase A current from the PDU meter.', unit: 'A',      expectedRange: [0, 90] },
      { kind: 'reading', title: 'Phase B current',   detail: 'Record phase B current from the PDU meter.', unit: 'A',      expectedRange: [0, 90] },
      { kind: 'reading', title: 'Phase C current',   detail: 'Record phase C current from the PDU meter.', unit: 'A',      expectedRange: [0, 90] },
      { kind: 'ack',     title: 'Assess balance',    detail: 'Confirm phase imbalance is within acceptable limits and note any branch overloads.',  ackLabel: 'Balance assessed' },
    ]),
  },
  {
    id: 'PM-FIRE-MONTHLY',
    title: 'Fire Suppression — Cylinder & Detector Check',
    assetLabel: 'Clean-agent system Zone B',
    system: 'fire', interval: 'monthly', version: 1,
    riskStatement: 'Life-safety system. Place panel in maintenance/bypass before testing per procedure.',
    steps: buildSteps('PM-FIRE-MONTHLY', [
      { kind: 'ack',     title: 'Place panel in test mode',   detail: 'Place the suppression panel in maintenance/bypass mode per site procedure before any check.', hard: true, ackLabel: 'Panel in test mode' },
      { kind: 'reading', title: 'Agent cylinder pressure',    detail: 'Record clean-agent cylinder pressure gauge reading.',  unit: 'psi', expectedRange: [360, 600] },
      { kind: 'ack',     title: 'Detector functional check',  detail: 'Confirm detectors report and panel annunciates correctly.',                                               ackLabel: 'Detectors verified' },
      { kind: 'photo',   title: 'Photo of cylinder gauge',    detail: 'Capture the cylinder pressure gauge for the record.' },
      { kind: 'ack',     title: 'Restore panel to normal',    detail: 'Return the suppression panel to normal armed state and verify.',              hard: true,                 ackLabel: 'Panel restored & armed' },
    ]),
  },
  {
    id: 'PM-COOL-CRAC-QTR',
    title: 'CRAC Coil Cleaning & Sensor Calibration',
    assetLabel: 'CRAC-1..4 (Liebert DS105)',
    system: 'cooling', interval: 'quarterly', version: 1,
    riskStatement: 'Live floor — stagger units to maintain N+1 cooling at all times.',
    steps: buildSteps('PM-COOL-CRAC-QTR', [
      { kind: 'ack',     title: 'Confirm redundancy maintained', detail: 'Verify remaining units hold the floor before taking any CRAC offline.', hard: true, ackLabel: 'N+1 maintained' },
      { kind: 'scan',    title: 'Confirm unit under service',    detail: 'Scan the asset tag of the unit being serviced.',                                   expectedTag: 'CRAC-1' },
      { kind: 'ack',     title: 'Clean condenser/evap coils',   detail: 'Clean coils per procedure and clear condensate drain.',                             ackLabel: 'Coils cleaned' },
      { kind: 'reading', title: 'Post-clean supply temp',        detail: 'Record supply air temp after cleaning.',              unit: '°F',                  expectedRange: [55, 70] },
      { kind: 'ack',     title: 'Calibrate T/RH sensor',        detail: 'Calibrate temperature/humidity sensor against reference and record offset.',        ackLabel: 'Sensor calibrated' },
    ]),
  },
  {
    id: 'PM-PWR-UPS-ANNUAL',
    title: 'UPS Load Bank Test (80% / 30 min)',
    assetLabel: 'UPS-A (Galaxy VS)',
    system: 'power', interval: 'annual', version: 1,
    riskStatement: 'Major electrical evolution. Requires approved MOP, on-site engineer, and confirmed backup path.',
    steps: buildSteps('PM-PWR-UPS-ANNUAL', [
      { kind: 'ack',     title: 'Verify approved MOP & backup path', detail: 'Confirm the approved load-bank MOP is in hand and an alternate power path is confirmed available.', hard: true, ackLabel: 'MOP & backup confirmed' },
      { kind: 'scan',    title: 'Confirm UPS-A',                     detail: 'Scan the asset tag to confirm you are at UPS-A.',                                                          expectedTag: 'UPS-A' },
      { kind: 'reading', title: 'Load bank target',                  detail: 'Set and record load bank target as percent of UPS rating.',       unit: '%',   expectedRange: [75, 85] },
      { kind: 'reading', title: 'Sustained duration',                detail: 'Record sustained test duration achieved at target load.',         unit: 'min', expectedRange: [30, 60] },
      { kind: 'ack',     title: 'Confirm transfer integrity',        detail: 'Verify clean transfer back to utility/normal with no dropped load.', hard: true,                            ackLabel: 'Transfer verified clean' },
      { kind: 'photo',   title: 'Capture test record',               detail: 'Photograph the load-bank readout / test summary for the record.' },
    ]),
  },
];

// seed completion dates — replaced by persisted runs in Task 6
const SEED_DAYS_AGO: Record<string, number> = {
  'PM-ENV-DAILY':         0,
  'PM-PWR-UPS-DAILY':     2,
  'PM-PWR-GEN-WEEKLY':    9,
  'PM-COOL-CRAC-MONTHLY': 41,
  'PM-PWR-PDU-MONTHLY':   22,
  'PM-FIRE-MONTHLY':      55,
  'PM-COOL-CRAC-QTR':     70,
  'PM-PWR-UPS-ANNUAL':    300,
};

export function seedLastCompleted(procedureId: string): Date | null {
  const n = SEED_DAYS_AGO[procedureId];
  if (n === undefined) return null;
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
