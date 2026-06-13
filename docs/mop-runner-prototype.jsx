import React, { useState, useEffect, useRef } from "react";

/*
  FacilityOps — MOP Runner + Maintenance Menu prototype
  Wedge product: guided, checkpoint-verified procedure execution for data-center techs,
  now fronted by a maintenance home that tracks due/overdue PM tasks across the facility.

  Flow:
    HOME (maintenance menu)
      - toggle: organize by SYSTEM or by INTERVAL
      - each task shows interval + due/overdue status + last completed
      - tap a task -> RUN (guided checkpoint flow) -> DONE (audit trail)
      - completing a task marks it done "today" and returns to HOME

  Catalog of PM tasks + intervals is grounded in standard DC practice
  (UPS, generator, CRAC/CRAH, PDU, fire suppression, environmental).
  No backend; all state is in-memory (React useState).
*/

// ---- Design tokens (instrument / control-panel aesthetic) ----
const C = {
  bg: "#0B0F12",
  panel: "#141A20",
  panelHi: "#1B232B",
  line: "#26313B",
  ink: "#E8EEF2",
  inkDim: "#8A99A6",
  inkFaint: "#54626D",
  verify: "#3DDC97",
  verifyDim: "#1F7A57",
  caution: "#F2B441",
  hardstop: "#FF5C5C",
  scan: "#5BAEF0",
};
const MONO = "'SFMono-Regular', ui-monospace, 'JetBrains Mono', 'Roboto Mono', Menlo, monospace";
const SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const FACILITY = "Naples Edge — Hall B";

// ---- System taxonomy ----
const SYSTEMS = {
  power:   { label: "Power",          color: "#F2B441", glyph: "\u26A1" },
  cooling: { label: "Cooling",        color: "#5BAEF0", glyph: "\u2744" },
  fire:    { label: "Fire & Safety",  color: "#FF5C5C", glyph: "\u25C9" },
  env:     { label: "Environmental",  color: "#3DDC97", glyph: "\u25A6" },
};

const INTERVAL_ORDER = ["daily", "weekly", "monthly", "quarterly", "annual"];
const INTERVAL_DAYS = { daily: 1, weekly: 7, monthly: 30, quarterly: 91, annual: 365 };
const INTERVAL_LABEL = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", annual: "Annual" };

// ---- Step templates reused across tasks ----
const stepAck = (title, detail, hard, ackLabel) => ({ kind: "ack", title, detail, hard, ackLabel });
const stepReading = (title, detail, unit, range, hard = false) => ({ kind: "reading", title, detail, unit, expectedRange: range, hard });
const stepPhoto = (title, detail, hard = false) => ({ kind: "photo", title, detail, hard });
const stepScan = (title, detail, tag, hard = true) => ({ kind: "scan", title, detail, expectedTag: tag, hard });

// ---- Maintenance catalog (grounded in standard DC PM practice) ----
// daysAgo = when last completed; compared to interval to compute due/overdue.
const CATALOG = [
  {
    id: "PM-ENV-DAILY",
    title: "Temp & Humidity Walk — Hot/Cold Aisles",
    system: "env",
    interval: "daily",
    asset: "Hall B environmental sensors",
    daysAgo: 0,
    risk: "Routine walk — no equipment interaction.",
    steps: [
      stepAck("Begin environmental walk", "Confirm you have the handheld reader and the aisle map for Hall B.", false, "Ready to begin"),
      stepReading("Cold-aisle supply temp", "Record cold-aisle supply temperature at the reference column.", "\u00B0F", [64, 81]),
      stepReading("Hot-aisle return temp", "Record hot-aisle return temperature at the reference column.", "\u00B0F", [75, 105]),
      stepReading("Relative humidity", "Record relative humidity at the room reference sensor.", "%", [45, 55]),
      stepAck("Note anomalies", "Note any hot spots, condensation, or airflow obstructions observed during the walk.", false, "Walk complete"),
    ],
  },
  {
    id: "PM-PWR-UPS-DAILY",
    title: "UPS Status & Alarm Check",
    system: "power",
    interval: "daily",
    asset: "UPS-A / UPS-B (Galaxy VS)",
    daysAgo: 2,
    risk: "Live electrical — observation only, no breaker operation.",
    steps: [
      stepScan("Confirm UPS-A", "Scan the asset tag to confirm you are at UPS-A.", "UPS-A"),
      stepAck("Check display for alarms", "Verify the UPS display shows normal operation with no active alarms or warnings.", true, "No active alarms"),
      stepReading("Battery string voltage", "Record battery string voltage from the UPS display.", "V", [432, 480]),
      stepReading("Output load", "Record current output load percentage.", "%", [0, 80]),
      stepAck("Log status", "Confirm runtime estimate is within spec and log the status.", false, "Status logged"),
    ],
  },
  {
    id: "PM-PWR-GEN-WEEKLY",
    title: "Generator Inspection — No-Load",
    system: "power",
    interval: "weekly",
    asset: "GEN-1 (Cat C175 diesel)",
    daysAgo: 9,
    risk: "Rotating equipment & fuel system. Confirm exhaust path clear before start.",
    steps: [
      stepScan("Confirm GEN-1", "Scan the asset tag to confirm you are at GEN-1.", "GEN-1"),
      stepAck("Verify exhaust path clear", "Confirm the exhaust path and louvers are clear before any start.", true, "Exhaust path clear"),
      stepReading("Fuel level", "Record day-tank fuel level.", "%", [50, 100]),
      stepReading("Coolant temperature", "Record coolant temperature (cold start baseline).", "\u00B0F", [60, 120]),
      stepPhoto("Photo of control panel", "Capture the generator control panel showing no fault codes."),
      stepAck("Confirm normal shutdown", "Return unit to auto/standby and confirm normal status.", true, "Returned to standby"),
    ],
  },
  {
    id: "PM-COOL-CRAC-MONTHLY",
    title: "CRAC-3 Filter & Airflow Verification",
    system: "cooling",
    interval: "monthly",
    asset: "CRAC-3 (Liebert DS105)",
    daysAgo: 41,
    risk: "Live floor — no airflow interruption permitted.",
    steps: [
      stepAck("Verify work authorization", "Confirm the change ticket is approved and the CRAC-3 maintenance window is active.", true, "Authorization confirmed"),
      stepScan("Confirm correct unit", "Scan the asset tag to confirm you are at CRAC-3, not an adjacent unit.", "CRAC-3"),
      stepReading("Return-air temp (pre)", "Read return-air temp from the unit display before any work (baseline).", "\u00B0F", [68, 80]),
      stepAck("Inspect filter condition", "Visually inspect the filter bank for loading, damage, or bypass gaps.", false, "Filters inspected"),
      stepPhoto("Capture filter condition", "Photograph the filter bank for the record (before replacement)."),
      stepAck("Replace filters", "Replace all filters with correct size/MERV. Confirm seating with no bypass gaps.", true, "Filters replaced & seated"),
      stepReading("Return-air temp (post)", "Read return-air temp after replacement and 5 min runtime.", "\u00B0F", [68, 80]),
      stepAck("Confirm normal operation", "Verify unit running, no alarms, airflow restored. Close the window.", true, "Unit nominal — work complete"),
    ],
  },
  {
    id: "PM-PWR-PDU-MONTHLY",
    title: "PDU Voltage & Phase Balance",
    system: "power",
    interval: "monthly",
    asset: "PDU-B4 (Vertiv 415V)",
    daysAgo: 22,
    risk: "Live electrical metering — no outlet operation under load.",
    steps: [
      stepScan("Confirm PDU-B4", "Scan the asset tag to confirm you are at PDU-B4.", "PDU-B4"),
      stepReading("Phase A current", "Record phase A current from the PDU meter.", "A", [0, 90]),
      stepReading("Phase B current", "Record phase B current from the PDU meter.", "A", [0, 90]),
      stepReading("Phase C current", "Record phase C current from the PDU meter.", "A", [0, 90]),
      stepAck("Assess balance", "Confirm phase imbalance is within acceptable limits and note any branch overloads.", false, "Balance assessed"),
    ],
  },
  {
    id: "PM-FIRE-MONTHLY",
    title: "Fire Suppression — Cylinder & Detector Check",
    system: "fire",
    interval: "monthly",
    asset: "Clean-agent system Zone B",
    daysAgo: 55,
    risk: "Life-safety system. Place panel in maintenance/bypass before testing per procedure.",
    steps: [
      stepAck("Place panel in test mode", "Place the suppression panel in maintenance/bypass mode per site procedure before any check.", true, "Panel in test mode"),
      stepReading("Agent cylinder pressure", "Record clean-agent cylinder pressure gauge reading.", "psi", [360, 600]),
      stepAck("Detector functional check", "Confirm detectors report and panel annunciates correctly.", false, "Detectors verified"),
      stepPhoto("Photo of cylinder gauge", "Capture the cylinder pressure gauge for the record."),
      stepAck("Restore panel to normal", "Return the suppression panel to normal armed state and verify.", true, "Panel restored & armed"),
    ],
  },
  {
    id: "PM-COOL-CRAC-QTR",
    title: "CRAC Coil Cleaning & Sensor Calibration",
    system: "cooling",
    interval: "quarterly",
    asset: "CRAC-1..4 (Liebert DS105)",
    daysAgo: 70,
    risk: "Live floor — stagger units to maintain N+1 cooling at all times.",
    steps: [
      stepAck("Confirm redundancy maintained", "Verify remaining units hold the floor before taking any CRAC offline.", true, "N+1 maintained"),
      stepScan("Confirm unit under service", "Scan the asset tag of the unit being serviced.", "CRAC-1"),
      stepAck("Clean condenser/evap coils", "Clean coils per procedure and clear condensate drain.", false, "Coils cleaned"),
      stepReading("Post-clean supply temp", "Record supply air temp after cleaning.", "\u00B0F", [55, 70]),
      stepAck("Calibrate T/RH sensor", "Calibrate temperature/humidity sensor against reference and record offset.", false, "Sensor calibrated"),
    ],
  },
  {
    id: "PM-PWR-UPS-ANNUAL",
    title: "UPS Load Bank Test (80% / 30 min)",
    system: "power",
    interval: "annual",
    asset: "UPS-A (Galaxy VS)",
    daysAgo: 300,
    risk: "Major electrical evolution. Requires approved MOP, on-site engineer, and confirmed backup path.",
    steps: [
      stepAck("Verify approved MOP & backup path", "Confirm the approved load-bank MOP is in hand and an alternate power path is confirmed available.", true, "MOP & backup confirmed"),
      stepScan("Confirm UPS-A", "Scan the asset tag to confirm you are at UPS-A.", "UPS-A"),
      stepReading("Load bank target", "Set and record load bank target as percent of UPS rating.", "%", [75, 85]),
      stepReading("Sustained duration", "Record sustained test duration achieved at target load.", "min", [30, 60]),
      stepAck("Confirm transfer integrity", "Verify clean transfer back to utility/normal with no dropped load.", true, "Transfer verified clean"),
      stepPhoto("Capture test record", "Photograph the load-bank readout / test summary for the record."),
    ],
  },
];

const KIND_META = {
  ack:     { label: "ACKNOWLEDGE", color: C.verify, glyph: "\u2713" },
  reading: { label: "READING",     color: C.caution, glyph: "#" },
  photo:   { label: "PHOTO",       color: C.inkDim,  glyph: "\u25A1" },
  scan:    { label: "SCAN TAG",    color: C.scan,    glyph: "\u29BF" },
};

// ---- due-status computation ----
function statusFor(task) {
  const due = INTERVAL_DAYS[task.interval];
  const remaining = due - task.daysAgo; // days until due (negative = overdue)
  if (remaining < 0) return { state: "overdue", remaining };
  if (remaining <= Math.max(1, Math.round(due * 0.15))) return { state: "due", remaining };
  return { state: "ok", remaining };
}
const STATUS_META = {
  overdue: { color: C.hardstop, label: "OVERDUE" },
  due:     { color: C.caution,  label: "DUE SOON" },
  ok:      { color: C.verify,   label: "ON TRACK" },
};

export default function App() {
  const [screen, setScreen] = useState("home"); // home | run | done
  const [view, setView] = useState("system");    // system | interval
  const [tasks, setTasks] = useState(CATALOG);
  const [activeId, setActiveId] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [log, setLog] = useState([]);
  const startRef = useRef(null);

  const active = tasks.find((t) => t.id === activeId);

  const openTask = (id) => {
    setActiveId(id);
    setStepIdx(0);
    setLog([]);
    startRef.current = new Date();
    setScreen("run");
  };

  const recordAndAdvance = (entry) => {
    const stamped = { ...entry, ts: new Date() };
    const nextLog = [...log, stamped];
    setLog(nextLog);
    if (stepIdx + 1 >= active.steps.length) {
      setScreen("done");
    } else {
      setStepIdx(stepIdx + 1);
    }
  };

  const finishTask = () => {
    // mark completed today
    setTasks((prev) => prev.map((t) => (t.id === activeId ? { ...t, daysAgo: 0 } : t)));
    setActiveId(null);
    setScreen("home");
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", justifyContent: "center", fontFamily: SANS }}>
      <div style={{ width: "100%", maxWidth: 430, minHeight: "100vh", background: C.bg, boxShadow: "0 0 0 1px " + C.line }}>
        {screen === "home" && (
          <Home tasks={tasks} view={view} setView={setView} onOpen={openTask} />
        )}
        {screen === "run" && active && (
          <Runner
            task={active}
            step={active.steps[stepIdx]}
            idx={stepIdx}
            total={active.steps.length}
            onComplete={recordAndAdvance}
            onBack={stepIdx > 0 ? () => setStepIdx(stepIdx - 1) : null}
            onExit={() => { setScreen("home"); setActiveId(null); }}
          />
        )}
        {screen === "done" && active && (
          <Done task={active} log={log} start={startRef.current} onDone={finishTask} />
        )}
      </div>
    </div>
  );
}

// ---------- HOME / maintenance menu ----------
function Home({ tasks, view, setView, onOpen }) {
  const overdue = tasks.filter((t) => statusFor(t).state === "overdue").length;
  const dueSoon = tasks.filter((t) => statusFor(t).state === "due").length;

  // group
  let groups = [];
  if (view === "system") {
    groups = Object.keys(SYSTEMS).map((key) => ({
      key,
      title: SYSTEMS[key].label,
      color: SYSTEMS[key].color,
      glyph: SYSTEMS[key].glyph,
      items: tasks.filter((t) => t.system === key),
    })).filter((g) => g.items.length);
  } else {
    groups = INTERVAL_ORDER.map((key) => ({
      key,
      title: INTERVAL_LABEL[key],
      color: C.inkDim,
      glyph: null,
      items: tasks.filter((t) => t.interval === key),
    })).filter((g) => g.items.length);
  }

  // sort items by urgency within group
  groups.forEach((g) => g.items.sort((a, b) => statusFor(a).remaining - statusFor(b).remaining));

  return (
    <div style={{ padding: "26px 18px 40px" }}>
      <Brand />

      <div style={{ marginTop: 22, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ color: C.ink, fontSize: 21, fontWeight: 650, letterSpacing: -0.3, margin: 0 }}>Maintenance</h1>
        <span style={{ color: C.inkFaint, fontFamily: MONO, fontSize: 11 }}>{FACILITY}</span>
      </div>

      {/* status banner */}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <Stat label="Overdue" value={overdue} alert={overdue > 0} />
        <Stat label="Due soon" value={dueSoon} caution={dueSoon > 0} />
        <Stat label="Tracked" value={tasks.length} />
      </div>

      {/* view toggle */}
      <div style={{ display: "flex", marginTop: 20, background: C.panel, border: "1px solid " + C.line, borderRadius: 10, padding: 3 }}>
        {["system", "interval"].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: MONO, fontSize: 12, letterSpacing: 1,
              background: view === v ? C.panelHi : "transparent",
              color: view === v ? C.ink : C.inkFaint,
              boxShadow: view === v ? "inset 0 0 0 1px " + C.line : "none",
            }}
          >
            BY {v.toUpperCase()}
          </button>
        ))}
      </div>

      {/* groups */}
      {groups.map((g) => (
        <div key={g.key} style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
            {g.glyph && <span style={{ color: g.color, fontSize: 13 }}>{g.glyph}</span>}
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, color: g.color }}>
              {g.title.toUpperCase()}
            </span>
            <span style={{ flex: 1, height: 1, background: C.line }} />
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.inkFaint }}>{g.items.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {g.items.map((t) => (
              <TaskCard key={t.id} task={t} showSystem={view === "interval"} onOpen={() => onOpen(t.id)} />
            ))}
          </div>
        </div>
      ))}

      <div style={{ textAlign: "center", marginTop: 28, fontFamily: MONO, fontSize: 11, color: C.inkFaint }}>
        offline-ready \u00B7 syncs when reconnected
      </div>
    </div>
  );
}

function TaskCard({ task, showSystem, onOpen }) {
  const st = statusFor(task);
  const sm = STATUS_META[st.state];
  const sys = SYSTEMS[task.system];
  const dueText =
    st.state === "overdue"
      ? `${Math.abs(st.remaining)}d overdue`
      : st.remaining === 0
      ? "due today"
      : `due in ${st.remaining}d`;
  return (
    <button
      onClick={onOpen}
      style={{
        width: "100%", textAlign: "left", cursor: "pointer",
        background: C.panel, border: "1px solid " + (st.state === "overdue" ? "rgba(255,92,92,0.4)" : C.line),
        borderRadius: 12, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12,
      }}
    >
      {/* status rail */}
      <span style={{ width: 3, alignSelf: "stretch", borderRadius: 3, background: sm.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {showSystem && <span style={{ color: sys.color, fontSize: 11 }}>{sys.glyph}</span>}
          <span style={{ color: C.ink, fontSize: 14.5, fontWeight: 560, lineHeight: 1.25 }}>{task.title}</span>
        </div>
        <div style={{ color: C.inkFaint, fontFamily: MONO, fontSize: 11, marginTop: 4 }}>
          {task.asset}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: sm.color, border: "1px solid " + sm.color, borderRadius: 4, padding: "2px 6px" }}>
            {sm.label}
          </span>
          <span style={{ color: C.inkDim, fontFamily: MONO, fontSize: 11 }}>
            {INTERVAL_LABEL[task.interval]} \u00B7 {dueText}
          </span>
        </div>
      </div>
      <span style={{ color: C.inkFaint, fontSize: 18, flexShrink: 0 }}>\u203A</span>
    </button>
  );
}

// ---------- RUNNER ----------
function Runner({ task, step, idx, total, onComplete, onBack, onExit }) {
  const meta = KIND_META[step.kind];
  const pct = Math.round((idx / total) * 100);
  const sys = SYSTEMS[task.system];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid " + C.line, background: C.panel }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onExit} style={{ background: "none", border: "none", color: C.inkFaint, fontFamily: MONO, fontSize: 12, cursor: "pointer", padding: 0 }}>
            \u2715 exit
          </button>
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.inkDim, letterSpacing: 1 }}>
            STEP {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>
        <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: sys.color, fontSize: 12 }}>{sys.glyph}</span>
          <span style={{ color: C.ink, fontSize: 13.5, fontWeight: 560, lineHeight: 1.2, flex: 1 }}>{task.title}</span>
        </div>
        <div style={{ marginTop: 11, height: 4, background: C.bg, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: pct + "%", height: "100%", background: C.verify, transition: "width .35s ease" }} />
        </div>
      </div>

      <div style={{ flex: 1, padding: "24px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, color: meta.color, border: "1px solid " + meta.color, borderRadius: 5, padding: "3px 8px" }}>
            {meta.label}
          </span>
          {step.hard && (
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, color: C.hardstop, background: "rgba(255,92,92,0.12)", borderRadius: 5, padding: "3px 8px" }}>
              HARD CHECKPOINT
            </span>
          )}
        </div>

        <h2 style={{ color: C.ink, fontSize: 22, lineHeight: 1.22, margin: "15px 0 0", fontWeight: 650, letterSpacing: -0.3 }}>
          {step.title}
        </h2>
        <p style={{ color: C.inkDim, fontSize: 14.5, lineHeight: 1.55, marginTop: 11 }}>{step.detail}</p>

        <div style={{ marginTop: 24 }}>
          <Checkpoint step={step} onComplete={onComplete} />
        </div>
      </div>

      <div style={{ padding: "14px 20px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {onBack ? (
          <button onClick={onBack} style={{ background: "none", border: "none", color: C.inkFaint, fontFamily: MONO, fontSize: 12, cursor: "pointer" }}>
            \u2190 previous
          </button>
        ) : <span />}
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.inkFaint }}>{step.hard ? "skip disabled" : ""}</span>
      </div>
    </div>
  );
}

// ---------- CHECKPOINT TYPES ----------
function Checkpoint({ step, onComplete }) {
  if (step.kind === "ack") return <AckCheckpoint step={step} onComplete={onComplete} />;
  if (step.kind === "reading") return <ReadingCheckpoint step={step} onComplete={onComplete} />;
  if (step.kind === "photo") return <PhotoCheckpoint step={step} onComplete={onComplete} />;
  if (step.kind === "scan") return <ScanCheckpoint step={step} onComplete={onComplete} />;
  return null;
}

function AckCheckpoint({ step, onComplete }) {
  const [held, setHeld] = useState(false);
  return (
    <div>
      <button
        onClick={() => setHeld(!held)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "18px",
          borderRadius: 12, cursor: "pointer",
          background: held ? "rgba(61,220,151,0.10)" : C.panel,
          border: "1px solid " + (held ? C.verify : C.line), transition: "all .15s",
        }}
      >
        <span style={{
          width: 26, height: 26, borderRadius: 7, flexShrink: 0,
          border: "2px solid " + (held ? C.verify : C.inkFaint),
          background: held ? C.verify : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.bg, fontSize: 15, fontWeight: 800,
        }}>{held ? "\u2713" : ""}</span>
        <span style={{ color: held ? C.ink : C.inkDim, fontSize: 15, fontWeight: 550, textAlign: "left" }}>
          {step.ackLabel}
        </span>
      </button>
      <ProceedBtn enabled={held} onClick={() => onComplete({ step: step.title, kind: "ack", value: step.ackLabel })} />
    </div>
  );
}

function ReadingCheckpoint({ step, onComplete }) {
  const [val, setVal] = useState("");
  const num = parseFloat(val);
  const valid = val !== "" && !isNaN(num);
  const [lo, hi] = step.expectedRange || [null, null];
  const inRange = valid && lo != null ? num >= lo && num <= hi : true;
  return (
    <div>
      <div style={{ display: "flex", border: "1px solid " + (valid ? (inRange ? C.caution : C.hardstop) : C.line), borderRadius: 12, overflow: "hidden", background: C.panel }}>
        <input
          type="number" value={val} onChange={(e) => setVal(e.target.value)} placeholder="0.0"
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.ink, fontSize: 30, fontFamily: MONO, padding: "18px 20px", width: "100%" }}
        />
        <div style={{ display: "flex", alignItems: "center", padding: "0 22px", borderLeft: "1px solid " + C.line, color: C.inkDim, fontSize: 20, fontFamily: MONO }}>
          {step.unit}
        </div>
      </div>
      {lo != null && (
        <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 12, color: valid ? (inRange ? C.verify : C.hardstop) : C.inkFaint }}>
          expected {lo}\u2013{hi}{step.unit}{valid && (inRange ? "  \u00B7 in range" : "  \u00B7 OUT OF RANGE \u2014 flagged")}
        </div>
      )}
      <ProceedBtn
        enabled={valid}
        label={valid && !inRange ? "Log out-of-range reading" : "Log reading & continue"}
        warn={valid && !inRange}
        onClick={() => onComplete({ step: step.title, kind: "reading", value: `${num}${step.unit}`, flagged: !inRange })}
      />
    </div>
  );
}

function PhotoCheckpoint({ step, onComplete }) {
  const [captured, setCaptured] = useState(false);
  return (
    <div>
      <button
        onClick={() => setCaptured(true)}
        style={{
          width: "100%", height: 170, borderRadius: 12, cursor: "pointer",
          background: captured ? "rgba(61,220,151,0.07)" : C.panel,
          border: "1px dashed " + (captured ? C.verify : C.line),
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
        }}
      >
        <span style={{ fontSize: 34, color: captured ? C.verify : C.inkFaint }}>{captured ? "\u2713" : "\u25A1"}</span>
        <span style={{ color: captured ? C.ink : C.inkDim, fontSize: 14, fontFamily: MONO, letterSpacing: 0.5 }}>
          {captured ? "image captured \u00B7 attached to record" : "tap to capture"}
        </span>
      </button>
      <ProceedBtn enabled={captured} onClick={() => onComplete({ step: step.title, kind: "photo", value: "1 image attached" })} />
    </div>
  );
}

function ScanCheckpoint({ step, onComplete }) {
  const [state, setState] = useState("idle");
  useEffect(() => {
    if (state === "scanning") {
      const t = setTimeout(() => setState("ok"), 1100);
      return () => clearTimeout(t);
    }
  }, [state]);
  return (
    <div>
      <button
        onClick={() => state === "idle" && setState("scanning")}
        style={{
          width: "100%", height: 170, borderRadius: 12, cursor: state === "idle" ? "pointer" : "default",
          background: C.panel, position: "relative", overflow: "hidden",
          border: "1px solid " + (state === "ok" ? C.verify : C.scan),
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
        }}
      >
        {state !== "ok" && (
          <div style={{
            position: "absolute", left: 0, right: 0, height: 2, background: C.scan,
            boxShadow: "0 0 12px " + C.scan,
            animation: state === "scanning" ? "scanmove 1.1s linear" : "none",
            top: state === "scanning" ? undefined : "50%", opacity: state === "scanning" ? 1 : 0.35,
          }} />
        )}
        <span style={{ fontSize: 32, color: state === "ok" ? C.verify : C.scan }}>{state === "ok" ? "\u2713" : "\u29BF"}</span>
        <span style={{ color: state === "ok" ? C.ink : C.inkDim, fontSize: 14, fontFamily: MONO, letterSpacing: 0.5 }}>
          {state === "idle" && "tap to scan asset tag"}
          {state === "scanning" && "reading tag\u2026"}
          {state === "ok" && `matched: ${step.expectedTag}`}
        </span>
      </button>
      <ProceedBtn
        enabled={state === "ok"}
        label="Confirm unit & continue"
        onClick={() => onComplete({ step: step.title, kind: "scan", value: `tag ${step.expectedTag} verified` })}
      />
      <style>{`@keyframes scanmove{0%{top:8%}100%{top:92%}}`}</style>
    </div>
  );
}

function ProceedBtn({ enabled, onClick, label = "Verify & continue", warn = false }) {
  const color = warn ? C.caution : C.verify;
  return (
    <button
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      style={{ ...primaryBtn(color), marginTop: 20, opacity: enabled ? 1 : 0.32, cursor: enabled ? "pointer" : "not-allowed" }}
    >
      {label}
    </button>
  );
}

// ---------- DONE ----------
function Done({ task, log, start, onDone }) {
  const end = new Date();
  const mins = start ? Math.max(1, Math.round((end - start) / 60000)) : "\u2014";
  const flagged = log.filter((l) => l.flagged).length;
  return (
    <div style={{ padding: "30px 20px 40px" }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14, background: "rgba(61,220,151,0.12)",
        border: "1px solid " + C.verify, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, color: C.verify, marginBottom: 18,
      }}>\u2713</div>

      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, color: C.verify }}>TASK COMPLETE</div>
      <h1 style={{ color: C.ink, fontSize: 22, margin: "8px 0 0", fontWeight: 650, letterSpacing: -0.3 }}>{task.title}</h1>
      <div style={{ color: C.inkFaint, fontFamily: MONO, fontSize: 12, marginTop: 6 }}>
        {task.asset} \u00B7 {INTERVAL_LABEL[task.interval]}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <Stat label="Steps verified" value={`${log.length}/${task.steps.length}`} />
        <Stat label="Duration" value={`${mins}m`} />
        <Stat label="Flagged" value={flagged} alert={flagged > 0} />
      </div>

      <div style={{ marginTop: 24, fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, color: C.inkDim }}>AUDIT TRAIL</div>
      <div style={{ marginTop: 11, border: "1px solid " + C.line, borderRadius: 12, overflow: "hidden", background: C.panel }}>
        {log.map((e, i) => {
          const meta = KIND_META[e.kind];
          return (
            <div key={i} style={{ display: "flex", gap: 12, padding: "13px 14px", borderBottom: i < log.length - 1 ? "1px solid " + C.line : "none" }}>
              <span style={{ color: meta.color, fontFamily: MONO, fontSize: 13, width: 16, textAlign: "center", flexShrink: 0 }}>{meta.glyph}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.ink, fontSize: 13.5, fontWeight: 520, lineHeight: 1.3 }}>{e.step}</div>
                <div style={{ color: e.flagged ? C.hardstop : C.inkDim, fontSize: 12, fontFamily: MONO, marginTop: 3 }}>
                  {e.value}{e.flagged ? "  \u00B7 OUT OF RANGE" : ""}
                </div>
              </div>
              <span style={{ color: C.inkFaint, fontFamily: MONO, fontSize: 11, flexShrink: 0 }}>
                {e.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, padding: "13px 15px", borderRadius: 12, background: C.panelHi, border: "1px solid " + C.line }}>
        <div style={{ color: C.inkDim, fontSize: 12.5, lineHeight: 1.5 }}>
          Logged to the maintenance record and the interval reset. This immutable, time-stamped
          artifact is auditor-ready \u2014 and becomes training data for the facility AI expert.
        </div>
      </div>

      <button onClick={onDone} style={{ ...primaryBtn(C.verify), marginTop: 22 }}>
        Log & return to maintenance
      </button>
    </div>
  );
}

// ---------- shared ----------
function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: C.panelHi, border: "1px solid " + C.verifyDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 13, height: 13, borderRadius: 3, background: C.verify, boxShadow: "0 0 10px " + C.verifyDim }} />
      </div>
      <div>
        <div style={{ color: C.ink, fontSize: 15, fontWeight: 700, letterSpacing: 0.3 }}>FacilityOps</div>
        <div style={{ color: C.inkFaint, fontSize: 10.5, fontFamily: MONO, letterSpacing: 1 }}>MOP RUNNER</div>
      </div>
    </div>
  );
}

function Stat({ label, value, alert, caution }) {
  const col = alert ? C.hardstop : caution ? C.caution : C.ink;
  return (
    <div style={{ flex: 1, padding: "13px 12px", borderRadius: 10, background: C.panel, border: "1px solid " + C.line }}>
      <div style={{ color: col, fontSize: 21, fontFamily: MONO, fontWeight: 600 }}>{value}</div>
      <div style={{ color: C.inkFaint, fontSize: 10.5, marginTop: 3, letterSpacing: 0.3 }}>{label}</div>
    </div>
  );
}

function primaryBtn(color) {
  return {
    width: "100%", padding: "16px", borderRadius: 12, border: "none",
    background: color, color: "#06140E", fontSize: 15.5, fontWeight: 700,
    letterSpacing: 0.2, cursor: "pointer", fontFamily: SANS,
  };
}
