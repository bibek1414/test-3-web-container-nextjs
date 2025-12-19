export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory" | "folder";
  children?: FileNode[];
}

export interface Message {
  role: 'user' | 'model' | 'ai';
  text?: string;
  content?: string; // For backward compatibility / user request match
  timestamp?: number;
  files_modified?: string[];
}

export type FileMap = Record<string, string>;

export interface ProjectState {
  files: FileMap;
  activeFile: string;
}

export enum ViewMode {
  PREVIEW = 'PREVIEW',
  CODE = 'CODE',
  SPLIT = 'SPLIT'
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}
