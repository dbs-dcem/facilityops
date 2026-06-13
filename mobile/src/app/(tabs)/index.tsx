import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';
import type { IntervalKey, SystemKey } from '@/types';
import {
  INTERVAL_LABEL, INTERVAL_ORDER, STATUS_META, SYSTEMS,
  dueLabel, statusFor,
} from '@/utils/dueStatus';
import { ONBOARDING_KEY } from '../onboarding';

const FACILITY = 'Naples Edge — Hall B';

export default function HomeScreen() {
  const router = useRouter();
  const { records, startRun, techName, setTechName } = useApp();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showTechModal, setShowTechModal] = useState(false);
  const [techDraft, setTechDraft] = useState('');
  const techInputRef = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      if (!val) {
        router.replace('/onboarding');
      } else {
        setOnboardingChecked(true);
      }
    }).catch(() => setOnboardingChecked(true));
  }, []);

  const openTechModal = () => {
    setTechDraft(techName);
    setShowTechModal(true);
    setTimeout(() => techInputRef.current?.focus(), 150);
  };

  const saveTech = () => {
    const trimmed = techDraft.trim();
    if (trimmed) setTechName(trimmed);
    setShowTechModal(false);
  };

  const { colors, isDark, toggleTheme } = useTheme();
  const [view, setView] = useState<'system' | 'interval'>('system');

  const s = useMemo(() => makeStyles(colors), [colors]);

  const statuses = useMemo(
    () => records.map(r => statusFor(r.lastCompletedAt, r.procedure.interval)),
    [records],
  );

  const overdueCount = statuses.filter(s => s.state === 'overdue').length;
  const dueCount     = statuses.filter(s => s.state === 'due').length;

  const groups = useMemo(() => {
    if (view === 'system') {
      return (Object.keys(SYSTEMS) as SystemKey[])
        .map(key => ({
          key,
          label: SYSTEMS[key].label,
          color: SYSTEMS[key].color,
          glyph: SYSTEMS[key].glyph,
          items: records.filter(r => r.procedure.system === key),
        }))
        .filter(g => g.items.length > 0);
    }
    return INTERVAL_ORDER
      .map(key => ({
        key,
        label: INTERVAL_LABEL[key],
        color: colors.inkDim,
        glyph: null as string | null,
        items: records.filter(r => r.procedure.interval === key),
      }))
      .filter(g => g.items.length > 0);
  }, [records, view, colors]);

  if (!onboardingChecked) return null;

  const openTask = (procedureId: string) => {
    startRun(procedureId);
    router.push(`/run/${procedureId}`);
  };

  const techInitials = techName.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || 'FT';

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* brand */}
        <View style={s.brand}>
          <View style={s.brandIcon}><View style={[s.brandDot, { backgroundColor: colors.verify }]} /></View>
          <View style={s.brandText}>
            <Text style={[s.brandName, { color: colors.ink }]}>FacilityOps</Text>
            <Text style={[s.brandSub, { color: colors.inkFaint }]}>MOP RUNNER</Text>
          </View>

          {/* technician badge */}
          <TouchableOpacity onPress={openTechModal} hitSlop={8} style={[s.techBadge, { backgroundColor: colors.panelHi, borderColor: colors.line }]}>
            <Text style={[s.techInitials, { color: colors.inkDim }]}>{techInitials}</Text>
          </TouchableOpacity>

          {/* theme toggle */}
          <TouchableOpacity onPress={toggleTheme} hitSlop={8} style={s.themeBtn}>
            <Text style={[s.themeBtnText, { color: colors.inkDim }]}>{isDark ? '◑' : '◐'}</Text>
            <Text style={[s.themeBtnLabel, { color: colors.inkFaint }]}>{isDark ? 'DARK' : 'LIGHT'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/help')} hitSlop={12} style={s.helpBtn}>
            <Text style={[s.helpBtnText, { color: colors.inkDim }]}>?</Text>
          </TouchableOpacity>
        </View>

        {/* technician name modal */}
        <Modal visible={showTechModal} transparent animationType="fade" onRequestClose={() => setShowTechModal(false)}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowTechModal(false)}>
            <TouchableOpacity activeOpacity={1} style={[s.modalCard, { backgroundColor: colors.panel, borderColor: colors.line }]} onPress={() => {}}>
              <Text style={[s.modalTitle, { color: colors.ink }]}>Technician Name</Text>
              <Text style={[s.modalSub, { color: colors.inkDim }]}>Stamped on every completed run record.</Text>
              <TextInput
                ref={techInputRef}
                style={[s.modalInput, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.panelHi }]}
                value={techDraft}
                onChangeText={setTechDraft}
                placeholder="e.g. J. Ramirez"
                placeholderTextColor={colors.inkFaint}
                returnKeyType="done"
                onSubmitEditing={saveTech}
                autoCapitalize="words"
              />
              <View style={s.modalBtns}>
                <TouchableOpacity onPress={() => setShowTechModal(false)} style={[s.modalCancelBtn, { borderColor: colors.line }]}>
                  <Text style={[s.modalCancelText, { color: colors.inkDim }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveTech} style={[s.modalSaveBtn, { backgroundColor: colors.verify }]}>
                  <Text style={s.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* header */}
        <View style={s.headerRow}>
          <Text style={[s.heading, { color: colors.ink }]}>Maintenance</Text>
          <Text style={[s.facility, { color: colors.inkFaint }]}>{FACILITY}</Text>
        </View>

        {/* stat tiles — clickable */}
        <View style={s.statRow}>
          <StatCard
            label="Overdue" value={overdueCount} alert colors={colors}
            onPress={() => router.push({ pathname: '/filter', params: { state: 'overdue' } })}
          />
          <StatCard
            label="Due soon" value={dueCount} caution colors={colors}
            onPress={() => router.push({ pathname: '/filter', params: { state: 'due' } })}
          />
          <StatCard
            label="Tracked" value={records.length} colors={colors}
            onPress={() => router.push({ pathname: '/filter', params: { state: 'all' } })}
          />
        </View>

        {/* view toggle */}
        <View style={[s.toggle, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          {(['system', 'interval'] as const).map(v => (
            <TouchableOpacity
              key={v}
              style={[s.toggleBtn, view === v && [s.toggleBtnActive, { backgroundColor: colors.panelHi, borderColor: colors.line }]]}
              onPress={() => setView(v)}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, { color: view === v ? colors.ink : colors.inkFaint }]}>
                BY {v.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* groups */}
        {groups.map(g => (
          <View key={g.key} style={s.group}>
            <View style={s.groupHeader}>
              {g.glyph ? <Text style={[s.groupGlyph, { color: g.color }]}>{g.glyph}</Text> : null}
              <Text style={[s.groupLabel, { color: g.color }]}>{g.label.toUpperCase()}</Text>
              <View style={[s.groupLine, { backgroundColor: colors.line }]} />
              <Text style={[s.groupCount, { color: colors.inkFaint }]}>{g.items.length}</Text>
            </View>
            {g.items
              .slice()
              .sort((a, b) =>
                statusFor(a.lastCompletedAt, a.procedure.interval).remaining -
                statusFor(b.lastCompletedAt, b.procedure.interval).remaining
              )
              .map(r => (
                <TaskCard
                  key={r.procedure.id}
                  record={r}
                  showSystem={view === 'interval'}
                  colors={colors}
                  onPress={() => openTask(r.procedure.id)}
                />
              ))}
          </View>
        ))}

        <Text style={[s.footer, { color: colors.inkFaint }]}>offline-ready · syncs when reconnected</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── TaskCard ────────────────────────────────────────────────────────────────

export function TaskCard({ record, showSystem, onPress, colors }: {
  record: ReturnType<typeof useApp>['records'][number];
  showSystem: boolean;
  onPress: () => void;
  colors: ColorPalette;
}) {
  const { procedure, lastCompletedAt } = record;
  const st  = statusFor(lastCompletedAt, procedure.interval);
  const sm  = STATUS_META[st.state];
  const sys = SYSTEMS[procedure.system];

  return (
    <TouchableOpacity
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 13, marginBottom: 9 },
        st.state === 'overdue' && { borderColor: 'rgba(255,92,92,0.4)' },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 3, backgroundColor: sm.color }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          {showSystem && <Text style={{ fontSize: 11, color: sys.color }}>{sys.glyph}</Text>}
          <Text style={{ flex: 1, color: colors.ink, fontSize: 14.5, fontWeight: '600', lineHeight: 20 }} numberOfLines={2}>{procedure.title}</Text>
        </View>
        <Text style={{ color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11, marginTop: 4 }}>{procedure.assetLabel}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 }}>
          <View style={{ borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderColor: sm.color }}>
            <Text style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1, color: sm.color }}>{sm.label}</Text>
          </View>
          <Text style={{ color: colors.inkDim, fontFamily: FONT_MONO, fontSize: 11 }}>{INTERVAL_LABEL[procedure.interval as IntervalKey]} · {dueLabel(st)}</Text>
        </View>
      </View>
      <Text style={{ color: colors.inkFaint, fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({ label, value, alert, caution, onPress, colors }: {
  label: string; value: number; alert?: boolean; caution?: boolean;
  onPress: () => void; colors: ColorPalette;
}) {
  const col = alert && value > 0 ? colors.hardstop : caution && value > 0 ? colors.caution : colors.ink;
  return (
    <TouchableOpacity
      style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line }}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={{ fontSize: 21, fontFamily: FONT_MONO, fontWeight: '600', color: col }}>{value}</Text>
      <Text style={{ color: colors.inkFaint, fontSize: 10.5, marginTop: 3 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 18, paddingBottom: 40 },

    brand:     { flexDirection: 'row', alignItems: 'center', gap: 11 },
    brandIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.panelHi, borderWidth: 1, borderColor: colors.verifyDim, alignItems: 'center', justifyContent: 'center' },
    brandDot:  { width: 13, height: 13, borderRadius: 3 },
    brandText: { flex: 1 },
    brandName: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
    brandSub:  { fontSize: 10.5, fontFamily: FONT_MONO, letterSpacing: 1 },
    techBadge:    { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    techInitials: { fontFamily: FONT_MONO, fontSize: 11, fontWeight: '700' },

    themeBtn:      { alignItems: 'center', gap: 1, padding: 4 },
    themeBtnText:  { fontSize: 18 },
    themeBtnLabel: { fontFamily: FONT_MONO, fontSize: 8, letterSpacing: 0.5 },
    helpBtn:       { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
    helpBtnText:   { fontSize: 14, fontWeight: '700', fontFamily: FONT_MONO },

    modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    modalCard:     { width: '100%', borderRadius: 18, borderWidth: 1, padding: 24 },
    modalTitle:    { fontSize: 18, fontWeight: '700', marginBottom: 6 },
    modalSub:      { fontSize: 13, lineHeight: 20, marginBottom: 20 },
    modalInput:    { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16, fontFamily: FONT_MONO, marginBottom: 20 },
    modalBtns:     { flexDirection: 'row', gap: 10 },
    modalCancelBtn:{ flex: 1, borderWidth: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
    modalCancelText:{ fontSize: 15, fontWeight: '600' },
    modalSaveBtn:  { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
    modalSaveText: { fontSize: 15, fontWeight: '700', color: '#06140E' },

    headerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22 },
    heading:   { fontSize: 21, fontWeight: '700', letterSpacing: -0.3 },
    facility:  { fontFamily: FONT_MONO, fontSize: 11 },

    statRow:   { flexDirection: 'row', gap: 10, marginTop: 16 },

    toggle:          { flexDirection: 'row', marginTop: 20, borderWidth: 1, borderRadius: 10, padding: 3 },
    toggleBtn:       { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
    toggleBtnActive: { borderWidth: 1 },
    toggleText:      { fontFamily: FONT_MONO, fontSize: 12, letterSpacing: 1 },

    group:       { marginTop: 24 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 },
    groupGlyph:  { fontSize: 13 },
    groupLabel:  { fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5 },
    groupLine:   { flex: 1, height: 1 },
    groupCount:  { fontFamily: FONT_MONO, fontSize: 11 },

    footer: { textAlign: 'center', marginTop: 28, fontFamily: FONT_MONO, fontSize: 11 },
  });
}
