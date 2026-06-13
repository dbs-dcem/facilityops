import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';

export const ONBOARDING_KEY = 'facilityops:onboarding';

const SLIDES = [
  {
    icon: '⚡',
    title: 'Guided PM Execution',
    body: 'FacilityOps turns your facility\'s MOPs and PM checklists into step-by-step, checkpoint-verified workflows — so nothing gets missed.',
  },
  {
    icon: '▶',
    title: 'Run a Task',
    body: 'Tap any task on the Home screen to start. The app walks you through each step one at a time. No skipping, no guessing.',
  },
  {
    icon: '◉',
    title: 'Four Checkpoint Types',
    body: 'Acknowledge a step  ·  Enter a numeric reading  ·  Capture a photo  ·  Scan an asset tag\n\nReadings are auto-flagged if they fall outside the expected range — logged, not blocked.',
  },
  {
    icon: '🔒',
    title: 'Hard Checkpoints',
    body: 'Safety-critical steps are marked HARD CHECKPOINT. The Proceed button stays locked until you complete the action. Hard checkpoints cannot be skipped.',
  },
  {
    icon: '📋',
    title: 'Immutable Audit Trail',
    body: 'Every completed run is time-stamped and logged. Find the full history in the Logs tab — one tap to expand any run\'s audit trail, ready for auditors.',
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [slide, setSlide] = useState(0);

  const s = useMemo(() => makeStyles(colors), [colors]);

  const isLast = slide === SLIDES.length - 1;
  const current = SLIDES[slide];

  const handleNext = () => {
    if (isLast) {
      AsyncStorage.setItem(ONBOARDING_KEY, 'done').catch(() => {});
      router.replace('/');
    } else {
      setSlide(i => i + 1);
    }
  };

  const handleSkip = () => {
    AsyncStorage.setItem(ONBOARDING_KEY, 'done').catch(() => {});
    router.replace('/');
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.container}>

        {/* skip */}
        <View style={s.topRow}>
          <TouchableOpacity onPress={handleSkip} hitSlop={12} style={s.skipBtn}>
            <Text style={s.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* slide content */}
        <View style={s.slideArea}>
          <View style={s.iconBox}>
            <Text style={s.icon}>{current.icon}</Text>
          </View>
          <Text style={s.slideNum}>{slide + 1} / {SLIDES.length}</Text>
          <Text style={s.title}>{current.title}</Text>
          <Text style={s.body}>{current.body}</Text>
        </View>

        {/* dots */}
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => setSlide(i)} hitSlop={8}>
              <View style={[s.dot, i === slide && s.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* action */}
        <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={s.nextBtnText}>{isLast ? 'Get Started' : 'Next  →'}</Text>
        </TouchableOpacity>

        {/* prev (hidden on first slide to keep layout stable) */}
        <TouchableOpacity
          style={[s.prevBtn, slide === 0 && s.hidden]}
          onPress={() => setSlide(i => i - 1)}
          hitSlop={12}
        >
          <Text style={s.prevText}>← Previous</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root:      { flex: 1, backgroundColor: colors.bg },
    container: { flex: 1, paddingHorizontal: 28, paddingBottom: 24 },

    topRow:   { alignItems: 'flex-end', paddingTop: 12, marginBottom: 12 },
    skipBtn:  { padding: 6 },
    skipText: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 12 },

    slideArea: { flex: 1, justifyContent: 'center' },

    iconBox: {
      width: 80, height: 80, borderRadius: 20,
      backgroundColor: colors.panelHi,
      borderWidth: 1, borderColor: colors.line,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 28,
    },
    icon:     { fontSize: 36 },
    slideNum: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, marginBottom: 12 },
    title:    { color: colors.ink, fontSize: 28, fontWeight: '700', lineHeight: 34, letterSpacing: -0.5, marginBottom: 20 },
    body:     { color: colors.inkDim, fontSize: 16, lineHeight: 26 },

    dots:     { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 28 },
    dot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.line },
    dotActive: { backgroundColor: colors.verify, width: 20 },

    nextBtn:     { backgroundColor: colors.verify, borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 14 },
    nextBtnText: { color: '#06140E', fontSize: 16, fontWeight: '700' },

    prevBtn:  { alignItems: 'center', padding: 8 },
    prevText: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 12 },
    hidden:   { opacity: 0, pointerEvents: 'none' },
  });
}
