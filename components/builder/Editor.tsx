"use client";

import React from 'react';
import { MonacoEditor } from '../editor/MonacoEditor';

interface EditorProps {
  code: string;
  onChange: (newCode: string) => void;
  filename?: string;
}

export const Editor: React.FC<EditorProps> = ({ code, onChange, filename }) => {

  const extension = filename ? filename.split('.').pop() || 'plaintext' : 'plaintext';

  return (
    <div className="w-full h-full bg-[#0d1117] overflow-hidden">
      <MonacoEditor
        content={code}
        onChange={onChange}
        language={extension}
        theme="modern-dark"
      />
    </div>
  );
};
