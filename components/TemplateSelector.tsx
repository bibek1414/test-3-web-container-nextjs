"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWebSocket } from "@/hooks/useWebSocket";

interface Template {
    id: string;
    name: string;
    description: string;
    image: string;
    previewUrl: string;
    repoUrl: string;
}

const templates: Template[] = [
    {
        id: "brainstorm",
        name: "Brainstorm Global Education",
        description: "A comprehensive educational platform template.",
        image: "/images/brainstorm-global-education.png",
        previewUrl: "https://www.brainstorm.edu.np/",
        repoUrl: "https://github.com/nepdora-nepal/brainstorm-global-education",
    },
    {
        id: "luminous",
        name: "Luminous Skin",
        description: "A modern, aesthetic skincare brand template.",
        image: "/images/luminous-skin.png",
        previewUrl: "https://luminous-skin.vercel.app/",
        repoUrl: "https://github.com/nepdora-nepal/luminous-skin",
    },
];

export function TemplateSelector() {
    const router = useRouter();
    const workspaceId = "nextjs-web-container"; // Default workspace
    const { cloneRepo, isConnected } = useWebSocket(workspaceId);
    const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);

    const handleUseTemplate = async (template: Template) => {
        if (!isConnected) {
            alert("Builder is connecting... Please wait.");
            return;
        }

        setLoadingTemplateId(template.id);
        try {
            cloneRepo(template.repoUrl);
            // Give it a moment to send the message before redirecting
            // Ideally we'd wait for a confirmation, but for now we'll assume optimistic success
            // and let the builder environment handle the rest.
            setTimeout(() => {
                router.push(`/builder/${workspaceId}`);
            }, 1000);
        } catch (error) {
            console.error("Failed to clone template:", error);
            setLoadingTemplateId(null);
            alert("Failed to start template cloning. Please try again.");
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mx-auto p-4">
            {templates.map((template) => (
                <div
                    key={template.id}
                    className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col"
                >
                    {/* Image Container */}
                    <div className="relative h-64 w-full overflow-hidden bg-slate-100">
                        <Image
                            src={template.image}
                            alt={template.name}
                            fill
                            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col grow bg-white">
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">
                            {template.name}
                        </h3>
                        <p className="text-slate-600 mb-6 grow">
                            {template.description}
                        </p>

                        <div className="flex items-center gap-3 mt-auto">
                            <a
                                href={template.previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <span className="mr-2">👁️</span> Preview
                            </a>

                            <button
                                onClick={() => handleUseTemplate(template)}
                                disabled={loadingTemplateId !== null}
                                className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-lg hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-95"
                            >
                                {loadingTemplateId === template.id ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Setting up...
                                    </>
                                ) : (
                                    <>
                                        <span className="mr-2">🚀</span> Use Template
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {/* Existing Fallback/Direct Link - Optional, kept for continuity but styled to be subtle */}
            <div className="md:col-span-2 flex justify-center mt-8">
                <Link
                    href={`/builder/${workspaceId}`}
                    className="text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors"
                >
                    Or continue without a template →
                </Link>
            </div>
        </div>
    );
}
