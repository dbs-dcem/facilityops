import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Checkpoint } from '@/components/checkpoints';
import { useApp } from '@/context/AppContext';
import { COLORS, FONT_MONO } from '@/constants/theme';
import { SYSTEMS } from '@/utils/dueStatus';
import type { RunEntry } from '@/types';

const KIND_META = {
  ack:     { label: 'ACKNOWLEDGE', color: COLORS.verify },
  reading: { label: 'READING',     color: COLORS.caution },
  photo:   { label: 'PHOTO',       color: COLORS.inkDim },
  scan:    { label: 'SCAN TAG',    color: COLORS.scan },
};

export default function RunnerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { records, activeRun, appendEntry, abandonRun } = useApp();

  const record = records.find(r => r.procedure.id === id);
  const procedure = record?.procedure;

  const [stepIdx, setStepIdx] = useState(0);

  if (!procedure || !activeRun) {
    router.replace('/');
    return null;
  }

  const steps = procedure.steps;
  const step  = steps[stepIdx];
  const total = steps.length;
  const pct   = Math.round((stepIdx / total) * 100);
  const sys   = SYSTEMS[procedure.system];
  const kind  = KIND_META[step.kind];

  const handleComplete = (entry: RunEntry) => {
    appendEntry(entry);
    if (stepIdx + 1 >= total) {
      router.push('/done');
    } else {
      setStepIdx(i => i + 1);
    }
  };

  const handleExit = () => {
    abandonRun();
    router.navigate('/');
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* header */}
        <View style={s.header}>
          <TouchableOpacity onPress={handleExit} hitSlop={12}>
            <Text style={s.exitBtn}>✕ exit</Text>
          </TouchableOpacity>
          <Text style={s.stepCounter}>
            STEP {String(stepIdx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </Text>
        </View>

        <View style={s.taskInfo}>
          <Text style={[s.sysGlyph, { color: sys.color }]}>{sys.glyph}</Text>
          <Text style={s.taskTitle} numberOfLines={2}>{procedure.title}</Text>
        </View>

        {/* progress bar */}
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${pct}%` as any }]} />
        </View>

        {/* step content */}
        <ScrollView style={s.body} contentContainerStyle={s.bodyContent} keyboardShouldPersistTaps="handled">
          <View style={s.badges}>
            <View style={[s.badge, { borderColor: kind.color }]}>
              <Text style={[s.badgeText, { color: kind.color }]}>{kind.label}</Text>
            </View>
            {step.hard && (
              <View style={s.hardBadge}>
                <Text style={s.hardBadgeText}>HARD CHECKPOINT</Text>
              </View>
            )}
          </View>

          <Text style={s.stepTitle}>{step.title}</Text>
          <Text style={s.stepDetail}>{step.detail}</Text>

          <View style={s.checkpointArea}>
            <Checkpoint step={step} onComplete={handleComplete} />
          </View>
        </ScrollView>

        {/* footer */}
        <View style={s.footer}>
          {stepIdx > 0 ? (
            <TouchableOpacity onPress={() => setStepIdx(i => i - 1)} hitSlop={12}>
              <Text style={s.backBtn}>← previous</Text>
            </TouchableOpacity>
          ) : <View />}
          {step.hard && <Text style={s.skipDisabled}>skip disabled</Text>}
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.line, backgroundColor: COLORS.panel },
  exitBtn:     { color: COLORS.inkFaint, fontFamily: FONT_MONO, fontSize: 12 },
  stepCounter: { color: COLORS.inkDim,   fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1 },

  taskInfo:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 11, backgroundColor: COLORS.panel },
  sysGlyph:  { fontSize: 12 },
  taskTitle: { flex: 1, color: COLORS.ink, fontSize: 13.5, fontWeight: '600', lineHeight: 19, paddingBottom: 11 },

  progressTrack: { height: 4, backgroundColor: COLORS.bg },
  progressFill:  { height: 4, backgroundColor: COLORS.verify },

  body:        { flex: 1 },
  bodyContent: { padding: 20, paddingTop: 24 },

  badges:        { flexDirection: 'row', gap: 8 },
  badge:         { borderWidth: 1, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:     { fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5 },
  hardBadge:     { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(255,92,92,0.12)' },
  hardBadgeText: { fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, color: COLORS.hardstop },

  stepTitle:      { color: COLORS.ink,    fontSize: 22, fontWeight: '700', lineHeight: 28, marginTop: 15, letterSpacing: -0.3 },
  stepDetail:     { color: COLORS.inkDim, fontSize: 14.5, lineHeight: 22, marginTop: 11 },
  checkpointArea: { marginTop: 24 },

  footer:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingVertical: 14 },
  backBtn:     { color: COLORS.inkFaint, fontFamily: FONT_MONO, fontSize: 12 },
  skipDisabled: { color: COLORS.inkFaint, fontFamily: FONT_MONO, fontSize: 11 },
});
