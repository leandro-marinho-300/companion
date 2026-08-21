(() => {
  const $ = (sel) => document.querySelector(sel);

  function statusText() { return $('#focus-status')?.textContent?.trim() || 'Sem foco'; }
  function workText() { return $('#work-badge')?.textContent?.trim() || 'Inativo'; }

  function setTodayLabel() {
    const el = $('#today-label');
    if (!el) return;
    const text = new Intl.DateTimeFormat('pt-BR', { weekday:'long', day:'2-digit', month:'long' }).format(new Date());
    el.textContent = text.charAt(0).toUpperCase() + text.slice(1);
  }

  function syncCompletedMetric() {
    try {
      const store = window.CompanionStore;
      const s = store?.loadState?.();
      const el = $('#stat-completed');
      if (el) el.textContent = String(s?.completions?.length || 0);
    } catch {}
  }

  function syncHome() {
    const status = statusText();
    const work = workText();
    const noFocus = status === 'Sem foco';
    const declared = status === 'Declarado';
    const activating = status === 'Ativação';
    const stuck = status === 'Travado';
    const engaged = status === 'Engrenado';
    const temporary = status === 'Foco temporário';
    const paused = status === 'Pausado';

    const entry = $('#entry-card');
    const focusCard = $('#current-focus-card');
    const start = $('#start-focus');
    const help = $('#help-enter');
    const interrupt = $('#interrupt-btn');
    const deviate = $('#deviate-btn');
    const finish = $('#finish-temp-main');
    const actionWrap = $('#focus-action-wrap');
    const action = $('#focus-action');
    const cycle = $('#focus-cycle');
    const helperTitle = $('#helper-title');
    const subtitle = $('#work-subtitle');
    const sinceWrap = $('#focus-since-wrap');
    const sessionCard = $('#session-card');

    if (entry) entry.hidden = !noFocus || work === 'Inativo';
    if (focusCard) focusCard.hidden = noFocus;

    if (start) start.hidden = !(declared || paused);
    if (help) help.hidden = !declared;
    if (interrupt) interrupt.hidden = !(engaged || temporary);
    if (deviate) deviate.hidden = !(engaged || temporary);
    if (finish) finish.hidden = !(engaged || temporary);

    if (actionWrap) actionWrap.hidden = !action || !action.textContent || action.textContent.trim() === '—';
    if (cycle) cycle.hidden = !(activating || engaged || temporary);
    if (sinceWrap) sinceWrap.hidden = declared;

    if (subtitle) {
      subtitle.textContent = noFocus
        ? (work === 'Inativo' ? 'Sua sessão está encerrada. Quando precisar voltar, inicie uma nova sessão.' : 'Vamos escolher uma coisa para proteger agora.')
        : declared ? 'A tarefa está declarada. Agora só precisamos entrar nela.'
        : activating ? 'Você começou. O Companion fica quieto por alguns minutos.'
        : stuck ? 'Você não precisa forçar a entrada. Vamos reduzir até ficar possível.'
        : temporary ? 'Uma urgência real assumiu o foco por enquanto. O foco anterior está preservado.'
        : paused ? 'Seu foco está preservado. Nada está correndo enquanto a sessão está pausada.'
        : 'O foco está em andamento. A janela principal acompanha sem competir.';
    }

    if (helperTitle) {
      helperTitle.textContent = noFocus ? 'Um foco por vez.'
        : declared ? 'Primeiro objetivo: entrar.'
        : activating ? 'Agora eu saio um pouco da frente.'
        : stuck ? 'Vamos tornar isso pequeno o bastante.'
        : temporary ? 'Seu foco anterior continua guardado.'
        : paused ? 'Pausa não apaga contexto.'
        : 'Você faz o trabalho. Eu cuido do retorno.';
    }

    if (sessionCard) sessionCard.dataset.mode = work === 'Inativo' ? 'ended' : (paused ? 'paused' : 'active');

    document.body.dataset.focusState = noFocus ? 'empty' : declared ? 'declared' : activating ? 'activation' : stuck ? 'stuck' : temporary ? 'temporary' : paused ? 'paused' : engaged ? 'focus' : 'other';
    syncCompletedMetric();
  }

  function watch() {
    setTodayLabel();
    syncHome();
    const targets = ['#focus-status','#work-badge','#focus-action','#focus-title','#stat-return','#stat-int','#stat-dev'];
    const observer = new MutationObserver(() => queueMicrotask(syncHome));
    targets.map($).filter(Boolean).forEach(el => observer.observe(el,{subtree:true,childList:true,characterData:true,attributes:true}));
    window.addEventListener('storage', syncHome);
    window.addEventListener('companion-state', () => setTimeout(syncHome,0));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();
})();
