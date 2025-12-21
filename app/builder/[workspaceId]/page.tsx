"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { 
  PanelLeft, 
  Layout, 
  MonitorPlay, 
  Code2, 
  Download,
  GitBranch,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck
} from 'lucide-react';

import { useWebSocket } from '@/hooks/useWebSocket';
import { FileExplorer } from '@/components/builder/FileExplorer';
import { Editor } from '@/components/builder/Editor';
import { CodePreview } from '@/components/builder/CodePreview';
import { ChatInterface } from '@/components/builder/ChatInterface';
import { ImportModal } from '@/components/builder/ImportModal';
import { GitHubModal } from '@/components/builder/GitHubModal';
import { useWebContainer } from '@/hooks/useWebContainer';
import { cn } from '@/lib/utils';
import { ViewMode, FileNode } from '@/types';

export default function BuilderPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  // Default to a test workspace if none provided in URL (though routing should catch this)
  const currentWorkspaceId = workspaceId || 'default';

  const {
    fileTree,
    status,
    currentFileContent,
    lastReceivedFile,
    openFile,
    updateFile,
    activeFile,
    refreshFileTree,
    createFile,
    createDirectory,
    deleteFile,
    renameFile,
    recloneProject,
    cloneRepo,
    pushChanges
  } = useWebSocket(currentWorkspaceId);

  // Local state for the UI
  const [localFileContent, setLocalFileContent] = useState('');
  const [prevCurrentFileContent, setPrevCurrentFileContent] = useState<string | undefined>(undefined);

  const [filesMap, setFilesMap] = useState<Record<string, string>>({});
  const [prevLastReceivedFile, setPrevLastReceivedFile] = useState<{path: string, content: string} | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.SPLIT);
  const [showChat, setShowChat] = useState(true);
  const [showExplorer, setShowExplorer] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [commitMessage, setCommitMessage] = useState("Update from Builder IDE");
  const [copied, setCopied] = useState(false);
  const [isProduction, setIsProduction] = useState(false);
  const [usePublicUrl, setUsePublicUrl] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'webcontainer:connected') {
        console.log("✅ WebContainer connection verified, refreshing preview...");
        setPreviewKey(prev => prev + 1);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getEffectiveUrl = (url: string) => {
    if (!url) return '';
    if (usePublicUrl) {
      return url.replace('.local-corp.', '.');
    }
    return url;
  };

  const handleConnect = () => {
    const token = Math.random().toString(36).substring(2, 10);
    window.open(`/webcontainer/connect/${token}`, '_blank', 'width=500,height=600');
  };

  // WebContainer state
  const webContainerState = useWebContainer({ files: filesMap });

  // Sync content from WebSocket to local editor state (Derived State Pattern)
  if (currentFileContent !== prevCurrentFileContent) {
      if (currentFileContent !== undefined) {
          setLocalFileContent(currentFileContent);
      }
      setPrevCurrentFileContent(currentFileContent);
  }

  // Sync files map (Derived State Pattern)
  if (lastReceivedFile !== prevLastReceivedFile) {
      if (lastReceivedFile) {
         setFilesMap(prev => ({
            ...prev,
            [lastReceivedFile.path]: lastReceivedFile.content
         }));
      }
      setPrevLastReceivedFile(lastReceivedFile);
  }

  // Populate filesMap from fileTree if it contains content
  const prevFileTreeLength = useRef(0);
  useEffect(() => {
      if (fileTree.length > 0 && fileTree.length !== prevFileTreeLength.current) {
          const newFiles: Record<string, string> = {};
          
          const traverse = (nodes: FileNode[]) => {
              nodes.forEach(node => {
                  if (node.type === 'file' && 'content' in node && node.content) {
                      newFiles[node.path] = node.content as string;
                  }
                  if (node.children) traverse(node.children);
              });
          };
          
          traverse(fileTree);
          
          setFilesMap(prev => {
              const updated = { ...prev, ...newFiles };
              if (JSON.stringify(prev) === JSON.stringify(updated)) return prev;
              return updated;
          });
          prevFileTreeLength.current = fileTree.length;
      }
  }, [fileTree]);

  // Helper to recursively extract all file paths from the tree structure
  const getAllFilePaths = (nodes: FileNode[]): string[] => {
    const paths: string[] = [];
    const traverse = (items: FileNode[]) => {
      items.forEach(node => {
        if (node.type === 'file') {
          paths.push(node.path);
        }
        if (node.children) traverse(node.children);
      });
    };
    traverse(nodes);
    return paths;
  };

  // Helper to find entry files
  const findEntryFiles = (nodes: FileNode[]): Record<string, string> => {
    const found: Record<string, string> = {
      main: '',
      app: '',
      css: ''
    };

    const traverse = (items: FileNode[]) => {
      items.forEach(node => {
        if (node.type === 'file') {
          if (node.path.endsWith('main.tsx') || node.path.endsWith('index.tsx')) {
            if (!found.main) found.main = node.path;
          }
          if (node.path.endsWith('App.tsx')) {
            if (!found.app) found.app = node.path;
          }
           if (node.path.endsWith('index.css')) {
             if (!found.css) found.css = node.path;
          }
        }
        if (node.children) traverse(node.children);
      });
    };
    traverse(nodes);
    return found;
  };

  // Pre-fetch essential files when connected
  const hasPreFetched = useRef(false);
  
  useEffect(() => {
    if (status === 'Connected' && !hasPreFetched.current && fileTree.length > 0) {
      
      const allPaths = getAllFilePaths(fileTree);
      
      // Filter to only source files needed for preview
      const sourceFiles = allPaths.filter(path => 
        path.match(/\.(tsx?|jsx?|css)$/i)
      );
      
      // Request all files with delay to avoid overwhelming WebSocket
      sourceFiles.forEach((path, index) => {
        setTimeout(() => {
          openFile(path);
        }, index * 100); // 100ms delay between requests
      });

      hasPreFetched.current = true;
    }
  }, [status, openFile, fileTree]);


  useEffect(() => {
    if (status === 'Connected' && !hasPreFetched.current && fileTree.length > 0) {
      const entryFiles = findEntryFiles(fileTree);
      
      // Fetch critical configuration files
      const configFiles = ['package.json', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'index.html', 'postcss.config.js', 'tailwind.config.js'];
      
      configFiles.forEach(file => {
          const exists = getAllFilePaths(fileTree).some(p => p.endsWith(file));
          if (exists) openFile(file);
      });

      if (entryFiles.main) openFile(entryFiles.main);
      if (entryFiles.app) openFile(entryFiles.app);
      if (entryFiles.css) openFile(entryFiles.css);

      hasPreFetched.current = true;
    }
  }, [status, openFile, fileTree]);

  // Handler for editor changes
  const handleEditorChange = (newCode: string) => {
    setLocalFileContent(newCode);
    if (activeFile) {
        // Update local map for immediate preview feedback
        setFilesMap(prev => ({
            ...prev,
            [activeFile]: newCode
        }));
        
        // Send updates to server
        updateFile(activeFile, newCode);
    }
  };


  const handleImport = (name: string, content: string) => {
    // Optimistic update
    setFilesMap(prev => ({ ...prev, [name]: content }));
    // Send to server
    updateFile(name, content);
  };

  return (
    <div className="flex h-screen w-full bg-[#0d1117] text-gray-300 overflow-hidden font-sans">
       {/* Left Sidebar - Chat */}
      {showChat && (
        <div className="w-80 border-r border-gray-800 flex-shrink-0 bg-gray-900 flex flex-col h-full">
          <ChatInterface 
             workspaceId={currentWorkspaceId}
             onTaskCompleted={(files) => {
                files.forEach(path => {
                   openFile(path);
                });
                refreshFileTree();
             }}
          />
        </div>
      )}

      {/* Internal Sidebar - File Explorer */}
      {showExplorer && (
        <FileExplorer 
          fileTree={fileTree} 
          activeFile={activeFile || ''}
          onSelectFile={(path) => {
            openFile(path);
          }}
          onCreateFile={createFile}
          onCreateDirectory={createDirectory}
          onDeleteFile={deleteFile}
          onRename={renameFile}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-12 border-b border-gray-800 bg-[#0d1117] flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowChat(!showChat)}
              className={`p-1.5 rounded-md hover:bg-gray-800 ${showChat ? 'text-blue-400' : 'text-gray-400'}`}
              title="Toggle AI Chat"
            >
              <PanelLeft size={18} />
            </button>
             <button 
              onClick={() => setShowExplorer(!showExplorer)}
              className={`p-1.5 rounded-md hover:bg-gray-800 ${showExplorer ? 'text-blue-400' : 'text-gray-400'}`}
              title="Toggle File Explorer"
            >
              <Layout size={18} className="rotate-90" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-md border border-gray-700/50">
              <span className={`w-2 h-2 rounded-full ${status === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs font-medium text-gray-300">{status}</span>
            </div>
            {activeFile && (
                <span className="text-sm text-gray-400 font-mono hidden md:block">{activeFile}</span>
            )}
          </div>

          <div className="flex items-center gap-2 bg-gray-800/50 p-1 rounded-lg border border-gray-700/50">
            <button 
              onClick={() => setViewMode(ViewMode.CODE)}
              className={`p-1.5 rounded-md transition-all ${viewMode === ViewMode.CODE ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              title="Code Only"
            >
              <Code2 size={16} />
            </button>
            <button 
              onClick={() => setViewMode(ViewMode.SPLIT)}
              className={`p-1.5 rounded-md transition-all ${viewMode === ViewMode.SPLIT ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              title="Split View"
            >
              <Layout size={16} />
            </button>
            <button 
              onClick={() => setViewMode(ViewMode.PREVIEW)}
              className={`p-1.5 rounded-md transition-all ${viewMode === ViewMode.PREVIEW ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              title="Preview Only"
            >
              <MonitorPlay size={16} />
            </button>
          </div>

          {webContainerState.serverUrl && (
            <div className="hidden lg:flex items-center gap-2 bg-gray-900/50 px-3 py-1.5 rounded-md border border-gray-800 max-w-[700px]">
              <div className="flex items-center gap-3 pr-3 border-r border-gray-800 shrink-0">
                <button 
                  onClick={handleConnect}
                  className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-500/30 transition-all active:scale-95"
                >
                  <ShieldCheck size={12} />
                  Connect
                </button>

                <div className="flex items-center gap-1 bg-gray-800 rounded p-0.5">
                   <button 
                     onClick={() => setIsProduction(false)}
                     className={cn(
                       "text-[10px] px-2 py-0.5 rounded transition-all font-bold uppercase tracking-wider",
                       !isProduction ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                     )}
                   >
                     Dev
                   </button>
                   <button 
                     onClick={() => setIsProduction(true)}
                     className={cn(
                       "text-[10px] px-2 py-0.5 rounded transition-all font-bold uppercase tracking-wider",
                       isProduction ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                     )}
                   >
                     Prod
                   </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Public</span>
                  <button 
                    onClick={() => setUsePublicUrl(!usePublicUrl)}
                    className={cn(
                      "w-7 h-4 rounded-full transition-colors relative",
                      usePublicUrl ? "bg-blue-600" : "bg-gray-700"
                    )}
                  >
                    <div className={cn(
                      "w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all text-black",
                      usePublicUrl ? "right-0.5" : "left-0.5"
                    )} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                   <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isProduction ? "bg-green-500" : "bg-blue-500")} />
                   <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{isProduction ? 'Live' : 'Preview'}</span>
                </div>
                <span className="text-xs text-blue-400 font-mono truncate">{getEffectiveUrl(webContainerState.serverUrl)}</span>
              </div>
              
              <div className="flex items-center gap-1 shrink-0 border-l border-gray-800 pl-2 ml-1">
                <button 
                  onClick={() => handleCopyUrl(getEffectiveUrl(webContainerState.serverUrl))}
                  className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                  title="Copy preview URL"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
                <a 
                  href={getEffectiveUrl(webContainerState.serverUrl)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsGithubModalOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-md transition-colors border border-gray-700"
             >
                <GitBranch size={14} />
                GitHub
             </button>
             <button 
                onClick={() => setIsImportModalOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors shadow-sm shadow-blue-900/20"
             >
                <Download size={14} />
                Import
             </button>
          </div>
        </header>

        {/* Editor / Preview Area */}
        <div className="flex-1 flex overflow-hidden">
           {/* Code Editor */}
           {(viewMode === ViewMode.CODE || viewMode === ViewMode.SPLIT) && (
             <div className={`${viewMode === ViewMode.SPLIT ? 'w-1/2' : 'w-full'} border-r border-gray-800 bg-[#0d1117] flex flex-col`}>
                {activeFile ? (
                   <Editor code={localFileContent} onChange={handleEditorChange} filename={activeFile || undefined} />
                ) : (
                   <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2">
                      <Code2 size={48} className="opacity-20" />
                      <p>Select a file to edit</p>
                   </div>
                )}
             </div>
           )}

            {/* Preview */}
            <div className={cn(
               "bg-white flex flex-col relative",
               viewMode === ViewMode.CODE && "hidden",
               viewMode === ViewMode.SPLIT ? "w-1/2" : "w-full"
            )}>
                <CodePreview 
                  key={previewKey}
                  files={filesMap} 
                  activeFile={activeFile || ''} 
                  webContainerState={webContainerState}
                  isProduction={isProduction}
                />
            </div>
        </div>
      </div>

      {/* Modals */}
      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleImport} 
      />
      <GitHubModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
        repoUrl={repoUrl}
        setRepoUrl={setRepoUrl}
        commitMessage={commitMessage}
        setCommitMessage={setCommitMessage}
        onClone={() => {
            setIsCloning(true);
            cloneRepo(repoUrl);
            setTimeout(() => {
                setIsCloning(false);
                setIsGithubModalOpen(false);
            }, 2000);
        }}
        onReclone={() => {
            setIsCloning(true);
            recloneProject();
            setTimeout(() => {
                setIsCloning(false);
                setIsGithubModalOpen(false);
            }, 2000);
        }}
        onPush={(message) => {
            setIsPushing(true);
            pushChanges(message);
             setTimeout(() => {
                setIsPushing(false);
                setIsGithubModalOpen(false);
            }, 2000);
        }}
        isCloning={isCloning}
        isPushing={isPushing}
      />
    </div>
  );
}

// Helper to extract paths if necessary, assuming FileNode structure
function extractPaths(nodes: FileNode[]): string[] {
    const paths: string[] = [];
    
    if (!nodes || !Array.isArray(nodes)) {
        console.warn('⚠️ extractPaths received invalid nodes:', nodes);
        return paths;
    }
    
    const traverse = (items: FileNode[]) => {
        items.forEach(node => {
            // Only add files (not directories) to the paths array
            if (node.type === 'file' && node.path) {
                paths.push(node.path);
            }
            
            // Recursively traverse children
            if (node.children && Array.isArray(node.children)) {
                traverse(node.children);
            }
        });
    };
    
    traverse(nodes);
    return paths;
}
