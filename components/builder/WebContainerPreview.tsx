"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { transformFlatMapToWebContainer } from "../../utils/webcontainerUtils";
import { CheckCircle, Loader2, XCircle, Terminal as TerminalIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { WebContainer } from "@webcontainer/api";

import { cn } from "@/lib/utils";

// Lazy load Terminal to avoid SSR issues (xterm uses 'self')
import { type TerminalRef } from './Terminal';
const TerminalComponent = React.lazy(() => import('./Terminal'));

interface WebContainerPreviewProps {
  files: Record<string, string>;
  webContainerInstance: WebContainer | null;
  serverUrl: string;
  isProduction?: boolean;
  isSetupComplete: boolean;
  setIsSetupComplete: (complete: boolean) => void;
  onTerminalError?: (error: string) => void;
}

const WebContainerPreview: React.FC<WebContainerPreviewProps> = ({
  files,
  webContainerInstance,
  serverUrl,
  isProduction = false,
  isSetupComplete,
  setIsSetupComplete,
  onTerminalError,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = isProduction ? 5 : 4;
  const [setupError, setSetupError] = useState<string | null>(null);
  const [terminalVisibility, setTerminalVisibility] = useState<"visible" | "minimized" | "closed">("visible");

  // Ref to access terminal methods
  const terminalRef = useRef<TerminalRef | null>(null);

  // Ref to prevent double setup execution in Concurrent Mode/Strict Mode
  const setupStartedRef = useRef(false);

  // Initial setup effect
  useEffect(() => {
    async function setupContainer() {
      // Don't start if we're already complete or already started
      if (!webContainerInstance || isSetupComplete || setupStartedRef.current) return;

      // If server is already running, we can skip setup but we should still
      // set the flag so sync logic works.
      if (serverUrl) {
        console.log("🌍 Server already running, skipping setup sequence");
        setIsSetupComplete(true);
        return;
      }

      // Check if we have the necessary files to start (at least package.json)
      if (!files['package.json'] && !files['/package.json']) {
        console.log("⏳ Waiting for package.json before setup...");
        return;
      }

      setupStartedRef.current = true;
      try {
        setSetupError(null);

        // Check if files are already mounted by checking if package.json exists in FS
        let filesMounted = false;
        try {
          // Use absolute path for robustness
          await webContainerInstance.fs.readFile('/package.json');
          filesMounted = true;
          console.log("📄 /package.json found in FS, skipping mount");
        } catch {
          // package.json doesn't exist, need to mount
        }

        if (!filesMounted) {
          // Step 1: Mount files
          setCurrentStep(1);

          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal("📁 Mounting files to WebContainer...\r\n");
          }

          const webContainerFiles = transformFlatMapToWebContainer(files);
          await webContainerInstance.mount(webContainerFiles);

          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal("✅ Files mounted successfully\r\n");
          }
        } else {
          setCurrentStep(1);
          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal("📁 Files already mounted in this session, skipping...\r\n");
          }
        }

        setCurrentStep(2);

        // Check if node_modules exists to skip install
        let dependenciesInstalled = false;
        try {
          const entries = await webContainerInstance.fs.readdir('/', { withFileTypes: true });
          if (entries.some(entry => entry.name === 'node_modules' && entry.isDirectory())) {
            dependenciesInstalled = true;
            console.log("📦 node_modules found in FS, skipping install");
          }
        } catch (e) {
          console.error("Error checking node_modules:", e);
        }

        if (!dependenciesInstalled) {
          // Step 2: Install dependencies
          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal("📦 Installing dependencies with pnpm...\r\n");
          }

          // Use pnpm as requested
          const installProcess = await webContainerInstance.spawn("pnpm", [
            "install",
            "--prefer-offline",
          ]);

          // Stream install output to terminal
          installProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                if (terminalRef.current?.writeToTerminal) {
                  terminalRef.current.writeToTerminal(data);
                }
              },
            })
          );

          const installExitCode = await installProcess.exit;

          if (installExitCode !== 0) {
            throw new Error(`Failed to install dependencies. Exit code: ${installExitCode}`);
          }

          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal("✅ Dependencies installed successfully\r\n");
          }
        } else {
          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal("📦 Dependencies already exist in this session, skipping install...\r\n");
          }
        }

        if (isProduction) {
          setCurrentStep(3);

          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal("🏗️ Building for production...\r\n");
          }

          const buildProcess = await webContainerInstance.spawn("pnpm", ["run", "build"]);
          buildProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                if (terminalRef.current?.writeToTerminal) {
                  terminalRef.current.writeToTerminal(data);
                }
              },
            })
          );

          const buildExitCode = await buildProcess.exit;
          if (buildExitCode !== 0) {
            throw new Error(`Build failed with exit code: ${buildExitCode}`);
          }

          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal("✅ Build complete\r\n");
          }

          setCurrentStep(4);

          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal("🚀 Serving production build...\r\n");
          }

          const serveProcess = await webContainerInstance.spawn("pnpm", ["dlx", "serve", "dist"]);
          serveProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                if (terminalRef.current?.writeToTerminal) {
                  terminalRef.current.writeToTerminal(data);
                }
              },
            })
          );
        } else {
          setCurrentStep(3);

          // Step 3: Start the server
          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal("🚀 Starting development server...\r\n");
          }

          const startProcess = await webContainerInstance.spawn("pnpm", ["run", "dev"]);
          startProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                if (terminalRef.current?.writeToTerminal) {
                  terminalRef.current.writeToTerminal(data);
                }
              },
            })
          );
        }

        setCurrentStep(isProduction ? 5 : 4);
        setIsSetupComplete(true);

      } catch (err) {
        console.error("Error setting up container:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);

        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal(`❌ Error: ${errorMessage}\r\n`);
        }

        setSetupError(errorMessage);
        setupStartedRef.current = false; // Allow retry
      }
    }

    setupContainer();
  }, [webContainerInstance, isSetupComplete, isProduction, serverUrl, files, setIsSetupComplete]);


  // Handle file updates without full re-setup
  // This is tricky. Do we re-mount?
  // Ideally we use `fs.writeFile` for delta updates.
  // For now, let's assume the user manually restarts if they want full sync,
  // OR we implement a "Save" in Builder that writes to WebContainer.

  // Let's implement active file sync if possible
  const prevFilesRef = useRef(files);
  useEffect(() => {
    if (!webContainerInstance || !isSetupComplete) return;

    // Find changed files
    const changedFiles: Record<string, string> = {};
    let hasChanges = false;

    Object.keys(files).forEach(path => {
      if (files[path] !== prevFilesRef.current[path]) {
        changedFiles[path] = files[path];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      console.log("Syncing changes to WebContainer...", Object.keys(changedFiles));
      Promise.all(Object.entries(changedFiles).map(async ([path, content]) => {
        try {
          await webContainerInstance.fs.writeFile(path, content);
        } catch (e) {
          console.error(`Failed to write ${path}:`, e);
        }
      })).then(() => {
        console.log("Synced changes");
        prevFilesRef.current = files;
      });
    }
  }, [files, webContainerInstance, isSetupComplete]);

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (stepIndex === currentStep) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    } else {
      return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepText = (stepIndex: number, label: string) => {
    const isActive = stepIndex === currentStep;
    const isComplete = stepIndex < currentStep;

    return (
      <span className={`text-sm font-medium ${isComplete ? 'text-green-600' :
        isActive ? 'text-blue-600' :
          'text-gray-500'
        }`}>
        {label}
      </span>
    );
  };


  return (
    <div className={cn(
      "h-full w-full flex flex-col bg-[#0d1117] transition-all duration-300 ease-in-out p-0"
    )}>
      {!serverUrl ? (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0d1117] rounded-xl border border-gray-800/50 overflow-hidden">
          {/* Browser Header for Loading */}
          <div className="h-10 bg-gray-900/50 border-b border-gray-800/50 flex items-center px-4 gap-2 shrink-0">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 max-w-sm mx-auto h-6 bg-gray-950 rounded border border-gray-800 flex items-center px-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mr-2" />
              <span className="text-[10px] text-gray-500 font-medium truncate uppercase tracking-widest">Environment Setup</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-8 flex flex-col items-center justify-center bg-gray-950/20">
            <div className="w-full max-w-md p-8 rounded-2xl bg-gray-900/50 border border-gray-800/50 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-100">Environment Setup</h3>
                <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded">Step {currentStep}/{totalSteps}</span>
              </div>

              <Progress
                value={(currentStep / totalSteps) * 100}
                className="h-2 mb-8 bg-gray-800"
              />

              <div className="grid grid-cols-1 gap-4 mb-2">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  {getStepIcon(1)}
                  {getStepText(1, "Mounting files")}
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  {getStepIcon(2)}
                  {getStepText(2, "Installing dependencies")}
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  {getStepIcon(3)}
                  {getStepText(3, isProduction ? "Building project" : "Starting development server")}
                </div>
                {isProduction && (
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                    {getStepIcon(4)}
                    {getStepText(4, "Serving assets")}
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  {getStepIcon(isProduction ? 5 : 4)}
                  {getStepText(isProduction ? 5 : 4, "Ready")}
                </div>
              </div>

              {setupError && (
                <div className="p-4 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-sm mt-6 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <span className="wrap-break-word">{setupError}</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-1/3 min-h-[180px] border-t border-gray-800">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-gray-500 bg-gray-950">Loading Terminal...</div>}>
              <TerminalComponent
                ref={terminalRef}
                webContainerInstance={webContainerInstance}
                theme="dark"
                className="h-full"
                onError={onTerminalError}
              />
            </Suspense>
          </div>
        </div>
      ) : (
        <div className={cn(
          "flex-1 flex flex-col min-h-0 bg-white overflow-hidden relative border-l border-gray-800"
        )}>
          {/* Browser Header */}
          <div className="h-11 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-4 shrink-0">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-sm" />
            </div>

            <div className="flex-1 flex items-center bg-gray-950 rounded-md border border-gray-800 px-3 py-1 gap-2 max-w-2xl mx-auto">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[11px] text-gray-500 font-medium truncate select-all">{serverUrl}</span>
            </div>

            <div className="w-20" /> {/* Spacer to balance dots */}
          </div>

          {/* Iframe Preview Container with Internal Padding */}
          <div className={cn(
            "flex-1 relative bg-white overflow-hidden transition-all duration-300 p-2"
          )}>
            <div className="w-full h-full rounded-lg  overflow-hidden">
              <iframe
                src={serverUrl}
                className="w-full h-full border-none"
                title="WebContainer Preview"
                allow="cross-origin-isolated"
              />
            </div>
          </div>

          {/* Terminal Toggle Overlay */}
          {terminalVisibility === "closed" && (
            <div className="absolute bottom-4 right-4 z-50">
              <Button
                onClick={() => setTerminalVisibility("visible")}
                size="sm"
                className="bg-gray-900/90 backdrop-blur hover:bg-gray-800 text-white border border-gray-700 flex items-center gap-2 shadow-xl rounded-full px-4"
              >
                <TerminalIcon className="h-4 w-4" />
                <span className="text-xs font-semibold">Terminal</span>
              </Button>
            </div>
          )}

          {/* Terminal at bottom */}
          {terminalVisibility !== "closed" && (
            <div className={cn(
              "border-t border-gray-800 transition-all duration-300 ease-in-out",
              terminalVisibility === "minimized" ? 'h-10' : 'h-1/3 min-h-[200px]'
            )}>
              <Suspense fallback={<div className="h-full flex items-center justify-center text-gray-500 bg-[#09090B]">Loading Terminal...</div>}>
                <TerminalComponent
                  ref={terminalRef}
                  webContainerInstance={webContainerInstance}
                  theme="dark"
                  className="h-full border-none rounded-none"
                  onClose={() => setTerminalVisibility("closed")}
                  onMinimize={(min) => setTerminalVisibility(min ? "minimized" : "visible")}
                  isMinimized={terminalVisibility === "minimized"}
                  onError={onTerminalError}
                />
              </Suspense>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebContainerPreview;
