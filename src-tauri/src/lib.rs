use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{command, Manager};

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct AppConfig {
    workspaces: Vec<WorkspaceConfig>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct WorkspaceConfig {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    id: Option<String>,
    name: String,
    apps: Vec<String>,
    webs: Vec<WebGroup>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct WebGroup {
    browser: String,
    urls: Vec<String>,
}

fn get_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Не удалось определить папку конфигурации: {}", e))?;

    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Не удалось создать папку конфигурации: {}", e))?;

    config_dir.push("config.json");

    let legacy_path = Path::new("../config.json");
    if !config_dir.exists() && legacy_path.exists() {
        std::fs::copy(legacy_path, &config_dir)
            .map_err(|e| format!("Не удалось скопировать существующий config.json: {}", e))?;
    }

    Ok(config_dir)
}

fn load_config(config_path: &Path) -> Result<AppConfig, String> {
    if !config_path.exists() {
        return Ok(AppConfig {
            workspaces: Vec::new(),
        });
    }

    let content = std::fs::read_to_string(config_path)
        .map_err(|e| format!("Cannot read config.json: {}", e))?;

    serde_json::from_str::<AppConfig>(&content)
        .map_err(|e| format!("Error parsing config.json: {}", e))
}

fn save_config(config_path: &Path, app_config: &AppConfig) -> Result<(), String> {
    let json_data = serde_json::to_string_pretty(app_config)
        .map_err(|e| format!("Error of serialization JSON: {}", e))?;

    std::fs::write(config_path, json_data)
        .map_err(|e| format!("Cannot write in config.json: {}", e))?;

    Ok(())
}

#[command]
fn get_workspaces(app: tauri::AppHandle) -> Result<String, String> {
    let config_path = get_config_path(&app)?;
    let app_config = load_config(&config_path)?;

    serde_json::to_string(&app_config)
        .map_err(|e| format!("Error serializing config.json: {}", e))
}

#[command]
fn launch_workspace(apps: Vec<String>, urls: Vec<String>) -> Result<(), String> {
    for app in apps {
        let cleaned_app = app.trim().trim_matches('"');
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
                .args(["/C", "start", "", &url])
                .spawn()
                .map_err(|e| format!("Error during url {} launching: {}", url, e))?;
        }
    }

    Ok(())
}

#[command]
fn create_workspace(app: tauri::AppHandle, new_workspace: WorkspaceConfig) -> Result<(), String> {
    let config_path = get_config_path(&app)?;
    let mut app_config = load_config(&config_path)?;

    app_config.workspaces.push(new_workspace);
    save_config(&config_path, &app_config)
}

#[command]
fn update_workspace(
    app: tauri::AppHandle,
    id: String,
    mut updated_workspace: WorkspaceConfig,
) -> Result<(), String> {
    let config_path = get_config_path(&app)?;
    let mut app_config = load_config(&config_path)?;

    let target = app_config
        .workspaces
        .iter_mut()
        .find(|ws| ws.id.as_deref() == Some(id.as_str()))
        .ok_or_else(|| format!("Workspace with id '{}' not found", id))?;

    // Сохраняем исходный id, даже если фронтенд его не передал повторно
    updated_workspace.id = Some(id);
    *target = updated_workspace;

    save_config(&config_path, &app_config)
}

#[command]
fn delete_workspace(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let config_path = get_config_path(&app)?;
    let mut app_config = load_config(&config_path)?;

    let initial_len = app_config.workspaces.len();
    app_config.workspaces.retain(|ws| ws.id.as_deref() != Some(id.as_str()));

    if app_config.workspaces.len() == initial_len {
        return Err(format!("Workspace with id '{}' not found", id));
    }

    save_config(&config_path, &app_config)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_workspaces,
            launch_workspace,
            create_workspace,
            update_workspace,
            delete_workspace
        ])
        .run(tauri::generate_context!())
        .expect("Ошибка при запуске приложения Tauri");
}