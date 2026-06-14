import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';

const SECTIONS = [
  {
    heading: 'Getting Started',
    items: [
      {
        q: 'What is a MOP?',
        a: 'A Method of Procedure (MOP) is a written, step-by-step work instruction for a specific task — like checking a UPS or inspecting a generator. IRIS digitizes your MOPs so every run is guided, consistent, and logged.',
      },
      {
        q: 'How do I run a PM task?',
        a: 'From the Home tab, tap any task card. The runner opens and walks you through each step one at a time. Complete each checkpoint to advance. When you reach the last step, tap "Log & return to maintenance" to record the run and reset the due date.',
      },
      {
        q: 'How do I create a new procedure?',
        a: 'Open the Library tab and tap "+ New". Fill in the title, asset, system, interval, and risk statement. Then add steps using the step builder — each step has its own type, title, detail, and optional hard-checkpoint flag.',
      },
    ],
  },
  {
    heading: 'Checkpoints',
    items: [
      {
        q: 'What are the four checkpoint types?',
        a: 'Acknowledge — confirm you\'ve completed an action by checking a box.\n\nReading — enter a numeric value (e.g. temperature, voltage). If it falls outside the expected range it\'s flagged and logged, but you can still proceed.\n\nPhoto — capture an image attached to the run record (stub in this version).\n\nScan — scan an asset tag to confirm you\'re working on the correct unit.',
      },
      {
        q: 'What is a hard checkpoint?',
        a: 'A hard checkpoint is a safety-critical step that cannot be skipped. The Proceed button stays locked until you complete the required action. These are used for steps like "Verify exhaust path clear" or "Place suppression panel in test mode" where skipping could cause an incident.',
      },
      {
        q: 'What happens when a reading is out of range?',
        a: 'The reading is logged and flagged with "OUT OF RANGE". The run is not blocked — you can still proceed and complete the task. The flagged reading appears in the audit trail and the Done screen shows a "Flagged" count. Use your facility\'s escalation procedure for out-of-range values.',
      },
    ],
  },
  {
    heading: 'Status & Schedule',
    items: [
      {
        q: 'What do the status colors mean?',
        a: 'Green (ON TRACK) — the task has been completed recently and is within its interval.\n\nAmber (DUE SOON) — the task is within ~15% of its interval length from the due date.\n\nRed (OVERDUE) — the task is past its scheduled due date.',
      },
      {
        q: 'How is the due date calculated?',
        a: 'Due date = date of last completed run + the procedure\'s interval (daily, weekly, monthly, quarterly, or annual). Completing a run resets the clock.',
      },
      {
        q: 'What does the Calendar tab show?',
        a: 'The Calendar tab shows all procedures sorted by their next due date. Switch between List view (grouped by urgency) and Grid view (monthly calendar with dots on due dates). Tap a date in Grid view to see which tasks are due that day.',
      },
    ],
  },
  {
    heading: 'Logs & Audit Trail',
    items: [
      {
        q: 'Where do I find completed run history?',
        a: 'Open the Logs tab. Each completed run is listed newest-first. Tap a run to expand it and see the full timestamped audit trail — every checkpoint, value, and flag.',
      },
      {
        q: 'Can I share or export a log?',
        a: 'Export is not yet available in this version. The audit trail is stored locally and will sync to the backend in a future release. In the meantime, the expanded log view is designed to be auditor-readable on screen.',
      },
    ],
  },
  {
    heading: 'Offline & Data',
    items: [
      {
        q: 'Does the app work offline?',
        a: 'Yes. IRIS is offline-first — data halls often have dead spots. All runs and logs are saved locally to the device and will sync with the server when a connection is available (backend sync is a future release).',
      },
      {
        q: 'Will I lose data if I close the app mid-run?',
        a: 'The active run is kept in memory, not persisted to storage mid-step. If the app closes unexpectedly during a run, that run will be lost. Completed runs are saved immediately when you tap "Log & return to maintenance".',
      },
      {
        q: 'What data does the app collect?',
        a: 'All data stays on-device in this version. No telemetry or readings are sent to any cloud service. On-premises operation is a core design principle — especially important for facilities that cannot send telemetry off-site.',
      },
    ],
  },
] as const;

type FaqItem = { q: string; a: string };

export default function HelpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [openItem, setOpenItem] = useState<string | null>(null);

  const s = useMemo(() => makeStyles(colors), [colors]);

  const toggle = (key: string) => setOpenItem(prev => prev === key ? null : key);

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.screenTitle}>Help & FAQ</Text>
        <Text style={s.subtitle}>Everything you need to know about IRIS — Integrated Reliability & Inspection System.</Text>

        {SECTIONS.map(section => (
          <View key={section.heading} style={s.section}>
            <Text style={s.sectionHeading}>{section.heading.toUpperCase()}</Text>
            <View style={s.sectionCard}>
              {section.items.map((item, i) => {
                const key = `${section.heading}-${i}`;
                const open = openItem === key;
                const isLast = i === section.items.length - 1;
                return (
                  <View key={key}>
                    <TouchableOpacity
                      style={[s.row, !isLast && s.rowBorder]}
                      onPress={() => toggle(key)}
                      activeOpacity={0.75}
                    >
                      <Text style={s.question} numberOfLines={open ? undefined : 2}>{item.q}</Text>
                      <Text style={s.chevron}>{open ? '∧' : '∨'}</Text>
                    </TouchableOpacity>
                    {open && (
                      <View style={[s.answer, !isLast && s.rowBorder]}>
                        <Text style={s.answerText}>{item.a}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <View style={s.contactBox}>
          <Text style={s.contactTitle}>Still have questions?</Text>
          <Text style={s.contactText}>
            Contact your facility administrator or the IRIS team. During your pilot, your implementation partner can also add and refine procedures directly.
          </Text>
        </View>

        <View style={s.versionRow}>
          <Text style={s.version}>IRIS · MOP RUNNER · Phase 1 · Naples Edge Pilot</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 18, paddingBottom: 48 },

    header: { marginBottom: 16 },
    back:   { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 12 },

    screenTitle: { color: colors.ink, fontSize: 26, fontWeight: '700', letterSpacing: -0.5, marginBottom: 6 },
    subtitle:    { color: colors.inkDim, fontSize: 14, lineHeight: 21, marginBottom: 28 },

    section:        { marginBottom: 24 },
    sectionHeading: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 2, marginBottom: 10 },
    sectionCard:    { backgroundColor: colors.panel, borderRadius: 14, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },

    row:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    question:  { flex: 1, color: colors.ink, fontSize: 14.5, fontWeight: '600', lineHeight: 21 },
    chevron:   { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 14, paddingTop: 2 },

    answer:     { paddingHorizontal: 16, paddingBottom: 16 },
    answerText: { color: colors.inkDim, fontSize: 14, lineHeight: 22 },

    contactBox:   { backgroundColor: colors.panelHi, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 18, marginBottom: 20 },
    contactTitle: { color: colors.ink, fontSize: 15, fontWeight: '700', marginBottom: 8 },
    contactText:  { color: colors.inkDim, fontSize: 13.5, lineHeight: 21 },

    versionRow: { alignItems: 'center' },
    version:    { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1 },
  });
}
