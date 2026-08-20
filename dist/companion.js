const S = window.CompanionStore;
let state = S.loadState();
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function focus(){return S.currentFocus(state)}
function persist(){S.saveState(state); render()}
function clearActivationState(){
  state.activation={...state.activation,status:'idle',focusId:null,startedAt:null,checkpointDue:null,checkpointReady:false,notifiedAt:null};
}
function finishTemporaryFromCompanion(){
  if(state.focusStack.length<2)return;
  clearActivationState();
  const finished=state.focusStack.pop();
  const linked=state.interruptions.find(i=>(finished.sourceId&&i.id===finished.sourceId)||(!finished.sourceId&&i.description===finished.title&&i.status==='temporary-focus'));
  if(linked){linked.status='done';linked.completedAt=new Date().toISOString();}
  const back=focus();
  if(back){back.status='engaged';back.startedAt||=new Date().toISOString();}
  S.addRetake(state,finished,back);
  persist();
}
function esc(str=''){return String(str).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function overlay(html){$('#overlay-root').innerHTML=`<div class="overlay-backdrop">${html}</div>`;bindClose()}
function closeOverlay(){$('#overlay-root').innerHTML=''}
function bindClose(){$$('[data-close]').forEach(b=>b.onclick=closeOverlay)}

function render(){
  const f=focus();
  const activationMatches=!!f && state.activation.focusId===f.id;
  const checkpointReady = !f?.temporary && activationMatches && state.activation.status==='running' && (state.activation.checkpointReady || (state.activation.checkpointDue && Date.now() >= new Date(state.activation.checkpointDue).getTime()));
  $('#comp-title').textContent=f?.title||'Sem foco ativo';
  let label='Aguardando', color='var(--muted)', width='15%';
  if(state.session.paused){label='PAUSADO';color='var(--muted)';width='20%'}
  else if(checkpointReady){label='CHECK-IN';color='var(--yellow)';width='100%'}
  else if(f?.temporary){label='FOCO TEMPORÁRIO';color='var(--purple)';width='78%'}
  else if(activationMatches && state.activation.status==='running'){label='ATIVAÇÃO';color='var(--yellow)';width='54%'}
  else if(f){label='EM FOCO';color='var(--green)';width='68%'}
  $('#comp-status').textContent=label; $('#comp-status').style.color=color; $('#comp-progress').style.background=color; $('#comp-progress').style.width=width;
  $('#comp-foot').textContent=f?.temporary?`↩ Depois: ${state.focusStack[state.focusStack.length-2]?.title||'foco anterior'}`:f?.startedAt?`Desde ${S.formatClock(f.startedAt)} · ${S.elapsedText(f.startedAt)}`:'Defina um foco na janela principal.';
  $('#comp-interrupt').disabled=!f||state.session.paused||!state.workMode; $('#comp-deviate').disabled=!f||state.session.paused||!state.workMode; $('#comp-pause').textContent=state.session.paused?'▶':'⏸';
  $('#comp-normal-actions').hidden = checkpointReady || !!f?.temporary;
  $('#comp-checkpoint').hidden = !checkpointReady || !!f?.temporary;
  $('#comp-temp-actions').hidden = !f?.temporary;
  if(f?.temporary){$('#comp-finish-temp').textContent='✓ Concluí — Retomar foco anterior';}
}


function markEngagedFromCompanion(){
  const f=focus(); if(!f)return;
  f.status='engaged'; f.startedAt ||= new Date().toISOString();
  clearActivationState();
  persist();
}
async function showMainPage(page){
  if(window.__TAURI__?.core?.invoke){
    try{await window.__TAURI__.core.invoke('show_main_page',{page});return;}catch(err){console.warn(err)}
  }
  try{window.opener?.focus()}catch{}
}

function showInterruption(){
  overlay(`<div class="modal small"><div class="modal-header"><strong>⚡ O que surgiu?</strong><button class="btn icon ghost" data-close>✕</button></div><div class="modal-body"><input class="input" id="ci" placeholder="Descreva em poucas palavras..."></div><div class="modal-footer"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="cin">Continuar</button></div></div>`);
  setTimeout(()=>$('#ci')?.focus(),20); const next=()=>{const v=$('#ci').value.trim();if(v)showTriage(v)}; $('#cin').onclick=next; $('#ci').onkeydown=e=>{if(e.key==='Enter')next()};
}
function showTriage(desc){
  overlay(`<div class="modal small"><div class="modal-header"><strong>Triagem rápida</strong><button class="btn icon ghost" data-close>✕</button></div><div class="modal-body"><h2 style="margin-top:0">Substitui seu foco agora?</h2><p class="muted">${esc(desc)}</p><div class="option-grid"><button class="option yes" data-t="yes">Sim</button><button class="option no" data-t="no">Não</button><button class="option maybe" data-t="unsure">Não sei</button></div></div></div>`); $$('[data-t]').forEach(b=>b.onclick=()=>{if(b.dataset.t==='yes')showUrgency(desc);else{S.addInterruption(state,desc,b.dataset.t==='unsure'?'unsure':'later');persist();closeOverlay();}});
}
function showUrgency(desc){
 const reasons=['Alguém está bloqueado agora','Existe prazo imediato','Existe consequência financeira / operacional','Há um problema acontecendo agora','Só parece urgente'];
 overlay(`<div class="modal small"><div class="modal-header"><strong>Confirmação</strong><button class="btn icon ghost" data-close>✕</button></div><div class="modal-body"><h2 style="margin-top:0">O que acontece se esperar?</h2><div class="reason-list">${reasons.map((r,i)=>`<label class="reason"><input type="radio" name="r" value="${i}"> ${r}</label>`).join('')}</div></div><div class="modal-footer"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="rc">Confirmar</button></div></div>`); $('#rc').onclick=()=>{const idx=Number(document.querySelector('input[name=r]:checked')?.value??-1);if(idx<0)return;if(idx===4){S.addInterruption(state,desc,'later',reasons[idx]);persist();closeOverlay();return;}const item=S.addInterruption(state,desc,'now',reasons[idx]);const temp=S.createFocus(desc,{temporary:true,source:'interruption',sourceId:item.id});temp.startedAt=new Date().toISOString();temp.status='engaged';clearActivationState();state.focusStack.push(temp);item.status='temporary-focus';persist();closeOverlay();};
}
function showDeviation(){
 overlay(`<div class="modal small"><div class="modal-header"><strong>🛟 Para onde você foi?</strong><button class="btn icon ghost" data-close>✕</button></div><div class="modal-body"><input class="input" id="di" placeholder="Descreva rapidamente..."></div><div class="modal-footer"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="dn">Continuar</button></div></div>`);setTimeout(()=>$('#di')?.focus(),20);const next=()=>{const v=$('#di').value.trim();if(v)decision(v)};$('#dn').onclick=next;$('#di').onkeydown=e=>{if(e.key==='Enter')next()};
}
function decision(desc){overlay(`<div class="modal small"><div class="modal-header"><strong>Recuperação</strong></div><div class="modal-body"><h2 style="margin-top:0">Isso virou mais importante?</h2><div class="option-grid"><button class="option yes" data-d="yes">Sim</button><button class="option no" data-d="no">Não</button><button class="option maybe" data-d="unsure">Não sei</button></div></div></div>`);$$('[data-d]').forEach(b=>b.onclick=()=>{const v=b.dataset.d;if(v==='yes'){const d=S.addDeviation(state,desc,'prioritized');const temp=S.createFocus(desc,{temporary:true,source:'deviation',sourceId:d.id});temp.startedAt=new Date().toISOString();temp.status='engaged';clearActivationState();state.focusStack.push(temp);}else{const d=S.addDeviation(state,desc,'returned');d.returnedAt=new Date().toISOString();}persist();closeOverlay();});}

$('#comp-interrupt').onclick=showInterruption;
$('#comp-deviate').onclick=showDeviation;
$('#comp-engaged').onclick=markEngagedFromCompanion;
$('#comp-stuck').onclick=()=>{state.activation.status='stuck';state.activation.focusId=focus()?.id||null;state.activation.checkpointReady=false;persist();showMainPage('unstuck')};
$('#comp-check-dev').onclick=showDeviation;
$('#comp-finish-temp').onclick=finishTemporaryFromCompanion;
$('#comp-pause').onclick=()=>{state.session.paused=!state.session.paused;persist()};
$('#comp-hide').onclick=async()=>{
  if(window.__TAURI__?.core?.invoke){try{await window.__TAURI__.core.invoke('hide_companion');return;}catch{}}
  window.close();
};
$('#comp-open-main').onclick=async()=>{
  if(window.__TAURI__?.core?.invoke){ try{ await window.__TAURI__.core.invoke('show_main'); return; }catch{} }
  try{window.opener?.focus()}catch{}
};
window.addEventListener('storage',()=>{state=S.loadState();render()});
S.subscribeState?.(next=>{state=next;render();});window.addEventListener('keydown',e=>{if(e.key==='Escape')closeOverlay();if(e.ctrlKey&&e.shiftKey&&e.code==='Space'){e.preventDefault();showInterruption()}});
render();
if(window.__TAURI__?.event?.listen){
  window.__TAURI__.event.listen('quick-interruption',()=>showInterruption()).catch(()=>{});
}
