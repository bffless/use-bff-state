// Main entry point - exports React components and hooks

// React exports (primary API)
export { BffStateProvider, type BffStateProviderProps } from './react/BffStateProvider';
export { useBffState } from './react/useBffState';
export { useBffStateContext, BffStateContext } from './react/context';

// Type exports
export type {
  PersistenceOption,
  BffStateProviderOptions,
  UseBffStateOptions,
  UseBffStateResult,
} from './core/types';

// Core utilities (for advanced usage)
export {
  generateUuid,
  getOrCreateGuestId,
  readGuestId,
  writeGuestId,
} from './core/cookie';

export {
  fetchState,
  updateState,
  appendGuestIdParam,
  buildUrl,
  mergeHeaders,
} from './core/client';
