"use client";

import React, { useState } from 'react';
import { 
  FileCode, 
  Plus, 
  Trash2, 
  FolderOpen, 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  FileJson, 
  FileType, 
  File
} from 'lucide-react';


import { FileNode } from '@/types';

interface FileExplorerProps {
  fileTree: FileNode[];
  activeFile: string;
  onSelectFile: (fileName: string) => void;
  onCreateFile: (fileName: string) => void;
  onCreateDirectory: (dirName: string) => void;
  onDeleteFile: (fileName: string) => void;
  onRename: (oldPath: string, newPath: string) => void;
}


// Recursive Tree Item Component
const FileTreeItem: React.FC<{
  node: FileNode;
  level: number;
  activeFile: string;
  onSelect: (path: string) => void;
  onCreateFile: (path: string) => void;
  onCreateDir: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (oldPath: string, newPath: string) => void;
}> = ({ node, level, activeFile, onSelect, onCreateFile, onCreateDir, onDelete, onRename }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
  const [createName, setCreateName] = useState('');
  
  const isSelected = node.path === activeFile;
  const isProtected = ['src/main.tsx', 'src/App.tsx', 'src/index.css', 'package.json'].includes(node.path);
  const isFolder = node.type === 'directory' || node.type === 'folder';

  const getFileIcon = (name: string) => {
    if (name.endsWith('.tsx') || name.endsWith('.ts')) return <FileCode size={14} className="text-blue-400" />;
    if (name.endsWith('.css')) return <FileType size={14} className="text-sky-300" />;
    if (name.endsWith('.json')) return <FileJson size={14} className="text-yellow-400" />;
    if (name.endsWith('.html')) return <FileCode size={14} className="text-orange-400" />;
    return <File size={14} className="text-gray-400" />;
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newName !== node.name) {
      const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;
      onRename(node.path, newPath);
    }
    setIsRenaming(false);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (createName) {
      const newPath = `${node.path}/${createName}`;
      if (isCreating === 'file') onCreateFile(newPath);
      else onCreateDir(newPath);
    }
    setIsCreating(null);
    setCreateName('');
    setIsOpen(true);
  };

  return (
    <div className="select-none">
      <div 
        className={`group flex items-center justify-between py-1 pr-2 rounded-sm cursor-pointer text-xs transition-colors font-mono
          ${isSelected ? 'bg-blue-600/20 text-blue-300' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => isFolder ? setIsOpen(!isOpen) : onSelect(node.path)}
      >
        <div className="flex items-center gap-1.5 overflow-hidden flex-1">
          {isFolder && (
            <span className="text-gray-500">
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          {!isFolder && <span className="w-3.5" />}
          
          {isFolder ? (
            isOpen ? <FolderOpen size={14} className="text-blue-400/80" /> : <Folder size={14} className="text-blue-400/80" />
          ) : (
            getFileIcon(node.name)
          )}
          
          {isRenaming ? (
            <form onSubmit={handleRename} className="flex-1" onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onBlur={() => setIsRenaming(false)}
                className="w-full bg-gray-900 border border-blue-500 px-1 py-0.5 rounded outline-none"
              />
            </form>
          ) : (
            <span className="truncate">{node.name}</span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isFolder && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setIsCreating('file'); }}
                className="p-1 hover:text-white"
                title="New File"
              >
                <Plus size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsCreating('folder'); }}
                className="p-1 hover:text-white"
                title="New Folder"
              >
                <Folder size={12} className="scale-75" />
              </button>
            </>
          )}
          {!isProtected && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setNewName(node.name); }}
                className="p-1 hover:text-white"
                title="Rename"
              >
                <FileType size={12} className="scale-75" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete ${node.name}?`)) onDelete(node.path);
                }}
                className="p-1 hover:text-red-400"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      {isCreating && (
        <div style={{ paddingLeft: `${(level + 1) * 12 + 24}px` }} className="py-1">
          <form onSubmit={handleCreate}>
            <input
              autoFocus
              placeholder={isCreating === 'file' ? 'filename' : 'foldername'}
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              onBlur={() => setIsCreating(null)}
              className="w-full bg-gray-900 border border-blue-500 px-1 py-0.5 rounded outline-none text-xs"
            />
          </form>
        </div>
      )}

      {isOpen && node.children && (
        <div>
          {node.children
            .sort((a, b) => {
              const aIsFolder = a.type === 'directory' || a.type === 'folder';
              const bIsFolder = b.type === 'directory' || b.type === 'folder';
              if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map(child => (
              <FileTreeItem 
                key={child.path} 
                node={child} 
                level={level + 1} 
                activeFile={activeFile}
                onSelect={onSelect}
                onCreateFile={onCreateFile}
                onCreateDir={onCreateDir}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({
  fileTree,
  activeFile,
  onSelectFile,
  onCreateFile,
  onCreateDirectory,
  onDeleteFile,
  onRename
}) => {
  const [isCreatingRoot, setIsCreatingRoot] = useState<'file' | 'folder' | null>(null);
  const [rootCreateName, setRootCreateName] = useState('');

  const handleRootCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (rootCreateName) {
      if (isCreatingRoot === 'file') onCreateFile(rootCreateName);
      else onCreateDirectory(rootCreateName);
    }
    setIsCreatingRoot(null);
    setRootCreateName('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 border-r border-gray-800 w-64 flex-shrink-0 select-none">
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase pl-2">Explorer</span>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsCreatingRoot('file')}
            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
            title="New File"
          >
            <Plus size={14} />
          </button>
          <button 
            onClick={() => setIsCreatingRoot('folder')}
            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
            title="New Folder"
          >
            <Folder size={14} className="scale-90" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {isCreatingRoot && (
          <div className="px-3 mb-2">
            <form onSubmit={handleRootCreate}>
              <input
                autoFocus
                value={rootCreateName}
                onChange={e => setRootCreateName(e.target.value)}
                onBlur={() => setIsCreatingRoot(null)}
                placeholder={isCreatingRoot === 'file' ? 'filename' : 'foldername'}
                className="w-full bg-gray-900 border border-blue-500 px-2 py-1 rounded text-xs outline-none"
              />
            </form>
          </div>
        )}

        <div className="space-y-0.5">
          {fileTree
            .sort((a, b) => {
              const aIsFolder = a.type === 'directory' || a.type === 'folder';
              const bIsFolder = b.type === 'directory' || b.type === 'folder';
              if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map(node => (
              <FileTreeItem
                key={node.path}
                node={node}
                level={0}
                activeFile={activeFile}
                onSelect={onSelectFile}
                onCreateFile={onCreateFile}
                onCreateDir={onCreateDirectory}
                onDelete={onDeleteFile}
                onRename={onRename}
              />
            ))}
        </div>
      </div>
    </div>
  );
};
