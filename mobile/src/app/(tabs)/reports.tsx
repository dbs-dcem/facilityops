import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import type { ProcedureRecord } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';
import { INTERVAL_LABEL, INTERVAL_ORDER, SYSTEMS, sysInfoFor, statusFor, INTERVAL_DAYS } from '@/utils/dueStatus';
import type { CompletedRunRecord } from '@/types';
import type { SystemKey, IntervalKey } from '@/types';

// ─── Report selector ─────────────────────────────────────────────────────────

type ReportKind = 'compliance' | 'history' | 'escalations' | 'assets' | 'technicians';

const REPORT_TABS: { kind: ReportKind; label: string }[] = [
  { kind: 'compliance',  label: 'Compliance'  },
  { kind: 'history',     label: 'Run History' },
  { kind: 'escalations', label: 'Escalations' },
  { kind: 'assets',      label: 'Assets'      },
  { kind: 'technicians', label: 'Technicians' },
];

type HistoryRange = '7d' | '30d' | '90d' | 'all';
const HISTORY_RANGES: { key: HistoryRange; label: string }[] = [
  { key: '7d',  label: 'Last 7 days'  },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'all', label: 'All time'     },
];

function rangeMs(key: HistoryRange): number {
  if (key === '7d')  return 7  * 86_400_000;
  if (key === '30d') return 30 * 86_400_000;
  if (key === '90d') return 90 * 86_400_000;
  return Infinity;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

function buildShareText(
  report: ReportKind,
  records: ProcedureRecord[],
  completedRuns: CompletedRunRecord[],
  histRange: HistoryRange,
): string {
  const line = '─'.repeat(48);
  const now = new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  if (report === 'compliance') {
    const statuses = records.map(r => statusFor(r.lastCompletedAt, r.procedure.interval));
    const overdue  = statuses.filter(s => s.state === 'overdue').length;
    const due      = statuses.filter(s => s.state === 'due').length;
    const ok       = records.length - overdue - due;
    const pct = (n: number) => records.length ? `${Math.round(n / records.length * 100)}%` : '—';
    const lines = [
      'I.R.I.S. — COMPLIANCE SUMMARY',
      `Generated: ${now}`,
      line,
      `Total procedures : ${records.length}`,
      `On Track         : ${ok}  (${pct(ok)})`,
      `Due Soon         : ${due}  (${pct(due)})`,
      `Overdue          : ${overdue}  (${pct(overdue)})`,
      line,
      'BY SYSTEM',
      ...(Object.keys(SYSTEMS) as SystemKey[]).flatMap(key => {
        const recs = records.filter(r => r.procedure.system === key);
        if (!recs.length) return [];
        const sts = recs.map(r => statusFor(r.lastCompletedAt, r.procedure.interval));
        const ov = sts.filter(s => s.state === 'overdue').length;
        const du = sts.filter(s => s.state === 'due').length;
        return [`${SYSTEMS[key].label.padEnd(16)} ${recs.length - ov - du}/${recs.length} on track${ov ? `  ${ov} OVERDUE` : ''}`];
      }),
    ];
    return lines.join('\n');
  }

  if (report === 'history') {
    const cutoff   = Date.now() - rangeMs(histRange);
    const filtered = completedRuns.filter(r => r.completedAt.getTime() >= cutoff);
    const mins     = filtered.reduce((s, r) => s + r.durationMins, 0);
    const lines = [
      'I.R.I.S. — RUN HISTORY',
      `Generated: ${now}  |  Range: ${HISTORY_RANGES.find(r => r.key === histRange)?.label}`,
      line,
      `Runs: ${filtered.length}  |  Total time: ${mins} min  |  Avg: ${filtered.length ? Math.round(mins / filtered.length) : '—'} min`,
      `Flagged runs: ${filtered.filter(r => r.flaggedCount > 0).length}  |  Escalated: ${filtered.filter(r => r.escalated).length}`,
      line,
      ...filtered.map(r =>
        `${r.completedAt.toLocaleDateString([], { month: 'short', day: 'numeric' })}  ${r.procedureTitle}  [${r.techName ?? '—'}]${r.escalated ? '  ESCALATED' : r.flaggedCount ? `  ${r.flaggedCount} flagged` : ''}`
      ),
    ];
    return lines.join('\n');
  }

  return `I.R.I.S. Report — ${report}\nGenerated: ${now}`;
}

export default function ReportsScreen() {
  const { records, completedRuns } = useApp();
  const { colors } = useTheme();
  const [report, setReport] = useState<ReportKind>('compliance');
  const [histRange, setHistRange] = useState<HistoryRange>('30d');

  const s = useMemo(() => makeStyles(colors), [colors]);

  const canShare = report === 'compliance' || report === 'history';

  const handleShare = async () => {
    try {
      const text = buildShareText(report, records, completedRuns, histRange);
      await Share.share({ message: text, title: `I.R.I.S. ${REPORT_TABS.find(t => t.kind === report)?.label}` });
    } catch {
      Alert.alert('Share unavailable', 'Could not open the share sheet on this device.');
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.titleRow}>
          <Text style={s.screenTitle}>Reports</Text>
          {canShare && (
            <TouchableOpacity onPress={handleShare} hitSlop={12} style={[s.shareBtn, { borderColor: colors.verify }]}>
              <Text style={[s.shareBtnText, { color: colors.verify }]}>↑ Share</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* report type picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={s.tabRow}>
          {REPORT_TABS.map(t => (
            <TouchableOpacity
              key={t.kind}
              style={[s.tabPill, report === t.kind && { backgroundColor: colors.verify }]}
              onPress={() => setReport(t.kind)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabPillText, { color: report === t.kind ? '#06140E' : colors.inkDim }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {report === 'compliance'  && <ComplianceReport  records={records} colors={colors} />}
        {report === 'history'     && <HistoryReport      completedRuns={completedRuns} range={histRange} setRange={setHistRange} colors={colors} />}
        {report === 'escalations' && <EscalationsReport  completedRuns={completedRuns} colors={colors} />}
        {report === 'assets'      && <AssetsReport       records={records} completedRuns={completedRuns} colors={colors} />}
        {report === 'technicians' && <TechniciansReport  completedRuns={completedRuns} colors={colors} />}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Compliance report ───────────────────────────────────────────────────────

function ComplianceReport({ records, colors }: { records: ProcedureRecord[]; colors: ColorPalette }) {
  const statuses = records.map(r => statusFor(r.lastCompletedAt, r.procedure.interval));
  const overdue  = statuses.filter(s => s.state === 'overdue').length;
  const due      = statuses.filter(s => s.state === 'due').length;
  const ok       = records.length - overdue - due;
  const total    = records.length;

  type SysRow = { key: SystemKey; label: string; color: string; glyph: string; total: number; ok: number; due: number; overdue: number };
  type IntRow = { key: IntervalKey; label: string; total: number; ok: number; due: number; overdue: number };

  const bySys: SysRow[] = (Object.keys(SYSTEMS) as SystemKey[]).flatMap(key => {
    const recs = records.filter(r => r.procedure.system === key);
    if (recs.length === 0) return [];
    const sts   = recs.map(r => statusFor(r.lastCompletedAt, r.procedure.interval));
    const sOvd  = sts.filter(st => st.state === 'overdue').length;
    const sDue  = sts.filter(st => st.state === 'due').length;
    return [{ key, ...SYSTEMS[key], total: recs.length, ok: recs.length - sOvd - sDue, due: sDue, overdue: sOvd }];
  });

  const byInt: IntRow[] = INTERVAL_ORDER.flatMap(key => {
    const recs = records.filter(r => r.procedure.interval === key);
    if (recs.length === 0) return [];
    const sts   = recs.map(r => statusFor(r.lastCompletedAt, r.procedure.interval));
    const sOvd  = sts.filter(st => st.state === 'overdue').length;
    const sDue  = sts.filter(st => st.state === 'due').length;
    return [{ key, label: INTERVAL_LABEL[key], total: recs.length, ok: recs.length - sOvd - sDue, due: sDue, overdue: sOvd }];
  });

  return (
    <View>
      <SectionLabel label="OVERALL" colors={colors} />
      <StatBar label="On Track" value={ok}      total={total} color={colors.verify}   colors={colors} />
      <StatBar label="Due Soon"  value={due}     total={total} color={colors.caution}  colors={colors} />
      <StatBar label="Overdue"   value={overdue} total={total} color={colors.hardstop} colors={colors} />

      <SectionLabel label="BY SYSTEM" colors={colors} />
      {bySys.map(s => (
        <View key={s.key} style={{ marginBottom: 10 }}>
          <Text style={{ color: s.color, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>
            {s.glyph}  {s.label.toUpperCase()}
          </Text>
          <StatBar label="On Track" value={s.ok}      total={s.total} color={colors.verify}   colors={colors} compact />
          <StatBar label="Due Soon"  value={s.due}     total={s.total} color={colors.caution}  colors={colors} compact />
          <StatBar label="Overdue"   value={s.overdue} total={s.total} color={colors.hardstop} colors={colors} compact />
        </View>
      ))}

      <SectionLabel label="BY INTERVAL" colors={colors} />
      {byInt.map(i => (
        <View key={i.key} style={{ marginBottom: 10 }}>
          <Text style={{ color: colors.inkDim, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>
            {i.label.toUpperCase()}
          </Text>
          <StatBar label="On Track" value={i.ok}      total={i.total} color={colors.verify}   colors={colors} compact />
          <StatBar label="Due Soon"  value={i.due}     total={i.total} color={colors.caution}  colors={colors} compact />
          <StatBar label="Overdue"   value={i.overdue} total={i.total} color={colors.hardstop} colors={colors} compact />
        </View>
      ))}
    </View>
  );
}

// ─── Run History report ──────────────────────────────────────────────────────

function HistoryReport({ completedRuns, range, setRange, colors }: {
  completedRuns: CompletedRunRecord[];
  range: HistoryRange;
  setRange: (r: HistoryRange) => void;
  colors: ColorPalette;
}) {
  const cutoff = Date.now() - rangeMs(range);
  const filtered = completedRuns.filter(r => r.completedAt.getTime() >= cutoff);
  const totalMins = filtered.reduce((s, r) => s + r.durationMins, 0);
  const flagged   = filtered.filter(r => r.flaggedCount > 0).length;
  const escalated = filtered.filter(r => r.escalated).length;

  return (
    <View>
      {/* range selector */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {HISTORY_RANGES.map(r => (
          <TouchableOpacity
            key={r.key}
            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1,
              borderColor: range === r.key ? colors.verify : colors.line,
              backgroundColor: range === r.key ? colors.verifyDim : 'transparent' }}
            onPress={() => setRange(r.key)}
          >
            <Text style={{ fontFamily: FONT_MONO, fontSize: 11, color: range === r.key ? colors.verify : colors.inkDim }}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionLabel label="SUMMARY" colors={colors} />
      <KVRow label="Runs completed" value={String(filtered.length)} colors={colors} />
      <KVRow label="Total time"     value={`${totalMins} min`}      colors={colors} />
      <KVRow label="Avg duration"   value={filtered.length ? `${Math.round(totalMins / filtered.length)} min` : '—'} colors={colors} />
      <KVRow label="With flags"     value={String(flagged)}          colors={colors} alert={flagged > 0} />
      <KVRow label="Escalated"      value={String(escalated)}        colors={colors} alert={escalated > 0} />

      <SectionLabel label={`RUNS (${filtered.length})`} colors={colors} />
      {filtered.length === 0 && <Empty label="No completed runs in this range." colors={colors} />}
      {filtered.map(r => (
        <View key={r.id} style={{ backgroundColor: colors.panel, borderWidth: 1, borderColor: r.escalated ? colors.hardstop : r.flaggedCount > 0 ? colors.caution : colors.line, borderRadius: 10, padding: 12, marginBottom: 8 }}>
          <Text style={{ color: colors.ink, fontSize: 13.5, fontWeight: '600', marginBottom: 4 }} numberOfLines={2}>{r.procedureTitle}</Text>
          <Text style={{ color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10 }}>
            {r.completedAt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            {'  ·  '}{r.techName ?? '—'}
            {'  ·  '}{r.durationMins} min
            {r.flaggedCount > 0 ? `  ·  ${r.flaggedCount} flagged` : ''}
            {r.escalated ? '  ·  ESCALATED' : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Escalations report ──────────────────────────────────────────────────────

function EscalationsReport({ completedRuns, colors }: { completedRuns: CompletedRunRecord[]; colors: ColorPalette }) {
  const escalated = completedRuns.filter(r => r.escalated);
  const now = Date.now();

  return (
    <View>
      <SectionLabel label="SUMMARY" colors={colors} />
      <KVRow label="Total escalations" value={String(escalated.length)} colors={colors} alert={escalated.length > 0} />
      <KVRow label="Oldest open"
        value={escalated.length ? `${Math.floor((now - escalated[escalated.length - 1].completedAt.getTime()) / 86_400_000)}d ago` : '—'}
        colors={colors} />

      <SectionLabel label={`ALL ESCALATIONS (${escalated.length})`} colors={colors} />
      {escalated.length === 0 && <Empty label="No escalated runs." colors={colors} />}
      {escalated.map(r => {
        const daysAgo = Math.floor((now - r.completedAt.getTime()) / 86_400_000);
        return (
          <View key={r.id} style={{ backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.hardstop, borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <Text style={{ color: colors.hardstop, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>
              ESCALATED · {daysAgo === 0 ? 'today' : `${daysAgo}d ago`}
            </Text>
            <Text style={{ color: colors.ink, fontSize: 13.5, fontWeight: '600', marginBottom: 6 }} numberOfLines={2}>{r.procedureTitle}</Text>
            <Text style={{ color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10 }}>
              {r.completedAt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              {'  ·  '}{r.techName ?? '—'}
              {'  ·  '}{r.flaggedCount} checkpoint{r.flaggedCount !== 1 ? 's' : ''} flagged
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Asset service history ────────────────────────────────────────────────────

function AssetsReport({ records, completedRuns, colors }: {
  records: ProcedureRecord[];
  completedRuns: CompletedRunRecord[];
  colors: ColorPalette;
}) {
  const assets = useMemo(() =>
    records.map(r => {
      const runs = completedRuns.filter(cr => cr.procedureId === r.procedure.id);
      const totalMins = runs.reduce((s, cr) => s + cr.durationMins, 0);
      const sys = sysInfoFor(r.procedure);
      return {
        procedure: r.procedure,
        lastCompletedAt: r.lastCompletedAt,
        runCount: runs.length,
        avgMins: runs.length ? Math.round(totalMins / runs.length) : null,
        flaggedRuns: runs.filter(cr => cr.flaggedCount > 0).length,
        sys,
      };
    }).sort((a, b) => {
      if (!a.lastCompletedAt) return -1;
      if (!b.lastCompletedAt) return 1;
      return a.lastCompletedAt.getTime() - b.lastCompletedAt.getTime();
    }),
    [records, completedRuns],
  );

  return (
    <View>
      <SectionLabel label={`PROCEDURE SERVICE HISTORY (${assets.length})`} colors={colors} />
      {assets.map(a => (
        <View key={a.procedure.id} style={{ backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: a.sys.color }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{a.procedure.title}</Text>
              <Text style={{ color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10, marginTop: 2 }}>{a.procedure.assetLabel}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
            <MiniKV label="Last Service" value={a.lastCompletedAt ? a.lastCompletedAt.toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Never'} colors={colors} />
            <MiniKV label="Total Runs"   value={String(a.runCount)} colors={colors} />
            <MiniKV label="Avg Duration" value={a.avgMins !== null ? `${a.avgMins}m` : '—'} colors={colors} />
            <MiniKV label="Runs Flagged" value={String(a.flaggedRuns)} colors={colors} alert={a.flaggedRuns > 0} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Technician activity ─────────────────────────────────────────────────────

function TechniciansReport({ completedRuns, colors }: { completedRuns: CompletedRunRecord[]; colors: ColorPalette }) {
  const techs = useMemo(() => {
    const map = new Map<string, { runs: number; mins: number; flagged: number; escalated: number }>();
    completedRuns.forEach(r => {
      const name = r.techName ?? 'Unknown';
      const cur = map.get(name) ?? { runs: 0, mins: 0, flagged: 0, escalated: 0 };
      map.set(name, {
        runs:      cur.runs + 1,
        mins:      cur.mins + r.durationMins,
        flagged:   cur.flagged + (r.flaggedCount > 0 ? 1 : 0),
        escalated: cur.escalated + (r.escalated ? 1 : 0),
      });
    });
    return [...map.entries()]
      .map(([name, d]) => ({ name, ...d, avgMins: Math.round(d.mins / d.runs) }))
      .sort((a, b) => b.runs - a.runs);
  }, [completedRuns]);

  return (
    <View>
      <SectionLabel label={`TECHNICIANS (${techs.length})`} colors={colors} />
      {techs.length === 0 && <Empty label="No completed runs yet." colors={colors} />}
      {techs.map(t => (
        <View key={t.name} style={{ backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginBottom: 8 }}>
          <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '700', marginBottom: 10 }}>{t.name}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            <MiniKV label="Runs"       value={String(t.runs)}    colors={colors} />
            <MiniKV label="Total Time" value={`${t.mins}m`}      colors={colors} />
            <MiniKV label="Avg / Run"  value={`${t.avgMins}m`}   colors={colors} />
            <MiniKV label="Flagged"    value={String(t.flagged)}  colors={colors} alert={t.flagged > 0} />
            <MiniKV label="Escalated"  value={String(t.escalated)} colors={colors} alert={t.escalated > 0} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatBar({ label, value, total, color, colors, compact }: {
  label: string; value: number; total: number; color: string; colors: ColorPalette; compact?: boolean;
}) {
  const pct = total > 0 ? value / total : 0;
  return (
    <View style={{ marginBottom: compact ? 5 : 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ color: colors.inkDim, fontFamily: FONT_MONO, fontSize: compact ? 10 : 11 }}>{label}</Text>
        <Text style={{ color, fontFamily: FONT_MONO, fontSize: compact ? 10 : 11, fontWeight: '700' }}>
          {value}/{total}  {total > 0 ? `${Math.round(pct * 100)}%` : '—'}
        </Text>
      </View>
      <View style={{ height: compact ? 4 : 6, backgroundColor: colors.panelHi, borderRadius: 3 }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

function KVRow({ label, value, colors, alert }: { label: string; value: string; colors: ColorPalette; alert?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <Text style={{ color: colors.inkDim, fontFamily: FONT_MONO, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: alert ? colors.hardstop : colors.ink, fontFamily: FONT_MONO, fontSize: 12, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

function MiniKV({ label, value, colors, alert }: { label: string; value: string; colors: ColorPalette; alert?: boolean }) {
  return (
    <View>
      <Text style={{ color: alert ? colors.hardstop : colors.ink, fontFamily: FONT_MONO, fontSize: 14, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 9, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: ColorPalette }) {
  return (
    <Text style={{ color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1.5, marginTop: 20, marginBottom: 10 }}>
      {label}
    </Text>
  );
}

function Empty({ label, colors }: { label: string; colors: ColorPalette }) {
  return <Text style={{ color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 12, textAlign: 'center', marginTop: 20 }}>{label}</Text>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 18, paddingBottom: 48 },

    titleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    screenTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', letterSpacing: -0.3 },
    shareBtn:    { borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
    shareBtnText:{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: '700' },

    tabScroll: { marginBottom: 20 },
    tabRow:    { flexDirection: 'row', gap: 8 },
    tabPill:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.line },
    tabPillText: { fontFamily: FONT_MONO, fontSize: 12, fontWeight: '600' },
  });
}
