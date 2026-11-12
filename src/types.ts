export interface WebGroup {
  browser: string;
  urls: string[];
}

export interface Workspace {
  name: string;
  apps: string[];
  webs: WebGroup[];
}

export interface ConfigData {
  workspaces: Workspace[];
}
