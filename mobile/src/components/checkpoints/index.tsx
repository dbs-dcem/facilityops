import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { COLORS, FONT_MONO } from '@/constants/theme';
import type { AckStep, PhotoStep, ReadingStep, RunEntry, ScanStep, Step } from '@/types';

// ─── Proceed button ──────────────────────────────────────────────────────────

interface ProceedProps {
  enabled: boolean;
  label?: string;
  color?: string;
  onPress: () => void;
}

function ProceedButton({ enabled, label = 'Verify & continue', color = COLORS.verify, onPress }: ProceedProps) {
  return (
    <TouchableOpacity
      style={[s.proceed, { backgroundColor: color, opacity: enabled ? 1 : 0.3 }]}
      onPress={enabled ? onPress : undefined}
      activeOpacity={0.8}
    >
      <Text style={s.proceedText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Ack ─────────────────────────────────────────────────────────────────────

function AckCheckpoint({ step, onComplete }: { step: AckStep; onComplete: (e: RunEntry) => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <View>
      <TouchableOpacity
        style={[s.ackRow, checked && s.ackRowChecked]}
        onPress={() => setChecked(v => !v)}
        activeOpacity={0.8}
      >
        <View style={[s.checkbox, checked && s.checkboxChecked]}>
          {checked && <Text style={s.checkmark}>✓</Text>}
        </View>
        <Text style={[s.ackLabel, checked && s.ackLabelChecked]}>{step.ackLabel}</Text>
      </TouchableOpacity>
      <ProceedButton
        enabled={checked}
        onPress={() => onComplete({ stepId: step.id, stepTitle: step.title, kind: 'ack', value: step.ackLabel, flagged: false, ts: new Date() })}
      />
    </View>
  );
}

// ─── Reading ─────────────────────────────────────────────────────────────────

function ReadingCheckpoint({ step, onComplete }: { step: ReadingStep; onComplete: (e: RunEntry) => void }) {
  const [raw, setRaw] = useState('');
  const num = parseFloat(raw);
  const valid = raw !== '' && !isNaN(num);
  const [lo, hi] = step.expectedRange ?? [null, null];
  const inRange = valid && lo != null ? num >= lo && num <= hi : true;

  let borderColor: string = COLORS.line;
  if (valid) borderColor = inRange ? COLORS.caution : COLORS.hardstop;

  return (
    <View>
      <View style={[s.readingBox, { borderColor }]}>
        <TextInput
          style={s.readingInput}
          keyboardType="decimal-pad"
          returnKeyType="done"
          value={raw}
          onChangeText={setRaw}
          placeholder="0.0"
          placeholderTextColor={COLORS.inkFaint}
        />
        <View style={s.readingUnit}>
          <Text style={s.readingUnitText}>{step.unit}</Text>
        </View>
      </View>

      {lo != null && (
        <Text style={[s.rangeHint, { color: valid ? (inRange ? COLORS.verify : COLORS.hardstop) : COLORS.inkFaint }]}>
          expected {lo}–{hi} {step.unit}
          {valid ? (inRange ? '  · in range' : '  · OUT OF RANGE — flagged') : ''}
        </Text>
      )}

      <ProceedButton
        enabled={valid}
        label={valid && !inRange ? 'Log out-of-range reading' : 'Log reading & continue'}
        color={valid && !inRange ? COLORS.caution : COLORS.verify}
        onPress={() => onComplete({ stepId: step.id, stepTitle: step.title, kind: 'reading', value: `${num} ${step.unit}`, flagged: !inRange, ts: new Date() })}
      />
    </View>
  );
}

// ─── Photo ───────────────────────────────────────────────────────────────────

function PhotoCheckpoint({ step, onComplete }: { step: PhotoStep; onComplete: (e: RunEntry) => void }) {
  const [captured, setCaptured] = useState(false);
  return (
    <View>
      <TouchableOpacity
        style={[s.captureArea, captured && s.captureAreaDone]}
        onPress={() => setCaptured(true)}
        activeOpacity={0.8}
      >
        <Text style={[s.captureIcon, { color: captured ? COLORS.verify : COLORS.inkFaint }]}>
          {captured ? '✓' : '□'}
        </Text>
        <Text style={[s.captureLabel, { color: captured ? COLORS.ink : COLORS.inkDim }]}>
          {captured ? 'image captured · attached to record' : 'tap to capture'}
        </Text>
      </TouchableOpacity>
      <ProceedButton
        enabled={captured}
        onPress={() => onComplete({ stepId: step.id, stepTitle: step.title, kind: 'photo', value: '1 image attached', flagged: false, ts: new Date() })}
      />
    </View>
  );
}

// ─── Scan ────────────────────────────────────────────────────────────────────

function ScanCheckpoint({ step, onComplete }: { step: ScanStep; onComplete: (e: RunEntry) => void }) {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'matched'>('idle');
  const beamY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scanState === 'scanning') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(beamY, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(beamY, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      ).start();
      const t = setTimeout(() => { setScanState('matched'); beamY.stopAnimation(); }, 1100);
      return () => clearTimeout(t);
    }
  }, [scanState, beamY]);

  const translateY = beamY.interpolate({ inputRange: [0, 1], outputRange: [0, 130] });

  return (
    <View>
      <TouchableOpacity
        style={[s.scanArea, { borderColor: scanState === 'matched' ? COLORS.verify : COLORS.scan }]}
        onPress={() => scanState === 'idle' && setScanState('scanning')}
        activeOpacity={scanState === 'idle' ? 0.8 : 1}
      >
        {scanState === 'scanning' && (
          <Animated.View style={[s.scanBeam, { transform: [{ translateY }] }]} />
        )}
        <Text style={[s.scanIcon, { color: scanState === 'matched' ? COLORS.verify : COLORS.scan }]}>
          {scanState === 'matched' ? '✓' : '⊙'}
        </Text>
        <Text style={[s.scanLabel, { color: scanState === 'matched' ? COLORS.ink : COLORS.inkDim }]}>
          {scanState === 'idle'    && 'tap to scan asset tag'}
          {scanState === 'scanning' && 'reading tag…'}
          {scanState === 'matched' && `matched: ${step.expectedTag}`}
        </Text>
      </TouchableOpacity>
      <ProceedButton
        enabled={scanState === 'matched'}
        label="Confirm unit & continue"
        onPress={() => onComplete({ stepId: step.id, stepTitle: step.title, kind: 'scan', value: `tag ${step.expectedTag} verified`, flagged: false, ts: new Date() })}
      />
    </View>
  );
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

export function Checkpoint({ step, onComplete }: { step: Step; onComplete: (e: RunEntry) => void }) {
  switch (step.kind) {
    case 'ack':     return <AckCheckpoint     step={step} onComplete={onComplete} />;
    case 'reading': return <ReadingCheckpoint step={step} onComplete={onComplete} />;
    case 'photo':   return <PhotoCheckpoint   step={step} onComplete={onComplete} />;
    case 'scan':    return <ScanCheckpoint    step={step} onComplete={onComplete} />;
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // proceed
  proceed:     { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  proceedText: { color: '#06140E', fontSize: 15, fontWeight: '700' },

  // ack
  ackRow:        { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.panel },
  ackRowChecked: { backgroundColor: 'rgba(61,220,151,0.10)', borderColor: COLORS.verify },
  checkbox:        { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: COLORS.inkFaint, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.verify, borderColor: COLORS.verify },
  checkmark:     { color: '#06140E', fontSize: 15, fontWeight: '800' },
  ackLabel:      { flex: 1, color: COLORS.inkDim, fontSize: 15, fontWeight: '500' },
  ackLabelChecked: { color: COLORS.ink },

  // reading
  readingBox:       { flexDirection: 'row', borderWidth: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.panel },
  readingInput:     { flex: 1, color: COLORS.ink, fontSize: 32, fontFamily: FONT_MONO, padding: 18 },
  readingUnit:      { justifyContent: 'center', paddingHorizontal: 22, borderLeftWidth: 1, borderLeftColor: COLORS.line },
  readingUnitText:  { color: COLORS.inkDim, fontSize: 20, fontFamily: FONT_MONO },
  rangeHint:        { fontFamily: FONT_MONO, fontSize: 12, marginTop: 10 },

  // photo
  captureArea:     { height: 160, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.line, backgroundColor: COLORS.panel, alignItems: 'center', justifyContent: 'center', gap: 10 },
  captureAreaDone: { borderColor: COLORS.verify, backgroundColor: 'rgba(61,220,151,0.07)' },
  captureIcon:     { fontSize: 34 },
  captureLabel:    { fontSize: 14, fontFamily: FONT_MONO, letterSpacing: 0.5 },

  // scan
  scanArea:  { height: 160, borderRadius: 12, borderWidth: 1, backgroundColor: COLORS.panel, alignItems: 'center', justifyContent: 'center', gap: 12, overflow: 'hidden' },
  scanBeam:  { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: COLORS.scan, shadowColor: COLORS.scan, shadowOpacity: 0.8, shadowRadius: 6 },
  scanIcon:  { fontSize: 32 },
  scanLabel: { fontSize: 14, fontFamily: FONT_MONO, letterSpacing: 0.5 },
});
