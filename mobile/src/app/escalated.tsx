import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';
import type { RunEntry } from '@/types';

const KIND_GLYPH: Record<RunEntry['kind'], string> = { ack: '✓', reading: '#', photo: '□', scan: '⊙' };

export default function EscalatedScreen() {
  const router = useRouter();
  const { records, activeRun, escalateRun, abandonRun } = useApp();
  const { colors } = useTheme();

  const s = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    if (!activeRun) router.replace('/');
  }, [activeRun]);

  if (!activeRun) return null;

  const procedure = records.find(r => r.procedure.id === activeRun.procedureId)?.procedure;
  const log       = activeRun.log;
  const mins      = Math.max(1, Math.round((Date.now() - activeRun.startedAt.getTime()) / 60_000));
  const stepsTotal = procedure?.steps.length ?? 0;

  const KIND_COLOR: Record<RunEntry['kind'], string> = {
    ack: colors.verify, reading: colors.caution, photo: colors.inkDim, scan: colors.scan,
  };

  const handleLog = () => {
    escalateRun();
    router.navigate('/');
  };

  const handleAbandon = () => {
    abandonRun();
    router.navigate('/');
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* escalation icon */}
        <View style={[s.alertIcon, { borderColor: colors.hardstop, backgroundColor: 'rgba(255,92,92,0.10)' }]}>
          <Text style={[s.alertGlyph, { color: colors.hardstop }]}>⚑</Text>
        </View>

        <Text style={[s.eyebrow, { color: colors.hardstop }]}>RUN ESCALATED</Text>
        <Text style={[s.title, { color: colors.ink }]}>{procedure?.title ?? '—'}</Text>
        <Text style={[s.sub, { color: colors.inkFaint }]}>
          {procedure?.assetLabel} · step {log.length} of {stepsTotal}
        </Text>

        {/* stat row */}
        <View style={s.statRow}>
          <StatCard label="Steps done" value={`${log.length}/${stepsTotal}`} colors={colors} />
          <StatCard label="Duration"   value={`${mins}m`} colors={colors} />
          <StatCard label="Failed"     value={String(log.filter(e => e.flagged).length)} alert colors={colors} />
        </View>

        {/* supervisor notice */}
        <View style={[s.notice, { borderColor: colors.hardstop, backgroundColor: 'rgba(255,92,92,0.06)' }]}>
          <Text style={[s.noticeTitle, { color: colors.hardstop }]}>Supervisor notification required</Text>
          <Text style={[s.noticeText, { color: colors.inkDim }]}>
            A hard checkpoint could not be confirmed. Notify your supervisor or shift lead immediately.
            Do not attempt to continue the procedure without authorisation.
            The PM interval will not be reset — this task remains open until re-run successfully.
          </Text>
        </View>

        {/* partial audit trail */}
        <Text style={[s.trailHeading, { color: colors.inkDim }]}>PARTIAL AUDIT TRAIL</Text>
        <View style={[s.trailBox, { borderColor: colors.line, backgroundColor: colors.panel }]}>
          {log.map((entry, i) => (
            <View
              key={i}
              style={[
                s.trailRow,
                i < log.length - 1 && [s.trailRowBorder, { borderBottomColor: colors.line }],
                entry.flagged && [s.trailRowFailed, { backgroundColor: 'rgba(255,92,92,0.06)' }],
              ]}
            >
              <Text style={[s.trailGlyph, { color: entry.flagged ? colors.hardstop : KIND_COLOR[entry.kind] }]}>
                {entry.flagged ? '⚑' : KIND_GLYPH[entry.kind]}
              </Text>
              <View style={s.trailContent}>
                <Text style={[s.trailStep, { color: colors.ink }]}>{entry.stepTitle}</Text>
                <Text style={[s.trailValue, { color: entry.flagged ? colors.hardstop : colors.inkDim }]}>
                  {entry.value}
                </Text>
              </View>
              <Text style={[s.trailTs, { color: colors.inkFaint }]}>
                {entry.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
        </View>

        {/* primary action */}
        <TouchableOpacity style={[s.logBtn, { backgroundColor: colors.hardstop }]} onPress={handleLog} activeOpacity={0.85}>
          <Text style={s.logBtnText}>Log escalation & return to maintenance</Text>
        </TouchableOpacity>

        {/* discard without logging */}
        <TouchableOpacity style={s.abandonBtn} onPress={handleAbandon} activeOpacity={0.75}>
          <Text style={[s.abandonBtnText, { color: colors.inkFaint }]}>Discard run without logging</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, alert, colors }: { label: string; value: string; alert?: boolean; colors: ColorPalette }) {
  return (
    <View style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line }}>
      <Text style={{ color: alert ? colors.hardstop : colors.ink, fontSize: 19, fontFamily: FONT_MONO, fontWeight: '600' }}>{value}</Text>
      <Text style={{ color: colors.inkFaint, fontSize: 10.5, marginTop: 3 }}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 20, paddingBottom: 48 },

    alertIcon:  { width: 56, height: 56, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    alertGlyph: { fontSize: 26, fontWeight: '700' },

    eyebrow: { fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5 },
    title:   { fontSize: 22, fontWeight: '700', marginTop: 8, letterSpacing: -0.3 },
    sub:     { fontFamily: FONT_MONO, fontSize: 12, marginTop: 6 },

    statRow: { flexDirection: 'row', gap: 10, marginTop: 20 },

    notice:      { borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 20 },
    noticeTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
    noticeText:  { fontSize: 13, lineHeight: 20 },

    trailHeading:   { fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, marginTop: 24 },
    trailBox:       { marginTop: 11, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
    trailRow:       { flexDirection: 'row', gap: 12, padding: 13 },
    trailRowBorder: { borderBottomWidth: 1 },
    trailRowFailed: {},
    trailGlyph:     { fontFamily: FONT_MONO, fontSize: 13, width: 16, textAlign: 'center' },
    trailContent:   { flex: 1, minWidth: 0 },
    trailStep:      { fontSize: 13.5, fontWeight: '500', lineHeight: 18 },
    trailValue:     { fontFamily: FONT_MONO, fontSize: 12, marginTop: 3 },
    trailTs:        { fontFamily: FONT_MONO, fontSize: 11 },

    logBtn:     { marginTop: 24, padding: 16, borderRadius: 12, alignItems: 'center' },
    logBtnText: { color: '#ffffff', fontSize: 15.5, fontWeight: '700' },

    abandonBtn:     { marginTop: 14, padding: 12, alignItems: 'center' },
    abandonBtnText: { fontFamily: FONT_MONO, fontSize: 12 },
  });
}
