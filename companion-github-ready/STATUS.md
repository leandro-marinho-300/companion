# Companion — Status da V1.1 (0.2.0)

## Implementado

- Janela principal com Modo Trabalho, foco, ativação, destravar, revisão e histórico básico.
- Companion compacto independente e sempre no topo.
- Captura rápida de interrupção + triagem Sim / Não / Não sei.
- Foco temporário com retorno ao foco anterior.
- Recuperação de desvio.
- Caixa de Interrupções.
- Atalho global `Ctrl + Shift + Espaço` no app Tauri.
- Checkpoint de ativação automático após a janela silenciosa.
- Check-in direto no Companion compacto: Engrenei / Ainda travado / Desviei.
- Notificação nativa no checkpoint (quando permitida pelo Windows).
- System tray com acesso à janela principal, mini Companion, Caixa de Interrupções e saída real do app.
- Fechar uma janela apenas a esconde; a sessão continua ativa na bandeja.
- Autostart configurável nas Configurações.
- Modo Trabalho híbrido real: agenda automática + override manual por dia.
- Instância única: abrir o app novamente traz a janela existente em vez de duplicar tray/atalhos.
- Mini Companion sem moldura, arrastável e com fundo transparente.
- Persistência automática da posição/tamanho das janelas, inclusive no segundo monitor.
- Estado comportamental persistido localmente.

## Validado neste ambiente

- Sintaxe JavaScript (`node --check`).
- JSON de configuração/capabilities.
- Preview web do frontend.

## Ainda precisa de validação em Windows

- Compilação Rust/Tauri e geração do instalador.
- Comportamento real da bandeja e do always-on-top.
- Atalho global em conflito com outros apps.
- Autostart após login do Windows.
- Restauração de posição em configuração real com dois monitores/DPI diferentes.
- Notificação nativa: no Windows, o plugin deve ser testado com o app instalado.

## Próximo ciclo sugerido

1. Compilar e instalar em um Windows real.
2. Usar por 3–5 dias em trabalho normal.
3. Registrar atritos antes de adicionar funções novas.
4. Só depois evoluir histórico/métricas e a persistência de dados para store/SQLite, se necessário.
