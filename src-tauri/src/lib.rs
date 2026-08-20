use tauri::{Emitter, Manager};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[tauri::command]
fn show_companion(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("companion") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn hide_companion(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("companion") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn show_main(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn show_main_page(app: tauri::AppHandle, page: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        window.emit("navigate", page).map_err(|e| e.to_string())?;
    }
    Ok(())
}


#[tauri::command]
fn get_autostart(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    if enabled {
        manager.enable().map_err(|e| e.to_string())
    } else {
        manager.disable().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn notify_activation_checkpoint(app: tauri::AppHandle, focus_title: String) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title("Companion")
        .body(format!("Conseguiu entrar em “{}”?", focus_title))
        .show()
        .map_err(|e| e.to_string())
}

fn reveal_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn reveal_companion(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("companion") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            reveal_main(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            show_companion,
            hide_companion,
            show_main,
            show_main_page,
            get_autostart,
            set_autostart,
            notify_activation_checkpoint
        ])
        .on_window_event(|window, event| {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        // O Companion é um app de bandeja: fechar a janela esconde, não encerra a sessão.
        api.prevent_close();
        let _ = window.hide();
    }
})
        .setup(|app| {
            #[cfg(desktop)]
            {
                // Restaura posição/tamanho — especialmente útil para o Companion no segundo monitor.
                app.handle().plugin(tauri_plugin_window_state::Builder::default().build())?;

                // Atalho global de captura rápida.
                let shortcut = Shortcut::new(
                    Some(Modifiers::CONTROL | Modifiers::SHIFT),
                    Code::Space,
                );
                let shortcut_for_handler = shortcut.clone();

                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |app, pressed, event| {
                            if pressed == &shortcut_for_handler
                                && event.state() == ShortcutState::Pressed
                            {
                                if let Some(window) = app.get_webview_window("companion") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                    let _ = window.emit("quick-interruption", ());
                                }
                            }
                        })
                        .build(),
                )?;

                app.global_shortcut().register(shortcut)?;

                // Bandeja do sistema: o processo continua vivo mesmo quando as janelas são fechadas.
                let open_main = MenuItem::with_id(app, "open_main", "Abrir Companion", true, None::<&str>)?;
                let show_mini = MenuItem::with_id(app, "show_mini", "Mostrar mini Companion", true, None::<&str>)?;
                let hide_mini = MenuItem::with_id(app, "hide_mini", "Ocultar mini Companion", true, None::<&str>)?;
                let inbox = MenuItem::with_id(app, "inbox", "Caixa de Interrupções", true, None::<&str>)?;
                let quit = MenuItem::with_id(app, "quit", "Sair do Companion", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&open_main, &show_mini, &hide_mini, &inbox, &quit])?;

                TrayIconBuilder::new()
                    .icon(app.default_window_icon().expect("ícone padrão do Companion").clone())
                    .tooltip("Companion — TDAH Focus")
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "open_main" => reveal_main(app),
                        "show_mini" => reveal_companion(app),
                        "hide_mini" => {
                            if let Some(window) = app.get_webview_window("companion") {
                                let _ = window.hide();
                            }
                        }
                        "inbox" => {
                            reveal_main(app);
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.emit("navigate", "interruptions");
                            }
                        }
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            reveal_main(tray.app_handle());
                        }
                    })
                    .build(app)?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao executar o Companion");
}
