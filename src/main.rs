use std::fs;
use std::io;
use std::io::Write;
use std::process::Command;
use std::thread;
use std::time::Duration;

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

fn main() -> Result<(), Box<dyn std::error::Error>> {
    loop {
        println!("\n==============================");
        println!("      WORKSPACE LAUNCHER      ");
        println!("==============================");
        println!("1. Show all workspaces");
        println!("2. Execute workspace");
        println!("3. Create new workspace");
        println!("4. Edit workspace");
        println!("5. Delete workspace");
        println!("0. Exit");

        let choice = read_input("Enter num: ")?;

        match choice.as_str() {
            "1" => {
                let _ = show_workspaces();
            }
            "2" => {
                let app_config = match show_workspaces_silent() {
                    Ok(cfg) => cfg,
                    Err(_) => {
                        continue;
                    }
                };
                for (i, ws) in app_config.workspaces.iter().enumerate() {
                    println!("{}. {:?}", i, ws);
                }
                let idx_str = read_input("Enter num for execution: ")?;
                if let Ok(ind) = idx_str.parse::<usize>() {
                    if ind < app_config.workspaces.len() {
                        let workspace = show_workspace(&app_config, ind);
                        let _ = execution_apps(workspace)?;
                    }
                }
            }
            "3" => {
                if let Err(e) = add_workspace_in_config() {
                    eprintln!("Error: {}", e);
                }
            }
            "4" => {
                if let Err(e) = update_workspace() {
                    eprintln!("Error: {}", e);
                }
            }
            "5" => {
                let app_config = match show_workspaces_silent() {
                    Ok(cfg) => cfg,
                    Err(_) => {
                        continue;
                    }
                };

                for (i, ws) in app_config.workspaces.iter().enumerate() {
                    println!("{}. {:?}", i, ws.name);
                }

                let idx_str = read_input("Enter number for deleting: ")?;
                if let Ok(ind) = idx_str.parse::<usize>() {
                    if ind < app_config.workspaces.len() {
                        if let Err(e) = delete_workspace(ind) {
                            eprintln!("Error: {}", e);
                        }
                    }
                }
            }
            "0" => {
                break;
            }
            _ => println!("Choose another option"),
        }
    }
    Ok(())
}

// execution apps
fn execution_apps(
    config: &WorkspaceConfig,
) -> Result<Vec<std::process::Child>, Box<dyn std::error::Error>> {
    let mut running_processes = Vec::new();

    for app in &config.apps {
        match Command::new(app).spawn() {
            Ok(value) => {
                println!("App success: {}", value.id());
                running_processes.push(value);
            }

            Err(error) => eprintln!("App error: {}", error),
        }
    }

    for web_group in &config.webs {
        for url in &web_group.urls {
            match Command::new("cmd")
                .args(["/C", "start", &web_group.browser, &url])
                .spawn()
            {
                Ok(value) => {
                    println!("Web success: {}", value.id());
                    running_processes.push(value);
                }
                Err(error) => eprintln!("Web error: {}", error),
            };
        }
    }

    Ok(running_processes)
}

// turning off apps
fn kill_processes(
    active_processes: &mut Vec<std::process::Child>,
) -> Result<(), Box<dyn std::error::Error>> {
    for process in active_processes {
        let _ = process.kill();
        let _ = process.wait();
    }
    Ok(())
}

// showing all workspaces
fn show_workspaces() -> Result<AppConfig, Box<dyn std::error::Error>> {
    let content = fs::read_to_string("config.json")?;
    let parsed_data: AppConfig = serde_json::from_str(&content)?;

    println!("{:?}", parsed_data);

    Ok(parsed_data)
}

fn show_workspaces_silent() -> Result<AppConfig, Box<dyn std::error::Error>> {
    let content = fs::read_to_string("config.json")?;
    let parsed_data: AppConfig = serde_json::from_str(&content)?;
    Ok(parsed_data)
}

// showing one workspace's data
fn show_workspace(config: &AppConfig, ind: usize) -> &WorkspaceConfig {
    &config.workspaces[ind]
}

// read user's input
fn read_input(prompt: &str) -> Result<String, Box<dyn std::error::Error>> {
    print!("{}", prompt);
    io::stdout().flush()?;

    let mut inp: String = String::new();

    io::stdin().read_line(&mut inp)?;

    let input: String = inp.trim().to_string();

    Ok(input)
}

// create new workspace
fn create_workspace() -> Result<WorkspaceConfig, Box<dyn std::error::Error>> {
    let name = read_input("Enter name of the new Workspace: ")?;

    let mut apps = Vec::new();
    println!("Enter apps: ");

    loop {
        let app_path = read_input("Path for.exe: ")?;
        if app_path.is_empty() {
            break;
        }
        apps.push(app_path);
    }

    let mut webs = Vec::new();

    let add_web = read_input("Adding web data?: ")?;
    if add_web.to_lowercase() == "y" {
        let browser = read_input("Enter browser name: ")?;
        let mut urls = Vec::new();

        println!("Enter urls: ");
        loop {
            let url = read_input("url: ")?;
            if url.is_empty() {
                break;
            }
            urls.push(url);
        }

        if !urls.is_empty() {
            webs.push(WebGroup { browser, urls });
        }
    }

    Ok(WorkspaceConfig { name, apps, webs })
}

fn save_config(config: &AppConfig) -> Result<(), Box<dyn std::error::Error>> {
    let json_data = serde_json::to_string_pretty(config)?;

    fs::write("config.json", json_data)?;

    Ok(())
}

// adding new workspace in config
fn add_workspace_in_config() -> Result<(), Box<dyn std::error::Error>> {
    let mut app_config = match show_workspaces() {
        Ok(cfg) => cfg,
        Err(_) => AppConfig {
            workspaces: Vec::new(),
        },
    };

    let new_workspace = create_workspace()?;

    app_config.workspaces.push(new_workspace);

    save_config(&app_config)?;

    println!("New workspace was saved in the config.json");
    Ok(())
}

fn update_name(workspace: &mut WorkspaceConfig) -> Result<(), Box<dyn std::error::Error>> {
    println!("Current name: {}", workspace.name);

    let new_name = read_input("New name: ")?;

    if !new_name.is_empty() {
        workspace.name = new_name;
    } else {
        println!("Name cannot be empty");
    }

    Ok(())
}

fn update_apps(workspace: &mut WorkspaceConfig) -> Result<(), Box<dyn std::error::Error>> {
    println!("Current apps: {:?}", workspace.apps);

    let mut new_apps = Vec::new();

    loop {
        let app_path = read_input("New path: ")?;
        if app_path.is_empty() {
            break;
        }
        new_apps.push(app_path);
    }

    workspace.apps = new_apps;

    Ok(())
}

fn update_browser(workspace: &mut WorkspaceConfig) -> Result<(), Box<dyn std::error::Error>> {
    println!("Current webs: {:?}", workspace.webs);

    let new_browser = read_input("New browser: ")?;
    workspace.webs[0].browser = new_browser;

    Ok(())
}

fn update_urls(workspace: &mut WorkspaceConfig) -> Result<(), Box<dyn std::error::Error>> {
    for (i, url) in workspace.webs[0].urls.iter().enumerate() {
        println!("{}. {}", i + 1, url);
    }

    let mut new_urls = Vec::new();

    loop {
        let url = read_input("New url: ")?;
        if url.is_empty() {
            break;
        }
        new_urls.push(url);
    }

    workspace.webs[0].urls = new_urls;
    Ok(())
}

fn update_workspace() -> Result<(), Box<dyn std::error::Error>> {
    let mut app_config = show_workspaces()?;

    if app_config.workspaces.is_empty() {
        return Ok(());
    }

    for (i, ws) in app_config.workspaces.iter().enumerate() {
        println!("{}. {:?}", i, ws);
    }

    let index_str = read_input("Choose workspace for update: ");
    let index: usize = index_str?.parse()?;

    let workspace = &mut app_config.workspaces[index];

    loop {
        println!("\n--- Update: '{}' ---", workspace.name);
        println!("1. Change name (name)");
        println!("2. Change apps (apps)");
        println!("3. Change browser (browser)");
        println!("4. Change urls (urls)");
        println!("0. Save changes and exit");

        let choice = read_input("Choose number: ")?;

        match choice.as_str() {
            "1" => update_name(workspace)?,
            "2" => update_apps(workspace)?,
            "3" => update_browser(workspace)?,
            "4" => update_urls(workspace)?,
            "0" => {
                save_config(&app_config)?;
                break;
            }
            _ => println!("Wrong"),
        }
    }
    Ok(())
}

fn delete_workspace(index: usize) -> Result<(), Box<dyn std::error::Error>> {
    let mut app_config = show_workspaces()?;

    let removed = app_config.workspaces.remove(index);
    save_config(&app_config)?;

    Ok(())
}
