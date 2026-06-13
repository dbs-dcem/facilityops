import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import type { ProcedureRecord } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import type { ColorPalette } from '@/context/ThemeContext';
import { FONT_MONO } from '@/constants/theme';
import { INTERVAL_DAYS, STATUS_META, SYSTEMS, dueLabel, statusFor } from '@/utils/dueStatus';
import { TaskCard } from './index';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_HEADERS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function getNextDue(r: ProcedureRecord): Date {
  if (!r.lastCompletedAt) return new Date(0);
  return new Date(r.lastCompletedAt.getTime() + INTERVAL_DAYS[r.procedure.interval] * 86_400_000);
}

export default function CalendarScreen() {
  const router = useRouter();
  const { records, startRun } = useApp();
  const { colors } = useTheme();
  const [calView, setCalView] = useState<'list' | 'grid'>('list');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const s = useMemo(() => makeStyles(colors), [colors]);

  const openTask = (procedureId: string) => {
    startRun(procedureId);
    router.push(`/run/${procedureId}`);
  };

  // ── List view groups ────────────────────────────────────────────────────────
  const listGroups = useMemo(() => {
    const sorted = [...records].sort((a, b) => getNextDue(a).getTime() - getNextDue(b).getTime());
    const overdue: ProcedureRecord[] = [];
    const thisWeek: ProcedureRecord[] = [];
    const thisMonth: ProcedureRecord[] = [];
    const later: ProcedureRecord[] = [];

    sorted.forEach(r => {
      const st = statusFor(r.lastCompletedAt, r.procedure.interval);
      if (st.state === 'overdue')        overdue.push(r);
      else if (st.remaining <= 7)        thisWeek.push(r);
      else if (st.remaining <= 30)       thisMonth.push(r);
      else                               later.push(r);
    });

    return [
      { key: 'overdue',  label: 'OVERDUE',     items: overdue,    color: colors.hardstop },
      { key: 'week',     label: 'THIS WEEK',   items: thisWeek,   color: colors.caution },
      { key: 'month',    label: 'THIS MONTH',  items: thisMonth,  color: colors.ink },
      { key: 'later',    label: 'LATER',       items: later,      color: colors.inkFaint },
    ].filter(g => g.items.length > 0);
  }, [records, colors]);

  // ── Grid view ───────────────────────────────────────────────────────────────
  const dueDayMap = useMemo(() => {
    const map: Record<number, ProcedureRecord[]> = {};
    records.forEach(r => {
      const d = getNextDue(r);
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(r);
      }
    });
    return map;
  }, [records, viewYear, viewMonth]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  };

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={s.screenTitle}>Maintenance Schedule</Text>

        {/* toggle */}
        <View style={s.toggle}>
          {(['list', 'grid'] as const).map(v => (
            <TouchableOpacity
              key={v}
              style={[s.toggleBtn, calView === v && s.toggleBtnActive]}
              onPress={() => setCalView(v)}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, { color: calView === v ? colors.ink : colors.inkFaint }]}>
                BY {v.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {calView === 'list' ? (
          /* ── LIST VIEW ── */
          <>
            {listGroups.map(g => (
              <View key={g.key} style={s.group}>
                <View style={s.groupHeader}>
                  <Text style={[s.groupLabel, { color: g.color }]}>{g.label}</Text>
                  <View style={s.groupLine} />
                  <Text style={s.groupCount}>{g.items.length}</Text>
                </View>
                {g.items.map(r => (
                  <TaskCard
                    key={r.procedure.id}
                    record={r}
                    showSystem
                    colors={colors}
                    onPress={() => openTask(r.procedure.id)}
                  />
                ))}
              </View>
            ))}
            {listGroups.length === 0 && (
              <Text style={s.empty}>All tasks are on track.</Text>
            )}
          </>
        ) : (
          /* ── GRID VIEW ── */
          <View style={s.gridCard}>
            {/* month nav */}
            <View style={s.monthNav}>
              <TouchableOpacity onPress={prevMonth} hitSlop={12}>
                <Text style={s.monthNavBtn}>‹</Text>
              </TouchableOpacity>
              <Text style={s.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
              <TouchableOpacity onPress={nextMonth} hitSlop={12}>
                <Text style={s.monthNavBtn}>›</Text>
              </TouchableOpacity>
            </View>

            {/* day headers */}
            <View style={s.dayRow}>
              {DAY_HEADERS.map(d => (
                <View key={d} style={s.dayCell}>
                  <Text style={s.dayHeader}>{d}</Text>
                </View>
              ))}
            </View>

            {/* date cells */}
            <View style={s.dayRow}>
              {cells.map((day, i) => {
                const hasTasks = day !== null && !!dueDayMap[day];
                const isTodayCell = day !== null && isToday(day);
                const isSelected = day === selectedDay;
                return (
                  <View key={i} style={s.dayCell}>
                    {day !== null && (
                      <TouchableOpacity
                        onPress={() => setSelectedDay(day === selectedDay ? null : day)}
                        style={[
                          s.dateTouchable,
                          isTodayCell && s.dateToday,
                          isSelected && s.dateSelected,
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          s.dateText,
                          { color: isSelected ? '#06140E' : isTodayCell ? colors.verify : colors.ink },
                        ]}>{day}</Text>
                      </TouchableOpacity>
                    )}
                    {hasTasks && (
                      <View style={[s.dueDot, { backgroundColor: isSelected ? colors.caution : colors.caution }]} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* selected day tasks */}
            {selectedDay !== null && dueDayMap[selectedDay] && (
              <View style={s.selectedDayTasks}>
                <Text style={s.selectedDayLabel}>
                  DUE {MONTH_NAMES[viewMonth].toUpperCase()} {selectedDay}
                </Text>
                {dueDayMap[selectedDay].map(r => (
                  <TaskCard
                    key={r.procedure.id}
                    record={r}
                    showSystem
                    colors={colors}
                    onPress={() => openTask(r.procedure.id)}
                  />
                ))}
              </View>
            )}
            {selectedDay !== null && !dueDayMap[selectedDay] && (
              <Text style={s.noDayTasks}>No tasks due on this day.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 18, paddingBottom: 40 },

    screenTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', letterSpacing: -0.3, marginBottom: 16 },

    toggle:          { flexDirection: 'row', marginBottom: 20, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 3 },
    toggleBtn:       { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: colors.panelHi, borderWidth: 1, borderColor: colors.line },
    toggleText:      { fontFamily: FONT_MONO, fontSize: 12, letterSpacing: 1 },

    group:       { marginBottom: 20 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    groupLabel:  { fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5 },
    groupLine:   { flex: 1, height: 1, backgroundColor: colors.line },
    groupCount:  { fontFamily: FONT_MONO, fontSize: 11, color: colors.inkFaint },

    empty: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 13, textAlign: 'center', marginTop: 40 },

    gridCard:  { backgroundColor: colors.panel, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14 },

    monthNav:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    monthNavBtn: { color: colors.inkDim, fontSize: 24, fontFamily: FONT_MONO, paddingHorizontal: 8 },
    monthTitle:  { color: colors.ink, fontSize: 15, fontWeight: '700' },

    dayRow:  { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.285%', alignItems: 'center', paddingVertical: 3 },

    dayHeader: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11, paddingBottom: 6 },

    dateTouchable: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    dateToday:     { borderWidth: 1, borderColor: colors.verify },
    dateSelected:  { backgroundColor: colors.verify, borderWidth: 0 },
    dateText:      { fontFamily: FONT_MONO, fontSize: 13 },

    dueDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 1 },

    selectedDayTasks: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line },
    selectedDayLabel: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, marginBottom: 10 },
    noDayTasks: { color: colors.inkFaint, fontFamily: FONT_MONO, fontSize: 12, textAlign: 'center', marginTop: 12, paddingBottom: 4 },
  });
}
