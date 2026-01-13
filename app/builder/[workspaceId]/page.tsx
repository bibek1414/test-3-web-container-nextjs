"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Allotment } from 'allotment';
import {
  PanelLeft,
  Code2,
  Download,
  GitBranch,
  ExternalLink,
  Copy,
  Check,
  Database
} from 'lucide-react';

import { useWebSocket } from '@/hooks/useWebSocket';
import { CodePreview } from '@/components/builder/CodePreview';
import { ChatInterface } from '@/components/builder/ChatInterface';
import { ImportModal } from '@/components/builder/ImportModal';
import { GitHubModal } from '@/components/builder/GitHubModal';
import { useWebContainer } from '@/hooks/useWebContainer';
import { useUseRealData } from '@/hooks/use-templates';
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

    recloneProject,
    cloneRepo,
    pushChanges,
    lastDeletedPath,
    lastRenamedFile,

    aiStatus
  } = useWebSocket(currentWorkspaceId);

  // Local state for the UI
  const [localFileContent, setLocalFileContent] = useState('');
  const [prevCurrentFileContent, setPrevCurrentFileContent] = useState<string | undefined>(undefined);

  const [filesMap, setFilesMap] = useState<Record<string, string>>({});

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.PREVIEW);
  const [showChat, setShowChat] = useState(true);
  const [showExplorer, setShowExplorer] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [commitMessage, setCommitMessage] = useState("Update from Builder IDE");
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [terminalError, setTerminalError] = useState<string | null>(null);

  // Track previous values for effect-based synchronization
  const prevLastReceivedFileRef = useRef<{ path: string, content: string } | null>(null);
  const prevLastDeletedPathRef = useRef<{ path: string } | null>(null);
  const prevLastRenamedFileRef = useRef<{ oldPath: string, newPath: string } | null>(null);

  const { mutate: mutateRealData, isPending: isUsingRealData } = useUseRealData();

  const handleUseRealData = () => {
    mutateRealData(undefined, {
      onSuccess: () => {
        alert("Success: Use real data request sent!");
      },
      onError: (error) => {
        alert(`Error: ${error instanceof Error ? error.message : "Failed to use real data"}`);
      }
    });
  };

  const handleTerminalError = (error: string) => {
    console.log("Terminal Error Detected:", error);
    setTerminalError(error);
  };

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
    // Automatically use public URL if not on localhost
    const isLocal = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (!isLocal) {
      return url.replace('.local-corp.', '.');
    }
    return url;
  };

  // WebContainer state
  const webContainerState = useWebContainer({ files: filesMap });

  // Sync content from WebSocket to local editor state
  if (currentFileContent !== prevCurrentFileContent) {
    if (currentFileContent !== undefined) {
      setLocalFileContent(currentFileContent);
    }
    setPrevCurrentFileContent(currentFileContent);
  }


  // Effect-based synchronization for filesMap
  useEffect(() => {
    let hasChanges = false;
    const nextFilesMap = { ...filesMap };

    // Sync new/updated files
    if (lastReceivedFile !== prevLastReceivedFileRef.current) {
      if (lastReceivedFile) {
        nextFilesMap[lastReceivedFile.path] = lastReceivedFile.content;
        hasChanges = true;
      }
      prevLastReceivedFileRef.current = lastReceivedFile;
    }

    // Sync deletions
    if (lastDeletedPath !== prevLastDeletedPathRef.current) {
      if (lastDeletedPath) {
        delete nextFilesMap[lastDeletedPath.path];
        hasChanges = true;
      }
      prevLastDeletedPathRef.current = lastDeletedPath;
    }

    // Sync renames
    if (lastRenamedFile !== prevLastRenamedFileRef.current) {
      if (lastRenamedFile) {
        if (nextFilesMap[lastRenamedFile.oldPath]) {
          nextFilesMap[lastRenamedFile.newPath] = nextFilesMap[lastRenamedFile.oldPath];
          delete nextFilesMap[lastRenamedFile.oldPath];
          hasChanges = true;
        }
      }
      prevLastRenamedFileRef.current = lastRenamedFile;
    }

    if (hasChanges) {
      setFilesMap(nextFilesMap);
    }
  }, [lastReceivedFile, lastDeletedPath, lastRenamedFile, filesMap]);

  // Populate filesMap from fileTree if it contains content
  useEffect(() => {
    if (fileTree.length > 0) {
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
      const entryFiles = findEntryFiles(fileTree);
      const configFiles = ['package.json', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'index.html', 'postcss.config.js', 'tailwind.config.js'];

      // Create a unique set of files to pre-fetch silently
      const filesToFetch = new Set<string>();

      // Add config files
      configFiles.forEach(file => {
        const found = allPaths.find(p => p === file || p.endsWith('/' + file));
        if (found) filesToFetch.add(found);
      });

      // Add entry files
      if (entryFiles.main) filesToFetch.add(entryFiles.main);
      if (entryFiles.app) filesToFetch.add(entryFiles.app);
      if (entryFiles.css) filesToFetch.add(entryFiles.css);

      // Add all source files
      allPaths.filter(path => path.match(/\.(tsx?|jsx?|css)$/i))
        .forEach(path => filesToFetch.add(path));

      // Request all files with delay to avoid overwhelming WebSocket
      Array.from(filesToFetch).forEach((path, index) => {
        setTimeout(() => {
          openFile(path, true); // Use silent fetch to populate cache without auto-opening
        }, index * 50); // Staggered delay
      });

      hasPreFetched.current = true;
    }
  }, [status, openFile, fileTree]);

  const handleImport = (name: string, content: string) => {
    // Optimistic update
    setFilesMap(prev => ({ ...prev, [name]: content }));
    // Send to server
    updateFile(name, content);
  };

  return (
    <div className="h-screen w-full bg-[#0d1117] text-gray-300 font-sans">
      <Allotment>
        <Allotment.Pane
          visible={showChat}
          minSize={280}
          preferredSize={320}
          maxSize={400}
        >
          <div className="h-full border-r border-gray-800 bg-gray-900 flex flex-col">
            <ChatInterface
              workspaceId={currentWorkspaceId}
              onTaskCompleted={(files) => {
                files.forEach(path => {
                  openFile(path);
                });
                refreshFileTree();
              }}
              terminalError={terminalError || undefined}
              onClearError={() => setTerminalError(null)}
              aiStatus={aiStatus}
            />
          </div>
        </Allotment.Pane>

        <Allotment.Pane>
          <Allotment>


            <Allotment.Pane>
              {/* Main Content */}
              <div className="flex flex-col h-full bg-[#0d1117]">
                {/* Top Navigation Bar */}
                <header className="h-12 border-b border-gray-800 bg-[#0d1117] flex items-center justify-between px-4 z-10 shrink-0">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setShowChat(!showChat)}
                      className={`p-1.5 rounded-md hover:bg-gray-800 ${showChat ? 'text-blue-400' : 'text-gray-400'}`}
                      title="Toggle AI Chat"
                    >
                      <PanelLeft size={18} />
                    </button>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-md border border-gray-700/50">
                      <span className={`w-2 h-2 rounded-full ${status === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-xs font-medium text-gray-300">{status}</span>
                    </div>
                    {activeFile && (
                      <span className="text-sm text-gray-400 font-mono hidden md:block">{activeFile}</span>
                    )}
                  </div>



                  {webContainerState.serverUrl && (
                    <div className="hidden lg:flex items-center gap-1 bg-gray-900/50 p-1 rounded-md border border-gray-800">
                      <a
                        href={getEffectiveUrl(webContainerState.serverUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 rounded-md transition-all group"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-blue-500" />
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-white transition-colors">
                            Preview
                          </span>
                        </div>
                        <ExternalLink size={13} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
                      </a>

                      <div className="w-px h-4 bg-gray-800 mx-0.5" />

                      <button
                        onClick={() => handleCopyUrl(getEffectiveUrl(webContainerState.serverUrl))}
                        className="p-1.5 hover:bg-gray-800 rounded-md text-gray-500 hover:text-white transition-colors"
                        title="Copy preview URL"
                      >
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </button>
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
                      onClick={handleUseRealData}
                      disabled={isUsingRealData}
                      className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-md transition-colors shadow-sm shadow-purple-900/20 disabled:opacity-50"
                    >
                      <Database size={14} className={isUsingRealData ? "animate-spin" : ""} />
                      {isUsingRealData ? "Processing..." : "Real Data"}
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

                {/* Editor / Preview Area with Allotment */}
                <div className="flex-1 min-h-0 relative">
                  {viewMode === ViewMode.SPLIT ? (
                    <Allotment>

                      <Allotment.Pane>
                        <div className="h-full bg-white flex flex-col relative">
                          <CodePreview
                            key={previewKey}
                            files={filesMap}
                            activeFile={activeFile || ''}
                            webContainerState={webContainerState}
                            onTerminalError={handleTerminalError}
                          />
                        </div>
                      </Allotment.Pane>
                    </Allotment>
                  ) : (
                    // Single View
                    viewMode === ViewMode.CODE ? (
                      <div className="h-full flex flex-col bg-[#0d1117]">

                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2">
                          <Code2 size={48} className="opacity-20" />
                          <p>Select a file to edit</p>
                        </div>
                        {/* 
                        )}
                        */}
                      </div>
                    ) : (
                      <div className="h-full bg-white flex flex-col relative">
                        <CodePreview
                          key={previewKey}
                          files={filesMap}
                          activeFile={activeFile || ''}
                          webContainerState={webContainerState}
                          onTerminalError={handleTerminalError}
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            </Allotment.Pane>
          </Allotment>
        </Allotment.Pane>
      </Allotment>

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
          // Trigger dependency installation after a short delay to ensure clone started
          setTimeout(() => {
            setIsCloning(false);
            setIsGithubModalOpen(false);
          }, 3000);
        }}
        onReclone={() => {
          setIsCloning(true);
          recloneProject();
          setTimeout(() => {
            setIsCloning(false);
            setIsGithubModalOpen(false);
          }, 3000);
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

