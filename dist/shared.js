const STORE_KEY = 'companion-v1-state';
let stateChannel = null;
try { stateChannel = new BroadcastChannel('companion-v1-sync'); } catch {}

const defaultState = {
  workMode: false,
  workHours: { start: '08:00', end: '18:00', days: [1,2,3,4,5] },
  focusStack: [],
  activation: { status: 'idle', focusId: null, startedAt: null, durationMin: 5, checkpointDue: null, checkpointReady: false, notifiedAt: null },
  interruptions: [],
  deviations: [],
  retakes: [],
  completions: [],
  interventions: [],
  session: { startedAt: null, paused: false },
  ui: { companionPinned: true, quickOverlay: null, workOverride: null, workOverrideDate: null },
};

function uid(prefix='id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      workHours: { ...defaultState.workHours, ...(parsed.workHours || {}) },
      activation: { ...defaultState.activation, ...(parsed.activation || {}) },
      session: { ...defaultState.session, ...(parsed.session || {}) },
      ui: { ...defaultState.ui, ...(parsed.ui || {}) },
    };
  } catch (err) {
    console.warn('Falha ao carregar estado', err);
    return structuredClone(defaultState);
  }
}

function saveState(state) {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('companion-state', { detail: state }));
  try { stateChannel?.postMessage(state); } catch {}
}

function subscribeState(handler) {
  if (!stateChannel || typeof handler !== 'function') return () => {};
  const listener = (event) => handler(event.data);
  stateChannel.addEventListener('message', listener);
  return () => stateChannel.removeEventListener('message', listener);
}

function currentFocus(state) {
  return state.focusStack[state.focusStack.length - 1] || null;
}

function rootFocus(state) {
  return state.focusStack[0] || null;
}

function createFocus(title, extra={}) {
  return {
    id: uid('focus'),
    title: title.trim(),
    createdAt: new Date().toISOString(),
    startedAt: null,
    status: 'declared',
    firstAction: extra.firstAction || '',
    link: extra.link || '',
    temporary: !!extra.temporary,
    source: extra.source || 'manual',
    sourceId: extra.sourceId || null,
  };
}

function addInterruption(state, description, triage='pending', reason='') {
  const focus = currentFocus(state);
  const item = {
    id: uid('interrupt'),
    description: description.trim(),
    createdAt: new Date().toISOString(),
    focusId: focus?.id || null,
    focusTitle: focus?.title || null,
    triage,
    reason,
    status: triage === 'now' ? 'temporary-focus' : 'waiting',
  };
  state.interruptions.unshift(item);
  return item;
}

function addDeviation(state, description, decision='pending') {
  const focus = currentFocus(state);
  const item = {
    id: uid('dev'),
    description: description.trim(),
    createdAt: new Date().toISOString(),
    previousFocusId: focus?.id || null,
    previousFocusTitle: focus?.title || null,
    decision,
    returnedAt: null,
  };
  state.deviations.unshift(item);
  return item;
}



function addCompletion(state, focus) {
  const item = {
    id: uid('completion'),
    focusId: focus?.id || null,
    focusTitle: focus?.title || null,
    createdAt: new Date().toISOString(),
    startedAt: focus?.startedAt || null,
    completedAt: new Date().toISOString(),
  };
  state.completions.unshift(item);
  return item;
}

function addRetake(state, fromFocus, toFocus) {
  const item = {
    id: uid('retake'),
    createdAt: new Date().toISOString(),
    fromFocusId: fromFocus?.id || null,
    fromFocusTitle: fromFocus?.title || null,
    toFocusId: toFocus?.id || null,
    toFocusTitle: toFocus?.title || null,
  };
  state.retakes.unshift(item);
  return item;
}

function formatClock(iso) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function elapsedText(iso) {
  if (!iso) return '';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m ? ` ${m}min` : ''}`;
}

window.CompanionStore = {
  STORE_KEY, defaultState, uid, loadState, saveState, subscribeState, currentFocus, rootFocus,
  createFocus, addInterruption, addDeviation, addRetake, addCompletion, formatClock, elapsedText
};
