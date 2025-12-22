"use client";

"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { transformFlatMapToWebContainer } from "../../utils/webcontainerUtils";
import { CheckCircle, Loader2, XCircle, Terminal as TerminalIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { WebContainer } from "@webcontainer/api";

// Lazy load Terminal to avoid SSR issues (xterm uses 'self')
const TerminalComponent = React.lazy(() => import('./Terminal'));

interface WebContainerPreviewProps {
  files: Record<string, string>;
  webContainerInstance: WebContainer | null;
  serverUrl: string;
  isProduction?: boolean;
}

const WebContainerPreview: React.FC<WebContainerPreviewProps> = ({
  files,
  webContainerInstance,
  serverUrl,
  isProduction = false,
}) => {
  const [loadingState, setLoadingState] = useState({
    mounting: false,
    installing: false,
    building: false,
    starting: false,
    ready: false,
  });
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = isProduction ? 5 : 4;
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [terminalVisibility, setTerminalVisibility] = useState<"visible" | "minimized" | "closed">("visible");

  // Ref to access terminal methods
  const terminalRef = useRef<any>(null);

  // Initial setup effect
  useEffect(() => {
    async function setupContainer() {
      if (!webContainerInstance || isSetupComplete) return;

      try {
        setSetupError(null);

        // Check if files are already mounted by checking if package.json exists
        let filesMounted = false;
        try {
          await webContainerInstance.fs.readFile('package.json');
          filesMounted = true;
          console.log("📄 package.json found, skipping mount");
        } catch (e) {
          // package.json doesn't exist, need to mount
        }

        if (!filesMounted) {
          // Step 1: Mount files
          setLoadingState((prev) => ({ ...prev, mounting: true }));
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
            terminalRef.current.writeToTerminal("📁 Files already mounted, skipping...\r\n");
          }
        }

        setLoadingState((prev) => ({
          ...prev,
          mounting: false,
          installing: true,
        }));
        setCurrentStep(2);

        // Check if node_modules exists to skip install
        let dependenciesInstalled = false;
        try {
          const entries = await webContainerInstance.fs.readdir('.', { withFileTypes: true });
          if (entries.some(entry => entry.name === 'node_modules' && entry.isDirectory())) {
            dependenciesInstalled = true;
            console.log("📦 node_modules found, skipping install");
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
            terminalRef.current.writeToTerminal("📦 Dependencies already exist, skipping install...\r\n");
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
        setLoadingState({
          mounting: false,
          installing: false,
          building: false,
          starting: false,
          ready: false,
        });
      }
    }

    setupContainer();
  }, [webContainerInstance, isSetupComplete, isProduction]);


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
    <div className="h-full w-full flex flex-col">
      {!serverUrl ? (
        <div className="h-full flex flex-col">
          <div className="w-full max-w-md p-6 m-5 rounded-lg bg-white dark:bg-zinc-800 shadow-sm mx-auto">
            <Progress
              value={(currentStep / totalSteps) * 100}
              className="h-2 mb-6"
            />

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                {getStepIcon(1)}
                {getStepText(1, "Mounting files")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(2)}
                {getStepText(2, "Installing dependencies")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(3)}
                {getStepText(3, isProduction ? "Building project" : "Starting development server")}
              </div>
              {isProduction && (
                <div className="flex items-center gap-3">
                  {getStepIcon(4)}
                  {getStepText(4, "Serving assets")}
                </div>
              )}
              <div className="flex items-center gap-3">
                {getStepIcon(isProduction ? 5 : 4)}
                {getStepText(isProduction ? 5 : 4, "Ready")}
              </div>
            </div>

            {setupError && (
              <div className="p-3 bg-red-100 text-red-800 rounded text-sm mt-4 wrap-break-word">
                {setupError}
              </div>
            )}
          </div>

          <div className="flex-1 p-4 border-t border-gray-200">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-gray-500">Loading Terminal...</div>}>
              <TerminalComponent
                ref={terminalRef}
                webContainerInstance={webContainerInstance}
                theme="dark"
                className="h-full"
              />
            </Suspense>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          {/* Preview */}
          <div className="flex-1 relative bg-white">
            <iframe
              src={serverUrl}
              className="w-full h-full border-none"
              title="WebContainer Preview"
              allow="cross-origin-isolated"
            />
          </div>

          {/* Terminal at bottom */}
          {terminalVisibility !== "closed" ? (
            <div className={`${terminalVisibility === "minimized" ? 'h-auto' : 'h-1/3 min-h-[200px]'} border-t border-gray-800 transition-all duration-300`}>
              <Suspense fallback={<div className="h-full flex items-center justify-center text-gray-500 bg-[#09090B]">Loading Terminal...</div>}>
                <TerminalComponent
                  ref={terminalRef}
                  webContainerInstance={webContainerInstance}
                  theme="dark"
                  className="h-full border-none rounded-none"
                  onClose={() => setTerminalVisibility("closed")}
                  onMinimize={(min) => setTerminalVisibility(min ? "minimized" : "visible")}
                  isMinimized={terminalVisibility === "minimized"}
                />
              </Suspense>
            </div>
          ) : (
            <div className="absolute bottom-4 right-4 z-50">
              <Button
                onClick={() => setTerminalVisibility("visible")}
                size="sm"
                className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 flex items-center gap-2 shadow-lg"
              >
                <TerminalIcon className="h-4 w-4" />
                Open Terminal
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebContainerPreview;
