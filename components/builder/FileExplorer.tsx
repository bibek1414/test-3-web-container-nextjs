"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronRight,
  FilePlus,
  FolderPlus,
  RefreshCw,
  CopyMinus as CollapseAllIcon,
  Image as ImageIcon
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileNode } from "@/types";

import { Tree } from "./file-explorer/tree";
import { CreateInput } from "./file-explorer/create-input";
import { LoadingRow } from "./file-explorer/loading-row";

interface FileExplorerProps {
  fileTree: FileNode[];
  activeFile: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string, content?: string) => void;
  onCreateDirectory: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRename: (oldPath: string, newPath: string) => void;
  onRefresh: () => void;
  onUploadFile?: (path: string, content: string) => void;
  isLoading?: boolean;
}

export const FileExplorer = ({
  fileTree,
  activeFile,
  onSelectFile,
  onCreateFile,
  onCreateDirectory,
  onDeleteFile,
  onRename,
  onRefresh,
  onUploadFile,
  isLoading
}: FileExplorerProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [collapseKey, setCollapseKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = (name: string) => {
    setCreating(null);
    if (creating === "file") {
      onCreateFile(name);
    } else {
      onCreateDirectory(name);
    }
  };

  const handleCollapseAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapseKey(prev => prev + 1);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onUploadFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      // Default to public folder for uploaded images
      const path = `public/${file.name}`;
      onUploadFile(path, content);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle Image Pasting
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const base64Content = event.target?.result as string;
            const timestamp = new Date().getTime();
            // Default to public folder for pasted images
            const fileName = `public/pasted_image_${timestamp}.png`;

            if (onUploadFile) {
              onUploadFile(fileName, base64Content);
            }
          };
          reader.readAsDataURL(blob);
          e.preventDefault();
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onUploadFile]);

  return (
    <div className="h-full bg-gray-950 flex flex-col border-r border-gray-800 w-64 select-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900/50 cursor-pointer group"
        onClick={() => setIsOpen(v => !v)}
      >
        <div className="flex items-center gap-1">
          <ChevronRight
            className={cn(
              "size-4 text-gray-400 transition-transform duration-200",
              isOpen && "rotate-90"
            )}
          />
          <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">
            Files
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              setCreating("file");
              setIsOpen(true);
            }}
            title="New File"
          >
            <FilePlus className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              setCreating("folder");
              setIsOpen(true);
            }}
            title="New Folder"
          >
            <FolderPlus className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            title="Upload Image"
          >
            <ImageIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={handleCollapseAll}
            title="Collapse All"
          >
            <CollapseAllIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            title="Refresh"
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {isOpen && (
        <ScrollArea className="flex-1">
          <div className="p-1">
            {isLoading && fileTree.length === 0 && <LoadingRow level={0} />}

            {creating && (
              <CreateInput
                type={creating}
                level={0}
                onSubmit={handleCreate}
                onCancel={() => setCreating(null)}
              />
            )}

            {fileTree.map((node) => (
              <Tree
                key={`${node.path}-${collapseKey}`}
                item={node}
                level={0}
                activeFile={activeFile}
                onSelect={onSelectFile}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateDirectory}
                onRename={onRename}
                onDelete={onDeleteFile}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};