import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import { getItemPadding } from "./constants";

interface CreateInputProps {
    type: "file" | "folder";
    level: number;
    onSubmit: (name: string) => void;
    onCancel: () => void;
}

export const CreateInput = ({
    type,
    level,
    onSubmit,
    onCancel,
}: CreateInputProps) => {
    const [name, setName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            if (name.trim()) onSubmit(name);
            else onCancel();
        } else if (e.key === "Escape") {
            onCancel();
        }
    };

    return (
        <div
            className="flex items-center gap-1 h-5.5 bg-accent/30"
            style={{ paddingLeft: getItemPadding(level, type === "file") }}
        >
            <div className="flex items-center gap-0.5">
                {type === "folder" && (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                )}
                {type === "file" && (
                    <FileIcon fileName={name} autoAssign className="size-4 shrink-0" />
                )}
                {type === "folder" && (
                    <FolderIcon folderName={name} className="size-4 shrink-0" />
                )}
            </div>
            <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    if (name.trim()) onSubmit(name);
                    else onCancel();
                }}
                className="flex-1 min-w-0 bg-transparent outline-none text-sm border border-blue-500/50 rounded-sm px-1 focus:border-blue-500"
                placeholder={`New ${type}...`}
            />
        </div>
    );
};
