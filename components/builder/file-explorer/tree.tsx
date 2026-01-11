import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import { cn } from "@/lib/utils";
import { FileNode } from "@/types";
import { getItemPadding } from "./constants";
import { LoadingRow } from "./loading-row";
import { CreateInput } from "./create-input";
import { RenameInput } from "./rename-input";
import { TreeItemWrapper } from "./tree-item-wrapper";

interface TreeProps {
    item: FileNode;
    level?: number;
    activeFile?: string; // path
    onSelect: (path: string) => void;
    onCreateFile: (path: string) => void;
    onCreateFolder: (path: string) => void;
    onRename: (oldPath: string, newPath: string) => void;
    onDelete: (path: string) => void;
}

export const Tree = ({
    item,
    level = 0,
    activeFile,
    onSelect,
    onCreateFile,
    onCreateFolder,
    onRename,
    onDelete
}: TreeProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [creating, setCreating] = useState<"file" | "folder" | null>(null);

    // Derive folder contents from item.children
    const folderContents = item.children;
    const isLoading = false; // We assume data is loaded if node exists for now

    const handleRename = (newName: string) => {
        setIsRenaming(false);
        if (newName === item.name) return;

        // Construct new path
        const parentDir = item.path.substring(0, item.path.lastIndexOf('/'));
        const newPath = parentDir ? `${parentDir}/${newName}` : newName;

        onRename(item.path, newPath);
    };

    const handleCreate = (name: string) => {
        setCreating(null);
        const newPath = item.path ? `${item.path}/${name}` : name;

        if (creating === "file") {
            onCreateFile(newPath);
        } else {
            onCreateFolder(newPath);
        }
    };

    const startCreating = (type: "file" | "folder") => {
        setIsOpen(true);
        setCreating(type);
    };

    if (item.type === "file") {
        const fileName = item.name;
        const isActive = activeFile === item.path;

        if (isRenaming) {
            return (
                <RenameInput
                    type="file"
                    defaultValue={fileName}
                    level={level}
                    onSubmit={handleRename}
                    onCancel={() => setIsRenaming(false)}
                />
            );
        }

        return (
            <TreeItemWrapper
                item={item}
                level={level}
                isActive={isActive}
                onClick={() => onSelect(item.path)}
                onDoubleClick={() => onSelect(item.path)} // Maybe distinct action?
                onRename={() => setIsRenaming(true)}
                onDelete={() => onDelete(item.path)}
            >
                <FileIcon fileName={fileName} autoAssign className="size-4 shrink-0" />
                <span className="truncate text-sm">{fileName}</span>
            </TreeItemWrapper>
        )
    }

    // Folder Logic
    const folderName = item.name;

    const folderRender = (
        <>
            <div className="flex items-center gap-0.5">
                <ChevronRight
                    className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        isOpen && "rotate-90"
                    )}
                />
                <FolderIcon folderName={folderName} className="size-4 shrink-0" />
            </div>
            <span className="truncate text-sm">{folderName}</span>
        </>
    )

    if (creating) {
        return (
            <>
                <button
                    onClick={() => setIsOpen((value) => !value)}
                    className="group flex items-center gap-1 h-5.5 hover:bg-accent/30 w-full text-gray-300 hover:text-white"
                    style={{ paddingLeft: getItemPadding(level, false) }}
                >
                    {folderRender}
                </button>
                {isOpen && (
                    <div className="flex flex-col">
                        {/* Creating Input */}
                        <CreateInput
                            type={creating}
                            level={level + 1}
                            onSubmit={handleCreate}
                            onCancel={() => setCreating(null)}
                        />
                        {/* Folder Contents */}
                        {folderContents?.map((subItem) => (
                            <Tree
                                key={subItem.path}
                                item={subItem}
                                level={level + 1}
                                activeFile={activeFile}
                                onSelect={onSelect}
                                onCreateFile={onCreateFile}
                                onCreateFolder={onCreateFolder}
                                onDelete={onDelete}
                                onRename={onRename}
                            />
                        ))}
                    </div>
                )}
            </>
        )
    }

    if (isRenaming) {
        return (
            <>
                <RenameInput
                    type="folder"
                    defaultValue={folderName}
                    isOpen={isOpen}
                    level={level}
                    onSubmit={handleRename}
                    onCancel={() => setIsRenaming(false)}
                />
                {isOpen && (
                    <div className="flex flex-col">
                        {folderContents?.map((subItem) => (
                            <Tree
                                key={subItem.path}
                                item={subItem}
                                level={level + 1}
                                activeFile={activeFile}
                                onSelect={onSelect}
                                onCreateFile={onCreateFile}
                                onCreateFolder={onCreateFolder}
                                onDelete={onDelete}
                                onRename={onRename}
                            />
                        ))}
                    </div>
                )}
            </>
        )
    }

    return (
        <>
            <TreeItemWrapper
                item={item}
                level={level}
                onClick={() => setIsOpen((value) => !value)}
                onRename={() => setIsRenaming(true)}
                onDelete={() => onDelete(item.path)}
                onCreateFile={() => startCreating("file")}
                onCreateFolder={() => startCreating("folder")}
            >
                {folderRender}
            </TreeItemWrapper>
            {isOpen && (
                <div className="flex flex-col">
                    {isLoading && !folderContents ? <LoadingRow level={level + 1} /> : null}
                    {folderContents?.map((subItem) => (
                        <Tree
                            key={subItem.path}
                            item={subItem}
                            level={level + 1}
                            activeFile={activeFile}
                            onSelect={onSelect}
                            onCreateFile={onCreateFile}
                            onCreateFolder={onCreateFolder}
                            onDelete={onDelete}
                            onRename={onRename}
                        />
                    ))}
                </div>
            )}
        </>
    );
};
