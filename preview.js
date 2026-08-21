const $ = (sel,root=document)=>root.querySelector(sel);
const $$ = (sel,root=document)=>[...root.querySelectorAll(sel)];
const owl = './assets/coruja-oficial.svg';

const nav = (active='work') => `
  <nav class="app-nav">
    <button class="${active==='work'?'active':''}"><span class="nav-icon">⚡</span><span>Modo Trabalho</span></button>
    <button class="${active==='interruptions'?'active':''}"><span class="nav-icon">📥</span><span>Interrupções</span></button>
    <button class="${active==='review'?'active':''}"><span class="nav-icon">📊</span><span>Revisão</span></button>
    <button class="${active==='history'?'active':''}"><span class="nav-icon">🕘</span><span>Histórico</span></button>
    <button class="${active==='settings'?'active':''}"><span class="nav-icon">⚙️</span><span>Configurações</span></button>
  </nav>`;

const sessionCard = (mode='active') => {
  const cfg = {
    active:{label:'Modo Trabalho',small:'Sessão ativa · 17 min neste foco',toggle:'on',action:'Encerrar dia',actionCls:'ghost'},
    idle:{label:'Modo Trabalho',small:'Pronto para quando você começar.',toggle:'on',action:'Pausar sessão',actionCls:'ghost'},
    paused:{label:'Modo Trabalho pausado',small:'Foco e checkpoints congelados.',toggle:'',action:'▶ Retomar',actionCls:'primary'},
    ended:{label:'Modo Trabalho encerrado',small:'Sessão finalizada.',toggle:'',action:'▶ Iniciar nova sessão',actionCls:'primary'}
  }[mode];
  return `<div class="session-card"><div class="row"><div class="session-title">${cfg.label}</div><div class="toggle ${cfg.toggle}"></div></div><small>${cfg.small}</small><button class="btn session-action ${cfg.actionCls}">${cfg.action}</button></div>`;
};

const appShell = (content,{active='work',session='active'}={}) => `
  <div class="app-window">
    <aside class="app-sidebar">
      <div class="app-logo"><img src="${owl}" alt="Coruja do Companion"><div><strong>Companion</strong><span>TDAH FOCUS</span></div></div>
      ${nav(active)}
      ${sessionCard(session)}
    </aside>
    <main class="app-main">${content}</main>
  </div>`;

const pageHeader = (title,subtitle,badge='',badgeCls='gray',meta='Hoje · 20 de agosto') => `
  <div class="app-pagebar">
    <div><div class="title-row"><h2>${title}</h2>${badge?`<span class="badge ${badgeCls}">${badge}</span>`:''}</div><p class="subtitle">${subtitle}</p></div>
    <div class="page-meta">${meta}</div>
  </div>`;

const interruptionSide = (count=2) => `
  <div class="card soft">
    <div class="card-label">Caixa de interrupções</div>
    <h4>${count ? `${count} aguardando você` : 'Tudo limpo por aqui'}</h4>
    <p>${count?'Elas estão guardadas. Nada precisa ser resolvido agora.':'Nenhuma interrupção pendente.'}</p>
    ${count?`<div class="side-list"><div class="side-item"><div class="side-top"><strong>Verificar CND AGEA</strong><span class="tiny-pill orange">Aguardando</span></div><small>capturada há 12 min</small></div><div class="side-item"><div class="side-top"><strong>Responder mensagem da Cris</strong><span class="tiny-pill">Revisar</span></div><small>capturada há 7 min</small></div></div>`:''}
  </div>`;

const todayMetrics = () => `<div class="card"><div class="card-label">Hoje</div><h4>Seu foco não precisa ser perfeito.</h4><div class="metric-grid"><div class="metric"><strong>3</strong><span>focos concluídos</span></div><div class="metric"><strong>4</strong><span>retomadas</span></div><div class="metric"><strong>6</strong><span>interrupções protegidas</span></div><div class="metric"><strong>1</strong><span>desvio percebido</span></div></div></div>`;

const mainStates = {
  empty:()=>appShell(`${pageHeader('Modo Trabalho','Vamos escolher uma coisa para proteger agora.','SEM FOCO','gray')}<div class="layout"><div class="stack"><div class="card accent"><div class="card-label">Próximo foco</div><h3>O que vamos proteger agora?</h3><p>Não precisa organizar o dia inteiro. Só declare a próxima coisa que merece alguns minutos de atenção.</p><input class="input" placeholder="Ex.: Fechar folha AGEA"><div class="btn-row"><button class="btn primary">Assumir foco →</button><button class="btn ghost">Não sei qual é ainda</button></div></div><div class="helper orange"><img src="${owl}" alt=""><div><strong>Um foco por vez.</strong><span>O Companion cuida da proteção. Sua tarefa continua onde ela já vive.</span></div></div></div><div class="stack">${todayMetrics()}${interruptionSide()}</div></div>`,{session:'idle'}),

  declared:()=>appShell(`${pageHeader('Modo Trabalho','A tarefa está declarada. Agora só precisamos entrar nela.','FOCO DECLARADO','orange')}<div class="layout"><div class="stack"><div class="card focus-card"><div><div class="card-label">Foco atual</div><div class="focus-title">Fechamento AGEA</div><div class="focus-meta"><span>Declarado agora</span><span>•</span><span>Ainda não iniciado</span></div><div class="btn-row"><button class="btn primary">▶ Começar</button><button class="btn">Me ajuda a entrar</button></div></div><span class="badge orange">Declarado</span></div><div class="helper"><img src="${owl}" alt=""><div><strong>Sem pressa para “produzir”.</strong><span>Primeiro objetivo: entrar na tarefa. Interrupção e Desvio só aparecem depois que a execução começa.</span></div></div></div><div class="stack">${todayMetrics()}${interruptionSide()}</div></div>`,{session:'active'}),

  activation:()=>appShell(`${pageHeader('Modo Trabalho','Você começou. Agora o Companion fica quieto por alguns minutos.','ATIVAÇÃO','yellow')}<div class="layout"><div class="stack"><div class="card"><div class="focus-card"><div><div class="card-label">Entrando em</div><div class="focus-title">Fechamento AGEA</div><div class="focus-meta"><span class="badge yellow">Ativação</span><span>2 min desde que começou</span></div></div><span class="tiny-pill yellow">check-in em 3 min</span></div><div class="micro-step"><span>Primeiro passo</span><strong>Abrir a folha e localizar onde parei</strong></div><div class="progress-line"><span style="width:42%"></span></div><div class="progress-caption"><span>2 min</span><span>check-in de ativação em 3 min</span></div></div><div class="helper orange"><img src="${owl}" alt=""><div><strong>Não precisa olhar para mim agora.</strong><span>O próximo check-in só quer saber se você conseguiu entrar — não se terminou.</span></div></div></div><div class="stack">${todayMetrics()}${interruptionSide()}</div></div>`,{session:'active'}),

  focus:()=>appShell(`${pageHeader('Modo Trabalho','O foco está em andamento. A janela principal só acompanha o estado.','EM FOCO','green')}<div class="layout"><div class="stack"><div class="card"><div class="focus-card"><div><div class="card-label">Foco protegido</div><div class="focus-title">Fechamento AGEA</div><div class="focus-meta"><span class="badge green">Em foco</span><span>17 min neste foco</span><span>•</span><span>check-in em 8 min</span></div></div><span class="tiny-pill">Companion compacto ativo</span></div><div class="micro-step"><span>Primeiro passo usado na entrada</span><strong>Abrir a folha e localizar onde parei</strong></div><div class="progress-line green"><span style="width:68%"></span></div><div class="progress-caption"><span>17 min neste ciclo</span><span>próximo check-in: 25 min</span></div></div><div class="helper"><img src="${owl}" alt=""><div><strong>Execução no Companion compacto.</strong><span>Enquanto ele estiver visível, Concluir, Interrupção e Desviei ficam lá — sem duplicar ações aqui.</span></div></div></div><div class="stack">${todayMetrics()}${interruptionSide()}</div></div>`,{session:'active'}),

  temporary:()=>appShell(`${pageHeader('Modo Trabalho','Uma urgência real substituiu o foco por alguns minutos.','FOCO TEMPORÁRIO','purple')}<div class="layout"><div class="stack"><div class="card accent"><div class="focus-card"><div><div class="card-label">Foco temporário</div><div class="focus-title">Certificado Digital AGEA</div><div class="focus-meta"><span class="badge purple">Temporário</span><span>10 min neste foco</span></div></div><span class="tiny-pill">origem: interrupção</span></div><div class="micro-step"><span>Depois</span><strong>↩ Retomar Fechamento AGEA</strong></div><div class="progress-line purple"><span style="width:42%"></span></div><div class="progress-caption"><span>10 min</span><span>check-in em 15 min</span></div></div><div class="helper"><img src="${owl}" alt=""><div><strong>O foco anterior não sumiu.</strong><span>Concluir este temporário devolve você imediatamente para Fechamento AGEA.</span></div></div></div><div class="stack">${todayMetrics()}${interruptionSide()}</div></div>`,{session:'active'}),

  unstuck:()=>appShell(`${pageHeader('Modo Trabalho','Mais travado = menos decisões.','DESTRAVANDO','yellow')}<div class="layout"><div class="stack"><div class="card"><div class="card-label">Destravando: Fechamento AGEA</div><h3>O que está pegando agora?</h3><p>Escolha o bloqueio mais próximo do que você está sentindo. Não precisa diagnosticar perfeitamente.</p><div class="choice-grid"><button class="choice selected"><strong>Parece grande demais</strong><span>Vamos reduzir brutalmente.</span></button><button class="choice"><strong>Não sei como entrar</strong><span>Vamos encontrar uma porta de entrada.</span></button><button class="choice"><strong>Estou evitando / sem vontade</strong><span>Vamos diminuir a resistência inicial.</span></button><button class="choice"><strong>Medo de fazer errado</strong><span>Vamos criar uma primeira ação reversível.</span></button><button class="choice"><strong>Saturado / sem energia</strong><span>Vamos reduzir carga e decisão.</span></button><button class="choice"><strong>Não faço ideia</strong><span>O Companion escolhe por você.</span></button></div></div></div><div class="stack"><div class="helper orange"><img src="${owl}" alt=""><div><strong>Timers congelados.</strong><span>Enquanto você destrava, isso não conta como execução nem como desvio.</span></div></div>${interruptionSide()}</div></div>`,{session:'active'}),

  bodydoubling:()=>appShell(`${pageHeader('Modo Trabalho','Sem conversa longa. Só o próximo passo.','ACOMPANHANDO','yellow')}<div class="layout"><div class="stack"><div class="card"><div class="card-label">Destravando: Fechamento AGEA</div><h3>Vamos juntos.</h3><p>Você não precisa enxergar a tarefa inteira. Só responda ao passo que está na sua frente.</p><div class="stepper"><div class="step-row done"><div class="step-num">✓</div><div><strong>Abra o arquivo ou sistema</strong><span>Concluído</span></div><button class="btn" disabled>Feito</button></div><div class="step-row active"><div class="step-num">2</div><div><strong>Agora encontre onde você parou</strong><span>Esse é o único objetivo agora.</span></div><button class="btn primary">✓ Achei</button></div><div class="step-row"><div class="step-num">3</div><div><strong>Faça apenas a primeira alteração</strong><span>Bloqueado até o passo anterior.</span></div><button class="btn" disabled>✓ Fiz</button></div></div></div><div class="helper"><img src="${owl}" alt=""><div><strong>Depois do terceiro passo:</strong><span>“Consegue seguir sozinho agora?” — Sim retorna ao foco; Ainda não avança para outra intervenção.</span></div></div></div><div class="stack"><div class="card"><div class="card-label">Princípio</div><h4>Body doubling digital</h4><p>Estrutura de execução, não chat. Uma instrução curta, uma resposta curta, um próximo passo.</p></div>${interruptionSide()}</div></div>`,{session:'active'}),

  ended:()=>appShell(`${pageHeader('Modo Trabalho','Por hoje, acabou.','DIA ENCERRADO','gray','Sessão finalizada')}<div class="layout"><div class="stack"><div class="card empty-state"><img src="${owl}" alt=""><h3>Dia encerrado</h3><p>Seu histórico continua salvo e as interrupções pendentes permanecem guardadas para quando você voltar.</p><div class="btn-row"><button class="btn primary">Ver revisão do dia</button></div></div></div><div class="stack"><div class="card"><div class="card-label">Resumo da sessão</div><div class="metric-grid"><div class="metric"><strong>4</strong><span>focos concluídos</span></div><div class="metric"><strong>6</strong><span>interrupções</span></div><div class="metric"><strong>5</strong><span>retomadas</span></div><div class="metric"><strong>1</strong><span>desvio percebido</span></div></div></div>${interruptionSide()}</div></div>`,{session:'ended'}),

  interruptions:()=>appShell(`${pageHeader('Interrupções','Coisas que surgiram enquanto você protegia outro foco.','3 PENDENTES','orange')}<div class="layout"><div class="stack"><div class="card"><div class="card-label">Aguardando</div><div class="page-grid"><div class="page-row"><div><strong>Verificar CND AGEA</strong><p>Surgiu durante: Fechamento AGEA · há 12 min</p></div><div class="row-actions"><button class="btn primary">Assumir agora</button><button class="btn">Resolvido</button></div></div><div class="page-row"><div><strong>Responder mensagem da Cris</strong><p>Surgiu durante: Fechamento AGEA · há 7 min</p></div><div class="row-actions"><button class="btn">Revisar</button><button class="btn">Resolvido</button></div></div><div class="page-row"><div><strong>Conferir protocolo digital</strong><p>Surgiu durante: Certificado Digital AGEA · há 3 min</p></div><div class="row-actions"><button class="btn">Revisar</button><button class="btn">Resolvido</button></div></div></div></div></div><div class="stack"><div class="card"><div class="card-label">Regra da caixa</div><h4>Capturar não é executar.</h4><p>Esta tela guarda o que apareceu sem transformar tudo em “agora”.</p></div><div class="helper orange"><img src="${owl}" alt=""><div><strong>Sem culpa por deixar aqui.</strong><span>O objetivo da caixa é permitir que você volte para o que já estava fazendo.</span></div></div></div></div>`,{active:'interruptions',session:'active'}),

  review:()=>appShell(`${pageHeader('Revisão','Um retrato do comportamento do seu foco — não uma nota.','HOJE','gray')}<div class="stack"><div class="review-hero"><div class="card review-callout"><div><div class="card-label">Leitura do dia</div><blockquote>Você voltou para o foco 5 vezes depois de uma interrupção ou desvio.</blockquote></div><small>Retomar também é trabalhar bem.</small></div><div class="card"><div class="card-label">Permanência</div><h4>Check-ins ao longo do dia</h4><div class="sparkline"><span style="height:28%"></span><span class="hot" style="height:62%"></span><span style="height:44%"></span><span class="hot" style="height:86%"></span><span style="height:54%"></span><span class="hot" style="height:70%"></span></div><div class="progress-caption"><span>manhã</span><span>agora</span></div></div></div><div class="card"><div class="card-label">Resumo</div><div class="metric-grid" style="grid-template-columns:repeat(5,1fr)"><div class="metric"><strong>4</strong><span>focos concluídos</span></div><div class="metric"><strong>6</strong><span>interrupções</span></div><div class="metric"><strong>2</strong><span>temporários</span></div><div class="metric"><strong>1</strong><span>desvio percebido</span></div><div class="metric"><strong>5</strong><span>retomadas</span></div></div></div><div class="helper"><img src="${owl}" alt=""><div><strong>Sem streak, sem nota, sem vermelho.</strong><span>A revisão existe para perceber padrões e facilitar o próximo dia — não para julgar o anterior.</span></div></div></div>`,{active:'review',session:'active'}),

  history:()=>appShell(`${pageHeader('Histórico','O que aconteceu, em linguagem humana.','LINHA DO TEMPO','gray')}<div class="layout"><div class="stack"><div class="card"><div class="card-label">Hoje</div><div class="timeline"><div class="timeline-item"><div class="timeline-icon">↩</div><time>17:23</time><div><strong>Retomou Fechamento AGEA</strong><span>Depois de concluir Certificado Digital AGEA</span></div></div><div class="timeline-item"><div class="timeline-icon">✓</div><time>17:20</time><div><strong>Certificado Digital AGEA concluído</strong><span>Foco temporário · 10 min</span></div></div><div class="timeline-item"><div class="timeline-icon">⚡</div><time>17:10</time><div><strong>Certificado Digital AGEA virou foco temporário</strong><span>Interrupção confirmada como urgente</span></div></div><div class="timeline-item"><div class="timeline-icon">●</div><time>16:53</time><div><strong>Entrou em Fechamento AGEA</strong><span>Após check-in de ativação</span></div></div><div class="timeline-item"><div class="timeline-icon">↗</div><time>16:48</time><div><strong>Começou Fechamento AGEA</strong><span>Primeiro passo: abrir a folha</span></div></div></div></div></div><div class="stack"><div class="card"><div class="card-label">Filtro</div><div class="segmented"><button class="active">Hoje</button><button>7 dias</button><button>30 dias</button></div></div><div class="helper"><img src="${owl}" alt=""><div><strong>Histórico conta a história.</strong><span>Nada de códigos internos ou estados de banco de dados expostos para você.</span></div></div></div></div>`,{active:'history',session:'active'}),

  settings:()=>appShell(`${pageHeader('Configurações','Poucas preferências. Só o que muda a experiência.','LOCAL','gray')}<div class="layout"><div class="stack"><div class="card"><div class="settings-group"><h4>Rotina</h4><div class="setting-row"><div><strong>Iniciar com o Windows</strong><span>Abrir o Companion automaticamente.</span></div><div class="toggle on"></div></div><div class="setting-row"><div><strong>Horário habitual</strong><span>Usado apenas como sugestão de início.</span></div><div class="segmented"><button>08:00</button><button class="active">09:00</button><button>10:00</button></div></div></div><div class="settings-group"><h4>Foco</h4><div class="setting-row"><div><strong>Check-in de ativação</strong><span>Quanto tempo esperar antes de perguntar se você entrou.</span></div><div class="segmented"><button>3</button><button class="active">5 min</button><button>10</button></div></div><div class="setting-row"><div><strong>Check-in de permanência</strong><span>Ciclo silencioso enquanto você está em foco.</span></div><div class="segmented"><button>15</button><button class="active">25 min</button><button>40</button><button>Off</button></div></div></div><div class="settings-group"><h4>Companion compacto</h4><div class="setting-row"><div><strong>Mostrar automaticamente</strong><span>Ao entrar no Modo Trabalho.</span></div><div class="toggle on"></div></div><div class="setting-row"><div><strong>Restaurar posição</strong><span>Voltar para o monitor e posição usados por último.</span></div><div class="toggle on"></div></div><div class="setting-row"><div><strong>Atalho global</strong><span>Mostrar / ocultar o compacto.</span></div><span class="tiny-pill">Ctrl + Shift + Space</span></div></div></div></div><div class="stack"><div class="card"><div class="card-label">Companion</div><h4>Janela compacta</h4><p>Teste a posição e o tamanho sem iniciar um foco.</p><div class="btn-row"><button class="btn primary">Mostrar Companion compacto</button></div></div><div class="helper orange"><img src="${owl}" alt=""><div><strong>Configuração não vira tarefa.</strong><span>Opções avançadas e dados de teste ficam fora do caminho normal.</span></div></div></div></div>`,{active:'settings',session:'active'})
};

const progress = (cls,w) => `<div class="progress ${cls}"><span style="width:${w}%"></span></div>`;
const compactBase = ({title,status,statusCls='state-gray',progressHtml='',body='',foot=''}) => `<div class="compact-window"><div class="compact-top"><img src="${owl}" alt=""><div><strong>${title}</strong><small class="${statusCls}">${status}</small></div><div class="window-actions"><button class="icon-btn" aria-label="Mais opções">⋮</button><button class="icon-btn" aria-label="Ocultar">×</button></div></div>${progressHtml}${body}${foot}</div>`;

const compactStates = {
  empty:()=>compactBase({title:'Sem foco ativo',status:'MODO TRABALHO ATIVO',body:`<div class="compact-message"><p>Pronto para quando você começar.</p></div><div class="compact-actions single"><button class="compact-btn primary">＋ Definir foco</button></div>`}),
  activation:()=>compactBase({title:'Fechamento AGEA',status:'ATIVAÇÃO',statusCls:'state-yellow',progressHtml:progress('yellow',42),body:`<div class="compact-message"><p><strong style="color:#eef2f7">Primeiro passo:</strong> abrir a folha e localizar onde parei.</p></div>`,foot:`<div class="compact-foot"><span>2 min desde que começou</span><span>check-in em 3 min</span></div>`}),
  'activation-check':()=>compactBase({title:'Fechamento AGEA',status:'CHECK-IN DE ATIVAÇÃO',statusCls:'state-yellow',progressHtml:progress('yellow',100),body:`<div class="checkpoint"><div class="checkpoint-label">Conseguiu entrar na tarefa?</div><div class="compact-actions three"><button class="compact-btn success">✓ Sim, entrei</button><button class="compact-btn warn">Ainda não</button><button class="compact-btn">🛟 Desviei</button></div></div>`,foot:`<div class="compact-foot"><span>5 min desde que começou</span><span>sem cobrança</span></div>`}),
  focus:()=>compactBase({title:'Fechamento AGEA',status:'EM FOCO',statusCls:'state-green',progressHtml:progress('green',68),body:`<div class="compact-actions"><button class="compact-btn">⚡ Interrupção</button><button class="compact-btn">🛟 Desviei</button></div><div class="compact-actions single"><button class="compact-btn success">✓ Concluir foco</button></div>`,foot:`<div class="compact-foot"><span>17 min neste foco</span><span>check-in em 8 min</span></div>`}),
  'presence-check':()=>compactBase({title:'Fechamento AGEA',status:'CHECK-IN DE PERMANÊNCIA',statusCls:'state-green',progressHtml:progress('green',100),body:`<div class="compact-message"><h3>Ainda está nesta tarefa?</h3><p>Você está nesse foco há 25 min.</p></div><div class="compact-actions three"><button class="compact-btn success">✓ Continuo</button><button class="compact-btn">🛟 Desviei</button><button class="compact-btn">✓ Concluí</button></div>`}),
  temporary:()=>compactBase({title:'Certificado Digital AGEA',status:'FOCO TEMPORÁRIO',statusCls:'state-purple',progressHtml:progress('purple',42),body:`<div class="compact-message"><p>↩ Depois: Fechamento AGEA</p></div><div class="compact-actions single"><button class="compact-btn success">✓ Concluir e retomar Fechamento AGEA</button></div><div class="compact-actions single"><button class="compact-btn">🛟 Desviei</button></div>`,foot:`<div class="compact-foot"><span>10 min neste foco</span><span>check-in em 15 min</span></div>`}),
  paused:()=>compactBase({title:'Fechamento AGEA',status:'PAUSADO',body:`<div class="compact-message"><h3>17 min de foco acumulado</h3><p>Tempo e checkpoints estão congelados.</p></div><div class="compact-actions single"><button class="compact-btn primary">▶ Retomar foco</button></div>`}),
  unstuck:()=>compactBase({title:'Fechamento AGEA',status:'DESTRAVANDO',statusCls:'state-yellow',body:`<div class="compact-message"><h3>Estamos encontrando uma forma menor de entrar.</h3><p>Continue na janela principal. O foco está preservado e os timers estão congelados.</p></div>`})
};

const modalWrap = content => `<div class="modal-stage">${content}</div>`;
const modal = ({head,body,foot=''}) => `<div class="modal"><div class="modal-head"><strong>${head}</strong><button class="icon-btn">×</button></div><div class="modal-body">${body}</div>${foot?`<div class="modal-foot">${foot}</div>`:''}</div>`;
const modalStates = {
  interrupt:()=>modalWrap(modal({head:'⚡ O que surgiu?',body:`<p>Capture rápido. Sem transformar isso em outra tarefa para organizar.</p><input class="input" style="margin-top:10px" placeholder="Descreva em poucas palavras..."><p style="font-size:9px;margin-top:7px;color:#6f7d90">Ex.: Verificar CND AGEA</p>`,foot:`<button class="btn">Cancelar</button><button class="btn primary">Continuar →</button>`})),
  triage:()=>modalWrap(modal({head:'Triagem rápida',body:`<p><strong style="color:#fff">Interrupção:</strong> Verificar CND AGEA</p><h3>Isso precisa substituir o que você está fazendo agora?</h3><div class="choices three"><button class="choice"><strong>Sim</strong><span>Avaliar urgência</span></button><button class="choice selected"><strong>Não</strong><span>Estacionar</span></button><button class="choice"><strong>Não sei</strong><span>Revisar depois</span></button></div>`})),
  urgency:()=>modalWrap(modal({head:'Confirmação de urgência',body:`<p><strong style="color:#fff">Interrupção:</strong> Verificar CND AGEA</p><h3>O que acontece se isso esperar até você terminar seu foco?</h3><div class="radio-list"><label class="radio-row"><input type="radio" name="u"> Alguém está bloqueado agora</label><label class="radio-row"><input type="radio" name="u"> Existe prazo imediato</label><label class="radio-row"><input type="radio" name="u"> Existe consequência financeira / operacional</label><label class="radio-row"><input type="radio" name="u"> Há um problema acontecendo agora</label><label class="radio-row"><input type="radio" name="u"> Só parece urgente</label></div>`,foot:`<button class="btn">← Voltar</button><button class="btn primary" disabled>Trocar foco agora</button>`})),
  deviation:()=>modalWrap(modal({head:'🛟 Para onde você foi?',body:`<p>Perceber o desvio já é parte da recuperação.</p><input class="input" style="margin-top:10px" placeholder="Ex.: WhatsApp, e-mail, outra demanda..."><h3 style="margin-top:18px">Isso realmente precisa substituir seu foco agora?</h3><div class="choices three"><button class="choice selected"><strong>Não</strong><span>Voltar ao foco</span></button><button class="choice"><strong>Não sei</strong><span>Proteger foco atual</span></button><button class="choice"><strong>Sim</strong><span>Verificar necessidade</span></button></div>`})),
  microaction:()=>modalWrap(modal({head:'Me ajuda a entrar',body:`<p><strong style="color:#fff">Para entrar em:</strong> Fechamento AGEA</p><h3>Qual é a primeira ação concreta?</h3><p>Não vamos planejar o projeto inteiro.</p><div class="choices"><button class="choice selected"><strong>Abrir o arquivo/sistema</strong></button><button class="choice"><strong>Localizar onde parei</strong></button><button class="choice"><strong>Fazer uma única alteração</strong></button><button class="choice"><strong>Outra ação...</strong></button></div><input class="input" placeholder="Escreva outra ação, se precisar">`,foot:`<button class="btn">Cancelar</button><button class="btn primary">Fazer só isso →</button>`}))
};

const labels = {
  main:{empty:'Janela principal · Sem foco',declared:'Janela principal · Foco declarado',activation:'Janela principal · Ativação',focus:'Janela principal · Em foco',temporary:'Janela principal · Foco temporário',unstuck:'Janela principal · Destravando',bodydoubling:'Janela principal · Acompanhamento',ended:'Janela principal · Dia encerrado',interruptions:'Tela secundária · Interrupções',review:'Tela secundária · Revisão',history:'Tela secundária · Histórico',settings:'Tela secundária · Configurações'},
  compact:{empty:'Companion compacto · Sem foco',activation:'Companion compacto · Ativação','activation-check':'Companion compacto · Check-in de ativação',focus:'Companion compacto · Em foco','presence-check':'Companion compacto · Check-in de permanência',temporary:'Companion compacto · Foco temporário',paused:'Companion compacto · Pausado',unstuck:'Companion compacto · Destravando'},
  modal:{interrupt:'Modal · Captura de interrupção',triage:'Modal · Triagem',urgency:'Modal · Confirmação de urgência',deviation:'Modal · Desvio',microaction:'Modal · Microação'}
};

function render(surface='main',state='empty'){
  const root=$('#preview-root');
  const fn=surface==='main'?mainStates[state]:surface==='compact'?compactStates[state]:modalStates[state];
  if(!fn) return;
  root.innerHTML=fn();
  root.dataset.surface=surface;
  $('#preview-title').textContent=labels[surface][state];
  wirePreviewInteractions(root);
  requestAnimationFrame(applyZoom);
}

function wirePreviewInteractions(root){
  $$('.choice',root).forEach(choice=>choice.addEventListener('click',()=>{
    const group=choice.parentElement;
    $$('.choice',group).forEach(c=>c.classList.remove('selected'));
    choice.classList.add('selected');
  }));
  $$('input[type="radio"]',root).forEach(radio=>radio.addEventListener('change',()=>{
    const submit=$('.modal-foot .btn.primary',root);
    if(submit) submit.disabled=false;
  }));
  $$('.segmented button',root).forEach(btn=>btn.addEventListener('click',()=>{
    const seg=btn.parentElement;
    $$('.segmented button',seg).forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  }));
  $$('.toggle',root).forEach(t=>t.addEventListener('click',()=>t.classList.toggle('on')));
}

function applyZoom(){
  const root=$('#preview-root');
  const surface=root.dataset.surface || 'main';
  const fit=$('.viewport-switch button.active')?.dataset.zoom==='fit';
  if(!fit){root.style.transform='scale(1)';return;}
  const area=$('.preview-area');
  const target=surface==='main'?1180:surface==='modal'?900:440;
  const availableW=Math.max(300,area.clientWidth-76);
  const availableH=Math.max(300,area.clientHeight-76);
  const targetH=surface==='main'?760:surface==='modal'?610:320;
  const scale=Math.min(1,availableW/target,availableH/targetH);
  root.style.transform=`scale(${Math.max(.35,scale)})`;
}

$$('.lab-state').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.lab-state').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  render(btn.dataset.surface,btn.dataset.state);
}));
$$('.viewport-switch button').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.viewport-switch button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  applyZoom();
}));
window.addEventListener('resize',applyZoom);
render();
