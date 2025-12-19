"use client";

import React, { useState } from 'react';
import { X, Code } from 'lucide-react';
import { Button } from './Button';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (name: string, content: string) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [componentName, setComponentName] = useState('');
  const [htmlContent, setHtmlContent] = useState('');

  if (!isOpen) return null;

  const handleImport = () => {
    if (!componentName || !htmlContent) return;
    
    // Basic conversion from HTML to JSX structure (naive)
    // In a real app we might use a parser, but here we'll wrap it and let the AI fix it later or user edit it.
    const jsxContent = htmlContent
      .replace(/class=/g, 'className=')
      .replace(/for=/g, 'htmlFor=')
      .replace(/<!--/g, '{/*')
      .replace(/-->/g, '*/}');

    const fileContent = `import React from 'react';

export const ${componentName} = () => {
  return (
    <>
      ${jsxContent}
    </>
  );
};
`;
    
    // Auto prefix with src/components/ if not specified
    const fileName = componentName.includes('/') ? componentName : `src/components/${componentName}.tsx`;
    
    onImport(fileName, fileContent);
    onClose();
    setComponentName('');
    setHtmlContent('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 text-white font-semibold">
             <Code className="text-blue-500" />
             <h3>Import Component</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Component Name</label>
            <input 
              type="text" 
              placeholder="e.g. PricingCard"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-1">Paste HTML</label>
            <textarea 
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="<div class='card'>...</div>"
              className="w-full h-64 bg-gray-950 border border-gray-700 rounded-lg p-4 text-gray-300 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-200">
            <strong>Tip:</strong> Pasted HTML will be automatically converted to a React Functional Component.
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleImport} disabled={!componentName || !htmlContent}>
            Import & Create
          </Button>
        </div>
      </div>
    </div>
  );
};
