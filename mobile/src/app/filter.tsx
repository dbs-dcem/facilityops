import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';
import { statusFor, SYSTEMS } from '@/utils/dueStatus';
import type { SystemKey } from '@/types';
import { TaskCard } from './(tabs)/index';

type FilterState = 'overdue' | 'due' | 'ok' | 'all';

const FILTER_META: Record<FilterState, { title: string; color: keyof ColorPalette }> = {
  overdue: { title: 'Overdue',   color: 'hardstop' },
  due:     { title: 'Due Soon',  color: 'caution' },
  ok:      { title: 'On Track',  color: 'verify' },
  all:     { title: 'All Tasks', color: 'ink' },
};

export default function FilterScreen() {
  const router = useRouter();
  const { state, system } = useLocalSearchParams<{ state?: FilterState; system?: SystemKey }>();
  const { records, startRun } = useApp();
  const { colors } = useTheme();

  const filterState: FilterState = (state as FilterState) || 'all';
  const filterSystem = system as SystemKey | undefined;

  const title = filterSystem ? SYSTEMS[filterSystem]?.label ?? 'Tasks' : FILTER_META[filterState].title;
  const titleColorKey: keyof ColorPalette = filterSystem
    ? ('ink' as keyof ColorPalette)
    : FILTER_META[filterState].color;

  const s = useMemo(() => makeStyles(colors), [colors]);

  const filtered = useMemo(() => {
    return records
      .filter(r => {
        if (filterSystem && r.procedure.system !== filterSystem) return false;
        if (filterState === 'all') return true;
        const st = statusFor(r.lastCompletedAt, r.procedure.interval);
        return st.state === filterState;
      })
      .slice()
      .sort((a, b) =>
        statusFor(a.lastCompletedAt, a.procedure.interval).remaining -
        statusFor(b.lastCompletedAt, b.procedure.interval).remaining,
      );
  }, [records, filterState, filterSystem]);

  const openTask = (procedureId: string) => {
    startRun(procedureId);
    router.push(`/run/${procedureId}`);
  };

  const emptyMsg = filterSystem
    ? `No procedures for ${title}.`
    : filterState === 'overdue' ? 'No overdue tasks.' : filterState === 'due' ? 'Nothing due soon.' : filterState === 'ok' ? 'Nothing on track yet.' : 'No tasks found.';

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
        </View>

        {filterSystem && (
          <Text style={s.systemGlyph}>{SYSTEMS[filterSystem]?.glyph}</Text>
        )}
        <Text style={[s.title, { color: colors[titleColorKey] as string }]}>{title}</Text>
        <Text style={s.count}>{filtered.length} task{filtered.length !== 1 ? 's' : ''}</Text>

        {filtered.map(r => (
          <TaskCard
            key={r.procedure.id}
            record={r}
            showSystem={!!filterSystem}
            colors={colors}
            onPress={() => openTask(r.procedure.id)}
          />
        ))}

        {filtered.length === 0 && (
          <Text style={s.empty}>{emptyMsg}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 18, paddingBottom: 40 },

    header: { marginBottom: 16 },
    back:   { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 12 },

    systemGlyph: { fontSize: 32, marginBottom: 4 },
    title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, marginBottom: 4 },
    count: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11, marginBottom: 20 },
    empty: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 13, textAlign: 'center', marginTop: 40 },
  });
}
