use tauri::command;

// Команда чтения конфига из корня проекта
#[command]
fn get_workspaces() -> Result<String, String> {
    std::fs::read_to_string("../config.json")
        .map_err(|e| format!("Не удалось прочитать config.json: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_workspaces])
        .run(tauri::generate_context!())
        .expect("Ошибка при запуске приложения Tauri");
}