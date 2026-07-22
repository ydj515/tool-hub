import { useEffect, useRef, useState } from 'react';
import {
  convertSource,
  oppositeDirection,
  sampleFor,
  type ConverterDirection,
} from '../lib/converter';
import type { Diagnostic } from '../lib/diagnostics';
import { safetyDiagnostic } from '../lib/safety';
import { classifySize, utf8ByteLength, type SizeLevel } from '../lib/size';

export type ConverterStatus = 'empty' | 'scheduled' | 'valid' | 'invalid' | 'oversized';

export interface ConverterState {
  direction: ConverterDirection;
  source: string;
  result: string;
  status: ConverterStatus;
  diagnostic: Diagnostic | null;
  bytes: number;
  sizeLevel: SizeLevel;
  resultFresh: boolean;
}

const DEBOUNCE_MS = 300;
const DEFAULT_DIRECTION: ConverterDirection = 'json-to-yaml';

function initialState(direction: ConverterDirection): ConverterState {
  return {
    direction,
    source: '',
    result: '',
    status: 'empty',
    diagnostic: null,
    bytes: 0,
    sizeLevel: 'normal',
    resultFresh: false,
  };
}

function sourceState(
  direction: ConverterDirection,
  source: string,
  previous: ConverterState,
): ConverterState {
  const bytes = utf8ByteLength(source);
  const sizeLevel = classifySize(bytes);
  const preservedResult = previous.result;

  if (source.trim().length === 0) {
    return { ...initialState(direction), source, bytes, sizeLevel };
  }

  if (sizeLevel === 'oversized') {
    return {
      direction,
      source,
      result: preservedResult,
      status: 'oversized',
      diagnostic: null,
      bytes,
      sizeLevel,
      resultFresh: false,
    };
  }

  return {
    direction,
    source,
    result: preservedResult,
    status: 'scheduled',
    diagnostic: null,
    bytes,
    sizeLevel,
    resultFresh: false,
  };
}

export function useConverter(convert: typeof convertSource = convertSource): {
  state: ConverterState;
  setSource: (source: string) => void;
  selectDirection: (direction: ConverterDirection) => void;
  setDirectionAndSource: (direction: ConverterDirection, source: string) => void;
  loadSample: () => void;
  clear: () => void;
  swap: () => void;
  reportDiagnostic: (diagnostic: Diagnostic) => void;
} {
  const [state, setState] = useState<ConverterState>(() => initialState(DEFAULT_DIRECTION));
  const [scheduledRevision, setScheduledRevision] = useState(0);
  const stateRef = useRef(state);
  const directionRef = useRef<ConverterDirection>(state.direction);
  const revisionRef = useRef(0);
  const lastSuccessRevisionRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const replaceState = (next: ConverterState) => {
    stateRef.current = next;
    setState(next);
  };

  const cancelTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const replaceSource = (direction: ConverterDirection, source: string) => {
    revisionRef.current += 1;
    directionRef.current = direction;
    cancelTimer();
    replaceState(sourceState(direction, source, stateRef.current));
    setScheduledRevision(revisionRef.current);
  };

  useEffect(() => {
    if (state.status !== 'scheduled') return undefined;

    const revision = scheduledRevision;
    const direction = state.direction;
    const source = state.source;
    const timer = setTimeout(() => {
      if (revision !== revisionRef.current || direction !== directionRef.current) return;

      let converted;
      try {
        converted = convert(source, direction);
      } catch {
        converted = {
          ok: false as const,
          diagnostic: safetyDiagnostic(
            direction === 'json-to-yaml' ? 'json' : 'yaml',
            'UNEXPECTED_ERROR',
            '변환 중 예상하지 못한 오류가 발생했습니다.',
            source,
          ),
        };
      }
      if (revision !== revisionRef.current || direction !== directionRef.current) return;

      const current = stateRef.current;
      if (converted.ok) {
        lastSuccessRevisionRef.current = revision;
        replaceState({
          ...current,
          direction,
          source,
          result: converted.value,
          status: 'valid',
          diagnostic: null,
          resultFresh: lastSuccessRevisionRef.current === revision,
        });
      } else {
        replaceState({
          ...current,
          direction,
          source,
          status: 'invalid',
          diagnostic: converted.diagnostic,
          resultFresh: false,
        });
      }
    }, DEBOUNCE_MS);

    timerRef.current = timer;
    return () => {
      clearTimeout(timer);
      if (timerRef.current === timer) timerRef.current = null;
    };
  }, [convert, scheduledRevision, state.direction, state.source, state.status]);

  return {
    state,
    setSource: (source) => replaceSource(directionRef.current, source),
    selectDirection: (direction) => replaceSource(direction, stateRef.current.source),
    setDirectionAndSource: replaceSource,
    loadSample: () => replaceSource(directionRef.current, sampleFor(directionRef.current)),
    clear: () => {
      revisionRef.current += 1;
      cancelTimer();
      replaceState(initialState(directionRef.current));
    },
    swap: () => {
      const current = stateRef.current;
      if (!current.resultFresh || current.result.length === 0) return;
      replaceSource(oppositeDirection(current.direction), current.result);
    },
    reportDiagnostic: (diagnostic) => {
      const current = stateRef.current;
      replaceState({ ...current, status: 'invalid', diagnostic, resultFresh: false });
    },
  };
}
