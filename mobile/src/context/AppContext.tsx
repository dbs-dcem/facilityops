import React, { createContext, useContext, useReducer } from 'react';
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
  | { type: 'START_RUN'; procedureId: string }
  | { type: 'APPEND_ENTRY'; entry: RunEntry }
  | { type: 'COMPLETE_RUN' }
  | { type: 'ABANDON_RUN' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
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

const initialState: State = {
  records: CATALOG.map(procedure => ({ procedure, lastCompletedAt: seedLastCompleted(procedure.id) })),
  activeRun: null,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
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
