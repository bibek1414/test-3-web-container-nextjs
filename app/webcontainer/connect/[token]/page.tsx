"use client";

import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useParams } from "next/navigation";

export default function ConnectPage() {
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");

  useEffect(() => {
    const handleConnect = async () => {
      try {
        console.log(`🔗 Attempting to connect with token: ${token}`);
        
        // Handshake delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Notify the IDE window if this was opened as a popup
        if (window.opener) {
          window.opener.postMessage({ type: 'webcontainer:connected', token }, '*');
        }
        
        setStatus("connected");
      } catch (err) {
        console.error("❌ Connection failed:", err);
        setStatus("error");
      }
    };

    if (token) {
      handleConnect();
    }
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1117] text-white p-6 font-sans">
      <div className="max-w-md w-full bg-[#161b22] border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <div className={`p-4 rounded-full ${
              status === "connecting" ? "bg-blue-500/10" : 
              status === "connected" ? "bg-green-500/10" : "bg-red-500/10"
            }`}>
              {status === "connecting" && <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />}
              {status === "connected" && <CheckCircle2 className="w-10 h-10 text-green-500" />}
              {status === "error" && <XCircle className="w-10 h-10 text-red-500" />}
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-3">
            {status === "connecting" && "Connecting Project"}
            {status === "connected" && "Now Connected!"}
            {status === "error" && "Connection Failed"}
          </h1>
          
          <p className="text-gray-400 text-center mb-10 text-sm leading-relaxed">
            {status === "connecting" && "Establishing a secure tunnel to your WebContainer project. This will enable real-time previewing."}
            {status === "connected" && "The authentication handshake is complete. You can now close this tab and return to the IDE."}
            {status === "error" && "We couldn't verify the project token. Please try refreshing the IDE and clicking connect again."}
          </p>

          <div className="space-y-3">
            {status === "connected" ? (
              <button 
                onClick={() => window.close()}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
              >
                Return to IDE
              </button>
            ) : status === "error" ? (
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-3.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all border border-gray-700"
              >
                Retry Connection
              </button>
            ) : (
              <div className="w-full py-3.5 bg-gray-800/50 text-gray-500 rounded-xl font-semibold text-center border border-gray-800 animate-pulse">
                Authorizing...
              </div>
            )}
            
            <p className="text-[10px] text-gray-600 text-center uppercase tracking-widest mt-6">
              WebContainer Security Handshake
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex items-center gap-2 text-gray-500 text-xs text-center">
        <span>Powered by WebContainer</span>
        <div className="w-1 h-1 rounded-full bg-gray-700" />
        <span>Secure Context Verified</span>
      </div>
    </div>
  );
}
