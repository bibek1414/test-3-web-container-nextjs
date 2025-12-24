"use client";

import React from 'react';
import { Image as ImageIcon, Download, Maximize2 } from 'lucide-react';

interface ImagePreviewProps {
    content: string; // Base64 or URL
    filename: string;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ content, filename }) => {
    const isBase64 = content.startsWith('data:image');
    const src = isBase64 ? content : `data:image/${filename.split('.').pop()};base64,${content}`;

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d1117] p-8 overflow-auto">
            <div className="relative group max-w-full max-h-full">
                <div className="absolute -inset-4 bg-blue-500/10 rounded-xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative bg-[#161b22] border border-gray-800 rounded-lg p-2 shadow-2xl overflow-hidden">
                    <img
                        src={src}
                        alt={filename}
                        className="max-w-full h-auto object-contain rounded-sm"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Image+Load+Error';
                        }}
                    />
                </div>

                <div className="mt-6 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-gray-400">
                        <ImageIcon size={16} />
                        <span className="text-sm font-medium font-mono">{filename}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                        <a
                            href={src}
                            download={filename}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-md transition-colors border border-gray-700"
                        >
                            <Download size={14} />
                            Download
                        </a>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors shadow-sm shadow-blue-900/20">
                            <Maximize2 size={14} />
                            Full View
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
