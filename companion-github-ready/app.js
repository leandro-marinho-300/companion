const S = window.CompanionStore;
let state = S.loadState();
let companionPopup = null;
let activationTimer = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function persist() { S.saveState(state); render(); armActivationCheckpoint(); }
function focus() { return S.currentFocus(state); }
function rootFocus() { return S.rootFocus(state); }

function esc(str='') {
  return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function localDateKey(d=new Date()) {
  const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function hmToMinutes(hm='00:00'){const [h,m]=hm.split(':').map(Number);return h*60+m}
function scheduledWorkNow(d=new Date()) {
  if (!state.workHours.days.includes(d.getDay())) return false;
  const now=d.getHours()*60+d.getMinutes();
  const start=hmToMinutes(state.workHours.start), end=hmToMinutes(state.workHours.end);
  return start<=end ? now>=start && now<end : now>=start || now<end;
}
function syncWorkModeFromSchedule() {
  const today=localDateKey();
  if (state.ui.workOverrideDate !== today) { state.ui.workOverrideDate=null; state.ui.workOverride=null; }
  const desired = typeof state.ui.workOverride === 'boolean' ? state.ui.workOverride : scheduledWorkNow();
  if (state.workMode === desired) return false;
  state.workMode = desired;
  state.session.paused = false;
  if (desired) state.session.startedAt = new Date().toISOString();
  return true;
}
function setManualWorkMode(value) {
  state.ui.workOverride = !!value;
  state.ui.workOverrideDate = localDateKey();
  state.workMode = !!value;
  state.session.paused = false;
  if (value) state.session.startedAt = new Date().toISOString();
}
async function syncCompanionForWorkMode() {
  if (!window.__TAURI__?.core?.invoke) return;
  try { await window.__TAURI__.core.invoke(state.workMode ? 'show_companion' : 'hide_companion'); } catch {}
}

function showToast(msg) {
  const t = document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(), 2200);
}

function statusLabel(f) {
  if (state.session.paused) return ['Pausado','gray'];
  if (!f) return ['Sem foco','gray'];
  if (f.temporary) return ['Foco temporário','purple'];
  if (state.activation.status === 'running') return ['Ativação','orange'];
  if (state.activation.status === 'stuck') return ['Travado','orange'];
  return ['Engrenado','green'];
}

function render() {
  const f = focus();
  $('#work-toggle').classList.toggle('on', state.workMode);
  $('#work-badge').textContent = state.workMode ? (state.session.paused ? 'Pausado' : 'Ativo') : 'Inativo';
  $('#work-badge').className = `badge ${state.workMode && !state.session.paused ? 'green' : 'gray'}`;
  $('#work-range').textContent = `${state.workHours.start} – ${state.workHours.end}`;
  $('#session-start').textContent = S.formatClock(state.session.startedAt);
  $('#pause-work').textContent = state.session.paused ? '▶ Retomar' : '⏸ Pausar';
  $('#pause-work').disabled = !state.workMode;

  const [label, color] = statusLabel(f);
  $('#focus-status').textContent = label; $('#focus-status').className=`badge ${color}`;
  $('#focus-title').textContent = f?.title || 'Nenhum foco declarado';
  $('#focus-subtitle').textContent = f ? (f.temporary ? `↩ Depois: ${state.focusStack[state.focusStack.length-2]?.title || 'foco anterior'}` : 'Proteja esta intenção até concluir ou trocar conscientemente.') : 'Declare uma intenção para começar.';
  $('#focus-action').textContent = f?.firstAction || '—';
  $('#focus-since').textContent = f?.startedAt ? S.formatClock(f.startedAt) : '—';
  const blocked = !state.workMode || state.session.paused;
  $('#start-focus').disabled = !f || blocked;
  $('#help-enter').disabled = !f || blocked;
  $('#interrupt-btn').disabled = !f || blocked;
  $('#deviate-btn').disabled = !f || blocked;
  $('#owl-quote').textContent = !f ? 'Só precisamos começar a primeira coisa.' : f.temporary ? `Resolve isso e eu te devolvo para ${rootFocus()?.title || 'o foco anterior'}.` : state.activation.status === 'running' ? 'Sem cronômetro na sua cara. Só entra na tarefa.' : state.activation.status === 'stuck' ? 'Vamos reduzir até ficar possível.' : 'Eu fico por perto. Você faz o trabalho.';

  const waiting = state.interruptions.filter(i => i.status === 'waiting');
  $('#nav-interrupt-count').textContent = waiting.length;
  $('#nav-dev-count').textContent = state.deviations.length;
  $('#box-count').textContent = waiting.length;
  $('#stat-int').textContent = state.interruptions.length;
  $('#stat-temp').textContent = state.interruptions.filter(i => i.status === 'temporary-focus').length;
  $('#stat-dev').textContent = state.deviations.length;
  $('#stat-return').textContent = state.deviations.filter(d => d.returnedAt).length;
  $('#activation-clock').textContent = state.activation.checkpointReady ? 'Hora do check-in' : state.activation.status === 'running' ? `Silencioso · ${state.activation.durationMin} min` : 'Silencioso';

  $('#mini-interrupt-list').innerHTML = waiting.slice(0,3).map(i => `<div class="list-item"><div class="grow"><strong>${esc(i.description)}</strong><small>${S.formatClock(i.createdAt)} · ${i.triage === 'unsure' ? 'revisar depois' : 'estacionado'}</small></div><span class="pill ${i.triage==='unsure'?'blue':''}">${i.triage==='unsure'?'Não sei':'Aguardar'}</span></div>`).join('') || `<div class="empty"><img src="./owl.svg" alt=""><div>Nada aguardando. Ótimo.</div></div>`;

  renderPages();
}

function pageShell(title, subtitle, content) {
  return `<header class="topbar"><div><div class="eyebrow">Companion</div><h1>${title}</h1><p>${subtitle}</p></div></header>${content}`;
}

function renderPages() {
  const f = focus();
  $('#page-focus').innerHTML = pageShell('Foco Atual','Uma intenção por vez. Trocas só quando forem conscientes.', f ? `<section class="card"><div class="card-body focus-card"><div><span class="badge ${f.temporary?'purple':'green'}">${f.temporary?'Foco temporário':'Foco ativo'}</span><div class="focus-title">${esc(f.title)}</div><p class="muted">${f.firstAction ? `Primeira ação: ${esc(f.firstAction)}` : 'Sem microação definida — e tudo bem.'}</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"><button class="btn primary" id="focus-page-start">▶ Começar / Retomar</button><button class="btn" id="focus-page-interrupt">⚡ Interrupção</button>${state.focusStack.length>1?'<button class="btn success" id="finish-temp">✓ Concluir temporário e retomar</button>':''}</div></div><div class="owl-wrap"><img src="./owl.svg" alt=""></div></div></section>` : `<section class="card"><div class="empty"><img src="./owl.svg"><h3>Nenhum foco ativo</h3><p>Volte ao Modo Trabalho e declare a primeira intenção.</p><button class="btn primary" data-go="work">Definir foco</button></div></section>`);

  $('#page-activate').innerHTML = pageShell('Ativação','O sucesso aqui não é terminar. É atravessar a porta de entrada.', `<section class="card"><div class="card-body"><h2>${f?esc(f.title):'Sem foco declarado'}</h2><p class="muted">Janela silenciosa padrão: ${state.activation.durationMin} minutos.</p><div class="activation-actions" style="margin-top:16px"><button class="action-card green" data-activation="engaged">🟢 <strong>Engrenei</strong><small>Entrei no foco</small></button><button class="action-card yellow" data-activation="stuck">🟡 <strong>Ainda travado</strong><small>Entrar no Modo Destravar</small></button><button class="action-card blue" data-activation="deviated">🔵 <strong>Desviei</strong><small>Recuperar foco</small></button></div></div></section>`);

  $('#page-unstuck').innerHTML = pageShell('Modo Destravar','Identificar → reduzir → acompanhar → reset.', `<section class="card"><div class="card-body"><h2>O que está pegando agora?</h2><div class="destruct-list">${['Parece grande demais','Não sei exatamente como entrar','Estou evitando / sem vontade','Estou com medo de fazer errado','Estou saturado / sem energia','Não faço ideia'].map((x,i)=>`<button class="btn" data-block="${i}">${x}</button>`).join('')}</div></div></section>`);

  const ints = state.interruptions.filter(i=>i.status==='waiting');
  $('#page-interruptions').innerHTML = pageShell('Caixa de Interrupções','Confiança de que não vai esquecer, sem executar tudo agora.', `<section class="card"><div class="card-body"><div class="list">${ints.map(i=>`<div class="list-item"><div class="grow"><strong>${esc(i.description)}</strong><small>${S.formatClock(i.createdAt)} · veio durante ${esc(i.focusTitle || 'sem foco')}</small></div><span class="pill ${i.triage==='unsure'?'blue':''}">${i.triage==='unsure'?'Revisar':'Aguardar'}</span><button class="btn" data-int-start="${i.id}">Assumir agora</button><button class="btn ghost" data-int-done="${i.id}">✓</button></div>`).join('') || '<div class="empty"><img src="./owl.svg"><h3>Caixa vazia</h3><p>Nenhuma interrupção aguardando.</p></div>'}</div></div></section>`);

  $('#page-deviations').innerHTML = pageShell('Desvios','Perceber que saiu do foco já é parte da recuperação.', `<section class="card"><div class="card-body"><div class="list">${state.deviations.map(d=>`<div class="list-item"><div class="grow"><strong>${esc(d.description)}</strong><small>${S.formatClock(d.createdAt)} · anterior: ${esc(d.previousFocusTitle || '—')}</small></div><span class="pill ${d.returnedAt?'':'red'}">${d.returnedAt?'Retomado':d.decision}</span></div>`).join('') || '<div class="empty"><img src="./owl.svg"><h3>Nenhum desvio registrado</h3><p>Quando perceber um, use 🛟 Desviei.</p></div>'}</div></div></section>`);

  const returns = state.deviations.filter(d=>d.returnedAt).length;
  $('#page-review').innerHTML = pageShell('Revisão','Dados para aprender padrões — sem transformar o dia em nota.', `<div class="grid two"><section class="card"><div class="card-body"><h2>Hoje</h2><div class="stats"><div class="stat"><div class="n">${state.interruptions.length}</div><div class="l">Interrupções registradas</div></div><div class="stat"><div class="n">${state.interruptions.filter(i=>i.triage==='now').length}</div><div class="l">Viraram foco temporário</div></div><div class="stat"><div class="n">${state.deviations.length}</div><div class="l">Desvios percebidos</div></div><div class="stat"><div class="n">${returns}</div><div class="l">Retomadas</div></div></div></div></section><section class="card"><div class="card-body"><div class="eyebrow">Leitura útil</div><p class="quote">O objetivo não é zerar distrações. É perceber mais cedo, proteger melhor e voltar mais rápido.</p></div></section></div>`);

  $('#page-history').innerHTML = pageShell('Histórico','A V1 registra o mínimo necessário para validar o mecanismo.', `<section class="card"><div class="card-body"><div class="list"><div class="list-item"><div class="grow"><strong>Sessão atual</strong><small>Iniciada às ${S.formatClock(state.session.startedAt)}</small></div><span class="badge ${state.session.paused?'gray':'green'}">${state.session.paused?'Pausada':'Ativa'}</span></div>${state.interruptions.slice(0,8).map(i=>`<div class="list-item"><div class="grow"><strong>⚡ ${esc(i.description)}</strong><small>${S.formatClock(i.createdAt)} · ${i.triage}</small></div></div>`).join('')}${state.deviations.slice(0,8).map(d=>`<div class="list-item"><div class="grow"><strong>🛟 ${esc(d.description)}</strong><small>${S.formatClock(d.createdAt)} · ${d.decision}</small></div></div>`).join('')}</div></div></section>`);

  $('#page-settings').innerHTML = pageShell('Configurações','Só o que afeta o uso cotidiano.', `<section class="card"><div class="card-body"><div class="grid two"><div><label class="eyebrow">Horário habitual</label><div class="input-row" style="margin-top:8px"><input class="input" type="time" id="set-start" value="${state.workHours.start}"><input class="input" type="time" id="set-end" value="${state.workHours.end}"></div></div><div><label class="eyebrow">Janela de ativação</label><select id="set-duration" style="margin-top:8px"><option value="3" ${state.activation.durationMin===3?'selected':''}>3 minutos</option><option value="5" ${state.activation.durationMin===5?'selected':''}>5 minutos</option><option value="10" ${state.activation.durationMin===10?'selected':''}>10 minutos</option></select></div></div><div style="margin-top:16px"><label class="eyebrow">Dias de trabalho</label><div class="day-picker" style="margin-top:8px">${[['D',0],['S',1],['T',2],['Q',3],['Q',4],['S',5],['S',6]].map(([label,day])=>`<label class="day-chip"><input type="checkbox" data-work-day="${day}" ${state.workHours.days.includes(day)?'checked':''}><span>${label}</span></label>`).join('')}</div></div><div class="native-settings"><label class="setting-row"><div><strong>Iniciar com o Windows</strong><small>Deixa o Companion disponível sem depender de lembrar de abrir.</small></div><input type="checkbox" id="set-autostart"></label><div class="setting-row"><div><strong>Posição do Companion</strong><small>A posição e o monitor são restaurados automaticamente no app desktop.</small></div><span class="badge blue">Persistente</span></div><div class="setting-row"><div><strong>Atalho global</strong><small>Captura uma interrupção de qualquer aplicativo.</small></div><kbd>Ctrl + Shift + Espaço</kbd></div></div><div style="margin-top:18px"><button class="btn primary" id="save-settings">Salvar configurações</button> <button class="btn" id="open-companion-settings">Abrir Companion</button> <button class="btn danger" id="reset-demo">Resetar dados de teste</button></div><p class="muted" id="native-status" style="margin-top:16px">Integrações nativas ficam disponíveis no aplicativo desktop.</p></div></section>`);

  bindDynamic();
  refreshNativeSettings();
}

function goPage(name) {
  $$('.page').forEach(p=>p.classList.remove('active'));
  $(`#page-${name}`)?.classList.add('active');
  $$('#nav button').forEach(b=>b.classList.toggle('active', b.dataset.page===name));
}

function assumeFocus(title) {
  if (!title.trim()) return;
  state.focusStack = [S.createFocus(title)];
  state.activation = { ...state.activation, status:'idle', startedAt:null, checkpointDue:null, checkpointReady:false, notifiedAt:null };
  persist(); showToast('Foco assumido. Agora só precisamos entrar.');
}

function startActivation() {
  const f = focus(); if (!f) return;
  f.startedAt ||= new Date().toISOString(); f.status='activating';
  state.activation.status='running'; state.activation.startedAt=new Date().toISOString();
  state.activation.checkpointDue = new Date(Date.now()+state.activation.durationMin*60000).toISOString();
  state.activation.checkpointReady = false;
  state.activation.notifiedAt = null;
  persist(); showToast('Janela de ativação iniciada silenciosamente.');
}

function markEngaged() {
  const f=focus(); if(!f) return; f.status='engaged'; f.startedAt ||= new Date().toISOString(); state.activation.status='engaged'; state.activation.checkpointReady=false; state.activation.checkpointDue=null; persist(); showToast('Engrenou. O Companion sai da frente.');
}

async function notifyActivationCheckpoint() {
  const f = focus();
  if (!f) return;
  try {
    if (window.__TAURI__?.core?.invoke) {
      await window.__TAURI__.core.invoke('notify_activation_checkpoint', { focusTitle: f.title });
    }
  } catch (err) { console.warn('Notificação indisponível', err); }
}

function armActivationCheckpoint() {
  if (activationTimer) { clearTimeout(activationTimer); activationTimer = null; }
  if (state.activation.status !== 'running' || !state.activation.checkpointDue || state.activation.checkpointReady) return;
  const due = new Date(state.activation.checkpointDue).getTime();
  const wait = Math.max(0, due - Date.now());
  activationTimer = setTimeout(async () => {
    state = S.loadState();
    if (state.activation.status !== 'running' || state.activation.checkpointReady) return;
    state.activation.checkpointReady = true;
    state.activation.notifiedAt = new Date().toISOString();
    S.saveState(state);
    render();
    await notifyActivationCheckpoint();
  }, wait);
}


function overlay(html) { $('#overlay-root').innerHTML = `<div class="overlay-backdrop">${html}</div>`; }
function closeOverlay() { $('#overlay-root').innerHTML=''; }

function showFirstAction() {
  const f=focus(); if(!f) return;
  overlay(`<div class="modal"><div class="modal-header"><strong>Me ajuda a entrar</strong><button class="btn icon ghost" data-close>✕</button></div><div class="modal-body"><p class="muted">Qual é a primeira ação concreta? Não vamos planejar o projeto inteiro.</p><input class="input" id="first-action-input" placeholder="Ex.: Abrir o documento e localizar onde parei"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn" data-suggest="Abrir o arquivo ou sistema">Abrir o arquivo/sistema</button><button class="btn" data-suggest="Localizar onde parei">Localizar onde parei</button><button class="btn" data-suggest="Fazer apenas a primeira alteração">Primeira alteração</button></div></div><div class="modal-footer"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="save-first-action">Fazer só isso →</button></div></div>`);
  bindOverlay();
  $$('[data-suggest]').forEach(b=>b.onclick=()=>$('#first-action-input').value=b.dataset.suggest);
  $('#save-first-action').onclick=()=>{ const v=$('#first-action-input').value.trim(); if(!v)return; f.firstAction=v; persist(); closeOverlay(); startActivation(); };
  setTimeout(()=>$('#first-action-input')?.focus(),20);
}

function showInterruption() {
  overlay(`<div class="modal small"><div class="modal-header"><strong>⚡ O que surgiu?</strong><button class="btn icon ghost" data-close>✕</button></div><div class="modal-body"><input class="input" id="interrupt-input" placeholder="Descreva em poucas palavras..."><p class="muted" style="font-size:12px">Ex.: Verificar CND AGEA</p></div><div class="modal-footer"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="interrupt-next">Continuar</button></div></div>`);
  bindOverlay(); setTimeout(()=>$('#interrupt-input')?.focus(),20);
  const next=()=>{ const desc=$('#interrupt-input').value.trim(); if(desc) showTriage(desc); };
  $('#interrupt-next').onclick=next; $('#interrupt-input').onkeydown=e=>{if(e.key==='Enter')next()};
}

function showTriage(desc) {
  overlay(`<div class="modal"><div class="modal-header"><strong>Triagem rápida</strong><button class="btn icon ghost" data-close>✕</button></div><div class="modal-body"><h2 style="margin-top:0">Isso precisa substituir o que você está fazendo agora?</h2><p class="muted">${esc(desc)}</p><div class="option-grid"><button class="option yes" data-triage="yes">Sim<br><small>Avaliar urgência</small></button><button class="option no" data-triage="no">Não<br><small>Estacionar</small></button><button class="option maybe" data-triage="unsure">Não sei<br><small>Revisar depois</small></button></div></div></div>`);
  bindOverlay();
  $$('[data-triage]').forEach(b=>b.onclick=()=>{ const v=b.dataset.triage; if(v==='yes') showUrgency(desc); else { S.addInterruption(state,desc,v==='unsure'?'unsure':'later'); persist(); closeOverlay(); showToast(v==='unsure'?'Guardado para revisão. O foco continua.':'Estacionado. Volte ao foco atual.'); } });
}

function showUrgency(desc) {
  const reasons=['Alguém está bloqueado agora','Existe prazo imediato','Existe consequência financeira / operacional','Há um problema acontecendo agora','Só parece urgente'];
  overlay(`<div class="modal"><div class="modal-header"><strong>Confirmação de urgência</strong><button class="btn icon ghost" data-close>✕</button></div><div class="modal-body"><h2 style="margin-top:0">O que acontece se isso esperar até você terminar seu foco?</h2><div class="reason-list">${reasons.map((r,i)=>`<label class="reason"><input type="radio" name="urgency" value="${i}"> <span>${r}</span></label>`).join('')}</div></div><div class="modal-footer"><button class="btn" id="urg-back">Voltar</button><button class="btn primary" id="urg-confirm">Confirmar</button></div></div>`);
  bindOverlay(); $('#urg-back').onclick=()=>showTriage(desc); $('#urg-confirm').onclick=()=>{ const idx=Number(document.querySelector('input[name=urgency]:checked')?.value ?? -1); if(idx<0)return; if(idx===4){ S.addInterruption(state,desc,'later','Só parece urgente'); persist(); closeOverlay(); showToast('Estacionado por padrão. Importante não é igual a imediato.'); return; } const item=S.addInterruption(state,desc,'now',reasons[idx]); const temp=S.createFocus(desc,{temporary:true,source:'interruption'}); temp.startedAt=new Date().toISOString(); temp.status='engaged'; state.focusStack.push(temp); item.status='temporary-focus'; persist(); closeOverlay(); showToast('Foco temporário assumido. Seu foco anterior está preservado.'); };
}

function finishTemporary() {
  if(state.focusStack.length<2) return; const finished=state.focusStack.pop(); const linked=state.interruptions.find(i=>i.description===finished.title && i.status==='temporary-focus'); if(linked) linked.status='done'; const back=focus(); if(back){back.status='engaged'; back.startedAt ||= new Date().toISOString();} persist(); showToast(`Retomando: ${back?.title || 'foco anterior'}`);
}

function showDeviation() {
  const f=focus(); if(!f)return;
  overlay(`<div class="modal small"><div class="modal-header"><strong>🛟 Para onde você foi?</strong><button class="btn icon ghost" data-close>✕</button></div><div class="modal-body"><input class="input" id="dev-input" placeholder="Descreva rapidamente..."><p class="muted" style="font-size:12px">Perceber o desvio já é um comportamento positivo.</p></div><div class="modal-footer"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="dev-next">Continuar</button></div></div>`); bindOverlay(); setTimeout(()=>$('#dev-input')?.focus(),20); const next=()=>{const d=$('#dev-input').value.trim();if(d) showDeviationDecision(d)}; $('#dev-next').onclick=next; $('#dev-input').onkeydown=e=>{if(e.key==='Enter')next()};
}

function showDeviationDecision(desc) {
  overlay(`<div class="modal"><div class="modal-header"><strong>Recuperação</strong></div><div class="modal-body"><h2 style="margin-top:0">Isso virou realmente mais importante que seu foco anterior?</h2><p class="muted">${esc(desc)}</p><div class="option-grid"><button class="option yes" data-devdecision="yes">Sim<br><small>Priorizar</small></button><button class="option no" data-devdecision="no">Não<br><small>Foi um desvio</small></button><button class="option maybe" data-devdecision="unsure">Não sei<br><small>Avaliar</small></button></div></div></div>`); bindOverlay(); $$('[data-devdecision]').forEach(b=>b.onclick=()=>{ const dec=b.dataset.devdecision; if(dec==='no'){const d=S.addDeviation(state,desc,'returned'); d.returnedAt=new Date().toISOString(); persist(); closeOverlay(); showToast(`Retomar: ${focus()?.title}`);} else if(dec==='yes'){ const d=S.addDeviation(state,desc,'prioritized'); const temp=S.createFocus(desc,{temporary:true,source:'deviation'}); temp.startedAt=new Date().toISOString(); temp.status='engaged'; state.focusStack.push(temp); persist(); closeOverlay(); showToast('Novo foco temporário. O anterior continua preservado.'); } else showDeviationConsequence(desc); });
}

function showDeviationConsequence(desc) {
  overlay(`<div class="modal"><div class="modal-header"><strong>Última checagem</strong></div><div class="modal-body"><h2 style="margin-top:0">Se você parar isso agora, existe alguma consequência concreta?</h2><div class="option-grid"><button class="option yes" data-cons="yes">Sim</button><button class="option no" data-cons="no">Não</button><button class="option maybe" data-cons="unsure">Não sei</button></div></div></div>`); bindOverlay(); $$('[data-cons]').forEach(b=>b.onclick=()=>{const v=b.dataset.cons;if(v==='yes'){ const d=S.addDeviation(state,desc,'prioritized'); const temp=S.createFocus(desc,{temporary:true,source:'deviation'}); temp.startedAt=new Date().toISOString();temp.status='engaged';state.focusStack.push(temp);} else {const d=S.addDeviation(state,desc,'returned');d.returnedAt=new Date().toISOString();} persist();closeOverlay();showToast(v==='yes'?'Foco temporário assumido.':'Incerteza não ganhou prioridade. Retome o foco anterior.');});
}

function showUnstuck(blockIndex=null) {
  const labels=['Parece grande demais','Não sei exatamente como entrar','Estou evitando / sem vontade','Estou com medo de fazer errado','Estou saturado / sem energia','Não faço ideia'];
  if(blockIndex===null){ goPage('unstuck'); return; }
  state.activation.status='stuck'; state.interventions.unshift({id:S.uid('intervention'),type:labels[blockIndex],at:new Date().toISOString()}); persist();
  const copy=[
    ['Vamos reduzir brutalmente.','Esquece terminar. Qual é a menor ação possível agora?'],
    ['Só precisamos da porta de entrada.','O que existe imediatamente antes de você conseguir trabalhar nisso?'],
    ['Você não precisa querer fazer.','Vamos fazer uma única ação juntos.'],
    ['Primeiro fazemos algo que pode estar errado.','Não estamos finalizando. Estamos criando material para corrigir.'],
    ['Vamos fazer um reset curto.','Levante, água/banheiro/respira. Seu foco continuará aqui quando voltar.'],
    ['Sem problema. Vamos ao padrão.','Qual é o primeiro lugar que você precisa abrir?']
  ][blockIndex];
  overlay(`<div class="modal"><div class="modal-header"><strong>Modo Destravar</strong><button class="btn icon ghost" data-close>✕</button></div><div class="modal-body"><div style="display:flex;gap:14px;align-items:center"><img src="./owl.svg" style="width:72px"><div><h2 style="margin:0 0 6px">${copy[0]}</h2><p class="muted" style="margin:0">${copy[1]}</p></div></div><input class="input" id="unstuck-action" style="margin-top:16px" placeholder="Escreva só a próxima ação..."></div><div class="modal-footer"><button class="btn" data-close>Agora não</button><button class="btn primary" id="unstuck-go">Fazer só isso →</button></div></div>`); bindOverlay(); $('#unstuck-go').onclick=()=>{const v=$('#unstuck-action').value.trim();if(v&&focus())focus().firstAction=v;persist();closeOverlay();startActivation();};
}

function bindOverlay(){ $$('[data-close]').forEach(b=>b.onclick=closeOverlay); $('.overlay-backdrop')?.addEventListener('click',e=>{if(e.target.classList.contains('overlay-backdrop')) closeOverlay();}); }

async function refreshNativeSettings() {
  const checkbox = $('#set-autostart');
  const status = $('#native-status');
  if (!checkbox) return;
  try {
    if (!window.__TAURI__?.core?.invoke) { checkbox.disabled = true; if(status) status.textContent = 'Autostart e persistência de janela ficam ativos somente no app desktop.'; return; }
    checkbox.disabled = false;
    checkbox.checked = await window.__TAURI__.core.invoke('get_autostart');
    if(status) status.textContent = 'Integrações nativas conectadas.';
  } catch (err) {
    checkbox.disabled = true;
    if(status) status.textContent = 'Não foi possível consultar as integrações nativas nesta execução.';
  }
}

function bindDynamic() {
  $$('[data-go]').forEach(b=>b.onclick=()=>goPage(b.dataset.go));
  $('#focus-page-start')?.addEventListener('click', startActivation);
  $('#focus-page-interrupt')?.addEventListener('click', showInterruption);
  $('#finish-temp')?.addEventListener('click', finishTemporary);
  $$('[data-block]').forEach(b=>b.onclick=()=>showUnstuck(Number(b.dataset.block)));
  $$('[data-int-start]').forEach(b=>b.onclick=()=>{const i=state.interruptions.find(x=>x.id===b.dataset.intStart);if(!i)return;i.status='temporary-focus';i.triage='now';const temp=S.createFocus(i.description,{temporary:true,source:'interruption'});temp.startedAt=new Date().toISOString();temp.status='engaged';state.focusStack.push(temp);persist();goPage('focus');});
  $$('[data-int-done]').forEach(b=>b.onclick=()=>{const i=state.interruptions.find(x=>x.id===b.dataset.intDone);if(i)i.status='done';persist();});
  $('#save-settings')?.addEventListener('click',async()=>{
    state.workHours.start=$('#set-start').value;
    state.workHours.end=$('#set-end').value;
    state.activation.durationMin=Number($('#set-duration').value);
    state.workHours.days=$$('[data-work-day]:checked').map(x=>Number(x.dataset.workDay));
    try {
      if (window.__TAURI__?.core?.invoke && $('#set-autostart')) {
        await window.__TAURI__.core.invoke('set_autostart', { enabled: $('#set-autostart').checked });
      }
    } catch (err) { console.warn('Autostart indisponível', err); }
    persist();
    showToast('Configurações salvas.');
    refreshNativeSettings();
  });
  $('#open-companion-settings')?.addEventListener('click', openCompanion);
  $('#reset-demo')?.addEventListener('click',()=>{if(confirm('Resetar os dados locais deste protótipo?')){localStorage.removeItem(S.STORE_KEY);state=S.loadState();render();goPage('work');}});
}

async function openCompanion(){
  if(window.__TAURI__?.core?.invoke) {
    try { await window.__TAURI__.core.invoke('show_companion'); return; } catch (e) { console.warn(e); }
  }
  if(companionPopup && !companionPopup.closed){companionPopup.focus();return;}
  companionPopup=window.open('./companion.html','companion','popup,width=470,height=260,left=1100,top=120');
}

$('#assume-focus').onclick=()=>{assumeFocus($('#focus-input').value);$('#focus-input').value='';};
$('#focus-input').onkeydown=e=>{if(e.key==='Enter')$('#assume-focus').click();};
$('#dont-know').onclick=()=>{assumeFocus('Descobrir qual é a primeira prioridade'); if(focus()) focus().firstAction='Abrir onde minhas tarefas estão'; persist();};
$('#start-focus').onclick=startActivation;
$('#help-enter').onclick=showFirstAction;
$('#interrupt-btn').onclick=showInterruption;
$('#deviate-btn').onclick=showDeviation;
$('#open-companion').onclick=openCompanion;
$('#pause-work').onclick=()=>{state.session.paused=!state.session.paused;persist();};
$('#work-toggle').onclick=()=>{setManualWorkMode(!state.workMode);persist();syncCompanionForWorkMode();};
$('#end-day').onclick=()=>{setManualWorkMode(false);state.focusStack=[];state.activation={...state.activation,status:'idle',startedAt:null,checkpointDue:null,checkpointReady:false,notifiedAt:null};persist();syncCompanionForWorkMode();showToast('Dia encerrado. O histórico continua salvo.');};
$$('[data-activation]').forEach(b=>b.onclick=()=>{const a=b.dataset.activation;if(a==='engaged')markEngaged();if(a==='stuck')showUnstuck();if(a==='deviated')showDeviation();});
$$('#nav button').forEach(b=>b.onclick=()=>goPage(b.dataset.page));
window.addEventListener('storage',()=>{state=S.loadState();render();});
window.addEventListener('companion-state',e=>{state=e.detail;render();});
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeOverlay(); if(e.ctrlKey&&e.shiftKey&&e.code==='Space'){e.preventDefault();showInterruption();}});

if (syncWorkModeFromSchedule()) S.saveState(state);
render();
armActivationCheckpoint();
setInterval(()=>{
  state=S.loadState();
  if(syncWorkModeFromSchedule()){persist();syncCompanionForWorkMode();}
},60000);
if (window.__TAURI__?.event?.listen) {
  window.__TAURI__.event.listen('navigate', e => goPage(String(e.payload || 'work'))).catch(()=>{});
}
if (window.__TAURI__?.core?.invoke && state.workMode) {
  window.__TAURI__.core.invoke('show_companion').catch(()=>{});
}
