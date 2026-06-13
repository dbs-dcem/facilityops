import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';
import type { CompletedRunRecord } from '@/types';
import { syncEscalations } from '@/services/syncService';

export default function EscalationsScreen() {
  const router = useRouter();
  const { completedRuns } = useApp();
  const { colors } = useTheme();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const s = useMemo(() => makeStyles(colors), [colors]);

  const escalated = useMemo(
    () => completedRuns.filter(r => r.escalated).sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime()),
    [completedRuns],
  );

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      await syncEscalations(escalated);
      setLastSync(new Date());
    } catch (e: any) {
      setSyncError(e.message ?? 'Connection failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={[s.back, { color: colors.inkFaint }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.ink }]}>Escalations</Text>
          <Text style={[s.badge, { color: colors.hardstop, borderColor: colors.hardstop }]}>
            {escalated.length}
          </Text>
        </View>

        {escalated.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={[s.emptyIcon, { color: colors.verify }]}>✓</Text>
            <Text style={[s.emptyTitle, { color: colors.ink }]}>No escalations</Text>
            <Text style={[s.emptyHint, { color: colors.inkFaint }]}>
              All runs completed without hard-checkpoint failures.
            </Text>
          </View>
        ) : (
          <>
            {/* banner */}
            <View style={[s.notice, { borderColor: colors.hardstop, backgroundColor: 'rgba(255,92,92,0.06)' }]}>
              <Text style={[s.noticeText, { color: colors.hardstop }]}>
                ⚑  {escalated.length} run{escalated.length !== 1 ? 's' : ''} require supervisor review.
                Hard checkpoints failed and PM intervals were NOT reset — these tasks remain open.
              </Text>
            </View>

            {/* sync button */}
            <TouchableOpacity
              style={[s.syncBtn, { borderColor: colors.line, backgroundColor: colors.panel }, syncing && s.syncBtnDisabled]}
              onPress={handleSync}
              disabled={syncing}
              activeOpacity={0.8}
            >
              <Text style={[s.syncBtnText, { color: colors.inkDim }]}>
                {syncing ? 'Sending to backend…' : '↑  Notify backend & send supervisor alerts'}
              </Text>
              {lastSync && (
                <Text style={[s.syncStatus, { color: colors.verify }]}>
                  Sent {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
              {syncError && (
                <Text style={[s.syncStatus, { color: colors.hardstop }]}>{syncError}</Text>
              )}
            </TouchableOpacity>

            <Text style={[s.listHeading, { color: colors.inkFaint }]}>ESCALATED RUNS</Text>

            {escalated.map(run => (
              <EscalationCard
                key={run.id}
                run={run}
                colors={colors}
                onViewReport={() => router.push(`/report/${run.id}`)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── EscalationCard ───────────────────────────────────────────────────────────

function EscalationCard({ run, colors, onViewReport }: {
  run: CompletedRunRecord;
  colors: ColorPalette;
  onViewReport: () => void;
}) {
  const s = useMemo(() => makeStyles(colors), [colors]);
  const date = run.completedAt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const time = run.completedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const failedEntries = run.log.filter(e => e.flagged);

  return (
    <View style={[s.card, { borderColor: 'rgba(255,92,92,0.35)', backgroundColor: colors.panel }]}>
      <View style={s.cardHeader}>
        <Text style={[s.cardFlag, { color: colors.hardstop }]}>⚑</Text>
        <View style={s.cardInfo}>
          <Text style={[s.cardTitle, { color: colors.ink }]}>{run.procedureTitle}</Text>
          <Text style={[s.cardMeta, { color: colors.inkFaint }]}>{date}  ·  {time}</Text>
          {run.techName && (
            <Text style={[s.cardTech, { color: colors.inkDim }]}>by {run.techName}</Text>
          )}
        </View>
      </View>

      {/* stat strip */}
      <View style={[s.statStrip, { borderTopColor: colors.line }]}>
        <MiniStat label="Steps done" value={`${run.log.length}`} colors={colors} />
        <MiniStat label="Duration"   value={`${run.durationMins}m`} colors={colors} />
        <MiniStat label="Failed"     value={`${run.flaggedCount}`} alert colors={colors} />
      </View>

      {/* failed steps inline */}
      {failedEntries.length > 0 && (
        <View style={[s.failedList, { borderTopColor: colors.line }]}>
          <Text style={[s.failedHeading, { color: colors.inkFaint }]}>FAILED CHECKPOINTS</Text>
          {failedEntries.map((e, i) => (
            <View key={i} style={s.failedRow}>
              <Text style={[s.failedGlyph, { color: colors.hardstop }]}>⚑</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.failedStep, { color: colors.ink }]}>{e.stepTitle}</Text>
                <Text style={[s.failedVal, { color: colors.hardstop }]}>{e.value}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        onPress={onViewReport}
        style={[s.reportBtn, { borderColor: colors.hardstop }]}
        activeOpacity={0.85}
      >
        <Text style={[s.reportBtnText, { color: colors.hardstop }]}>View Compliance Report  ↗</Text>
      </TouchableOpacity>
    </View>
  );
}

function MiniStat({ label, value, alert, colors }: {
  label: string; value: string; alert?: boolean; colors: ColorPalette;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: alert ? colors.hardstop : colors.ink, fontFamily: FONT_MONO, fontSize: 15, fontWeight: '600' }}>{value}</Text>
      <Text style={{ color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 20, paddingBottom: 52 },

    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    back:   { fontFamily: FONT_MONO, fontSize: 13 },
    title:  { flex: 1, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
    badge:  { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, fontFamily: FONT_MONO, fontSize: 12, fontWeight: '700' },

    notice:     { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 14 },
    noticeText: { fontSize: 13.5, lineHeight: 22, fontWeight: '500' },

    syncBtn:         { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 22 },
    syncBtnDisabled: { opacity: 0.6 },
    syncBtnText:     { fontFamily: FONT_MONO, fontSize: 13 },
    syncStatus:      { fontFamily: FONT_MONO, fontSize: 11, marginTop: 6 },

    listHeading: { fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, marginBottom: 12 },

    card:       { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 },
    cardFlag:   { fontSize: 18, marginTop: 2 },
    cardInfo:   { flex: 1 },
    cardTitle:  { fontSize: 15, fontWeight: '600', lineHeight: 21 },
    cardMeta:   { fontFamily: FONT_MONO, fontSize: 11, marginTop: 3 },
    cardTech:   { fontFamily: FONT_MONO, fontSize: 11, marginTop: 2 },

    statStrip:  { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, marginBottom: 14 },

    failedList:    { borderTopWidth: 1, paddingTop: 12, marginBottom: 14, gap: 10 },
    failedHeading: { fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1.5, marginBottom: 4 },
    failedRow:     { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    failedGlyph:   { fontFamily: FONT_MONO, fontSize: 12, width: 16, textAlign: 'center', marginTop: 2 },
    failedStep:    { fontSize: 13, fontWeight: '500' },
    failedVal:     { fontFamily: FONT_MONO, fontSize: 11, marginTop: 2 },

    reportBtn:     { borderWidth: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
    reportBtnText: { fontFamily: FONT_MONO, fontSize: 13, fontWeight: '700' },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 40 },
    emptyIcon:      { fontSize: 48, marginBottom: 16 },
    emptyTitle:     { fontSize: 20, fontWeight: '700', marginBottom: 8 },
    emptyHint:      { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  });
}
