"use client";

import React from 'react';
import { MonacoEditor } from '../editor/MonacoEditor';
import { ImagePreview } from './ImagePreview';

interface EditorProps {
  code: string;
  onChange: (newCode: string) => void;
  filename?: string;
}

export const Editor: React.FC<EditorProps> = ({ code, onChange, filename }) => {

  const extension = filename ? filename.split('.').pop()?.toLowerCase() || 'plaintext' : 'plaintext';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(extension);

  return (
    <div className="w-full h-full bg-[#0d1117] overflow-hidden">
      {isImage ? (
        <ImagePreview content={code} filename={filename || 'image'} />
      ) : (
        <MonacoEditor
          content={code}
          onChange={onChange}
          language={extension}
          theme="modern-dark"
        />
      )}
    </div>
  );
};
