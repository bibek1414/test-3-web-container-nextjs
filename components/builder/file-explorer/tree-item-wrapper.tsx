import { cn } from "@/lib/utils";
import {
    ContextMenu,
    ContextMenuItem,
    ContextMenuContent,
    ContextMenuTrigger,
    ContextMenuShortcut,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";

import { getItemPadding } from "./constants";
import { FileNode } from "@/types";

interface TreeItemWrapperProps {
    item: FileNode;
    children: React.ReactNode;
    level: number;
    isActive?: boolean;
    onClick?: () => void;
    onDoubleClick?: () => void;
    onRename?: () => void;
    onDelete?: () => void;
    onCreateFile?: () => void;
    onCreateFolder?: () => void;
}

export const TreeItemWrapper = ({
    item,
    children,
    level,
    isActive,
    onClick,
    onDoubleClick,
    onRename,
    onDelete,
    onCreateFile,
    onCreateFolder,
}: TreeItemWrapperProps) => {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    onClick={onClick}
                    onDoubleClick={onDoubleClick}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            onRename?.();
                        }
                    }}
                    className={cn(
                        "group flex items-center gap-1 w-full h-5.5 hover:bg-accent/30 outline-none focus:ring-1 focus:ring-inset focus:ring-ring select-none cursor-pointer text-gray-300 hover:text-white transition-colors",
                        isActive && "bg-accent/30 text-white",
                    )}
                    style={{ paddingLeft: getItemPadding(level, item.type === "file") }}
                >
                    {children}
                </button>
            </ContextMenuTrigger>
            <ContextMenuContent
                onCloseAutoFocus={(e) => e.preventDefault()}
                className="w-64"
            >
                {item.type === "folder" || item.type === "directory" ? (
                    <>
                        <ContextMenuItem
                            onClick={onCreateFile}
                            className="text-sm"
                        >
                            New File...
                        </ContextMenuItem>
                        <ContextMenuItem
                            onClick={onCreateFolder}
                            className="text-sm"
                        >
                            New Folder...
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                    </>
                ) : null}
                <ContextMenuItem
                    onClick={onRename}
                    className="text-sm"
                >
                    Rename...
                    <ContextMenuShortcut>
                        Enter
                    </ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem
                    onClick={onDelete}
                    className="text-sm"
                >
                    Delete Permanently
                    <ContextMenuShortcut>
                        ⌘Backspace
                    </ContextMenuShortcut>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};
