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
  // ─── DAILY ───────────────────────────────────────────────────────────────────

  {
    id: 'PM-ENV-DAILY',
    title: 'Temp & Humidity Walk — Hot/Cold Aisles',
    assetLabel: 'Hall B environmental sensors',
    system: 'env', interval: 'daily', version: 2,
    riskStatement: 'Routine walk — no equipment interaction.',
    complianceRefs: [
      { standard: 'ASHRAE TC 9.9-2021', section: 'Table 1', summary: 'Class A1 inlet temp 15–32°C (59–89.6°F), RH 20–80%' },
      { standard: 'ANSI/ASHRAE 90.4-2019', section: '§6.4', summary: 'Mechanical energy efficiency and thermal environment monitoring' },
    ],
    steps: buildSteps('PM-ENV-DAILY', [
      { kind: 'ack',     title: 'Begin environmental walk',  detail: 'Confirm you have the handheld reader and the aisle map for Hall B.',                            ackLabel: 'Ready to begin' },
      { kind: 'reading', title: 'Cold-aisle supply temp',    detail: 'Record cold-aisle supply temperature at the reference column.',       unit: '°F', expectedRange: [59, 80] },
      { kind: 'reading', title: 'Hot-aisle return temp',     detail: 'Record hot-aisle return temperature at the reference column.',        unit: '°F', expectedRange: [75, 113] },
      { kind: 'reading', title: 'Relative humidity',         detail: 'Record relative humidity at the room reference sensor.',              unit: '%',  expectedRange: [20, 80] },
      { kind: 'ack',     title: 'Note anomalies',            detail: 'Note any hot spots, condensation, or airflow obstructions observed during the walk.',           ackLabel: 'Walk complete' },
    ]),
  },

  {
    id: 'PM-PWR-UPS-DAILY',
    title: 'UPS Status & Alarm Check',
    assetLabel: 'UPS-A / UPS-B (Galaxy VS)',
    system: 'power', interval: 'daily', version: 2,
    riskStatement: 'Live electrical — observation only, no breaker operation.',
    complianceRefs: [
      { standard: 'NFPA 110:2022', section: '§8.3.1', summary: 'Monthly inspection of battery systems — daily visual inspection recommended' },
      { standard: 'IEEE Std 446-1995', section: '§4.3', summary: 'Recommended practice for emergency and standby power operational checks' },
    ],
    steps: buildSteps('PM-PWR-UPS-DAILY', [
      { kind: 'scan',    title: 'Confirm UPS-A',             detail: 'Scan the asset tag to confirm you are at UPS-A.',                                               expectedTag: 'UPS-A' },
      { kind: 'ack',     title: 'Check display for alarms',  detail: 'Verify the UPS display shows normal operation with no active alarms or warnings.', hard: true,  ackLabel: 'No active alarms' },
      { kind: 'reading', title: 'Battery string voltage',    detail: 'Record battery string voltage from the UPS display.',                                unit: 'V',   expectedRange: [432, 480] },
      { kind: 'reading', title: 'Output load',               detail: 'Record current output load percentage.',                                             unit: '%',   expectedRange: [0, 80] },
      { kind: 'ack',     title: 'Log status',                detail: 'Confirm runtime estimate is within spec and log the status.',                                    ackLabel: 'Status logged' },
    ]),
  },

  // ─── WEEKLY ──────────────────────────────────────────────────────────────────

  {
    id: 'PM-PWR-GEN-WEEKLY',
    title: 'Generator Inspection — No-Load',
    assetLabel: 'GEN-1 (Cat C175 diesel)',
    system: 'power', interval: 'weekly', version: 2,
    riskStatement: 'Rotating equipment & fuel system. Confirm exhaust path clear before start.',
    complianceRefs: [
      { standard: 'NFPA 110:2022', section: '§8.4.5', summary: 'Level 1 EPS — weekly visual inspection of generator and fuel system' },
      { standard: 'NFPA 37:2021',  section: '§8.3',   summary: 'Standard for installation and use of stationary combustion engines' },
    ],
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
    id: 'PM-PWR-LOAD-WEEKLY',
    title: 'IT Load & PUE Weekly Recording',
    assetLabel: 'EPMS — Hall B power monitoring',
    system: 'power', interval: 'weekly', version: 1,
    riskStatement: 'Monitoring only — no equipment interaction.',
    complianceRefs: [
      { standard: 'Uptime Institute Tier Standard', section: 'M&O §5.1', summary: 'Operational sustainability — continuous power monitoring and PUE tracking' },
      { standard: 'ISO 50001:2018',                section: '§6.3',     summary: 'Energy performance baseline and energy management measurement' },
      { standard: 'CLC EN 50600-4-1:2022',         section: '§5.2',     summary: 'Power usage effectiveness measurement and reporting' },
    ],
    steps: buildSteps('PM-PWR-LOAD-WEEKLY', [
      { kind: 'ack',     title: 'Access power monitoring dashboard',         detail: 'Log into EPMS (EcoStruxure Power Monitoring Expert) for Hall B.',                ackLabel: 'Dashboard open' },
      { kind: 'reading', title: 'Total IT load',                             detail: 'Record aggregate IT load from PDU summation.',                unit: 'kW',  expectedRange: [50, 400] },
      { kind: 'reading', title: 'Total facility power',                      detail: 'Record total facility consumption (IT + cooling + lighting).', unit: 'kW',  expectedRange: [75, 600] },
      { kind: 'reading', title: 'Power Usage Effectiveness (PUE)',           detail: 'Record PUE = total facility / IT load. Target ≤1.5.',         unit: 'PUE', expectedRange: [1.0, 1.5] },
      { kind: 'ack',     title: 'Flag if PUE exceeds target',                detail: 'If PUE > 1.5, log an efficiency note and notify the operations manager.',         ackLabel: 'PUE reviewed' },
      { kind: 'photo',   title: 'Capture EPMS dashboard',                    detail: 'Screenshot the EPMS summary panel for the weekly record.' },
    ]),
  },

  // ─── MONTHLY ─────────────────────────────────────────────────────────────────

  {
    id: 'PM-COOL-CRAC-MONTHLY',
    title: 'CRAC-3 Filter & Airflow Verification',
    assetLabel: 'CRAC-3 (Liebert DS105)',
    system: 'cooling', interval: 'monthly', version: 2,
    riskStatement: 'Live floor — no airflow interruption permitted.',
    complianceRefs: [
      { standard: 'ANSI/ASHRAE 62.1-2022', section: '§8.4',   summary: 'Maintenance of heating, ventilating, and air-conditioning equipment' },
      { standard: 'ANSI/ASHRAE 15-2022',   section: '§11.2',  summary: 'Safety standard for refrigerating systems — maintenance records required' },
    ],
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
    system: 'power', interval: 'monthly', version: 2,
    riskStatement: 'Live electrical metering — no outlet operation under load.',
    complianceRefs: [
      { standard: 'NFPA 70B:2023', section: 'Ch. 26', summary: 'Recommended practice for electrical equipment maintenance — power distribution' },
      { standard: 'NEC 2023',      section: '§645.27', summary: 'Information technology equipment — branch circuit, feeder, and service requirements' },
    ],
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
    system: 'fire', interval: 'monthly', version: 2,
    riskStatement: 'Life-safety system. Place panel in maintenance/bypass before testing per procedure.',
    complianceRefs: [
      { standard: 'NFPA 2001:2022', section: '§6.3',     summary: 'Clean-agent systems — monthly inspection of agent storage containers' },
      { standard: 'NFPA 72:2022',   section: '§14.4.5',  summary: 'National Fire Alarm Code — monthly testing of detection devices' },
    ],
    steps: buildSteps('PM-FIRE-MONTHLY', [
      { kind: 'ack',     title: 'Place panel in test mode',   detail: 'Place the suppression panel in maintenance/bypass mode per site procedure before any check.', hard: true, ackLabel: 'Panel in test mode' },
      { kind: 'reading', title: 'Agent cylinder pressure',    detail: 'Record clean-agent cylinder pressure gauge reading.',  unit: 'psi', expectedRange: [360, 600] },
      { kind: 'ack',     title: 'Detector functional check',  detail: 'Confirm detectors report and panel annunciates correctly.',                                               ackLabel: 'Detectors verified' },
      { kind: 'photo',   title: 'Photo of cylinder gauge',    detail: 'Capture the cylinder pressure gauge for the record.' },
      { kind: 'ack',     title: 'Restore panel to normal',    detail: 'Return the suppression panel to normal armed state and verify.',              hard: true,                 ackLabel: 'Panel restored & armed' },
    ]),
  },

  {
    id: 'PM-PWR-ATS-MONTHLY',
    title: 'Automatic Transfer Switch Monthly Test',
    assetLabel: 'ATS-1 (Eaton 800A)',
    system: 'power', interval: 'monthly', version: 1,
    riskStatement: 'Major electrical evolution. Brief load transfer — confirm IT load can tolerate simulated transfer before test.',
    complianceRefs: [
      { standard: 'NFPA 110:2022', section: '§8.4.2',  summary: 'Level 1 EPS — monthly operational test of automatic transfer switch' },
      { standard: 'NFPA 70B:2023', section: '§26.6',   summary: 'Recommended maintenance and testing of automatic transfer equipment' },
    ],
    steps: buildSteps('PM-PWR-ATS-MONTHLY', [
      { kind: 'scan',  title: 'Confirm ATS-1',                      detail: 'Scan the asset tag to confirm you are at ATS-1.',                                              expectedTag: 'ATS-1' },
      { kind: 'ack',   title: 'Verify ATS is in auto mode',         detail: 'Confirm ATS-1 selector is in AUTOMATIC before initiating any test.',             hard: true, ackLabel: 'ATS in auto mode' },
      { kind: 'ack',   title: 'Notify operations manager',          detail: 'Call or radio the operations manager to advise of imminent transfer test.',                    ackLabel: 'Manager notified' },
      { kind: 'ack',   title: 'Initiate simulated utility failure',  detail: 'Depress the UTILITY FAIL test button. Generator should start and transfer.',     hard: true, ackLabel: 'Transfer initiated' },
      { kind: 'reading', title: 'Transfer time',                    detail: 'Record the time from utility drop to ATS transfer completion.',                 unit: 's',  expectedRange: [0, 10] },
      { kind: 'ack',   title: 'Confirm generator assumed load',     detail: 'Verify generator voltage/frequency normal and ATS shows GEN source.',            hard: true, ackLabel: 'Gen load confirmed' },
      { kind: 'ack',   title: 'Initiate retransfer to utility',     detail: 'Restore simulated utility; confirm ATS retransfers cleanly.',                    hard: true, ackLabel: 'Retransfer complete' },
      { kind: 'photo', title: 'Capture ATS control panel',          detail: 'Photograph ATS-1 panel showing UTILITY source and AUTOMATIC mode.' },
      { kind: 'ack',   title: 'Confirm ATS returned to auto',       detail: 'Verify ATS-1 selector is in AUTOMATIC and no alarms are active.',               hard: true, ackLabel: 'ATS normal — test complete' },
    ]),
  },

  {
    id: 'PM-FIRE-PANEL-MONTHLY',
    title: 'Fire Detection Panel Monthly Test',
    assetLabel: 'FACP-1 (Notifier NFS2-3030)',
    system: 'fire', interval: 'monthly', version: 1,
    riskStatement: 'Life-safety system. Notify monitoring station before and after test. Do not activate suppression during test.',
    complianceRefs: [
      { standard: 'NFPA 72:2022', section: 'Table 14.3.1', summary: 'Monthly inspection and testing of fire alarm initiating devices and notification appliances' },
      { standard: 'NFPA 72:2022', section: '§14.4.5',      summary: 'Functional testing of smoke detection zones' },
    ],
    steps: buildSteps('PM-FIRE-PANEL-MONTHLY', [
      { kind: 'ack',     title: 'Notify central monitoring station', detail: 'Call the monitoring station and provide technician name and test authorization code.', hard: true, ackLabel: 'Station notified — test mode' },
      { kind: 'ack',     title: 'Place FACP in test mode',          detail: 'Enable test mode on FACP-1 to prevent false dispatch.',                               hard: true, ackLabel: 'Panel in test mode' },
      { kind: 'ack',     title: 'Test each detector zone',          detail: 'Activate test aerosol at one detector per zone. Confirm each zone annunciates.',               ackLabel: 'All zones verified' },
      { kind: 'ack',     title: 'Test audible/visual devices',      detail: 'Activate horns and strobes — confirm audible and visual notification across Hall B.',           ackLabel: 'Notification devices verified' },
      { kind: 'reading', title: 'Panel battery voltage',            detail: 'Read standby battery voltage from the panel display.',                               unit: 'V',  expectedRange: [24, 28] },
      { kind: 'photo',   title: 'Capture panel status',             detail: 'Photograph the FACP-1 display showing all zones normal after test.' },
      { kind: 'ack',     title: 'Restore panel to normal',          detail: 'Exit test mode. Confirm all zones reset. Panel fully armed.',                        hard: true, ackLabel: 'Panel restored & armed' },
      { kind: 'ack',     title: 'Notify monitoring station — clear', detail: 'Call station to confirm test complete and panel is back in normal operation.',      hard: true, ackLabel: 'Station cleared — test closed' },
    ]),
  },

  {
    id: 'PM-COOL-LEGIONELLA-MONTHLY',
    title: 'Cooling Tower Legionella Control Check',
    assetLabel: 'CT-1 (Baltimore Aircoil)',
    system: 'cooling', interval: 'monthly', version: 1,
    riskStatement: 'Biological hazard. Wear N95 mask and nitrile gloves during water sampling. Never breathe aerosolised tower water.',
    complianceRefs: [
      { standard: 'ASHRAE 188-2018', section: '§7.2',    summary: 'Legionellosis risk management for building water systems — monthly testing' },
      { standard: 'OSHA 3650',       section: '§IV.C',   summary: 'Legionella in the workplace — monitoring and control requirements' },
    ],
    steps: buildSteps('PM-COOL-LEGIONELLA-MONTHLY', [
      { kind: 'ack',     title: 'Don PPE',                    detail: 'Put on N95 respirator and nitrile gloves before approaching the tower.',                  hard: true, ackLabel: 'PPE confirmed' },
      { kind: 'scan',    title: 'Confirm cooling tower CT-1', detail: 'Scan the asset tag on the cooling tower.',                                                             expectedTag: 'CT-1' },
      { kind: 'reading', title: 'Basin water temperature',    detail: 'Read basin water temperature. Legionella thrives 25–45°C (77–113°F).',                 unit: '°F',  expectedRange: [60, 90] },
      { kind: 'reading', title: 'Free chlorine concentration',detail: 'Test basin water with a Hach kit. Target 1.0–3.0 ppm free chlorine.',                  unit: 'ppm', expectedRange: [1.0, 3.0] },
      { kind: 'reading', title: 'Water pH',                   detail: 'Test basin water pH. Target 7.2–7.8 for effective biocide action.',                    unit: 'pH',  expectedRange: [7.2, 7.8] },
      { kind: 'ack',     title: 'Confirm biocide dosing current', detail: 'Verify biocide dosing pump is operating and chemical inventory is sufficient.',                   ackLabel: 'Biocide confirmed' },
      { kind: 'photo',   title: 'Capture chemical test strip', detail: 'Photograph the chlorine/pH test strip for the Legionella Water Management log.' },
      { kind: 'ack',     title: 'Log results to LWMP',         detail: 'Record all readings in the Legionella Water Management Program logbook.',              hard: true, ackLabel: 'LWMP log updated' },
    ]),
  },

  {
    id: 'PM-FIRE-ELIGHT-MONTHLY',
    title: 'Emergency Lighting Monthly Test',
    assetLabel: 'Emergency luminaires — Hall B (24 units)',
    system: 'fire', interval: 'monthly', version: 1,
    riskStatement: 'Routine test — confirm all personnel aware before activating audible test mode.',
    complianceRefs: [
      { standard: 'NFPA 101:2021', section: '§7.9.3',   summary: 'Life Safety Code — monthly 30-second functional test of emergency luminaires' },
      { standard: 'NFPA 101:2021', section: '§7.9.2.1', summary: 'Emergency lighting must provide ≥1 ft-candle at floor level for 90 minutes' },
    ],
    steps: buildSteps('PM-FIRE-ELIGHT-MONTHLY', [
      { kind: 'ack',     title: 'Announce test to floor staff',      detail: 'Announce over radio that emergency lighting test is commencing.',                           ackLabel: 'Staff informed' },
      { kind: 'ack',     title: 'Activate test on each luminaire',   detail: 'Press the self-test button on each of the 24 luminaires in Hall B.',                        ackLabel: 'All units tested' },
      { kind: 'ack',     title: 'Verify illumination duration',      detail: 'Confirm each unit illuminates and remains lit for ≥30 seconds (monthly spec).',             ackLabel: 'Illumination confirmed' },
      { kind: 'reading', title: 'Number of failed units',            detail: 'Count luminaires that failed to illuminate or extinguished before 30 s.', unit: 'units',   expectedRange: [0, 0] },
      { kind: 'photo',   title: 'Photo of any failed luminaires',    detail: 'Capture each failed unit with asset tag visible. If none, capture a passing unit.' },
      { kind: 'ack',     title: 'Submit work orders for failures',   detail: 'Open a corrective work order for any failed unit. Log in the EM lighting register.', hard: true, ackLabel: 'Failures logged / none found' },
    ]),
  },

  // ─── QUARTERLY ───────────────────────────────────────────────────────────────

  {
    id: 'PM-COOL-CRAC-QTR',
    title: 'CRAC Coil Cleaning & Sensor Calibration',
    assetLabel: 'CRAC-1..4 (Liebert DS105)',
    system: 'cooling', interval: 'quarterly', version: 2,
    riskStatement: 'Live floor — stagger units to maintain N+1 cooling at all times.',
    complianceRefs: [
      { standard: 'ANSI/ASHRAE 62.1-2022', section: '§8.4',  summary: 'Heating and cooling system maintenance — evaporator/condenser coil cleaning' },
      { standard: 'NFPA 70B:2023',         section: '§27.3', summary: 'Recommended practice for maintenance of HVAC equipment in electrical facilities' },
    ],
    steps: buildSteps('PM-COOL-CRAC-QTR', [
      { kind: 'ack',     title: 'Confirm redundancy maintained', detail: 'Verify remaining units hold the floor before taking any CRAC offline.', hard: true, ackLabel: 'N+1 maintained' },
      { kind: 'scan',    title: 'Confirm unit under service',    detail: 'Scan the asset tag of the unit being serviced.',                                   expectedTag: 'CRAC-1' },
      { kind: 'ack',     title: 'Clean condenser/evap coils',   detail: 'Clean coils per procedure and clear condensate drain.',                             ackLabel: 'Coils cleaned' },
      { kind: 'reading', title: 'Post-clean supply temp',        detail: 'Record supply air temp after cleaning.',              unit: '°F',                  expectedRange: [55, 70] },
      { kind: 'ack',     title: 'Calibrate T/RH sensor',        detail: 'Calibrate temperature/humidity sensor against reference and record offset.',        ackLabel: 'Sensor calibrated' },
    ]),
  },

  {
    id: 'PM-PWR-BATTERY-QTR',
    title: 'UPS Battery String Quarterly Inspection',
    assetLabel: 'BATT-A (EnerSys DataSafe 480V)',
    system: 'power', interval: 'quarterly', version: 1,
    riskStatement: 'High-voltage DC battery hazard. Arc flash PPE Category 2 required. Chemical hazard if seals damaged — ventilate.',
    complianceRefs: [
      { standard: 'NFPA 110:2022',  section: '§8.3.1',  summary: 'Level 1 EPS — quarterly inspection of battery electrolyte levels, connections, and overall condition' },
      { standard: 'IEEE 450-2010',  section: '§5.2',    summary: 'Recommended practice for maintenance, testing, and replacement of vented lead-acid batteries' },
      { standard: 'NFPA 70E:2021',  section: 'Table 130.5(C)', summary: 'Arc flash PPE category for DC battery systems > 100V' },
    ],
    steps: buildSteps('PM-PWR-BATTERY-QTR', [
      { kind: 'scan',    title: 'Confirm battery string BATT-A',     detail: 'Scan the asset tag on the battery cabinet.',                                                  expectedTag: 'BATT-A' },
      { kind: 'ack',     title: 'Confirm PPE — arc flash + chemical', detail: 'Don Category 2 arc flash PPE and chemical-splash safety glasses before opening cabinet.', hard: true, ackLabel: 'PPE confirmed' },
      { kind: 'reading', title: 'Battery ambient temperature',        detail: 'Record ambient temperature at battery cabinet. Elevated temp accelerates aging.',  unit: '°F',  expectedRange: [65, 80] },
      { kind: 'reading', title: 'String open-circuit voltage',        detail: 'Record string voltage from UPS display with no load (idle).',                      unit: 'V',   expectedRange: [432, 480] },
      { kind: 'ack',     title: 'Inspect jars/cabinets',              detail: 'Visually inspect all jars for swelling, leaks, corrosion at terminals, and loose connections.',  ackLabel: 'Inspection complete' },
      { kind: 'photo',   title: 'Capture battery bank condition',     detail: 'Photograph battery bank — capture any anomalies with close-up.' },
      { kind: 'ack',     title: 'Confirm no thermal anomalies',       detail: 'Use infrared thermometer to spot-check inter-cell connectors for hot spots.', hard: true, ackLabel: 'No thermal anomalies' },
    ]),
  },

  {
    id: 'PM-PWR-FUEL-QTR',
    title: 'Diesel Fuel Quality Quarterly Test',
    assetLabel: 'FUEL-MAIN (day tank + bulk storage)',
    system: 'power', interval: 'quarterly', version: 1,
    riskStatement: 'Flammable liquid — no ignition sources within 10 feet during sampling.',
    complianceRefs: [
      { standard: 'NFPA 110:2022', section: '§8.3.5',  summary: 'Diesel fuel maintenance — quarterly sampling and testing per ASTM D975' },
      { standard: 'ASTM D975-23',  section: '§8',       summary: 'Standard specification for diesel fuel — water and sediment limits (ASTM Method D2709)' },
    ],
    steps: buildSteps('PM-PWR-FUEL-QTR', [
      { kind: 'scan',    title: 'Confirm fuel system FUEL-MAIN',      detail: 'Scan the asset tag on the day tank fill point.',                                              expectedTag: 'FUEL-MAIN' },
      { kind: 'ack',     title: 'No ignition sources — area clear',   detail: 'Confirm no open flames, sparks, or hot work within 10 ft of day tank.',           hard: true, ackLabel: 'Area clear — sampling safe' },
      { kind: 'ack',     title: 'Draw fuel sample',                   detail: 'Draw 250 mL sample from the tank bottom drain into a clean, clear container.',               ackLabel: 'Sample drawn' },
      { kind: 'reading', title: 'Water & sediment content',           detail: 'Use fuel test kit — ASTM D2709. Target < 0.05% water & sediment.', unit: '%',              expectedRange: [0, 0.05] },
      { kind: 'reading', title: 'Visual clarity rating',              detail: 'Rate clarity: 1=bright & clear, 3=hazy, 5=dark/sediment visible.', unit: '/5',             expectedRange: [1, 3] },
      { kind: 'ack',     title: 'Apply biocide treatment',            detail: 'Add biocide (e.g., Biobor JF) per schedule if microbiological growth suspected.',            ackLabel: 'Treatment applied' },
      { kind: 'photo',   title: 'Capture fuel sample clarity',        detail: 'Photograph sample jar against a white background for the record.' },
      { kind: 'ack',     title: 'Log and schedule polishing if needed', detail: 'Record results. If clarity ≥ 3 or water > 0.05%, schedule fuel polishing.',              ackLabel: 'Fuel quality logged' },
    ]),
  },

  // ─── ANNUAL ──────────────────────────────────────────────────────────────────

  {
    id: 'PM-PWR-UPS-ANNUAL',
    title: 'UPS Load Bank Test (80% / 30 min)',
    assetLabel: 'UPS-A (Galaxy VS)',
    system: 'power', interval: 'annual', version: 2,
    riskStatement: 'Major electrical evolution. Requires approved MOP, on-site engineer, and confirmed backup path.',
    complianceRefs: [
      { standard: 'NFPA 110:2022', section: '§8.4.1',  summary: 'Level 1 EPS — annual load test at 100% of nameplate kW rating for ≥30 minutes' },
      { standard: 'IEEE 450-2010', section: '§5.4',    summary: 'Annual capacity test of battery system to verify ≥80% rated capacity' },
      { standard: 'Uptime Institute Tier Standard', section: 'M&O §6.2', summary: 'Annual confirmation of power path capacity and switchover integrity' },
    ],
    steps: buildSteps('PM-PWR-UPS-ANNUAL', [
      { kind: 'ack',     title: 'Verify approved MOP & backup path', detail: 'Confirm the approved load-bank MOP is in hand and an alternate power path is confirmed available.', hard: true, ackLabel: 'MOP & backup confirmed' },
      { kind: 'scan',    title: 'Confirm UPS-A',                     detail: 'Scan the asset tag to confirm you are at UPS-A.',                                                          expectedTag: 'UPS-A' },
      { kind: 'reading', title: 'Load bank target',                  detail: 'Set and record load bank target as percent of UPS rating.',       unit: '%',   expectedRange: [75, 85] },
      { kind: 'reading', title: 'Sustained duration',                detail: 'Record sustained test duration achieved at target load.',         unit: 'min', expectedRange: [30, 60] },
      { kind: 'ack',     title: 'Confirm transfer integrity',        detail: 'Verify clean transfer back to utility/normal with no dropped load.', hard: true,                            ackLabel: 'Transfer verified clean' },
      { kind: 'photo',   title: 'Capture test record',               detail: 'Photograph the load-bank readout / test summary for the record.' },
    ]),
  },

  {
    id: 'PM-ENV-FLOOR-ANNUAL',
    title: 'Raised Floor Integrity & Airflow Annual Inspection',
    assetLabel: 'Hall B raised floor — all aisles',
    system: 'env', interval: 'annual', version: 1,
    riskStatement: 'Work above open floor cutouts — toe boards and signs required. No lifting tiles under live cabinets without containment.',
    complianceRefs: [
      { standard: 'Uptime Institute M&O', section: 'Operations §7.4', summary: 'Physical infrastructure inspections — raised floor, underfloor plenum, and cable management' },
      { standard: 'BICSI 009-2019',       section: '§10.5',           summary: 'Data center design and implementation — underfloor plenum maintenance and airflow management' },
    ],
    steps: buildSteps('PM-ENV-FLOOR-ANNUAL', [
      { kind: 'ack',     title: 'Confirm aisle containment operational', detail: 'Verify hot-aisle/cold-aisle containment panels intact before any tile work.',  hard: true, ackLabel: 'Containment confirmed' },
      { kind: 'reading', title: 'Under-floor static pressure',           detail: 'Measure plenum static pressure at reference point (target 0.02–0.08 in.wg).', unit: 'in.wg', expectedRange: [0.02, 0.08] },
      { kind: 'ack',     title: 'Inspect 20% tile sample',              detail: 'Lift and inspect a random 20% sample of floor tiles for cracks, warping, or poor seating.', ackLabel: 'Tile sample inspected' },
      { kind: 'reading', title: 'Perforated tile airflow (reference)',   detail: 'Measure CFM at the reference perforated tile with a flow hood.',               unit: 'CFM', expectedRange: [400, 700] },
      { kind: 'photo',   title: 'Underfloor cable tray condition',       detail: 'Photograph underfloor cable tray condition at the main plenum entry point.' },
      { kind: 'ack',     title: 'Re-seat disturbed tiles and log',       detail: 'Re-seat all lifted tiles. Log any defective tiles for replacement.',           hard: true, ackLabel: 'Tiles re-seated — findings logged' },
    ]),
  },
];

// ─── Seed completion dates ────────────────────────────────────────────────────
// Spread across all due states: some overdue, some due-soon, some ok.
// These are replaced by persisted runs after first launch.
const SEED_DAYS_AGO: Record<string, number> = {
  // daily
  'PM-ENV-DAILY':               0,   // ok
  'PM-PWR-UPS-DAILY':           2,   // overdue (interval 1d)
  // weekly
  'PM-PWR-GEN-WEEKLY':          9,   // overdue (interval 7d)
  'PM-PWR-LOAD-WEEKLY':         8,   // overdue (interval 7d)
  // monthly
  'PM-COOL-CRAC-MONTHLY':      41,   // overdue (interval 30d)
  'PM-PWR-PDU-MONTHLY':        22,   // ok (25.5d threshold)
  'PM-FIRE-MONTHLY':           55,   // overdue
  'PM-PWR-ATS-MONTHLY':        35,   // overdue
  'PM-FIRE-PANEL-MONTHLY':     27,   // due-soon (>25.5d)
  'PM-COOL-LEGIONELLA-MONTHLY':33,   // overdue
  'PM-FIRE-ELIGHT-MONTHLY':    26,   // due-soon
  // quarterly
  'PM-COOL-CRAC-QTR':          70,   // ok  (77.35d threshold)
  'PM-PWR-BATTERY-QTR':        83,   // due-soon
  'PM-PWR-FUEL-QTR':           60,   // ok
  // annual
  'PM-PWR-UPS-ANNUAL':        300,   // ok  (310.25d threshold)
  'PM-ENV-FLOOR-ANNUAL':      180,   // ok
};

export function seedLastCompleted(procedureId: string): Date | null {
  const n = SEED_DAYS_AGO[procedureId];
  if (n === undefined) return null;
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
