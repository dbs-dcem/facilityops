import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';
import type { CompletedRunRecord, RunEntry } from '@/types';

const KIND_GLYPH: Record<RunEntry['kind'], string> = { ack: '✓', reading: '#', photo: '□', scan: '⊙' };
const KIND_COLOR: Record<RunEntry['kind'], keyof ColorPalette> = {
  ack: 'verify', reading: 'caution', photo: 'inkDim', scan: 'scan',
};

export default function LogsScreen() {
  const router = useRouter();
  const { completedRuns } = useApp();
  const { colors } = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const s = useMemo(() => makeStyles(colors), [colors]);

  if (completedRuns.length === 0) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.emptyContainer}>
          <Text style={s.screenTitle}>Run Logs</Text>
          <Text style={s.emptyText}>No completed runs yet.</Text>
          <Text style={s.emptyHint}>Complete a PM task and the audit trail will appear here.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={s.screenTitle}>Run Logs</Text>
        <Text style={s.count}>{completedRuns.length} completed run{completedRuns.length !== 1 ? 's' : ''}</Text>

        {completedRuns.map(run => {
          const expanded = expandedId === run.id;
          return (
            <RunCard
              key={run.id}
              run={run}
              expanded={expanded}
              colors={colors}
              onToggle={() => setExpandedId(expanded ? null : run.id)}
              onViewReport={() => router.push(`/report/${run.id}`)}
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── RunCard ─────────────────────────────────────────────────────────────────

function RunCard({ run, expanded, colors, onToggle, onViewReport }: {
  run: CompletedRunRecord;
  expanded: boolean;
  colors: ColorPalette;
  onToggle: () => void;
  onViewReport: () => void;
}) {
  const s = useMemo(() => makeStyles(colors), [colors]);
  const completedDate = run.completedAt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const completedTime = run.completedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity style={[s.card, expanded && s.cardExpanded]} onPress={onToggle} activeOpacity={0.85}>
      <View style={s.cardTop}>
        <View style={[s.statusDot, { backgroundColor: run.flaggedCount > 0 ? colors.caution : colors.verify }]} />
        <View style={s.cardInfo}>
          <Text style={s.cardTitle} numberOfLines={expanded ? undefined : 2}>{run.procedureTitle}</Text>
          <Text style={s.cardMeta}>{completedDate} · {completedTime}</Text>
        </View>
        <Text style={s.expandChevron}>{expanded ? '∧' : '∨'}</Text>
      </View>

      <View style={s.statRow}>
        <MiniStat label="Steps" value={`${run.log.length}`} colors={colors} />
        <MiniStat label="Duration" value={`${run.durationMins}m`} colors={colors} />
        <MiniStat label="Flagged" value={`${run.flaggedCount}`} alert={run.flaggedCount > 0} colors={colors} />
      </View>

      {expanded && (
        <View style={s.trailBox}>
          <View style={s.trailHeader}>
            <Text style={s.trailHeading}>AUDIT TRAIL</Text>
            <TouchableOpacity onPress={onViewReport} hitSlop={8} style={s.reportBtn}>
              <Text style={s.reportBtnText}>View Report ↗</Text>
            </TouchableOpacity>
          </View>
          {run.log.map((entry, i) => (
            <View key={i} style={[s.trailRow, i < run.log.length - 1 && s.trailRowBorder]}>
              <Text style={[s.trailGlyph, { color: colors[KIND_COLOR[entry.kind]] as string }]}>
                {KIND_GLYPH[entry.kind]}
              </Text>
              <View style={s.trailContent}>
                <Text style={s.trailStep}>{entry.stepTitle}</Text>
                <Text style={[s.trailValue, entry.flagged && s.trailFlagged]}>
                  {entry.value}{entry.flagged ? '  · OUT OF RANGE' : ''}
                </Text>
              </View>
              <Text style={s.trailTs}>
                {entry.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
          {run.techName && (
            <View style={s.techRow}>
              <Text style={s.techLabel}>TECHNICIAN</Text>
              <Text style={s.techName}>{run.techName}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function MiniStat({ label, value, alert, colors }: { label: string; value: string; alert?: boolean; colors: ColorPalette }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: alert ? colors.caution : colors.ink, fontFamily: FONT_MONO, fontSize: 15, fontWeight: '600' }}>{value}</Text>
      <Text style={{ color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 18, paddingBottom: 40 },

    emptyContainer: { flex: 1, padding: 18 },
    screenTitle:    { color: colors.ink, fontSize: 21, fontWeight: '700', letterSpacing: -0.3, marginBottom: 6 },
    count:          { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11, marginBottom: 16 },
    emptyText:      { color: colors.inkDim, fontSize: 16, fontWeight: '600', marginTop: 40 },
    emptyHint:      { color: colors.inkFaint, fontSize: 13, lineHeight: 20, marginTop: 8 },

    card:         { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, marginBottom: 10 },
    cardExpanded: { borderColor: colors.verifyDim },
    cardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
    statusDot:    { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
    cardInfo:     { flex: 1 },
    cardTitle:    { color: colors.ink, fontSize: 14.5, fontWeight: '600', lineHeight: 20 },
    cardMeta:     { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11, marginTop: 3 },
    expandChevron: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 14 },

    statRow:  { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },

    trailBox:     { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
    trailHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    trailHeading: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1.5 },
    reportBtn:    { borderWidth: 1, borderColor: colors.verify, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    reportBtnText:{ color: colors.verify, fontFamily: FONT_MONO, fontSize: 10 },
    techRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
    techLabel:    { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1 },
    techName:     { color: colors.inkDim, fontFamily: FONT_MONO, fontSize: 11 },
    trailRow:     { flexDirection: 'row', gap: 10, paddingVertical: 8 },
    trailRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    trailGlyph:   { fontFamily: FONT_MONO, fontSize: 13, width: 16, textAlign: 'center' },
    trailContent: { flex: 1, minWidth: 0 },
    trailStep:    { color: colors.ink, fontSize: 13, fontWeight: '500' },
    trailValue:   { color: colors.inkDim, fontFamily: FONT_MONO, fontSize: 11, marginTop: 2 },
    trailFlagged: { color: colors.hardstop },
    trailTs:      { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11 },
  });
}
