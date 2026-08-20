# Validação técnica — Companion 0.2.0

## Checagens executadas neste ambiente

- `node --check shared.js`
- `node --check app.js`
- `node --check companion.js`
- parse de `package.json`
- parse de `src-tauri/tauri.conf.json`
- parse de `src-tauri/capabilities/default.json`
- servidor estático local respondendo `index.html` e `companion.html`
- verificação da presença do check-in compacto e dos arquivos de ícone

## Não validado aqui

Este ambiente não possui o toolchain Rust/Tauri para compilar o executável nativo. Portanto, antes de considerar 0.2.0 uma build distribuível, é obrigatório validar em Windows:

1. `npm install`
2. `npm run tauri dev`
3. mover o mini Companion para o segundo monitor e reiniciar;
4. testar `Ctrl + Shift + Espaço` dentro do WhatsApp Web e de outros apps;
5. ativar/desativar autostart e reiniciar a sessão do Windows;
6. fechar as duas janelas e reabrir pelo tray;
7. tentar iniciar o executável uma segunda vez e confirmar que não cria uma segunda instância;
8. testar o checkpoint de ativação e a notificação com o app instalado;
9. testar DPI/escala diferentes entre os dois monitores;
10. confirmar que uma interrupção temporária retorna ao foco anterior.

## Critério de avanço

Não adicionar gamificação, integrações ou IA antes deste ciclo de uso real. Primeiro corrigir atritos encontrados em 3–5 dias de uso.
