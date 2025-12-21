"use client";

import { useEffect } from "react"
import Editor, { useMonaco } from "@monaco-editor/react"
import { cn } from "@/lib/utils"
import { getEditorLanguage, configureMonaco, defaultEditorOptions } from "@/lib/monaco-utils"

interface MonacoEditorProps {
  content: string
  language: string
  onChange?: (value: string) => void
  readOnly?: boolean
  className?: string
  theme?: string
}

export function MonacoEditor({ 
  content, 
  language, 
  onChange, 
  readOnly = false, 
  className,
  theme = "modern-dark" 
}: MonacoEditorProps) {
  const monaco = useMonaco();
  
  useEffect(() => {
    if (monaco) {
      configureMonaco(monaco);
    }
  }, [monaco]);

  const handleEditorChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  }

  return (
    <div className={cn("h-full w-full border border-border rounded-md overflow-hidden", className)}>
      <Editor
        height="100%"
        width="100%"
        language={getEditorLanguage(language)}
        value={content}
        theme={theme}
        onChange={handleEditorChange}
        options={{
          ...defaultEditorOptions,
          readOnly,
        }}
        loading={
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading editor...
          </div>
        }
      />
    </div>
  )
}
