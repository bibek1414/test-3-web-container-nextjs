import { useState, useEffect, useRef } from "react";
import { WebContainer } from "@webcontainer/api"; // This is a singleton usually? No, api exports WebContainer class.
// Actually @webcontainer/api exports `WebContainer` which has `boot()`.

interface UseWebContainerProps {
  files: Record<string, string>;
}

export const useWebContainer = ({ files }: UseWebContainerProps) => {
  const [instance, setInstance] = useState<WebContainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>("");
  
  // Ref to track if we've already booted to avoid double boot in strict mode
  const isBooting = useRef(false);

  useEffect(() => {
    async function boot() {
      if (instance || isBooting.current) return;
      
      console.log("🚀 Booting WebContainer...");
      isBooting.current = true;
      try {
        const webcontainer = await WebContainer.boot({
          coep: 'require-corp'
        });
        setInstance(webcontainer);
        
        // Listen for server-ready
        webcontainer.on("server-ready", (port, url) => {
          console.log(`🌍 Server ready at ${url}:${port}`);
          setServerUrl(url);
        });

      } catch (err) {
        console.error("❌ Failed to boot WebContainer:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    }

    boot();
  }, [instance]);

  // Sync files when `files` prop changes
  // We need to compare specific file content changes or just overwrite?
  // Overwriting everything might be expensive.
  // For now, let's just mount initially.
  // Actually, standard pattern is to mount initial files, then use writeFile for updates.
  // But here we receive a full dump of files.
  
  // NOTE: This effect handles keeping the virtual FS in sync with the definition
  useEffect(() => {
    if (!instance) return;

    // Use a simple debounce or logic to mount files
    // Ideally we diff, but mounting everything is safer for correctness first.
    // However, mounting completely replaces? No, mount adds/overwrites.
    
    // For large projects this is heavy. 
    // We will assume `WebContainerPreview` handles the main init sequence (Mount -> Install -> Start).
    // This hook just provides the instance and maybe a helper to mount.
  }, [instance, files]);

  return {
    instance,
    isLoading,
    error,
    serverUrl,
  };
};
