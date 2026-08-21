/* Companion · Redesign Phase 3
   Fluxos aprovados de Interrupção + Desvio/Recuperação.
   Este arquivo não substitui o motor: ele usa o CompanionStore atual e intercepta
   apenas as entradas desses fluxos, tanto na janela principal quanto no compacto. */
(() => {
  const S = window.CompanionStore;
  if (!S) return;

  const $ = (sel) => document.querySelector(sel);
  const root = $('#overlay-root');
  if (!root) return;

  const body = document.body;
  const isCompact = body.classList.contains('companion-redesign');
  const FLOW_LOCK_KEY = 'companion:flow-lock-v1';
  const instanceId = `${isCompact ? 'compact' : 'main'}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const compactBaseSize = { width: 430, height: 285 };
  const interruptionReasons = [
    'Alguém está bloqueado agora',
    'Existe prazo imediato',
    'Existe consequência financeira / operacional',
    'Há um problema acontecendo agora',
    'Só parece urgente'
  ];
  const deviationReasons = [
    'Alguém depende de uma resposta neste momento',
    'Existe prazo imediato',
    'Há consequência operacional / financeira',
    'Existe uma situação real acontecendo agora',
    'Só ficou mais interessante/importante na minha cabeça agora'
  ];

  let flow = null;

  const esc = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));

  function readState() { return S.loadState(); }
  function currentFocus(state) { return S.currentFocus(state); }
  function focusTitle(state) { return currentFocus(state)?.title || 'seu foco atual'; }

  function saveState(state) {
    S.saveState(state);
    // companion.js legado atualiza seu estado interno por "storage"; o evento real
    // não dispara no mesmo documento, então fazemos a ponte local deliberadamente.
    try { window.dispatchEvent(new Event('storage')); } catch {}
  }

  function clearActivation(state) {
    state.activation = {
      ...state.activation,
      status:'idle', focusId:null, startedAt:null, checkpointDue:null,
      checkpointReady:false, notifiedAt:null
    };
  }

  function readLock() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FLOW_LOCK_KEY) || 'null');
      if (!parsed) return null;
      if (!parsed.at || Date.now() - parsed.at > 180000) {
        localStorage.removeItem(FLOW_LOCK_KEY);
        return null;
      }
      return parsed;
    } catch { return null; }
  }

  function lockFlow() {
    try {
      localStorage.setItem(FLOW_LOCK_KEY, JSON.stringify({
        owner: instanceId,
        surface: isCompact ? 'compact' : 'main',
        at: Date.now()
      }));
    } catch {}
  }

  function unlockFlow() {
    try {
      const lock = readLock();
      if (lock?.owner === instanceId) localStorage.removeItem(FLOW_LOCK_KEY);
    } catch {}
  }

  function lockedByOtherSurface() {
    const lock = readLock();
    return !!lock && lock.owner !== instanceId;
  }

  function toast(message) {
    let el = document.querySelector('.flow-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'flow-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._flowTimer);
    el._flowTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function tauriCurrentWindow() {
    const t = window.__TAURI__;
    try {
      return t?.window?.getCurrentWindow?.() || t?.webviewWindow?.getCurrentWebviewWindow?.() || null;
    } catch { return null; }
  }

  function logicalSize(width, height) {
    const D = window.__TAURI__?.dpi;
    try { return D?.LogicalSize ? new D.LogicalSize(width, height) : null; } catch { return null; }
  }

  function physicalPosition(x, y) {
    const D = window.__TAURI__?.dpi;
    try { return D?.PhysicalPosition ? new D.PhysicalPosition(x, y) : null; } catch { return null; }
  }


  function workAreaPhysical() {
    const scale = Number(window.devicePixelRatio || 1) || 1;
    const s = window.screen || {};
    const left = Math.round(Number(s.availLeft || 0) * scale);
    const top = Math.round(Number(s.availTop || 0) * scale);
    const width = Math.round(Number(s.availWidth || s.width || 1920) * scale);
    const height = Math.round(Number(s.availHeight || s.height || 1080) * scale);
    return { left, top, right:left + width, bottom:top + height };
  }

  function clamp(value, min, max) {
    if (max < min) return min;
    return Math.min(Math.max(value, min), max);
  }

  async function resizeCompact(width, height) {
    if (!isCompact) return;
    const win = tauriCurrentWindow();
    if (!win?.outerSize || !win?.outerPosition || !win?.setSize || !win?.setPosition) return;
    try {
      const oldSize = await win.outerSize();
      const oldPos = await win.outerPosition();
      const right = oldPos.x + oldSize.width;
      const centerY = oldPos.y + (oldSize.height / 2);
      const size = logicalSize(width, height);
      if (!size) return;
      await win.setSize(size);
      const newSize = await win.outerSize();
      const area = workAreaPhysical();
      const x = clamp(right - newSize.width, area.left, area.right - newSize.width);
      const y = clamp(Math.round(centerY - (newSize.height / 2)), area.top, area.bottom - newSize.height);
      const pos = physicalPosition(x, y);
      if (pos) await win.setPosition(pos);
    } catch (err) {
      console.debug('Companion: não foi possível redimensionar o fluxo', err);
    }
  }

  function compactHeight(requested) {
    const available = Math.max(360, (window.screen?.availHeight || 900) - 90);
    return Math.min(requested, available);
  }

  async function fitFlowWindow(height) {
    if (!isCompact) return;
    body.dataset.flowActive = 'true';
    document.documentElement.dataset.flowActive = 'true';
    await resizeCompact(compactBaseSize.width, compactHeight(height));
  }

  async function restoreCompactWindow() {
    if (!isCompact) return;
    delete body.dataset.flowActive;
    delete document.documentElement.dataset.flowActive;
    await resizeCompact(compactBaseSize.width, compactBaseSize.height);
  }

  function shell({ title, kicker = '', bodyHtml, footerHtml = '', close = true }) {
    return `
      <div class="flow-backdrop" data-flow-backdrop>
        <section class="flow-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
          <header class="flow-head">
            <div>
              ${kicker ? `<span class="flow-head-kicker">${esc(kicker)}</span>` : ''}
              <strong>${title}</strong>
            </div>
            ${close ? '<button class="flow-icon" type="button" data-flow-close aria-label="Fechar">×</button>' : ''}
          </header>
          <div class="flow-body">${bodyHtml}</div>
          ${footerHtml ? `<footer class="flow-foot">${footerHtml}</footer>` : ''}
        </section>
      </div>`;
  }

  async function render(html, { height = 430, focusSelector = null } = {}) {
    lockFlow();

    // Se o atalho global abrir um fluxo enquanto a lingueta estiver recolhida,
    // pedimos primeiro ao controlador visual já existente para sair do modo collapsed.
    // Em seguida aplicamos a altura necessária ao modal.
    if (isCompact) {
      try { $('#compact-edge-tab')?.dispatchEvent(new Event('mouseenter')); } catch {}
    }

    root.innerHTML = html;
    body.dataset.flowActive = 'true';
    if (isCompact) await new Promise(resolve => setTimeout(resolve, 90));
    await fitFlowWindow(height);
    if (isCompact) setTimeout(() => fitFlowWindow(height), 220);
    if (focusSelector) setTimeout(() => root.querySelector(focusSelector)?.focus(), 40);
  }

  async function closeFlow() {
    root.innerHTML = '';
    flow = null;
    unlockFlow();
    delete body.dataset.flowActive;
    await restoreCompactWindow();
  }

  function interruptionSummary() {
    return `<p class="flow-context-line"><strong>Interrupção:</strong> ${esc(flow?.description || '')}</p>`;
  }

  function deviationSummary() {
    return `<p class="flow-context-line"><strong>Você foi para:</strong> ${esc(flow?.description || '')}</p>`;
  }

  function resultFocusBox(label = 'Seu foco continua sendo') {
    const state = readState();
    return `<div class="flow-focus-return"><span>${esc(label)}</span><strong>${esc(focusTitle(state))}</strong></div>`;
  }

  function flowChoices(items) {
    return `<div class="flow-choices">${items.map(item => `
      <button type="button" class="flow-choice" data-flow-choice="${esc(item.value)}">
        <strong>${item.title}</strong><span>${item.subtitle}</span>
      </button>`).join('')}</div>`;
  }

  function radioRows(items, group) {
    return `<div class="flow-radio-list">${items.map((label, index) => `
      <button type="button" class="flow-radio-row" data-flow-radio="${index}" data-flow-group="${group}">
        <span class="flow-radio-dot" aria-hidden="true"></span><span>${esc(label)}</span>
      </button>`).join('')}</div>`;
  }

  function bindCloseButtons() {
    root.querySelectorAll('[data-flow-close]').forEach((el) => el.addEventListener('click', closeFlow));
    root.querySelector('[data-flow-backdrop]')?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) closeFlow();
    });
  }

  async function openInterruptionCapture() {
    if (lockedByOtherSurface()) {
      toast('A triagem já está aberta na outra janela.');
      return;
    }
    flow = { kind:'interruption', description:'', selected:null };
    await render(shell({
      title:'⚡ O que surgiu?',
      kicker:'CAPTURA EM ATÉ 5 SEGUNDOS',
      bodyHtml:`
        <p>Capture rápido. Sem transformar isso em outra tarefa para organizar.</p>
        <input class="flow-input" id="flow-interruption-input" autocomplete="off" placeholder="Descreva em poucas palavras..." />
        <small class="flow-soft">Ex.: Verificar CND AGEA</small>`,
      footerHtml:`<button class="flow-btn ghost" type="button" data-flow-close>Cancelar</button><button class="flow-btn primary" type="button" id="flow-interruption-next">Continuar →</button>`
    }), { height:350, focusSelector:'#flow-interruption-input' });
    bindCloseButtons();
    const input = $('#flow-interruption-input');
    const next = () => {
      const value = input?.value.trim();
      if (!value) { input?.focus(); return; }
      flow.description = value;
      showInterruptionTriage();
    };
    $('#flow-interruption-next')?.addEventListener('click', next);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); next(); } });
  }

  async function showInterruptionTriage() {
    await render(shell({
      title:'Triagem rápida',
      bodyHtml:`
        ${interruptionSummary()}
        <h2>Isso precisa substituir o que você está fazendo agora?</h2>
        ${flowChoices([
          { value:'yes', title:'Sim', subtitle:'Avaliar urgência' },
          { value:'no', title:'Não', subtitle:'Estacionar' },
          { value:'unsure', title:'Não sei', subtitle:'Revisar depois' }
        ])}
        <div class="flow-rule"><strong>Regra:</strong> “Não sei” não vira urgência. Na dúvida, o foco atual fica protegido.</div>`
    }), { height:440 });
    bindCloseButtons();
    root.querySelectorAll('[data-flow-choice]').forEach((button) => button.addEventListener('click', () => {
      const choice = button.dataset.flowChoice;
      if (choice === 'yes') showInterruptionUrgency();
      else if (choice === 'no') parkInterruption('later');
      else parkInterruption('unsure');
    }));
  }

  async function showInterruptionUrgency() {
    flow.selected = null;
    await render(shell({
      title:'Confirmação de urgência',
      bodyHtml:`
        ${interruptionSummary()}
        <h2>O que acontece se isso esperar até você terminar seu foco?</h2>
        ${radioRows(interruptionReasons, 'interrupt')}
        <div class="flow-rule orange">Trocar de foco precisa de uma consequência concreta — não só sensação de urgência.</div>`,
      footerHtml:`<button class="flow-btn ghost" type="button" id="flow-back-triage">← Voltar</button><button class="flow-btn primary" type="button" id="flow-urgency-confirm" disabled>Trocar foco agora</button>`
    }), { height:570 });
    bindCloseButtons();
    $('#flow-back-triage')?.addEventListener('click', showInterruptionTriage);
    const confirm = $('#flow-urgency-confirm');
    root.querySelectorAll('[data-flow-radio]').forEach((row) => row.addEventListener('click', () => {
      root.querySelectorAll('[data-flow-radio]').forEach((r) => r.classList.remove('selected'));
      row.classList.add('selected');
      flow.selected = Number(row.dataset.flowRadio);
      if (confirm) {
        confirm.disabled = false;
        confirm.textContent = flow.selected === interruptionReasons.length - 1 ? 'Estacionar para depois' : 'Trocar foco agora';
      }
    }));
    confirm?.addEventListener('click', () => {
      if (!Number.isInteger(flow.selected)) return;
      if (flow.selected === interruptionReasons.length - 1) {
        parkInterruption('later', interruptionReasons[flow.selected]);
      } else {
        createTemporaryFromInterruption(interruptionReasons[flow.selected]);
      }
    });
  }

  function parkInterruption(triage, reason = '') {
    const state = readState();
    const item = S.addInterruption(state, flow.description, triage, reason);
    flow.itemId = item.id;
    saveState(state);
    if (triage === 'unsure') showReviewLater();
    else showParked();
  }

  async function showParked({ nested = false } = {}) {
    await render(shell({
      title:'✓ Guardado sem te puxar daqui',
      kicker:'CAIXA DE INTERRUPÇÕES',
      bodyHtml:`
        <div class="flow-result-card">
          <div class="flow-result-icon">📥</div>
          <div><h2>${esc(flow.description)} ficou estacionada.</h2>
          <p>${nested ? 'Você já está em um foco temporário, então eu não abri outro por cima. Ficou guardado para depois.' : 'Ela continua salva. Você não precisa resolver agora para não esquecer depois.'}</p></div>
        </div>
        ${resultFocusBox()}`,
      footerHtml:`<button class="flow-btn primary" type="button" id="flow-return-focus">Voltar ao foco →</button>`
    }), { height:430 });
    bindCloseButtons();
    $('#flow-return-focus')?.addEventListener('click', closeFlow);
  }

  async function showReviewLater() {
    await render(shell({
      title:'✓ Decisão adiada com segurança',
      kicker:'REVISAR DEPOIS',
      bodyHtml:`
        <div class="flow-result-card">
          <div class="flow-result-icon">◷</div>
          <div><h2>Você não precisa saber agora.</h2>
          <p>“${esc(flow.description)}” ficou marcada para revisão. Isso não transforma a interrupção em urgente.</p></div>
        </div>
        ${resultFocusBox()}`,
      footerHtml:`<button class="flow-btn primary" type="button" id="flow-return-focus">Voltar ao foco →</button>`
    }), { height:430 });
    bindCloseButtons();
    $('#flow-return-focus')?.addEventListener('click', closeFlow);
  }

  function createTemporaryFromInterruption(reason) {
    const state = readState();
    const current = currentFocus(state);
    if (!current || current.temporary || state.focusStack.length > 1) {
      const item = S.addInterruption(state, flow.description, 'later', reason);
      item.preventedNestedFocus = true;
      flow.itemId = item.id;
      saveState(state);
      showParked({ nested:true });
      return;
    }

    const item = S.addInterruption(state, flow.description, 'now', reason);
    const temporary = S.createFocus(flow.description, {
      temporary:true,
      source:'interruption',
      sourceId:item.id
    });
    temporary.startedAt = new Date().toISOString();
    temporary.status = 'engaged';
    clearActivation(state);
    state.focusStack.push(temporary);
    item.status = 'temporary-focus';
    saveState(state);
    closeFlow();
    setTimeout(() => toast('Foco temporário assumido. O anterior continua guardado.'), 80);
  }

  async function openDeviationCapture() {
    if (lockedByOtherSurface()) {
      toast('A recuperação já está aberta na outra janela.');
      return;
    }
    flow = { kind:'deviation', description:'', selected:null };
    await render(shell({
      title:'🛟 Para onde você foi?',
      kicker:'RECUPERAÇÃO, NÃO BRONCA',
      bodyHtml:`
        <p>Perceber o desvio já é um comportamento positivo.</p>
        <input class="flow-input" id="flow-deviation-input" autocomplete="off" placeholder="Ex.: WhatsApp, e-mail, outra demanda..." />
        <small class="flow-soft">Só precisamos registrar o destino para conseguir voltar.</small>`,
      footerHtml:`<button class="flow-btn ghost" type="button" data-flow-close>Cancelar</button><button class="flow-btn primary" type="button" id="flow-deviation-next">Continuar →</button>`
    }), { height:370, focusSelector:'#flow-deviation-input' });
    bindCloseButtons();
    const input = $('#flow-deviation-input');
    const next = () => {
      const value = input?.value.trim();
      if (!value) { input?.focus(); return; }
      flow.description = value;
      showDeviationAssessment();
    };
    $('#flow-deviation-next')?.addEventListener('click', next);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); next(); } });
  }

  async function showDeviationAssessment() {
    await render(shell({
      title:'O desvio virou prioridade?',
      bodyHtml:`
        ${deviationSummary()}
        <h2>Isso realmente precisa substituir seu foco agora?</h2>
        ${flowChoices([
          { value:'no', title:'Não', subtitle:'Voltar ao foco' },
          { value:'unsure', title:'Não sei', subtitle:'Proteger foco atual' },
          { value:'yes', title:'Sim', subtitle:'Verificar necessidade' }
        ])}
        <div class="flow-rule"><strong>Regra:</strong> no “Não sei”, o foco atual vence por padrão.</div>`
    }), { height:440 });
    bindCloseButtons();
    root.querySelectorAll('[data-flow-choice]').forEach((button) => button.addEventListener('click', () => {
      const choice = button.dataset.flowChoice;
      if (choice === 'yes') showDeviationConfirmation();
      else recordRecoveredDeviation(choice === 'unsure' ? 'unsure' : 'no');
    }));
  }

  async function showDeviationConfirmation() {
    flow.selected = null;
    await render(shell({
      title:'Antes de trocar de foco…',
      bodyHtml:`
        ${deviationSummary()}
        <h2>Por que isso precisa virar o foco agora?</h2>
        ${radioRows(deviationReasons, 'deviation')}
        <div class="flow-rule orange">Desvio pode virar foco temporário — mas só quando houver uma razão concreta.</div>`,
      footerHtml:`<button class="flow-btn ghost" type="button" id="flow-back-deviation">← Voltar</button><button class="flow-btn primary" type="button" id="flow-deviation-confirm" disabled>Trocar foco agora</button>`
    }), { height:570 });
    bindCloseButtons();
    $('#flow-back-deviation')?.addEventListener('click', showDeviationAssessment);
    const confirm = $('#flow-deviation-confirm');
    root.querySelectorAll('[data-flow-radio]').forEach((row) => row.addEventListener('click', () => {
      root.querySelectorAll('[data-flow-radio]').forEach((r) => r.classList.remove('selected'));
      row.classList.add('selected');
      flow.selected = Number(row.dataset.flowRadio);
      if (confirm) {
        confirm.disabled = false;
        confirm.textContent = flow.selected === deviationReasons.length - 1 ? 'Voltar ao foco' : 'Trocar foco agora';
      }
    }));
    confirm?.addEventListener('click', () => {
      if (!Number.isInteger(flow.selected)) return;
      if (flow.selected === deviationReasons.length - 1) {
        recordRecoveredDeviation('not-concrete', deviationReasons[flow.selected]);
      } else {
        createTemporaryFromDeviation(deviationReasons[flow.selected]);
      }
    });
  }

  function recordRecoveredDeviation(source = 'no', reason = '') {
    const state = readState();
    const item = S.addDeviation(state, flow.description, 'returned');
    item.returnedAt = new Date().toISOString();
    item.recoveryChoice = source;
    if (reason) item.reason = reason;
    saveState(state);
    flow.deviationId = item.id;
    showRecovered();
  }

  async function showRecovered({ nested = false } = {}) {
    await render(shell({
      title:'↩ Foco recuperado',
      kicker:'VOCÊ PERCEBEU E VOLTOU',
      bodyHtml:`
        <div class="flow-result-card recovery">
          <div class="flow-result-icon owl">🦉</div>
          <div><h2>${esc(focusTitle(readState()))} continua protegido.</h2>
          <p>${nested ? 'Você já estava em um foco temporário, então evitamos criar outro nível de troca. O desvio foi registrado e este foco continua preservado.' : 'O desvio foi registrado, sem apagar o que você já tinha construído neste foco.'}</p></div>
        </div>
        ${resultFocusBox('Retomar agora')}`,
      footerHtml:`<button class="flow-btn primary" type="button" id="flow-resume-focus">Retomar foco →</button>`
    }), { height:430 });
    bindCloseButtons();
    $('#flow-resume-focus')?.addEventListener('click', closeFlow);
  }

  function createTemporaryFromDeviation(reason) {
    const state = readState();
    const current = currentFocus(state);
    if (!current || current.temporary || state.focusStack.length > 1) {
      const item = S.addDeviation(state, flow.description, 'returned');
      item.returnedAt = new Date().toISOString();
      item.reason = reason;
      item.preventedNestedFocus = true;
      saveState(state);
      flow.deviationId = item.id;
      showRecovered({ nested:true });
      return;
    }

    const item = S.addDeviation(state, flow.description, 'prioritized');
    item.reason = reason;
    const temporary = S.createFocus(flow.description, {
      temporary:true,
      source:'deviation',
      sourceId:item.id
    });
    temporary.startedAt = new Date().toISOString();
    temporary.status = 'engaged';
    clearActivation(state);
    state.focusStack.push(temporary);
    saveState(state);
    closeFlow();
    setTimeout(() => toast('Foco temporário assumido. O anterior continua guardado.'), 80);
  }

  function handleExecutionClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const interrupt = target.closest('#interrupt-btn, #focus-page-interrupt, #comp-interrupt');
    const deviation = target.closest('#deviate-btn, #comp-deviate, #comp-temp-deviate, #comp-check-dev, [data-activation="deviated"]');
    if (!interrupt && !deviation) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (interrupt) openInterruptionCapture();
    else openDeviationCapture();
  }

  document.addEventListener('click', handleExecutionClick, true);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && flow) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeFlow();
      return;
    }
    if (event.ctrlKey && event.shiftKey && event.code === 'Space') {
      event.preventDefault();
      event.stopImmediatePropagation();
      openInterruptionCapture();
    }
  }, true);

  // O atalho global do Tauri dispara este evento na janela compacta. O listener
  // legado também existe; rodamos um tick depois e substituímos o overlay antigo.
  if (window.__TAURI__?.event?.listen) {
    window.__TAURI__.event.listen('quick-interruption', () => {
      setTimeout(openInterruptionCapture, 0);
    }).catch(() => {});
  }

  window.addEventListener('beforeunload', unlockFlow);
  window.addEventListener('storage', () => {
    const lock = readLock();
    body.dataset.flowLocked = lock && lock.owner !== instanceId ? 'true' : 'false';
  });
})();
