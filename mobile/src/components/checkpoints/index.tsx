import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO, COLORS } from '@/constants/theme';
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
// PASS records the ackLabel (flagged: false).
// FAIL records "FAILED — <ackLabel>" (flagged: true).
// Hard checkpoints block on FAIL — the tech must resolve the issue, not proceed.

type AckOutcome = 'none' | 'pass' | 'fail';

function AckCheckpoint({ step, onComplete }: { step: AckStep; onComplete: (e: RunEntry) => void }) {
  const { colors } = useTheme();
  const [outcome, setOutcome] = useState<AckOutcome>('none');
  const isHard = step.hard;

  const canProceed = outcome === 'pass' || (outcome === 'fail' && !isHard);

  return (
    <View>
      {/* PASS / FAIL selector */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          style={[
            s.outcomeBtn,
            { borderColor: outcome === 'pass' ? colors.verify : colors.line, backgroundColor: colors.panel },
            outcome === 'pass' && { backgroundColor: 'rgba(61,220,151,0.10)', borderColor: colors.verify },
          ]}
          onPress={() => setOutcome(v => v === 'pass' ? 'none' : 'pass')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <View style={[s.outcomeCircle, { borderColor: outcome === 'pass' ? colors.verify : colors.inkFaint }, outcome === 'pass' && { backgroundColor: colors.verify }]}>
              {outcome === 'pass' && <Text style={s.outcomeTick}>✓</Text>}
            </View>
            <Text style={[s.outcomeTag, { color: outcome === 'pass' ? colors.verify : colors.inkDim }]}>PASS</Text>
          </View>
          <Text style={[s.ackLabel, { color: outcome === 'pass' ? colors.ink : colors.inkDim }]}>{step.ackLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            s.outcomeBtn, s.outcomeBtnFail,
            { borderColor: outcome === 'fail' ? colors.hardstop : colors.line, backgroundColor: colors.panel },
            outcome === 'fail' && { backgroundColor: 'rgba(255,92,92,0.08)', borderColor: colors.hardstop },
          ]}
          onPress={() => setOutcome(v => v === 'fail' ? 'none' : 'fail')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <View style={[s.outcomeCircle, { borderColor: outcome === 'fail' ? colors.hardstop : colors.inkFaint }, outcome === 'fail' && { backgroundColor: colors.hardstop }]}>
              {outcome === 'fail' && <Text style={s.outcomeTick}>✗</Text>}
            </View>
            <Text style={[s.outcomeTag, { color: outcome === 'fail' ? colors.hardstop : colors.inkDim }]}>FAIL</Text>
          </View>
          <Text style={[s.ackFailHint, { color: outcome === 'fail' ? colors.hardstop : colors.inkFaint }]}>
            {isHard ? 'Resolve before\ncontinuing' : 'Log failure &\ncontinue'}
          </Text>
        </TouchableOpacity>
      </View>

      {outcome === 'fail' && isHard && (
        <View style={[s.hardWarn, { borderColor: colors.hardstop, backgroundColor: 'rgba(255,92,92,0.08)' }]}>
          <Text style={[s.hardWarnText, { color: colors.hardstop }]}>
            ⚑ HARD CHECKPOINT — this step must be resolved before you can proceed. Escalate per your facility incident procedure.
          </Text>
        </View>
      )}

      <ProceedButton
        enabled={canProceed}
        label={
          outcome === 'fail'
            ? 'Log failure & continue'
            : outcome === 'pass'
            ? 'Confirmed — continue'
            : 'Select outcome above'
        }
        color={outcome === 'fail' ? colors.caution : colors.verify}
        onPress={() => onComplete({
          stepId: step.id,
          stepTitle: step.title,
          kind: 'ack',
          value: outcome === 'pass' ? step.ackLabel : `FAILED — ${step.ackLabel}`,
          flagged: outcome === 'fail',
          ts: new Date(),
        })}
      />
    </View>
  );
}

// ─── Reading ─────────────────────────────────────────────────────────────────

function ReadingCheckpoint({ step, onComplete }: { step: ReadingStep; onComplete: (e: RunEntry) => void }) {
  const { colors } = useTheme();
  const [raw, setRaw] = useState('');
  const num = parseFloat(raw);
  const valid = raw !== '' && !isNaN(num);
  const [lo, hi] = step.expectedRange ?? [null, null];
  const inRange = valid && lo != null ? num >= lo && num <= hi : true;

  let borderColor: string = colors.line;
  if (valid) borderColor = inRange ? colors.caution : colors.hardstop;

  return (
    <View>
      <View style={[{ flexDirection: 'row', borderWidth: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.panel }, { borderColor }]}>
        <TextInput
          style={{ flex: 1, color: colors.ink, fontSize: 32, fontFamily: FONT_MONO, padding: 18 }}
          keyboardType="decimal-pad"
          returnKeyType="done"
          value={raw}
          onChangeText={setRaw}
          placeholder="0.0"
          placeholderTextColor={colors.inkFaint}
        />
        <View style={{ justifyContent: 'center', paddingHorizontal: 22, borderLeftWidth: 1, borderLeftColor: colors.line }}>
          <Text style={{ color: colors.inkDim, fontSize: 20, fontFamily: FONT_MONO }}>{step.unit}</Text>
        </View>
      </View>

      {lo != null && (
        <Text style={[s.rangeHint, { color: valid ? (inRange ? colors.verify : colors.hardstop) : colors.inkFaint }]}>
          expected {lo}–{hi} {step.unit}
          {valid ? (inRange ? '  · in range' : '  · OUT OF RANGE — flagged') : ''}
        </Text>
      )}

      <ProceedButton
        enabled={valid}
        label={valid && !inRange ? 'Log out-of-range reading' : 'Log reading & continue'}
        color={valid && !inRange ? colors.caution : colors.verify}
        onPress={() => onComplete({ stepId: step.id, stepTitle: step.title, kind: 'reading', value: `${num} ${step.unit}`, flagged: !inRange, ts: new Date() })}
      />
    </View>
  );
}

// ─── Photo ───────────────────────────────────────────────────────────────────

function PhotoCheckpoint({ step, onComplete }: { step: PhotoStep; onComplete: (e: RunEntry) => void }) {
  const { colors } = useTheme();
  const [captured, setCaptured] = useState(false);
  return (
    <View>
      <TouchableOpacity
        style={[
          { height: 160, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', gap: 10 },
          captured && { borderColor: colors.verify, backgroundColor: 'rgba(61,220,151,0.07)' },
        ]}
        onPress={() => setCaptured(true)}
        activeOpacity={0.8}
      >
        <Text style={[s.captureIcon, { color: captured ? colors.verify : colors.inkFaint }]}>
          {captured ? '✓' : '□'}
        </Text>
        <Text style={[s.captureLabel, { color: captured ? colors.ink : colors.inkDim }]}>
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
  const { colors } = useTheme();
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
  const scanBorderColor = scanState === 'matched' ? colors.verify : colors.scan;

  return (
    <View>
      <TouchableOpacity
        style={[{ height: 160, borderRadius: 12, borderWidth: 1, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', gap: 12, overflow: 'hidden' }, { borderColor: scanBorderColor }]}
        onPress={() => scanState === 'idle' && setScanState('scanning')}
        activeOpacity={scanState === 'idle' ? 0.8 : 1}
      >
        {scanState === 'scanning' && (
          <Animated.View style={[s.scanBeam, { backgroundColor: colors.scan, shadowColor: colors.scan, transform: [{ translateY }] }]} />
        )}
        <Text style={[s.scanIcon, { color: scanState === 'matched' ? colors.verify : colors.scan }]}>
          {scanState === 'matched' ? '✓' : '⊙'}
        </Text>
        <Text style={[s.scanLabel, { color: scanState === 'matched' ? colors.ink : colors.inkDim }]}>
          {scanState === 'idle'      && 'tap to scan asset tag'}
          {scanState === 'scanning'  && 'reading tag…'}
          {scanState === 'matched'   && `matched: ${step.expectedTag}`}
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

// ─── Static styles (non-color) ───────────────────────────────────────────────

const s = StyleSheet.create({
  proceed:     { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  proceedText: { color: '#06140E', fontSize: 15, fontWeight: '700' },

  outcomeBtn:      { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1 },
  outcomeBtnFail:  { flex: 0.6 },
  outcomeCircle:   { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  outcomeTick:     { color: '#06140E', fontSize: 11, fontWeight: '800' },
  outcomeTag:      { fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },
  ackLabel:        { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  ackFailHint:     { fontSize: 12, fontFamily: FONT_MONO, lineHeight: 18 },

  hardWarn:     { borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 14 },
  hardWarnText: { fontSize: 13, lineHeight: 20, fontWeight: '500' },

  rangeHint:    { fontFamily: FONT_MONO, fontSize: 12, marginTop: 10 },

  captureIcon:  { fontSize: 34 },
  captureLabel: { fontSize: 14, fontFamily: FONT_MONO, letterSpacing: 0.5 },

  scanBeam:  { position: 'absolute', left: 0, right: 0, height: 2, shadowOpacity: 0.8, shadowRadius: 6 },
  scanIcon:  { fontSize: 32 },
  scanLabel: { fontSize: 14, fontFamily: FONT_MONO, letterSpacing: 0.5 },
});
