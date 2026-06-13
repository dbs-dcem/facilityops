import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { COLORS, FONT_MONO } from '@/constants/theme';
import type { IntervalKey, SystemKey } from '@/types';
import {
  INTERVAL_LABEL, INTERVAL_ORDER, STATUS_META, SYSTEMS,
  dueLabel, statusFor,
} from '@/utils/dueStatus';
import { useState } from 'react';

const FACILITY = 'Naples Edge — Hall B';

export default function HomeScreen() {
  const router = useRouter();
  const { records, startRun } = useApp();
  const [view, setView] = useState<'system' | 'interval'>('system');

  const statuses = useMemo(
    () => records.map(r => statusFor(r.lastCompletedAt, r.procedure.interval)),
    [records],
  );

  const overdueCount = statuses.filter(s => s.state === 'overdue').length;
  const dueCount     = statuses.filter(s => s.state === 'due').length;

  // build groups
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
        color: COLORS.inkDim,
        glyph: null as string | null,
        items: records.filter(r => r.procedure.interval === key),
      }))
      .filter(g => g.items.length > 0);
  }, [records, view]);

  const openTask = (procedureId: string) => {
    startRun(procedureId);
    router.push(`/run/${procedureId}`);
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* brand */}
        <View style={s.brand}>
          <View style={s.brandIcon}><View style={s.brandDot} /></View>
          <View>
            <Text style={s.brandName}>FacilityOps</Text>
            <Text style={s.brandSub}>MOP RUNNER</Text>
          </View>
        </View>

        {/* header */}
        <View style={s.headerRow}>
          <Text style={s.heading}>Maintenance</Text>
          <Text style={s.facility}>{FACILITY}</Text>
        </View>

        {/* status banner */}
        <View style={s.statRow}>
          <StatCard label="Overdue"  value={overdueCount} alert />
          <StatCard label="Due soon" value={dueCount}     caution />
          <StatCard label="Tracked"  value={records.length} />
        </View>

        {/* view toggle */}
        <View style={s.toggle}>
          {(['system', 'interval'] as const).map(v => (
            <TouchableOpacity
              key={v}
              style={[s.toggleBtn, view === v && s.toggleBtnActive]}
              onPress={() => setView(v)}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, view === v && s.toggleTextActive]}>
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
              <View style={s.groupLine} />
              <Text style={s.groupCount}>{g.items.length}</Text>
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
                  onPress={() => openTask(r.procedure.id)}
                />
              ))}
          </View>
        ))}

        <Text style={s.footer}>offline-ready · syncs when reconnected</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── TaskCard ────────────────────────────────────────────────────────────────

function TaskCard({ record, showSystem, onPress }: {
  record: ReturnType<typeof useApp>['records'][number];
  showSystem: boolean;
  onPress: () => void;
}) {
  const { procedure, lastCompletedAt } = record;
  const st  = statusFor(lastCompletedAt, procedure.interval);
  const sm  = STATUS_META[st.state];
  const sys = SYSTEMS[procedure.system];

  return (
    <TouchableOpacity
      style={[s.card, st.state === 'overdue' && s.cardOverdue]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[s.statusRail, { backgroundColor: sm.color }]} />
      <View style={s.cardBody}>
        <View style={s.cardTitleRow}>
          {showSystem && <Text style={[s.sysGlyph, { color: sys.color }]}>{sys.glyph}</Text>}
          <Text style={s.cardTitle} numberOfLines={2}>{procedure.title}</Text>
        </View>
        <Text style={s.cardAsset}>{procedure.assetLabel}</Text>
        <View style={s.cardMeta}>
          <View style={[s.badge, { borderColor: sm.color }]}>
            <Text style={[s.badgeText, { color: sm.color }]}>{sm.label}</Text>
          </View>
          <Text style={s.cardDue}>{INTERVAL_LABEL[procedure.interval as IntervalKey]} · {dueLabel(st)}</Text>
        </View>
      </View>
      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({ label, value, alert, caution }: { label: string; value: number; alert?: boolean; caution?: boolean }) {
  const col = alert && value > 0 ? COLORS.hardstop : caution && value > 0 ? COLORS.caution : COLORS.ink;
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, { color: col }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 18, paddingBottom: 40 },

  // brand
  brand:     { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.panelHi, borderWidth: 1, borderColor: COLORS.verifyDim, alignItems: 'center', justifyContent: 'center' },
  brandDot:  { width: 13, height: 13, borderRadius: 3, backgroundColor: COLORS.verify },
  brandName: { color: COLORS.ink, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  brandSub:  { color: COLORS.inkFaint, fontSize: 10.5, fontFamily: FONT_MONO, letterSpacing: 1 },

  // header
  headerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22 },
  heading:   { color: COLORS.ink, fontSize: 21, fontWeight: '700', letterSpacing: -0.3 },
  facility:  { color: COLORS.inkFaint, fontFamily: FONT_MONO, fontSize: 11 },

  // stats
  statRow:   { flexDirection: 'row', gap: 10, marginTop: 16 },
  stat:      { flex: 1, padding: 13, borderRadius: 10, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line },
  statValue: { fontSize: 21, fontFamily: FONT_MONO, fontWeight: '600' },
  statLabel: { color: COLORS.inkFaint, fontSize: 10.5, marginTop: 3 },

  // toggle
  toggle:         { flexDirection: 'row', marginTop: 20, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 3 },
  toggleBtn:      { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: COLORS.panelHi, borderWidth: 1, borderColor: COLORS.line },
  toggleText:     { fontFamily: FONT_MONO, fontSize: 12, letterSpacing: 1, color: COLORS.inkFaint },
  toggleTextActive: { color: COLORS.ink },

  // group
  group:       { marginTop: 24 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 },
  groupGlyph:  { fontSize: 13 },
  groupLabel:  { fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5 },
  groupLine:   { flex: 1, height: 1, backgroundColor: COLORS.line },
  groupCount:  { fontFamily: FONT_MONO, fontSize: 11, color: COLORS.inkFaint },

  // card
  card:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 13, marginBottom: 9 },
  cardOverdue: { borderColor: 'rgba(255,92,92,0.4)' },
  statusRail:  { width: 3, alignSelf: 'stretch', borderRadius: 3 },
  cardBody:    { flex: 1, minWidth: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sysGlyph:    { fontSize: 11 },
  cardTitle:   { flex: 1, color: COLORS.ink, fontSize: 14.5, fontWeight: '600', lineHeight: 20 },
  cardAsset:   { color: COLORS.inkFaint, fontFamily: FONT_MONO, fontSize: 11, marginTop: 4 },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  badge:       { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText:   { fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1 },
  cardDue:     { color: COLORS.inkDim, fontFamily: FONT_MONO, fontSize: 11 },
  chevron:     { color: COLORS.inkFaint, fontSize: 18 },

  footer: { textAlign: 'center', marginTop: 28, fontFamily: FONT_MONO, fontSize: 11, color: COLORS.inkFaint },
});
