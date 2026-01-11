"use client";

import React from 'react';
import { CodeMirrorEditor } from './CodeMirrorEditor';
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
    <div key={filename} className="w-full h-full bg-[#0d1117] overflow-hidden">
      {isImage ? (
        <ImagePreview content={code} filename={filename || 'image'} />
      ) : (
        <CodeMirrorEditor
          initialValue={code}
          fileName={filename || 'file.txt'}
          onChange={onChange}
        />
      )}
    </div>
  );
};
