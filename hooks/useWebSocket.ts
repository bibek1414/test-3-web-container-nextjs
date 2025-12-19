import { useState, useEffect, useRef, useCallback } from "react";
import type { FileNode } from "../types";

interface WebSocketMessage {
  action: string;
  items?: FileNode[];
  path?: string;
  content?: string;
  error?: string;
  message?: string;
  repo_url?: string;
  token?: string;
}

export const useWebSocket = (workspaceId: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [status, setStatus] = useState<string>("Connecting");
  const [statusColor, setStatusColor] = useState<string>("#FFA500");
  const [currentFileContent, setCurrentFileContent] = useState<string>("");
  const [lastReceivedFile, setLastReceivedFile] = useState<{ path: string; content: string } | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  
  const messageCount = useRef(0);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  // Custom console logging with styling
  const logSocketMessage = useCallback(
    (direction: "📤 SENT" | "📥 RECEIVED", data: any) => {
      const count = ++messageCount.current;
      const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
      const style =
        direction === "📤 SENT"
          ? "background: #2196F3; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;"
          : "background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;";

      console.groupCollapsed(`%c${direction} #${count} ${timestamp}`, style);

      if (data.action) console.log("Action:", data.action);
      if (data.path) console.log("Path:", data.path);
      if (data.content !== undefined) {
        console.log("Content length:", data.content.length, "characters");
        if (data.content.length < 500) {
          console.log("Content preview:", data.content.substring(0, 200) + '...');
        }
      }
      if (data.items) console.log("Items count:", data.items.length);
      if (data.error) console.error("Error:", data.error);

      console.groupEnd();
    },
    []
  );

  const connect = useCallback(() => {
    // Construct WebSocket URL
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://nepdora.baliyoventures.com";
    let wsUrl = "";
    
    try {
      const url = new URL(apiUrl);
      const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${wsProtocol}//${url.host}/ws/workspace/${workspaceId}/`;
    } catch(e) {
      console.error("Invalid API URL:", apiUrl);
      // Fallback or error handling
    }

    console.log(`🚀 Connecting to WebSocket: ${wsUrl}`);
    setStatus("Connecting");
    setStatusColor("#FFA500");

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✅ WebSocket Connection Established");
      setStatus("Connected");
      setStatusColor("#4CAF50");
      reconnectAttempts.current = 0; // Reset reconnect counter on success
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket Error:", error);
      setStatus("Connection Error");
      setStatusColor("#EF4444");
    };

    ws.onclose = (event) => {
      console.log(`🔌 WebSocket Closed - Code: ${event.code}, Reason: ${event.reason || "No reason"}`);
      setStatus("Disconnected");
      setStatusColor("#888");
      
      // Attempt reconnection with exponential backoff
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeout.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      } else {
        console.error("❌ Max reconnection attempts reached");
        setStatus("Connection Failed");
        setStatusColor("#EF4444");
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        logSocketMessage("📥 RECEIVED", msg);

        switch (msg.action) {
          case "tree":
            console.log(`🌳 File tree received with ${msg.items?.length || 0} root items`);
            if (msg.items) {
              // Log the tree structure for debugging
              console.log('🌳 Tree structure:', JSON.stringify(msg.items, null, 2));
              setFileTree(msg.items);
            }
            break;

          case "file_content":
            console.log(`📄 File content received: ${msg.path} (${msg.content?.length || 0} chars)`);
            if (msg.content !== undefined && msg.path) {
              setCurrentFileContent(msg.content);
              setLastReceivedFile({ path: msg.path, content: msg.content });
              setActiveFile(msg.path);
              console.log(`✅ Updated file state for: ${msg.path}`);
            }
            break;

          case "file_updated":
            console.log(`✅ File successfully updated: ${msg.path}`);
            break;

          case "component_selected":
            console.log(`🎯 Component selected: ${msg.path}`);
            if (msg.path) setActiveFile(msg.path);
            break;

          case "workspace_deleted":
            console.log("🗑️ Workspace deleted");
            alert("Workspace has been deleted!");
            window.location.href = "/";
            break;

          case "error":
            console.error("🚨 Server error:", msg.error || msg.message);
            alert(`Server Error: ${msg.error || msg.message}`);
            break;

          default:
            console.log(`🔹 Unhandled action: ${msg.action}`, msg);
        }
      } catch (error) {
        console.error("❌ Failed to parse WebSocket message:", error);
        console.log("Raw message:", event.data);
      }
    };

    setSocket(ws);

    return () => {
      console.log("🧹 Cleaning up WebSocket connection");
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      ws.close();
    };
  }, [workspaceId, logSocketMessage]);

  // Initial connection
  useEffect(() => {
    if (workspaceId) {
      const cleanup = connect();
      return cleanup;
    }
  }, [workspaceId, connect]);

  // Send message with error handling
  const send = useCallback((data: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      logSocketMessage("📤 SENT", data);
      socket.send(JSON.stringify(data));
      return true;
    } else {
      console.error(
        `⚠️ Cannot send message - WebSocket not connected. State: ${
          socket?.readyState === WebSocket.CONNECTING ? 'CONNECTING' :
          socket?.readyState === WebSocket.CLOSING ? 'CLOSING' :
          socket?.readyState === WebSocket.CLOSED ? 'CLOSED' :
          'UNKNOWN'
        }`
      );
      return false;
    }
  }, [socket, logSocketMessage]);

  // API Methods
  const openFile = useCallback((path: string) => {
    console.log(`📂 Requesting file: ${path}`);
    return send({ action: "open_file", path });
  }, [send]);

  const updateFile = useCallback((path: string, content: string) => {
    console.log(`✏️ Updating file: ${path} (${content.length} chars)`);
    return send({ action: "update_file", path, content });
  }, [send]);

  const createFile = useCallback((path: string, content: string = '') => {
    console.log(`➕ Creating file: ${path}`);
    return send({ action: "create_file", path, content });
  }, [send]);

  const deleteFile = useCallback((path: string) => {
    console.log(`🗑️ Deleting file: ${path}`);
    return send({ action: "delete_file", path });
  }, [send]);

  const recloneProject = useCallback(() => {
    console.log(`♻️ Re-cloning project request`);
    return send({ action: "reclone_project" });
  }, [send]);

  const cloneRepo = useCallback((url: string) => {
    console.log(`🐙 Cloning repository: ${url}`);
    return send({ action: "github_clone", repo_url: url });
  }, [send]);

  const pushChanges = useCallback((message: string) => {
    console.log(`📤 Pushing changes: ${message}`);
    return send({ action: "github_push", message });
  }, [send]);

  const refreshFileTree = useCallback(() => {
     console.log("🌲 Requesting file tree refresh");
     return send({ action: "get_files" });
  }, [send]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    console.log("🔄 Manual reconnect triggered");
    reconnectAttempts.current = 0;
    if (socket) {
      socket.close();
    }
    connect();
  }, [socket, connect]);

  return {
    socket,
    fileTree,
    status,
    statusColor,
    currentFileContent,
    setCurrentFileContent,
    lastReceivedFile,
    activeFile,
    openFile,
    updateFile,
    createFile,
    deleteFile,
    recloneProject,
    cloneRepo,
    pushChanges,
    refreshFileTree,
    reconnect,
    isConnected: status === "Connected",
  };
};