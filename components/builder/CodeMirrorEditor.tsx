"use client";

import { useEffect, useMemo, useRef } from "react"
import { EditorView, keymap } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { indentWithTab } from "@codemirror/commands";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";

import { minimap } from "./editor/extensions/minimap";
import { customTheme } from "./editor/extensions/theme";
import { getLanguageExtension } from "./editor/extensions/language-extension";
import { customSetup } from "./editor/extensions/custom-setup";
import { suggestion } from "./editor/extensions/suggestion";
import { quickEdit } from "./editor/extensions/quick-edit";
import { selectionTooltip } from "./editor/extensions/selection-tooltip";

interface Props {
    fileName: string;
    initialValue?: string;
    onChange: (value: string) => void;
}

export const CodeMirrorEditor = ({
    fileName,
    initialValue = "",
    onChange
}: Props) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    const languageExtension = useMemo(() => {
        return getLanguageExtension(fileName)
    }, [fileName])

    useEffect(() => {
        if (!editorRef.current) return;

        const view = new EditorView({
            doc: initialValue,
            parent: editorRef.current,
            extensions: [
                oneDark,
                customTheme,
                customSetup,
                languageExtension,
                suggestion(fileName),
                quickEdit(fileName),
                selectionTooltip(),
                keymap.of([indentWithTab]),
                minimap(),
                indentationMarkers(),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChange(update.state.doc.toString());
                    }
                })
            ],
        });

        viewRef.current = view;

        return () => {
            view.destroy();
        };
        // Re-create editor only when language or filename changes
    }, [languageExtension, fileName, onChange]); // Note: initialValue is handled by separate effect to avoid re-mounting on every keystroke

    // Update document content when initialValue prop changes from an external source (e.g. remote update)
    // We check if the content is actually different to avoid cursor jumping during local typing
    useEffect(() => {
        if (viewRef.current && initialValue !== undefined) {
            const currentValue = viewRef.current.state.doc.toString();
            if (currentValue !== initialValue) {
                // If the change is significant (not just local typing), update the doc
                // CM6 will try to preserve cursor if possible when doing changes
                viewRef.current.dispatch({
                    changes: { from: 0, to: currentValue.length, insert: initialValue }
                });
            }
        }
    }, [initialValue]);

    // Update doc if initialValue changes (and maybe we want to force update?)
    // Typically controlled editors are tricky in CM6. 
    // Polaris implementation re-creates view mostly on language change, but let's check if we need to update doc.
    // For now, mirroring Polaris exactly.

    return (
        <div ref={editorRef} className="size-full pl-4 bg-[#282c34]" />
    );
};
