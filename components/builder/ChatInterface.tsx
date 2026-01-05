"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { getSubDomain } from "@/lib/auth-client";


interface ChatMessage {
  role: "user" | "ai";
  content: string;
  files_modified?: string[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BUILD_URL || "https://builder-api.nepdora.com";

interface ChatInterfaceProps {
  workspaceId: string;
  onTaskCompleted?: (files: string[]) => void;
  terminalError?: string;
  onClearError?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onTaskCompleted,
  terminalError,
  onClearError
}) => {
  const [activeTab, setActiveTab] = useState<'chat'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      content:
        "Hi! I'm your AI coding assistant. Tell me what you want to build or change in your project, and I'll help you make it happen.",
    },
  ]);
  const [input, setInput] = useState("");
  const [tenantName] = useState<string>(() => getSubDomain() || "luminous-glow");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTab]);


  const mutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const response = await fetch(`${API_BASE_URL}/api/web-builder/build/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: userMessage,
          tenant_name: tenantName,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json() as Promise<{
        status: string;
        final_answer?: string;
        files_modified?: string[];
        message?: string;
      }>;
    },
    onSuccess: (data) => {
      if (data.status === "success" || data.status === "completed") {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: data.final_answer || "Task completed successfully.",
            files_modified: data.files_modified,
          },
        ]);

        if (data.files_modified && data.files_modified.length > 0) {
          console.log("Files modified:", data.files_modified);
          if (onTaskCompleted) {
            onTaskCompleted(data.files_modified);
          }
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: `❌ Error: ${data.message || "Task failed."}`,
          },
        ]);
      }
    },
    onError: (error: Error) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: `❌ Network Error: ${error.message}`,
        },
      ]);
    },
  });

  const sendMessage = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || mutation.isPending) return;

    setMessages((prev) => [...prev, { role: "user", content: textToSend }]);
    setInput("");

    mutation.mutate(textToSend);
  };

  const handleFixIssue = () => {
    if (terminalError) {
      const fixPrompt = `I encountered the following error in the terminal. Please fix it:\n\n${terminalError}`;
      sendMessage(fixPrompt);
      if (onClearError) onClearError();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#252526] border-l border-[#333]">
      {/* Tabs */}
      <div className="flex border-b border-[#333] bg-[#37373d]">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 p-2 text-xs font-bold ${activeTab === 'chat'
            ? 'text-white border-b-2 border-[#007acc] bg-[#252526]'
            : 'text-[#cccccc] hover:bg-[#2a2d2e]'
            }`}
        >
          🤖 AI Chat
        </button>

      </div>

      {activeTab === 'chat' ? (
        <>
          <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-2 rounded-md text-[13px] max-w-[90%] ${msg.role === "user"
                  ? "bg-[#007acc] text-white self-end ml-[30px]"
                  : "bg-[#2a2d2e] text-[#cccccc] self-start mr-[30px]"
                  }`}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: msg.content.replace(/\n/g, "<br/>"),
                  }}
                />
                {msg.files_modified && msg.files_modified.length > 0 && (
                  <div className="mt-1 text-xs text-[#888]">
                    Files modified: {msg.files_modified.length}
                  </div>
                )}
              </div>
            ))}
            {mutation.isPending && (
              <div className="p-2 rounded-md text-[13px] bg-[#2a2d2e] text-[#cccccc] self-start mr-[30px]">
                🤔 Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Fix Issues Button */}
          {terminalError && (
            <div className="px-2.5 pb-2">
              <button
                onClick={handleFixIssue}
                className="w-full bg-red-600/20 border border-red-600/50 text-red-200 p-2 rounded-sm text-xs flex items-center justify-center gap-2 hover:bg-red-600/30 transition-colors animate-in fade-in slide-in-from-bottom-2"
              >
                <span>⚠️ Terminal Error Detected</span>
                <span className="font-bold underline">Fix Issues</span>
              </button>
            </div>
          )}

          <div className="p-2.5 border-t border-[#333]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI to build or edit..."
              className="w-full bg-[#3c3c3c] border border-[#555] text-white p-2 rounded-sm text-[13px] min-h-[60px] resize-y font-sans focus:outline-none focus:border-[#007acc]"
            />
            <button
              onClick={() => sendMessage()}
              disabled={mutation.isPending}
              className={`w-full mt-2 bg-[#007acc] text-white border-none p-1.5 rounded-sm cursor-pointer text-xs hover:opacity-90 ${mutation.isPending ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
              Send to AI
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
};
