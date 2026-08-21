(() => {
  const S = window.CompanionStore;
  const $ = (s) => document.querySelector(s);
  const body = document.body;
  let lastSignature = '';
  let collapseTimer = null;
  let currentDisplay = 'expanded';
  let fullWindowSize = { width: 430, height: 285 };
  const DISPLAY_KEY = 'companion:displayMode';

  function nowFocusState() {
    const state = S?.loadState?.();
    const f = S?.currentFocus?.(state);
    const activationMatches = !!f && state?.activation?.focusId === f.id;
    const checkpointReady = !f?.temporary && activationMatches && state?.activation?.status === 'running' && (
      state?.activation?.checkpointReady || (state?.activation?.checkpointDue && Date.now() >= new Date(state.activation.checkpointDue).getTime())
    );

    if (state?.session?.paused) return { name:'paused', state, f };
    if (!f) return { name:'empty', state, f };
    if (f.temporary) return { name:'temporary', state, f };
    if (activationMatches && state?.activation?.status === 'stuck') return { name:'unstuck', state, f };
    if (checkpointReady) return { name:'attention', state, f };
    if (activationMatches && state?.activation?.status === 'running') return { name:'activation', state, f };
    if (!f.startedAt || f.status === 'declared') return { name:'declared', state, f };
    return { name:'focus', state, f };
  }

  function show(el, yes) { if (el) el.hidden = !yes; }

  function minutesSince(iso) {
    if (!iso) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  }

  function preferredMode() {
    const saved = localStorage.getItem(DISPLAY_KEY);
    return ['expanded','faded','collapsed'].includes(saved) ? saved : 'collapsed';
  }

  function tauriCurrentWindow() {
    const t = window.__TAURI__;
    try {
      return t?.window?.getCurrentWindow?.() || t?.webviewWindow?.getCurrentWebviewWindow?.() || null;
    } catch { return null; }
  }

  function physicalSize(width, height) {
    const D = window.__TAURI__?.dpi;
    try { return D?.PhysicalSize ? new D.PhysicalSize(width, height) : null; } catch { return null; }
  }

  function physicalPosition(x, y) {
    const D = window.__TAURI__?.dpi;
    try { return D?.PhysicalPosition ? new D.PhysicalPosition(x, y) : null; } catch { return null; }
  }

  async function resizeKeepingRightEdge(width, height) {
    const win = tauriCurrentWindow();
    if (!win?.outerSize || !win?.outerPosition || !win?.setSize || !win?.setPosition) return false;
    try {
      const oldSize = await win.outerSize();
      const oldPos = await win.outerPosition();
      const right = oldPos.x + oldSize.width;
      const size = physicalSize(width, height);
      const pos = physicalPosition(right - width, oldPos.y);
      if (!size || !pos) return false;
      await win.setSize(size);
      await win.setPosition(pos);
      return true;
    } catch (err) {
      console.debug('Companion: resize discreto indisponível', err);
      return false;
    }
  }

  async function setDisplayMode(mode) {
    if (mode === currentDisplay) return;
    currentDisplay = mode;
    body.dataset.displayMode = mode;
    if (mode === 'collapsed') await resizeKeepingRightEdge(78, 196);
    else await resizeKeepingRightEdge(fullWindowSize.width, fullWindowSize.height);
  }

  function cancelCollapse() {
    if (collapseTimer) clearTimeout(collapseTimer);
    collapseTimer = null;
  }

  function scheduleQuietMode(delay = 1800) {
    cancelCollapse();
    const info = nowFocusState();
    if (info.name !== 'focus' || $('#overlay-root')?.children?.length) return;
    const pref = preferredMode();
    if (pref === 'expanded') return setDisplayMode('expanded');
    collapseTimer = setTimeout(() => setDisplayMode(pref), delay);
  }

  function forceExpanded() {
    cancelCollapse();
    setDisplayMode('expanded');
  }

  function sync() {
    const info = nowFocusState();
    const { name, state, f } = info;
    const overlayOpen = !!$('#overlay-root')?.children?.length;
    const signature = [name, f?.id || '', f?.status || '', state?.activation?.checkpointReady || false, overlayOpen].join('|');

    body.dataset.compactState = name;

    const status = $('#comp-status');
    if (status) {
      const labels = {
        empty:'MODO TRABALHO ATIVO', declared:'FOCO DECLARADO', activation:'ATIVAÇÃO', attention:'PRECISA DA SUA ATENÇÃO',
        focus:'EM FOCO', temporary:'FOCO TEMPORÁRIO', paused:'PAUSADO', unstuck:'DESTRAVANDO'
      };
      status.textContent = labels[name] || 'AGUARDANDO';
      const colors = { activation:'var(--cr-yellow)', attention:'var(--cr-yellow)', focus:'var(--cr-green)', temporary:'var(--cr-purple)', unstuck:'var(--cr-yellow)' };
      status.style.color = colors[name] || 'var(--cr-muted)';
    }

    show($('#comp-empty-panel'), name === 'empty');
    show($('#comp-activation-panel'), name === 'activation' || name === 'declared');
    show($('#comp-normal-actions'), name === 'focus');
    show($('#comp-root-finish-actions'), name === 'focus');
    show($('#comp-checkpoint'), name === 'attention');
    show($('#comp-temp-actions'), name === 'temporary');
    show($('#comp-paused-panel'), name === 'paused');
    show($('#comp-unstuck-panel'), name === 'unstuck');

    const pause = $('#comp-pause');
    if (pause) pause.hidden = name === 'empty' || name === 'paused' || name === 'unstuck' || name === 'attention';

    const firstAction = $('#comp-first-action');
    if (firstAction) firstAction.textContent = f?.firstAction || (name === 'declared' ? 'Começar pela menor porta de entrada.' : 'Só entrar na tarefa.');

    const edgeMinutes = $('#compact-edge-minutes');
    if (edgeMinutes) edgeMinutes.textContent = String(minutesSince(f?.startedAt));

    const pausedTime = $('#comp-paused-time');
    if (pausedTime) pausedTime.textContent = f?.startedAt ? `${S.elapsedText?.(f.startedAt) || ''} de foco acumulado` : 'Foco preservado';

    if (overlayOpen || name !== 'focus') {
      forceExpanded();
    } else if (signature !== lastSignature) {
      forceExpanded();
      scheduleQuietMode(1800);
    }

    lastSignature = signature;
  }

  async function captureInitialWindowSize() {
    const win = tauriCurrentWindow();
    if (!win?.outerSize) return;
    try {
      const s = await win.outerSize();
      if (s.width > 200) fullWindowSize = { width:s.width, height:s.height };
    } catch {}
  }

  function wire() {
    captureInitialWindowSize();
    sync();

    $('#compact-edge-tab')?.addEventListener('mouseenter', forceExpanded);
    $('#compact-edge-tab')?.addEventListener('focus', forceExpanded);
    $('#compact-edge-tab')?.addEventListener('click', forceExpanded);

    $('#companion-window')?.addEventListener('mouseenter', forceExpanded);
    $('#companion-window')?.addEventListener('mouseleave', () => scheduleQuietMode(800));
    $('#companion-window')?.addEventListener('focusin', forceExpanded);
    $('#companion-window')?.addEventListener('focusout', () => scheduleQuietMode(1000));
    document.addEventListener('pointerdown', () => { forceExpanded(); scheduleQuietMode(2200); }, true);

    $('#comp-define-focus')?.addEventListener('click', () => {
      window.__TAURI__?.core?.invoke?.('show_main_page', { page:'work' }).catch(()=>{});
    });
    $('#comp-resume-main')?.addEventListener('click', () => $('#comp-pause')?.click());
    $('#comp-temp-deviate')?.addEventListener('click', () => $('#comp-deviate')?.click());

    window.addEventListener('storage', () => { forceExpanded(); setTimeout(sync, 0); });
    window.addEventListener('companion-state', () => { forceExpanded(); setTimeout(sync, 0); });
    setInterval(sync, 350);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
