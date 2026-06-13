import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';
import { INTERVAL_LABEL } from '@/utils/dueStatus';
import type { RunEntry } from '@/types';

const KIND_GLYPH: Record<RunEntry['kind'], string> = { ack: '✓', reading: '#', photo: '□', scan: '⊙' };

export default function DoneScreen() {
  const router  = useRouter();
  const { records, activeRun, completeRun } = useApp();
  const { colors } = useTheme();

  const s = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    if (!activeRun) router.replace('/');
  }, [activeRun]);

  if (!activeRun) return null;

  const procedure  = records.find(r => r.procedure.id === activeRun.procedureId)?.procedure;
  const log        = activeRun.log;
  const mins       = Math.max(1, Math.round((Date.now() - activeRun.startedAt.getTime()) / 60_000));
  const flagged    = log.filter(e => e.flagged).length;

  const KIND_COLOR: Record<RunEntry['kind'], string> = {
    ack: colors.verify, reading: colors.caution, photo: colors.inkDim, scan: colors.scan,
  };

  const handleComplete = () => {
    completeRun();
    router.navigate('/');
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.successIcon}>
          <Text style={s.successCheck}>✓</Text>
        </View>

        <Text style={s.eyebrow}>TASK COMPLETE</Text>
        <Text style={s.title}>{procedure?.title ?? '—'}</Text>
        <Text style={s.sub}>{procedure?.assetLabel} · {procedure ? INTERVAL_LABEL[procedure.interval] : ''}</Text>

        <View style={s.statRow}>
          <StatCard label="Steps verified" value={`${log.length}/${procedure?.steps.length ?? 0}`} colors={colors} />
          <StatCard label="Duration"       value={`${mins}m`} colors={colors} />
          <StatCard label="Flagged"        value={String(flagged)} alert={flagged > 0} colors={colors} />
        </View>

        <Text style={s.trailHeading}>AUDIT TRAIL</Text>
        <View style={s.trailBox}>
          {log.map((entry, i) => (
            <View key={i} style={[s.trailRow, i < log.length - 1 && s.trailRowBorder]}>
              <Text style={[s.trailGlyph, { color: KIND_COLOR[entry.kind] }]}>{KIND_GLYPH[entry.kind]}</Text>
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
        </View>

        <View style={s.note}>
          <Text style={s.noteText}>
            Logged to the maintenance record and the interval reset. This immutable,
            time-stamped artifact is auditor-ready — and becomes training data for the facility AI expert.
          </Text>
        </View>

        <TouchableOpacity style={s.doneBtn} onPress={handleComplete} activeOpacity={0.85}>
          <Text style={s.doneBtnText}>Log & return to maintenance</Text>
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
    scroll: { padding: 20, paddingBottom: 40 },

    successIcon:  { width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(61,220,151,0.12)', borderWidth: 1, borderColor: colors.verify, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    successCheck: { fontSize: 28, color: colors.verify },

    eyebrow: { color: colors.verify, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5 },
    title:   { color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: 8, letterSpacing: -0.3 },
    sub:     { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 12, marginTop: 6 },

    statRow:   { flexDirection: 'row', gap: 10, marginTop: 20 },

    trailHeading:   { color: colors.inkDim, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, marginTop: 24 },
    trailBox:       { marginTop: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.panel },
    trailRow:       { flexDirection: 'row', gap: 12, padding: 13 },
    trailRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    trailGlyph:     { fontFamily: FONT_MONO, fontSize: 13, width: 16, textAlign: 'center' },
    trailContent:   { flex: 1, minWidth: 0 },
    trailStep:      { color: colors.ink, fontSize: 13.5, fontWeight: '500', lineHeight: 18 },
    trailValue:     { color: colors.inkDim, fontFamily: FONT_MONO, fontSize: 12, marginTop: 3 },
    trailFlagged:   { color: colors.hardstop },
    trailTs:        { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11 },

    note:     { marginTop: 16, padding: 13, borderRadius: 12, backgroundColor: colors.panelHi, borderWidth: 1, borderColor: colors.line },
    noteText: { color: colors.inkDim, fontSize: 12.5, lineHeight: 19 },

    doneBtn:     { marginTop: 22, padding: 16, borderRadius: 12, backgroundColor: colors.verify, alignItems: 'center' },
    doneBtnText: { color: '#06140E', fontSize: 15.5, fontWeight: '700' },
  });
}
