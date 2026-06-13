import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';
import type { CompletedRunRecord, ComplianceRef, RunEntry } from '@/types';
import { SYSTEMS } from '@/utils/dueStatus';

const FACILITY = 'Naples Edge — Hall B';

const KIND_LABEL: Record<RunEntry['kind'], string> = {
  ack: 'ACK', reading: 'READING', photo: 'PHOTO', scan: 'SCAN',
};

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { completedRuns, records } = useApp();

  const s = useMemo(() => makeStyles(colors), [colors]);

  const run = completedRuns.find(r => r.id === id);
  const procedure = run ? records.find(r => r.procedure.id === run.procedureId)?.procedure : undefined;

  if (!run) {
    return (
      <SafeAreaView style={s.root}>
        <View style={{ flex: 1, padding: 18 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={[s.empty, { marginTop: 40 }]}>Report not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const complianceRefs: ComplianceRef[] = procedure?.complianceRefs ?? [];
  const flaggedEntries = run.log.filter(e => e.flagged);
  const systemLabel = procedure ? SYSTEMS[procedure.system].label.toUpperCase() : '—';
  const intervalLabel = procedure?.interval.toUpperCase() ?? '—';
  const techName = run.techName ?? 'Field Technician';

  const completedDate = run.completedAt.toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const completedTime = run.completedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const generatedAt = run.completedAt.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  const startTime = run.log.length > 0
    ? run.log[0].ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  const handleShare = async () => {
    const lines: string[] = [
      'MAINTENANCE COMPLETION REPORT',
      `${FACILITY}`,
      `Generated: ${generatedAt}`,
      '',
      `PROCEDURE: ${run.procedureTitle}`,
      procedure ? `Asset: ${procedure.assetLabel}` : '',
      `System: ${systemLabel}  |  Interval: ${intervalLabel}`,
      procedure?.version !== undefined ? `Version: ${procedure.version}` : '',
      '',
    ];

    if (complianceRefs.length > 0) {
      lines.push('REGULATORY BASIS');
      complianceRefs.forEach(ref => {
        lines.push(`• ${ref.standard} ${ref.section} — ${ref.summary}`);
      });
      lines.push('');
    }

    lines.push('EXECUTION');
    lines.push(`Technician: ${techName}`);
    lines.push(`Date: ${completedDate}`);
    lines.push(`Started: ${startTime}  |  Completed: ${completedTime}  |  Duration: ${run.durationMins} min`);
    lines.push('');
    lines.push(`SUMMARY: ${run.log.length} steps  ·  ${run.durationMins} min  ·  ${run.flaggedCount} flagged`);
    lines.push('');
    lines.push('AUDIT TRAIL');
    lines.push('─'.repeat(60));

    run.log.forEach((entry, i) => {
      const step = `#${String(i + 1).padStart(2, '0')}  ${KIND_LABEL[entry.kind].padEnd(8)}  ${entry.stepTitle}`;
      const val = `     ${entry.value}${entry.flagged ? '  ⚠ OUT OF RANGE' : '  ✓'}`;
      const time = `     ${entry.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      lines.push(step, val, time, '');
    });

    if (flaggedEntries.length > 0) {
      lines.push('─'.repeat(60));
      lines.push('FLAGGED READINGS — ACTION REQUIRED');
      flaggedEntries.forEach((e, i) => {
        lines.push(`${i + 1}. ${e.stepTitle}: ${e.value}`);
        lines.push(`   Recorded at: ${e.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        lines.push(`   Escalate per facility incident procedure.`);
      });
      lines.push('');
    }

    lines.push('─'.repeat(60));
    lines.push('CERTIFICATION');
    lines.push('');
    lines.push('Technician: ____________________________  Date: ____________');
    lines.push('Print name: ____________________________  Title: ___________');
    lines.push('');
    lines.push('Reviewed by: ___________________________  Date: ____________');
    lines.push('');
    lines.push('─'.repeat(60));
    lines.push(`FacilityOps · ${run.procedureId}${procedure?.version !== undefined ? ` · v${procedure.version}` : ''}`);
    lines.push(`Generated: ${generatedAt}`);
    if (complianceRefs.length > 0) {
      lines.push(`Standards: ${complianceRefs.map(r => `${r.standard} ${r.section}`).join('; ')}`);
    }

    const text = lines.filter(l => l !== undefined).join('\n');
    try {
      await Share.share({ message: text, title: `PM Report — ${run.procedureTitle}` });
    } catch {
      Alert.alert('Share unavailable', 'Could not open the share sheet on this device.');
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* nav */}
        <View style={s.navRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} hitSlop={12} style={s.shareBtn}>
            <Text style={s.shareBtnText}>↑ Share</Text>
          </TouchableOpacity>
        </View>

        {/* document header */}
        <View style={s.docHeader}>
          <Text style={s.docType}>MAINTENANCE COMPLETION REPORT</Text>
          <Text style={s.docFacility}>{FACILITY}</Text>
          <Text style={s.docGenerated}>Generated {generatedAt}</Text>
        </View>

        <View style={s.divider} />

        {/* procedure identity */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>PROCEDURE</Text>
          <Text style={s.procTitle}>{run.procedureTitle}</Text>
          {procedure && (
            <>
              <Text style={s.procMeta}>Asset: {procedure.assetLabel}</Text>
              <View style={s.badgeRow}>
                <Badge label={systemLabel} color={colors.inkDim} colors={colors} />
                <Badge label={intervalLabel} color={colors.inkDim} colors={colors} />
                <Badge label={`v${procedure.version}`} color={colors.inkFaint} colors={colors} />
              </View>
            </>
          )}
        </View>

        {/* regulatory basis */}
        {complianceRefs.length > 0 && (
          <>
            <View style={s.divider} />
            <View style={s.section}>
              <Text style={s.sectionLabel}>REGULATORY BASIS</Text>
              {complianceRefs.map((ref, i) => (
                <View key={i} style={[s.refRow, i < complianceRefs.length - 1 && s.refRowBorder]}>
                  <View style={s.refLeft}>
                    <Text style={s.refStandard}>{ref.standard}</Text>
                    <Text style={s.refSection}>{ref.section}</Text>
                  </View>
                  <Text style={s.refSummary}>{ref.summary}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* execution summary */}
        <View style={s.divider} />
        <View style={s.section}>
          <Text style={s.sectionLabel}>EXECUTION</Text>
          <View style={s.execGrid}>
            <ExecCell label="Technician" value={techName} colors={colors} />
            <ExecCell label="Date" value={completedDate} colors={colors} />
            <ExecCell label="Started" value={startTime} colors={colors} />
            <ExecCell label="Completed" value={completedTime} colors={colors} />
            <ExecCell label="Duration" value={`${run.durationMins} min`} colors={colors} />
            <ExecCell label="Risk statement" value={procedure?.riskStatement ?? '—'} colors={colors} wide />
          </View>
        </View>

        {/* summary stats */}
        <View style={s.summaryStrip}>
          <SumStat label="Steps" value={`${run.log.length}`} colors={colors} />
          <View style={s.summaryDivider} />
          <SumStat label="Duration" value={`${run.durationMins}m`} colors={colors} />
          <View style={s.summaryDivider} />
          <SumStat label="Flagged" value={`${run.flaggedCount}`} alert={run.flaggedCount > 0} colors={colors} />
          <View style={s.summaryDivider} />
          <SumStat
            label="Result"
            value={run.flaggedCount > 0 ? 'WITH FLAGS' : 'CLEAN'}
            alert={run.flaggedCount > 0}
            colors={colors}
          />
        </View>

        {/* audit trail */}
        <View style={s.divider} />
        <View style={s.section}>
          <Text style={s.sectionLabel}>AUDIT TRAIL</Text>
          {run.log.map((entry, i) => (
            <TrailRow key={i} entry={entry} index={i} isLast={i === run.log.length - 1} colors={colors} />
          ))}
        </View>

        {/* flagged items */}
        {flaggedEntries.length > 0 && (
          <>
            <View style={s.divider} />
            <View style={s.section}>
              <Text style={[s.sectionLabel, { color: colors.hardstop }]}>FLAGGED READINGS — ACTION REQUIRED</Text>
              {flaggedEntries.map((entry, i) => (
                <View key={i} style={[s.flagBox, i < flaggedEntries.length - 1 && s.flagBoxBorder]}>
                  <View style={[s.flagStripe, { backgroundColor: colors.hardstop }]} />
                  <View style={s.flagContent}>
                    <Text style={s.flagStep}>{entry.stepTitle}</Text>
                    <Text style={s.flagValue}>{entry.value}</Text>
                    <Text style={s.flagTime}>
                      Recorded at {entry.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Escalate per facility incident procedure.
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* certification block */}
        <View style={s.divider} />
        <View style={s.section}>
          <Text style={s.sectionLabel}>CERTIFICATION</Text>
          <Text style={s.certPara}>
            I certify that the work described in this record was performed in accordance with the applicable procedure
            and all checkpoints were completed as recorded.
          </Text>
          <View style={s.sigGrid}>
            <SigLine label="Technician signature" colors={colors} />
            <SigLine label="Print name" colors={colors} />
            <SigLine label="Date signed" short colors={colors} />
            <View style={s.sigSpacerFull} />
            <SigLine label="Reviewed by" colors={colors} />
            <SigLine label="Title / Role" colors={colors} />
            <SigLine label="Review date" short colors={colors} />
          </View>
        </View>

        {/* document footer */}
        <View style={s.divider} />
        <View style={s.docFooter}>
          <Text style={s.footerLine}>
            FacilityOps · {run.procedureId}{procedure?.version !== undefined ? ` · v${procedure.version}` : ''} · {FACILITY}
          </Text>
          {complianceRefs.length > 0 && (
            <Text style={s.footerLine}>
              {complianceRefs.map(r => `${r.standard} ${r.section}`).join('  ·  ')}
            </Text>
          )}
          <Text style={s.footerLine}>Generated: {generatedAt}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, color, colors }: { label: string; color: string; colors: ColorPalette }) {
  return (
    <View style={{ borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderColor: color, marginRight: 6 }}>
      <Text style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 0.8, color }}>{label}</Text>
    </View>
  );
}

function ExecCell({ label, value, colors, wide }: { label: string; value: string; colors: ColorPalette; wide?: boolean }) {
  return (
    <View style={{ width: wide ? '100%' : '50%', paddingVertical: 6, paddingRight: 12 }}>
      <Text style={{ color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 0.8, marginBottom: 3 }}>{label.toUpperCase()}</Text>
      <Text style={{ color: colors.ink, fontSize: 13, lineHeight: 18 }}>{value}</Text>
    </View>
  );
}

function SumStat({ label, value, alert, colors }: { label: string; value: string; alert?: boolean; colors: ColorPalette }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
      <Text style={{ color: alert ? colors.hardstop : colors.ink, fontFamily: FONT_MONO, fontSize: 15, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function TrailRow({ entry, index, isLast, colors }: { entry: RunEntry; index: number; isLast: boolean; colors: ColorPalette }) {
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[s.trailRow, !isLast && s.trailRowBorder]}>
      <Text style={s.trailNum}>{String(index + 1).padStart(2, '0')}</Text>
      <View style={s.trailMid}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <Text style={s.trailKind}>{KIND_LABEL[entry.kind]}</Text>
          <Text style={s.trailTitle}>{entry.stepTitle}</Text>
        </View>
        <Text style={[s.trailValue, entry.flagged && { color: colors.hardstop }]}>
          {entry.value}{entry.flagged ? '  ⚠ OUT OF RANGE' : ''}
        </Text>
      </View>
      <View style={s.trailRight}>
        <Text style={[s.trailStatus, entry.flagged ? { color: colors.hardstop } : { color: colors.verify }]}>
          {entry.flagged ? '⚠' : '✓'}
        </Text>
        <Text style={s.trailTs}>
          {entry.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

function SigLine({ label, short, colors }: { label: string; short?: boolean; colors: ColorPalette }) {
  return (
    <View style={{ width: short ? '40%' : '100%', marginBottom: 16 }}>
      <View style={{ height: 1, backgroundColor: colors.line, marginBottom: 6 }} />
      <Text style={{ color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 18, paddingBottom: 48 },
    empty:  { color: colors.inkDim, fontSize: 16 },

    navRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    back:        { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 12 },
    shareBtn:    { backgroundColor: colors.verify, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
    shareBtnText:{ color: '#06140E', fontFamily: FONT_MONO, fontSize: 12, fontWeight: '700' },

    docHeader:    { marginBottom: 16 },
    docType:      { color: colors.ink, fontSize: 11, fontFamily: FONT_MONO, letterSpacing: 2, fontWeight: '700', marginBottom: 6 },
    docFacility:  { color: colors.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.3, marginBottom: 4 },
    docGenerated: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11 },

    divider: { height: 1, backgroundColor: colors.line, marginVertical: 16 },

    section:      { marginBottom: 4 },
    sectionLabel: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 2, marginBottom: 12 },

    procTitle:  { color: colors.ink, fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginBottom: 6 },
    procMeta:   { color: colors.inkDim, fontSize: 13, marginBottom: 10 },
    badgeRow:   { flexDirection: 'row', flexWrap: 'wrap' },

    refRow:       { paddingVertical: 10, gap: 6 },
    refRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    refLeft:      { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 3 },
    refStandard:  { color: colors.ink, fontFamily: FONT_MONO, fontSize: 12, fontWeight: '700' },
    refSection:   { color: colors.verify, fontFamily: FONT_MONO, fontSize: 11 },
    refSummary:   { color: colors.inkDim, fontSize: 13, lineHeight: 19 },

    execGrid: { flexDirection: 'row', flexWrap: 'wrap' },

    summaryStrip:   { flexDirection: 'row', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 12, marginVertical: 4 },
    summaryDivider: { width: 1, backgroundColor: colors.line, marginVertical: 8 },

    trailRow:       { flexDirection: 'row', gap: 10, paddingVertical: 10 },
    trailRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    trailNum:       { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 12, width: 22, marginTop: 1 },
    trailMid:       { flex: 1, minWidth: 0 },
    trailKind:      { backgroundColor: colors.panelHi, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, fontFamily: FONT_MONO, fontSize: 10, color: colors.inkDim },
    trailTitle:     { color: colors.ink, fontSize: 13, fontWeight: '500', flex: 1 },
    trailValue:     { color: colors.inkDim, fontFamily: FONT_MONO, fontSize: 12, marginTop: 1 },
    trailRight:     { alignItems: 'flex-end', gap: 2 },
    trailStatus:    { fontFamily: FONT_MONO, fontSize: 14 },
    trailTs:        { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11 },

    flagBox:       { flexDirection: 'row', gap: 12, paddingVertical: 12 },
    flagBoxBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    flagStripe:    { width: 3, borderRadius: 2, alignSelf: 'stretch' },
    flagContent:   { flex: 1 },
    flagStep:      { color: colors.ink, fontSize: 14, fontWeight: '600', marginBottom: 3 },
    flagValue:     { color: colors.hardstop, fontFamily: FONT_MONO, fontSize: 13, marginBottom: 4 },
    flagTime:      { color: colors.inkDim, fontSize: 12, lineHeight: 18 },

    certPara: { color: colors.inkDim, fontSize: 13, lineHeight: 20, marginBottom: 20 },
    sigGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 0, columnGap: 20 },
    sigSpacerFull: { width: '100%', height: 8 },

    docFooter: { paddingTop: 4 },
    footerLine: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10, lineHeight: 18, letterSpacing: 0.3 },
  });
}
