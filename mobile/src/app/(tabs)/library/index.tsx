import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';
import { INTERVAL_LABEL, SYSTEMS } from '@/utils/dueStatus';

export default function LibraryScreen() {
  const router = useRouter();
  const { records } = useApp();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  const s = useMemo(() => makeStyles(colors), [colors]);

  const filtered = useMemo(() => {
    if (!query.trim()) return records;
    const q = query.toLowerCase();
    return records.filter(r =>
      r.procedure.title.toLowerCase().includes(q) ||
      r.procedure.assetLabel.toLowerCase().includes(q)
    );
  }, [records, query]);

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.headerRow}>
          <Text style={s.screenTitle}>MOP Library</Text>
          <TouchableOpacity
            style={s.newBtn}
            onPress={() => router.push('/library/new')}
            activeOpacity={0.8}
          >
            <Text style={s.newBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.count}>{filtered.length} procedure{filtered.length !== 1 ? 's' : ''}</Text>

        {filtered.map(r => {
          const { procedure } = r;
          const sys = SYSTEMS[procedure.system];
          return (
            <TouchableOpacity
              key={procedure.id}
              style={s.card}
              onPress={() => router.push(`/library/${procedure.id}`)}
              activeOpacity={0.85}
            >
              <View style={[s.systemDot, { backgroundColor: sys.color }]} />
              <View style={s.cardBody}>
                <Text style={s.cardTitle} numberOfLines={2}>{procedure.title}</Text>
                <Text style={s.cardAsset}>{procedure.assetLabel}</Text>
                <View style={s.cardMeta}>
                  <Text style={[s.chip, { borderColor: sys.color, color: sys.color }]}>
                    {sys.glyph} {sys.label}
                  </Text>
                  <Text style={s.interval}>{INTERVAL_LABEL[procedure.interval]}</Text>
                  <Text style={s.stepCount}>{procedure.steps.length} steps</Text>
                </View>
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          );
        })}

        {filtered.length === 0 && (
          <Text style={s.empty}>No procedures found.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 18, paddingBottom: 40 },

    headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    screenTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', letterSpacing: -0.3 },

    newBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.verify },
    newBtnText: { color: '#06140E', fontWeight: '700', fontSize: 13 },

    count: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11, marginBottom: 16 },

    card:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 13, marginBottom: 9 },
    systemDot:  { width: 3, alignSelf: 'stretch', borderRadius: 3 },
    cardBody:   { flex: 1, minWidth: 0 },
    cardTitle:  { color: colors.ink, fontSize: 14.5, fontWeight: '600', lineHeight: 20 },
    cardAsset:  { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11, marginTop: 3 },
    cardMeta:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' },
    chip:       { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, fontFamily: FONT_MONO, fontSize: 10 },
    interval:   { color: colors.inkDim, fontFamily: FONT_MONO, fontSize: 11 },
    stepCount:  { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11 },
    chevron:    { color: colors.inkFaint, fontSize: 18 },

    empty: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 13, textAlign: 'center', marginTop: 40 },
  });
}
