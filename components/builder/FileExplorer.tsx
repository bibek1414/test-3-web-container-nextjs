"use client";

import React, { useState, useMemo } from 'react';
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


interface FileExplorerProps {
  files: string[];
  activeFile: string;
  onSelectFile: (fileName: string) => void;
  onCreateFile: (fileName: string) => void;
  onDeleteFile: (fileName: string) => void;
}

// Helper to build tree structure
interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: Record<string, TreeNode>;
}

const buildFileTree = (filePaths: string[]): TreeNode => {
  const root: TreeNode = { name: 'root', path: '', type: 'folder', children: {} };

  filePaths.forEach(path => {
    const parts = path.split('/');
    let current = root;

    parts.forEach((part, index) => {
      if (!current.children) current.children = {};
      
      const isFile = index === parts.length - 1;
      const currentPath = parts.slice(0, index + 1).join('/');

      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : {}
        };
      }
      current = current.children[part];
    });
  });

  return root;
};

// Recursive Tree Item Component
const FileTreeItem: React.FC<{
  node: TreeNode;
  level: number;
  activeFile: string;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
}> = ({ node, level, activeFile, onSelect, onDelete }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  const isSelected = node.path === activeFile;
  const isProtected = ['src/main.tsx', 'src/App.tsx', 'src/index.css'].includes(node.path);

  const getFileIcon = (name: string) => {
    if (name.endsWith('.tsx') || name.endsWith('.ts')) return <FileCode size={14} className="text-blue-400" />;
    if (name.endsWith('.css')) return <FileType size={14} className="text-sky-300" />;
    if (name.endsWith('.json')) return <FileJson size={14} className="text-yellow-400" />;
    if (name.endsWith('.html')) return <FileCode size={14} className="text-orange-400" />;
    return <File size={14} className="text-gray-400" />;
  };

  if (node.type === 'folder') {
    return (
      <div className="select-none">
        <div 
          className="flex items-center gap-1.5 px-2 py-1 text-gray-400 hover:text-gray-100 hover:bg-gray-800/50 cursor-pointer transition-colors rounded-sm"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {isOpen ? <FolderOpen size={14} className="text-blue-300/80" /> : <Folder size={14} className="text-blue-300/80" />}
          <span className="text-xs font-medium truncate">{node.name}</span>
        </div>
        {isOpen && node.children && (
          <div>
            {(Object.values(node.children) as TreeNode[])
              .sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
              })
              .map(child => (
                <FileTreeItem 
                  key={child.path} 
                  node={child} 
                  level={level + 1} 
                  activeFile={activeFile}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`
        group flex items-center justify-between py-1 pr-2 rounded-sm cursor-pointer text-xs transition-colors font-mono
        ${isSelected 
          ? 'bg-blue-600/20 text-blue-300' 
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
        }
      `}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
      onClick={() => onSelect(node.path)}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        {getFileIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </div>
      
      {!isProtected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if(confirm(`Delete ${node.name}?`)) onDelete(node.path);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  activeFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFileName.trim()) {
      let name = newFileName.trim();
      // Auto-prefix with src/ if no path given and it looks like a component
      if (!name.includes('/') && /^[A-Z]/.test(name)) name = 'src/components/' + name;
      else if (!name.includes('/')) name = 'src/' + name;
      
      // Auto-extension
      if (!name.includes('.')) name += '.tsx';
      
      onCreateFile(name);
      setNewFileName('');
      setIsCreating(false);
    }
  };

  const fileTree = useMemo(() => buildFileTree(files), [files]);

  return (
    <div className="flex flex-col h-full bg-gray-950 border-r border-gray-800 w-64 flex-shrink-0 select-none">
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase pl-2">Explorer</span>
        <button 
          onClick={() => setIsCreating(true)}
          className="p-1.5 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors"
          title="New File"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {isCreating && (
          <form onSubmit={handleCreateSubmit} className="mb-2 px-3">
            <input
              autoFocus
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={() => setIsCreating(false)}
              placeholder="FileName.tsx"
              className="w-full bg-gray-900 text-white text-xs px-2 py-1.5 rounded border border-blue-500/50 focus:outline-none focus:border-blue-500 font-mono placeholder-gray-600"
            />
          </form>
        )}

        <div className="space-y-0.5">
          {(Object.values(fileTree.children || {}) as TreeNode[])
             // Sort: Folders first, then files, alphabetically
            .sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
            })
            .map(node => (
            <FileTreeItem
              key={node.path}
              node={node}
              level={0}
              activeFile={activeFile}
              onSelect={onSelectFile}
              onDelete={onDeleteFile}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
