import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';
import { INTERVAL_LABEL, SYSTEMS } from '@/utils/dueStatus';
import type { Step } from '@/types';

const KIND_META: Record<Step['kind'], { label: string; glyph: string }> = {
  ack:     { label: 'ACK',     glyph: '✓' },
  reading: { label: 'READING', glyph: '#' },
  photo:   { label: 'PHOTO',   glyph: '□' },
  scan:    { label: 'SCAN',    glyph: '⊙' },
};

export default function ProcedureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { records, startRun } = useApp();
  const { colors } = useTheme();

  const s = useMemo(() => makeStyles(colors), [colors]);

  const record = records.find(r => r.procedure.id === id);
  const procedure = record?.procedure;

  if (!procedure) {
    return (
      <SafeAreaView style={s.root}>
        <Text style={s.notFound}>Procedure not found.</Text>
      </SafeAreaView>
    );
  }

  const sys = SYSTEMS[procedure.system];

  const handleRun = () => {
    startRun(procedure.id);
    router.push(`/run/${procedure.id}`);
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={s.back}>← Library</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.runBtn} onPress={handleRun} activeOpacity={0.85}>
            <Text style={s.runBtnText}>Run now</Text>
          </TouchableOpacity>
        </View>

        <View style={s.titleRow}>
          <Text style={[s.sysGlyph, { color: sys.color }]}>{sys.glyph}</Text>
          <Text style={s.title}>{procedure.title}</Text>
        </View>

        <View style={s.metaRow}>
          <View style={[s.chip, { borderColor: sys.color }]}>
            <Text style={[s.chipText, { color: sys.color }]}>{sys.label}</Text>
          </View>
          <View style={s.chipNeutral}>
            <Text style={s.chipNeutralText}>{INTERVAL_LABEL[procedure.interval]}</Text>
          </View>
          <Text style={s.asset}>{procedure.assetLabel}</Text>
        </View>

        {procedure.riskStatement ? (
          <View style={s.riskBox}>
            <Text style={s.riskLabel}>RISK</Text>
            <Text style={s.riskText}>{procedure.riskStatement}</Text>
          </View>
        ) : null}

        <Text style={s.stepsHeading}>STEPS ({procedure.steps.length})</Text>

        {procedure.steps.map((step, i) => {
          const km = KIND_META[step.kind];
          return (
            <View key={step.id} style={[s.stepCard, step.hard && s.stepCardHard]}>
              <View style={s.stepTop}>
                <Text style={s.stepNum}>{String(i + 1).padStart(2, '0')}</Text>
                <View style={[s.kindBadge, step.hard && s.kindBadgeHard]}>
                  <Text style={[s.kindText, step.hard && s.kindTextHard]}>{km.label}</Text>
                </View>
                {step.hard && <Text style={s.hardTag}>HARD</Text>}
              </View>
              <Text style={s.stepTitle}>{step.title}</Text>
              {step.detail ? <Text style={s.stepDetail}>{step.detail}</Text> : null}
              {'expectedRange' in step && step.expectedRange && (
                <Text style={s.rangeHint}>
                  expected {step.expectedRange[0]}–{step.expectedRange[1]} {step.unit}
                </Text>
              )}
              {'ackLabel' in step && step.ackLabel ? (
                <Text style={s.ackLabelText}>confirm: "{step.ackLabel}"</Text>
              ) : null}
              {'expectedTag' in step && step.expectedTag ? (
                <Text style={s.ackLabelText}>scan: {step.expectedTag}</Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root:     { flex: 1, backgroundColor: colors.bg },
    scroll:   { padding: 18, paddingBottom: 40 },
    notFound: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 13, margin: 20 },

    header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    back:     { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 12 },
    runBtn:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.verify },
    runBtnText: { color: '#06140E', fontWeight: '700', fontSize: 13 },

    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
    sysGlyph: { fontSize: 15, marginTop: 3 },
    title:    { flex: 1, color: colors.ink, fontSize: 22, fontWeight: '700', lineHeight: 28, letterSpacing: -0.3 },

    metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
    chip:         { borderWidth: 1, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
    chipText:     { fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1 },
    chipNeutral:  { borderWidth: 1, borderColor: colors.line, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
    chipNeutralText: { color: colors.inkDim, fontFamily: FONT_MONO, fontSize: 11 },
    asset:        { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11 },

    riskBox:   { backgroundColor: colors.panelHi, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 13, marginBottom: 20 },
    riskLabel: { color: colors.caution, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1.5, marginBottom: 4 },
    riskText:  { color: colors.inkDim, fontSize: 13, lineHeight: 19 },

    stepsHeading: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, marginBottom: 12 },

    stepCard:     { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, marginBottom: 9 },
    stepCardHard: { borderColor: 'rgba(255,92,92,0.35)' },
    stepTop:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    stepNum:      { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11 },
    kindBadge:    { borderWidth: 1, borderColor: colors.line, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    kindBadgeHard: { borderColor: 'rgba(255,92,92,0.5)' },
    kindText:     { color: colors.inkDim, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1 },
    kindTextHard: { color: colors.hardstop },
    hardTag:      { color: colors.hardstop, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1 },
    stepTitle:    { color: colors.ink, fontSize: 15, fontWeight: '600', lineHeight: 21, marginBottom: 4 },
    stepDetail:   { color: colors.inkDim, fontSize: 13, lineHeight: 19 },
    rangeHint:    { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11, marginTop: 6 },
    ackLabelText: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  });
}
