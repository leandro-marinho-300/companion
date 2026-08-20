# Companion — TDAH Focus

Desktop Companion Windows-first para reduzir a distância entre **saber o que precisa fazer** e **efetivamente começar**, proteger uma intenção contra interrupções e recuperar contexto quando houver desvio.

## Motor do produto

**Intenção → Ativação → Foco → Proteção → Desvio → Recuperação → Retomada**

## V1.1 / 0.2.0

A V1.1 transforma o protótipo em uma base mais próxima de um companion desktop real:

- janela principal + mini Companion always-on-top;
- bandeja do sistema;
- fechar janela = esconder, sem perder a sessão;
- atalho global `Ctrl + Shift + Espaço` para capturar interrupções;
- posição das janelas restaurada automaticamente;
- autostart configurável;
- Modo Trabalho híbrido por horário/dias, com início/encerramento manual;
- instância única para evitar duplicação de tray/atalho global;
- mini Companion arrastável e com posição restaurada;
- checkpoint silencioso com notificação nativa e check-in no mini Companion;
- foco temporário preservando o foco anterior;
- Caixa de Interrupções e recuperação de desvios.

## Executar o frontend como preview

```bash
npm run preview
```

Abra `http://localhost:1420`.

O preview permite validar a UX principal, mas recursos de Windows/Tauri (tray, autostart, atalho global e notificações nativas) só funcionam no app desktop.

## Executar como app Tauri

Pré-requisitos do Tauri para Windows devem estar instalados, incluindo Rust e as dependências de build do Windows.

```bash
npm install
npm run tauri dev
```

Para gerar o instalador:

```bash
npm run tauri build
```

## Arquitetura atual

- UI: HTML/CSS/JavaScript local, sem backend web.
- Desktop: Tauri 2 + Rust.
- Dados comportamentais: `localStorage` do webview nesta fase.
- Estado de janela: `tauri-plugin-window-state`.
- Instância única: `tauri-plugin-single-instance`.
- Autostart: `tauri-plugin-autostart`.
- Notificações: `tauri-plugin-notification`.
- Atalho global: `tauri-plugin-global-shortcut`.

> Decisão deliberada: não refatorar a UI para React/TypeScript antes do primeiro teste real. A prioridade agora é validar o mecanismo comportamental e a ergonomia nativa; uma refatoração estrutural só deve ocorrer se houver ganho concreto.

## Regra de produto

> Se uma função aumentar o esforço cognitivo justamente quando o usuário está travado, provavelmente está errada.
