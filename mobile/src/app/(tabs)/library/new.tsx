import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';
import { SYSTEMS } from '@/utils/dueStatus';
import type { IntervalKey, Procedure, Step, StepKind, SystemKey } from '@/types';

type FormStep = {
  uid: string;
  kind: StepKind;
  title: string;
  detail: string;
  hard: boolean;
  ackLabel: string;
  unit: string;
  rangeMin: string;
  rangeMax: string;
  expectedTag: string;
};

const STEP_KINDS: StepKind[] = ['ack', 'reading', 'photo', 'scan'];
const INTERVALS: IntervalKey[] = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
const INTERVAL_LABELS: Record<IntervalKey, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual',
};
const SYSTEMS_KEYS: SystemKey[] = ['power', 'cooling', 'fire', 'env', 'custom'];

function blankStep(): FormStep {
  return { uid: String(Date.now() + Math.random()), kind: 'ack', title: '', detail: '', hard: false, ackLabel: '', unit: '', rangeMin: '', rangeMax: '', expectedTag: '' };
}

function buildStep(pid: string, s: FormStep, i: number): Step {
  const base = { id: `${pid}-${i}`, procedureId: pid, order: i, title: s.title, detail: s.detail, hard: s.hard };
  switch (s.kind) {
    case 'ack':     return { ...base, kind: 'ack', ackLabel: s.ackLabel || s.title };
    case 'reading': {
      const lo = parseFloat(s.rangeMin), hi = parseFloat(s.rangeMax);
      const range: [number, number] | null = !isNaN(lo) && !isNaN(hi) ? [lo, hi] : null;
      return { ...base, kind: 'reading', unit: s.unit, expectedRange: range };
    }
    case 'photo':   return { ...base, kind: 'photo' };
    case 'scan':    return { ...base, kind: 'scan', expectedTag: s.expectedTag };
  }
}

export default function NewMOPScreen() {
  const router = useRouter();
  const { addProcedure } = useApp();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [title, setTitle] = useState('');
  const [assetLabel, setAssetLabel] = useState('');
  const [system, setSystem] = useState<SystemKey>('power');
  const [customSystemLabel, setCustomSystemLabel] = useState('');
  const [interval, setInterval] = useState<IntervalKey>('monthly');
  const [riskStatement, setRiskStatement] = useState('');
  const [steps, setSteps] = useState<FormStep[]>([blankStep()]);

  const addStep = () => setSteps(prev => [...prev, blankStep()]);
  const removeStep = (uid: string) => setSteps(prev => prev.filter(s => s.uid !== uid));
  const updateStep = (uid: string, patch: Partial<FormStep>) =>
    setSteps(prev => prev.map(s => s.uid === uid ? { ...s, ...patch } : s));

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('Required', 'Procedure title is required.'); return; }
    if (!assetLabel.trim()) { Alert.alert('Required', 'Asset label is required.'); return; }
    if (system === 'custom' && !customSystemLabel.trim()) { Alert.alert('Required', 'Custom system name is required.'); return; }
    if (steps.some(s => !s.title.trim())) { Alert.alert('Required', 'All steps must have a title.'); return; }

    const pid = `CUSTOM-${Date.now()}`;
    const procedure: Procedure = {
      id: pid,
      title: title.trim(),
      assetLabel: assetLabel.trim(),
      system,
      ...(system === 'custom' && { systemLabel: customSystemLabel.trim() }),
      interval,
      riskStatement: riskStatement.trim(),
      version: 1,
      steps: steps.map((s, i) => buildStep(pid, s, i)),
    };
    addProcedure(procedure);
    router.back();
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
              <Text style={s.cancel}>✕ Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={s.saveBtnText}>Save MOP</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.screenTitle}>New Procedure</Text>

          {/* ── Header fields ── */}
          <Field label="TITLE" colors={colors}>
            <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. UPS Battery Inspection" placeholderTextColor={colors.inkFaint} />
          </Field>

          <Field label="ASSET / LOCATION" colors={colors}>
            <TextInput style={s.input} value={assetLabel} onChangeText={setAssetLabel} placeholder="e.g. UPS-A (Galaxy VS)" placeholderTextColor={colors.inkFaint} />
          </Field>

          <Field label="SYSTEM" colors={colors}>
            <View style={s.chipRow}>
              {SYSTEMS_KEYS.map(k => (
                <TouchableOpacity
                  key={k}
                  style={[s.selChip, system === k && { backgroundColor: SYSTEMS[k].color + '22', borderColor: SYSTEMS[k].color }]}
                  onPress={() => setSystem(k)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.selChipText, { color: system === k ? SYSTEMS[k].color : colors.inkDim }]}>
                    {SYSTEMS[k].glyph} {SYSTEMS[k].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {system === 'custom' && (
              <TextInput
                style={[s.input, { marginTop: 10 }]}
                value={customSystemLabel}
                onChangeText={setCustomSystemLabel}
                placeholder="System name (e.g. Security, Electrical)"
                placeholderTextColor={colors.inkFaint}
                autoCapitalize="words"
              />
            )}
          </Field>

          <Field label="INTERVAL" colors={colors}>
            <View style={s.chipRow}>
              {INTERVALS.map(k => (
                <TouchableOpacity
                  key={k}
                  style={[s.selChip, interval === k && s.selChipActive]}
                  onPress={() => setInterval(k)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.selChipText, { color: interval === k ? colors.verify : colors.inkDim }]}>
                    {INTERVAL_LABELS[k]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label="RISK STATEMENT (optional)" colors={colors}>
            <TextInput
              style={[s.input, s.inputMulti]}
              value={riskStatement}
              onChangeText={setRiskStatement}
              placeholder="Describe safety considerations…"
              placeholderTextColor={colors.inkFaint}
              multiline
              numberOfLines={3}
            />
          </Field>

          {/* ── Steps ── */}
          <View style={s.stepsHeader}>
            <Text style={s.stepsTitle}>STEPS</Text>
            <TouchableOpacity style={s.addStepBtn} onPress={addStep} activeOpacity={0.8}>
              <Text style={s.addStepText}>+ Add Step</Text>
            </TouchableOpacity>
          </View>

          {steps.map((step, i) => (
            <StepEditor
              key={step.uid}
              step={step}
              index={i}
              colors={colors}
              onUpdate={patch => updateStep(step.uid, patch)}
              onRemove={steps.length > 1 ? () => removeStep(step.uid) : undefined}
            />
          ))}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, children, colors }: { label: string; children: React.ReactNode; colors: ColorPalette }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1.5, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Step editor ─────────────────────────────────────────────────────────────

function StepEditor({ step, index, colors, onUpdate, onRemove }: {
  step: FormStep;
  index: number;
  colors: ColorPalette;
  onUpdate: (patch: Partial<FormStep>) => void;
  onRemove?: () => void;
}) {
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={s.stepCard}>
      <View style={s.stepCardHeader}>
        <Text style={s.stepNum}>STEP {index + 1}</Text>
        {onRemove && (
          <TouchableOpacity onPress={onRemove} hitSlop={12}>
            <Text style={s.removeStep}>remove</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Kind picker */}
      <View style={[s.chipRow, { marginBottom: 12 }]}>
        {STEP_KINDS.map(k => (
          <TouchableOpacity
            key={k}
            style={[s.selChip, step.kind === k && s.selChipActive]}
            onPress={() => onUpdate({ kind: k })}
            activeOpacity={0.7}
          >
            <Text style={[s.selChipText, { color: step.kind === k ? colors.verify : colors.inkDim }]}>
              {k.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Hard toggle */}
      <TouchableOpacity style={s.hardRow} onPress={() => onUpdate({ hard: !step.hard })} activeOpacity={0.7}>
        <View style={[s.checkbox, step.hard && s.checkboxOn]}>
          {step.hard && <Text style={s.checkmark}>✓</Text>}
        </View>
        <Text style={{ color: step.hard ? colors.hardstop : colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11 }}>
          HARD CHECKPOINT (cannot be skipped)
        </Text>
      </TouchableOpacity>

      <TextInput style={s.input} value={step.title} onChangeText={t => onUpdate({ title: t })} placeholder="Step title" placeholderTextColor={colors.inkFaint} />
      <TextInput
        style={[s.input, s.inputMulti, { marginTop: 8 }]}
        value={step.detail}
        onChangeText={t => onUpdate({ detail: t })}
        placeholder="Detail / instructions (optional)"
        placeholderTextColor={colors.inkFaint}
        multiline
        numberOfLines={2}
      />

      {step.kind === 'ack' && (
        <TextInput style={[s.input, { marginTop: 8 }]} value={step.ackLabel} onChangeText={t => onUpdate({ ackLabel: t })} placeholder="Confirm label (e.g. 'No active alarms')" placeholderTextColor={colors.inkFaint} />
      )}

      {step.kind === 'reading' && (
        <View style={{ marginTop: 8, gap: 8 }}>
          <TextInput style={s.input} value={step.unit} onChangeText={t => onUpdate({ unit: t })} placeholder="Unit (e.g. °F, %, V)" placeholderTextColor={colors.inkFaint} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[s.input, { flex: 1 }]} value={step.rangeMin} onChangeText={t => onUpdate({ rangeMin: t })} placeholder="Min" placeholderTextColor={colors.inkFaint} keyboardType="decimal-pad" />
            <TextInput style={[s.input, { flex: 1 }]} value={step.rangeMax} onChangeText={t => onUpdate({ rangeMax: t })} placeholder="Max" placeholderTextColor={colors.inkFaint} keyboardType="decimal-pad" />
          </View>
        </View>
      )}

      {step.kind === 'scan' && (
        <TextInput style={[s.input, { marginTop: 8 }]} value={step.expectedTag} onChangeText={t => onUpdate({ expectedTag: t })} placeholder="Expected tag (e.g. UPS-A)" placeholderTextColor={colors.inkFaint} />
      )}
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 18, paddingBottom: 40 },

    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    cancel:      { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 12 },
    saveBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.verify },
    saveBtnText: { color: '#06140E', fontWeight: '700', fontSize: 13 },

    screenTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', letterSpacing: -0.3, marginBottom: 20 },

    input:       { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 13, color: colors.ink, fontSize: 15 },
    inputMulti:  { minHeight: 70, textAlignVertical: 'top' },

    chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    selChip:       { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    selChipActive: { borderColor: colors.verify, backgroundColor: 'rgba(61,220,151,0.08)' },
    selChipText:   { fontFamily: FONT_MONO, fontSize: 11 },

    stepsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 },
    stepsTitle:  { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5 },
    addStepBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.verify },
    addStepText: { color: colors.verify, fontFamily: FONT_MONO, fontSize: 12 },

    stepCard:       { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, marginBottom: 12 },
    stepCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    stepNum:        { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5 },
    removeStep:     { color: colors.hardstop, fontFamily: FONT_MONO, fontSize: 11 },

    hardRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    checkbox:  { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.inkFaint, alignItems: 'center', justifyContent: 'center' },
    checkboxOn: { backgroundColor: colors.hardstop, borderColor: colors.hardstop },
    checkmark: { color: '#fff', fontSize: 11, fontWeight: '800' },
  });
}
