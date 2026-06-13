import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';
import { statusFor } from '@/utils/dueStatus';
import { TaskCard } from './(tabs)/index';

type FilterState = 'overdue' | 'due' | 'all';

const FILTER_META: Record<FilterState, { title: string; color: keyof ColorPalette }> = {
  overdue: { title: 'Overdue',   color: 'hardstop' },
  due:     { title: 'Due Soon',  color: 'caution' },
  all:     { title: 'All Tasks', color: 'ink' },
};

export default function FilterScreen() {
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state: FilterState }>();
  const { records, startRun } = useApp();
  const { colors } = useTheme();

  const filterState: FilterState = (state as FilterState) || 'all';
  const meta = FILTER_META[filterState];

  const s = useMemo(() => makeStyles(colors), [colors]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filterState === 'all') return true;
      const st = statusFor(r.lastCompletedAt, r.procedure.interval);
      return st.state === filterState;
    });
  }, [records, filterState]);

  const openTask = (procedureId: string) => {
    startRun(procedureId);
    router.push(`/run/${procedureId}`);
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.title, { color: colors[meta.color] as string }]}>{meta.title}</Text>
        <Text style={s.count}>{filtered.length} task{filtered.length !== 1 ? 's' : ''}</Text>

        {filtered.map(r => (
          <TaskCard
            key={r.procedure.id}
            record={r}
            showSystem
            colors={colors}
            onPress={() => openTask(r.procedure.id)}
          />
        ))}

        {filtered.length === 0 && (
          <Text style={s.empty}>
            {filterState === 'overdue' ? 'No overdue tasks.' : filterState === 'due' ? 'Nothing due soon.' : 'No tasks found.'}
          </Text>
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

    title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, marginBottom: 4 },
    count: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11, marginBottom: 20 },
    empty: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 13, textAlign: 'center', marginTop: 40 },
  });
}
