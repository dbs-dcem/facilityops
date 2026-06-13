import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { CATALOG, seedLastCompleted } from '../data/catalog';
import { SAMPLE_RUNS } from '../data/sampleRuns';
import type { CompletedRunRecord, Procedure, RunEntry } from '../types';

export interface ProcedureRecord {
  procedure: Procedure;
  lastCompletedAt: Date | null;
}

export interface ActiveRun {
  procedureId: string;
  startedAt: Date;
  log: RunEntry[];
}

interface State {
  records: ProcedureRecord[];
  activeRun: ActiveRun | null;
  completedRuns: CompletedRunRecord[];
  customProcedures: Procedure[];
}

type Action =
  | { type: 'HYDRATE'; completions: Record<string, string | null>; completedRuns: CompletedRunRecord[]; customProcedures: Procedure[] }
  | { type: 'START_RUN'; procedureId: string }
  | { type: 'APPEND_ENTRY'; entry: RunEntry }
  | { type: 'COMPLETE_RUN' }
  | { type: 'ABANDON_RUN' }
  | { type: 'ADD_PROCEDURE'; procedure: Procedure };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE': {
      const allProcedures = [...CATALOG, ...action.customProcedures];
      return {
        ...state,
        customProcedures: action.customProcedures,
        // keep sample runs if nothing has been persisted yet (first launch)
        completedRuns: action.completedRuns.length > 0 ? action.completedRuns : SAMPLE_RUNS,
        records: allProcedures.map(procedure => ({
          procedure,
          lastCompletedAt: action.completions[procedure.id]
            ? new Date(action.completions[procedure.id]!)
            : seedLastCompleted(procedure.id),
        })),
      };
    }
    case 'START_RUN':
      return { ...state, activeRun: { procedureId: action.procedureId, startedAt: new Date(), log: [] } };
    case 'APPEND_ENTRY':
      if (!state.activeRun) return state;
      return { ...state, activeRun: { ...state.activeRun, log: [...state.activeRun.log, action.entry] } };
    case 'COMPLETE_RUN': {
      if (!state.activeRun) return state;
      const { activeRun } = state;
      const completedAt = new Date();
      const durationMins = Math.max(1, Math.round((completedAt.getTime() - activeRun.startedAt.getTime()) / 60_000));
      const proc = state.records.find(r => r.procedure.id === activeRun.procedureId);
      const completedRunRecord: CompletedRunRecord = {
        id: `${activeRun.procedureId}-${completedAt.getTime()}`,
        procedureId: activeRun.procedureId,
        procedureTitle: proc?.procedure.title ?? 'Unknown',
        completedAt,
        durationMins,
        flaggedCount: activeRun.log.filter(e => e.flagged).length,
        log: activeRun.log,
      };
      return {
        ...state,
        records: state.records.map(r =>
          r.procedure.id === activeRun.procedureId ? { ...r, lastCompletedAt: completedAt } : r
        ),
        activeRun: null,
        completedRuns: [completedRunRecord, ...state.completedRuns],
      };
    }
    case 'ABANDON_RUN':
      return { ...state, activeRun: null };
    case 'ADD_PROCEDURE':
      return {
        ...state,
        customProcedures: [...state.customProcedures, action.procedure],
        records: [...state.records, { procedure: action.procedure, lastCompletedAt: null }],
      };
    default:
      return state;
  }
}

interface ContextValue {
  records: ProcedureRecord[];
  activeRun: ActiveRun | null;
  completedRuns: CompletedRunRecord[];
  startRun: (procedureId: string) => void;
  appendEntry: (entry: RunEntry) => void;
  completeRun: () => void;
  abandonRun: () => void;
  addProcedure: (procedure: Procedure) => void;
}

const AppContext = createContext<ContextValue | null>(null);

const STORAGE_KEY = 'facilityops:v1';

const initialState: State = {
  records: CATALOG.map(procedure => ({ procedure, lastCompletedAt: seedLastCompleted(procedure.id) })),
  activeRun: null,
  completedRuns: SAMPLE_RUNS,
  customProcedures: [],
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);
  const skipNextSave = useRef(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          const { completions = {}, completedRuns: rawRuns = [], customProcedures: rawProcs = [] } = JSON.parse(raw);
          const restoredRuns: CompletedRunRecord[] = rawRuns.map((r: any) => ({
            ...r,
            completedAt: new Date(r.completedAt),
            log: r.log.map((e: any) => ({ ...e, ts: new Date(e.ts) })),
          }));
          dispatch({ type: 'HYDRATE', completions, completedRuns: restoredRuns, customProcedures: rawProcs });
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    const completions: Record<string, string | null> = {};
    state.records.forEach(r => {
      completions[r.procedure.id] = r.lastCompletedAt?.toISOString() ?? null;
    });
    const data = {
      completions,
      completedRuns: state.completedRuns.map(r => ({
        ...r,
        completedAt: r.completedAt.toISOString(),
        log: r.log.map(e => ({ ...e, ts: e.ts.toISOString() })),
      })),
      customProcedures: state.customProcedures,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [state.records, state.completedRuns, state.customProcedures, hydrated]);

  if (!hydrated) return null;

  return (
    <AppContext.Provider value={{
      records:      state.records,
      activeRun:    state.activeRun,
      completedRuns: state.completedRuns,
      startRun:     (procedureId) => dispatch({ type: 'START_RUN', procedureId }),
      appendEntry:  (entry)       => dispatch({ type: 'APPEND_ENTRY', entry }),
      completeRun:  ()            => dispatch({ type: 'COMPLETE_RUN' }),
      abandonRun:   ()            => dispatch({ type: 'ABANDON_RUN' }),
      addProcedure: (procedure)   => dispatch({ type: 'ADD_PROCEDURE', procedure }),
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): ContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
