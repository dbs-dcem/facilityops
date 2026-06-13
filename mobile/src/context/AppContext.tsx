import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { CATALOG, seedLastCompleted } from '../data/catalog';
import type { Procedure, RunEntry } from '../types';

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
}

type Action =
  | { type: 'HYDRATE'; completions: Record<string, string | null> }
  | { type: 'START_RUN'; procedureId: string }
  | { type: 'APPEND_ENTRY'; entry: RunEntry }
  | { type: 'COMPLETE_RUN' }
  | { type: 'ABANDON_RUN' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        records: CATALOG.map(procedure => ({
          procedure,
          lastCompletedAt: action.completions[procedure.id]
            ? new Date(action.completions[procedure.id]!)
            : seedLastCompleted(procedure.id),
        })),
      };
    case 'START_RUN':
      return { ...state, activeRun: { procedureId: action.procedureId, startedAt: new Date(), log: [] } };
    case 'APPEND_ENTRY':
      if (!state.activeRun) return state;
      return { ...state, activeRun: { ...state.activeRun, log: [...state.activeRun.log, action.entry] } };
    case 'COMPLETE_RUN':
      if (!state.activeRun) return state;
      return {
        records: state.records.map(r =>
          r.procedure.id === state.activeRun!.procedureId ? { ...r, lastCompletedAt: new Date() } : r
        ),
        activeRun: null,
      };
    case 'ABANDON_RUN':
      return { ...state, activeRun: null };
    default:
      return state;
  }
}

interface ContextValue {
  records: ProcedureRecord[];
  activeRun: ActiveRun | null;
  startRun: (procedureId: string) => void;
  appendEntry: (entry: RunEntry) => void;
  completeRun: () => void;
  abandonRun: () => void;
}

const AppContext = createContext<ContextValue | null>(null);

const STORAGE_KEY = 'facilityops:v1';

const initialState: State = {
  records: CATALOG.map(procedure => ({ procedure, lastCompletedAt: seedLastCompleted(procedure.id) })),
  activeRun: null,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);
  const skipNextSave = useRef(true); // don't write back immediately after reading

  // load on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          const { completions } = JSON.parse(raw) as { completions: Record<string, string | null> };
          dispatch({ type: 'HYDRATE', completions });
        }
      })
      .catch(() => {/* use seed defaults on read failure */})
      .finally(() => setHydrated(true));
  }, []);

  // persist whenever completions change (skip the hydration write)
  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    const completions: Record<string, string | null> = {};
    state.records.forEach(r => {
      completions[r.procedure.id] = r.lastCompletedAt?.toISOString() ?? null;
    });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ completions })).catch(() => {});
  }, [state.records, hydrated]);

  if (!hydrated) return null;

  return (
    <AppContext.Provider value={{
      records:     state.records,
      activeRun:   state.activeRun,
      startRun:    (procedureId) => dispatch({ type: 'START_RUN', procedureId }),
      appendEntry: (entry)       => dispatch({ type: 'APPEND_ENTRY', entry }),
      completeRun: ()            => dispatch({ type: 'COMPLETE_RUN' }),
      abandonRun:  ()            => dispatch({ type: 'ABANDON_RUN' }),
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
