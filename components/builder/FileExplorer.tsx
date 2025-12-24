"use client";

import React, { useState } from 'react';
import {
  FileCode, Plus, Trash2, FolderOpen, Folder, ChevronRight,
  ChevronDown, FileJson, FileType, File, Loader2, RefreshCw, Image as ImageIcon
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'folder';
  children?: FileNode[];
  content?: string;
}

interface FileExplorerProps {
  fileTree: FileNode[];
  activeFile: string;
  onSelectFile: (fileName: string) => void;
  onCreateFile: (fileName: string, content?: string) => void;
  onCreateDirectory: (dirName: string) => void;
  onDeleteFile: (fileName: string) => void;
  onRename: (oldPath: string, newPath: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

// Recursive Tree Item Component
const FileTreeItem: React.FC<{
  node: FileNode;
  level: number;
  activeFile: string;
  onSelect: (path: string) => void;
  onCreateFile: (path: string, content?: string) => void;
  onCreateDir: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (oldPath: string, newPath: string) => void;
  onRefresh: () => void;
  defaultExpanded?: boolean;
  onDragStart: (e: React.DragEvent, path: string) => void;
  onDrop: (e: React.DragEvent, path: string) => void;
}> = ({
  node,
  level,
  activeFile,
  onSelect,
  onCreateFile,
  onCreateDir,
  onDelete,
  onRename,
  onRefresh,
  defaultExpanded = false,
  onDragStart,
  onDrop
}) => {
    // Only auto-expand root level and src folder by default
    const shouldAutoExpand = level === 0 || node.name === 'src';
    const [isOpen, setIsOpen] = useState(shouldAutoExpand || defaultExpanded);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(node.name);
    const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
    const [createName, setCreateName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const isSelected = node.path === activeFile;
    const isProtected = ['src/main.tsx', 'src/App.tsx', 'src/index.css', 'package.json'].includes(node.path);
    const isFolder = node.type === 'directory' || node.type === 'folder';

    const getFileIcon = (name: string) => {
      const lowerName = name.toLowerCase();
      if (lowerName.endsWith('.tsx') || lowerName.endsWith('.ts')) return <FileCode size={14} className="text-blue-400" />;
      if (lowerName.endsWith('.css')) return <FileType size={14} className="text-sky-300" />;
      if (lowerName.endsWith('.json')) return <FileJson size={14} className="text-yellow-400" />;
      if (lowerName.endsWith('.html')) return <FileCode size={14} className="text-orange-400" />;
      if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(lowerName)) return <ImageIcon size={14} className="text-emerald-400" />;
      return <File size={14} className="text-gray-400" />;
    };

    const handleFolderToggle = async () => {
      if (!isFolder) return;

      const newOpenState = !isOpen;
      setIsOpen(newOpenState);

      // Simulate loading when opening folder for first time
      if (newOpenState && node.children && node.children.length > 5) {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 200));
        setIsLoading(false);
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isFolder) {
        e.dataTransfer.dropEffect = 'move';
      }
    };

    const handleDropInternal = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDrop(e, node.path);
    };

    const handleRenameSubmit = () => {
      if (newName && newName !== node.name) {
        const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
        const newPath = parentPath ? `${parentPath}/${newName}` : newName;
        onRename(node.path, newPath);
      }
      setIsRenaming(false);
    };

    const handleCreateSubmit = () => {
      if (createName) {
        const newPath = node.path ? `${node.path}/${createName}` : createName;
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
          className={`group flex items-center justify-between py-1.5 pr-2 rounded-sm cursor-pointer text-xs transition-all font-mono
          ${isSelected ? 'bg-blue-600/20 text-blue-300 shadow-sm' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}
        `}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => isFolder ? handleFolderToggle() : onSelect(node.path)}
          draggable={!isProtected}
          onDragStart={(e) => onDragStart(e, node.path)}
          onDragOver={handleDragOver}
          onDrop={handleDropInternal}
        >
          <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
            {isFolder && (
              <span className="text-gray-500 shrink-0">
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : isOpen ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </span>
            )}
            {!isFolder && <span className="w-3.5 shrink-0" />}

            {isFolder ? (
              isOpen ? (
                <FolderOpen size={14} className="text-blue-400/80 shrink-0" />
              ) : (
                <Folder size={14} className="text-blue-400/80 shrink-0" />
              )
            ) : (
              <span className="shrink-0">{getFileIcon(node.name)}</span>
            )}

            {isRenaming ? (
              <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onBlur={() => setIsRenaming(false)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRenameSubmit();
                    if (e.key === 'Escape') setIsRenaming(false);
                  }}
                  className="w-full bg-gray-900 border border-blue-500 px-1 py-0.5 rounded outline-none text-xs"
                />
              </div>
            ) : (
              <span className="truncate">{node.name}</span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {isFolder && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsCreating('file'); setIsOpen(true); }}
                  className="p-1 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="New File"
                >
                  <Plus size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsCreating('folder'); setIsOpen(true); }}
                  className="p-1 hover:text-white hover:bg-gray-700 rounded transition-colors"
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
                  className="p-1 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="Rename"
                >
                  <FileType size={12} className="scale-75" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete ${node.name}?`)) onDelete(node.path);
                  }}
                  className="p-1 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
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
            <input
              autoFocus
              placeholder={isCreating === 'file' ? 'filename.tsx' : 'foldername'}
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              onBlur={() => setIsCreating(null)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateSubmit();
                if (e.key === 'Escape') setIsCreating(null);
              }}
              className="w-full bg-gray-900 border border-blue-500 px-2 py-1 rounded outline-none text-xs text-white placeholder:text-gray-600"
            />
          </div>
        )}

        {isOpen && node.children && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-150">
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
                  onRefresh={onRefresh}
                  defaultExpanded={false}
                  onDragStart={onDragStart}
                  onDrop={onDrop}
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
  onRename,
  onRefresh,
  isLoading
}) => {
  const [isCreatingRoot, setIsCreatingRoot] = useState<'file' | 'folder' | null>(null);
  const [rootCreateName, setRootCreateName] = useState('');
  const [dragItem, setDragItem] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, path: string) => {
    setDragItem(path);
    e.dataTransfer.setData('text/plain', path);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();

    // Check for external files first
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      files.forEach(file => {
        const reader = new FileReader();
        const isImage = file.type.startsWith('image/');

        reader.onload = (event) => {
          const content = event.target?.result as string;
          const fileName = file.name;
          const newPath = targetPath ? `${targetPath}/${fileName}` : fileName;

          if (isImage) {
            onCreateFile(newPath, content);
          } else {
            onCreateFile(newPath);
          }
        };

        if (isImage) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      });
      return;
    }

    const sourcePath = e.dataTransfer.getData('text/plain') || dragItem;

    if (sourcePath && sourcePath !== targetPath) {
      // Prevent dropping a folder into its own subfolder
      if (targetPath.startsWith(sourcePath + '/')) return;

      const fileName = sourcePath.split('/').pop();
      const newPath = `${targetPath}/${fileName}`;

      if (sourcePath !== newPath) {
        onRename(sourcePath, newPath);
      }
    }
    setDragItem(null);
  };

  // Handle Image Pasting
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const base64Content = event.target?.result as string;
            const timestamp = new Date().getTime();
            // Default to public folder for pasted images
            const fileName = `public/pasted_image_${timestamp}.png`;

            onCreateFile(fileName, base64Content);
          };
          reader.readAsDataURL(blob);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeFile, onCreateFile]);

  const handleRootCreateSubmit = () => {
    if (rootCreateName) {
      if (isCreatingRoot === 'file') onCreateFile(rootCreateName);
      else onCreateDirectory(rootCreateName);
    }
    setIsCreatingRoot(null);
    setRootCreateName('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 border-r border-gray-800 w-64 shrink-0 select-none">
      <div className="p-3 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
        <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase pl-2">Files</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCreatingRoot('file')}
            className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
            title="New File"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => setIsCreatingRoot('folder')}
            className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
            title="New Folder"
          >
            <Folder size={14} className="scale-90" />
          </button>
          <button
            onClick={onRefresh}
            className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
            title="Refresh Explorer"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {isCreatingRoot && (
          <div className="px-3 mb-2">
            <input
              autoFocus
              value={rootCreateName}
              onChange={e => setRootCreateName(e.target.value)}
              onBlur={() => setIsCreatingRoot(null)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRootCreateSubmit();
                if (e.key === 'Escape') setIsCreatingRoot(null);
              }}
              placeholder={isCreatingRoot === 'file' ? 'filename.tsx' : 'foldername'}
              className="w-full bg-gray-900 border border-blue-500 px-2 py-1 rounded text-xs outline-none text-white placeholder:text-gray-600"
            />
          </div>
        )}

        {isLoading && fileTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-4 px-4 text-center">
            <div className="relative">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <div className="absolute inset-0 blur-lg bg-blue-500/20 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-200">Scanning components...</p>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Analyzing project structure and building workspace tree
              </p>
            </div>
          </div>
        ) : (
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
                  onRefresh={onRefresh}
                  defaultExpanded={false}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                />
              ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0d1117;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #30363d;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #484f58;
        }
        @keyframes slide-in-from-top-1 {
          from {
            transform: translateY(-4px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-in {
          animation: slide-in-from-top-1 0.15s ease-out;
        }
      `}</style>
    </div>
  );
};