use tauri::command;
use std::fs;
use std::io;
use std::thread;
use std::io::Write;
use std::time::Duration;
use std::process::Command;


#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct AppConfig {
    workspaces: Vec<WorkspaceConfig>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct WorkspaceConfig {
    name: String,
    apps: Vec<String>,
    webs: Vec<WebGroup>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct WebGroup {
    browser: String,
    urls: Vec<String>,
}

// Команда чтения конфига из корня проекта
#[command]
fn get_workspaces() -> Result<String, String> {
    std::fs::read_to_string("../config.json")
        .map_err(|e| format!("Не удалось прочитать config.json: {}", e))
}

#[command]
fn launch_workspace(apps: Vec<String>, urls: Vec<String>) -> Result<(), String> {
    for app in apps {
        if !app.trim().is_empty() {
            Command::new(&app)
                .spawn()
                .map_err(|e| format!("Error during app {} launching: {}", app, e))?;
        }
    }

    for url in urls {
        if !url.trim().is_empty() {
            #[cfg(target_os = "windows")]
            Command::new("cmd")
                .args(["/C", "start", &url])
                .spawn()
                .map_err(|e| format!("Error during url {} launching: {}", url, e))?;
        }
    }

    Ok(())
}

#[command]
fn create_workspace(new_workspace: WorkspaceConfig) -> Result<(), String> {
    let config_path = "../config.json";

    let mut app_config = if std::path::Path::new(config_path).exists() {
        let content = std::fs::read_to_string(config_path)
            .map_err(|e| format!("Cannot read config.json: {}", e))?;
        serde_json::from_str::<AppConfig>(&content)
            .unwrap_or_else(|_| AppConfig {workspaces: Vec::new() })
    } else {
        AppConfig { workspaces: Vec::new() }
    };

    app_config.workspaces.push(new_workspace);

    let json_data = serde_json::to_string_pretty(&app_config)
        .map_err(|e| format!("Error of serialization JSON: {}", e))?;
    
    std::fs::write(config_path, json_data)
        .map_err(|e| format!("Cannot write in config.json: {}", e))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_workspaces, launch_workspace, create_workspace])
        .run(tauri::generate_context!())
        .expect("Ошибка при запуске приложения Tauri");
}
