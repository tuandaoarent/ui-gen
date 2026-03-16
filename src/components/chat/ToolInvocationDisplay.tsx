"use client";

import type { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function getToolLabel(tool: ToolInvocation): string {
  const isDone = tool.state === "result";
  const file = tool.args?.path ? (tool.args.path.split("/").pop() ?? tool.args.path) : "";

  if (tool.toolName === "str_replace_editor") {
    switch (tool.args?.command) {
      case "create":     return isDone ? `Created ${file}`       : `Creating ${file}`;
      case "str_replace":
      case "insert":     return isDone ? `Edited ${file}`        : `Editing ${file}`;
      case "view":       return isDone ? `Read ${file}`          : `Reading ${file}`;
      case "undo_edit":  return isDone ? `Undid edit in ${file}` : `Undoing edit in ${file}`;
      default:           return tool.toolName;
    }
  }

  if (tool.toolName === "file_manager") {
    switch (tool.args?.command) {
      case "rename": {
        if (isDone) {
          const newFile = tool.args?.new_path
            ? (tool.args.new_path.split("/").pop() ?? tool.args.new_path)
            : "";
          return `Renamed ${file} to ${newFile}`;
        }
        return `Renaming ${file}`;
      }
      case "delete": return isDone ? `Deleted ${file}` : `Deleting ${file}`;
      default:       return tool.toolName;
    }
  }

  return tool.toolName;
}

interface ToolInvocationDisplayProps {
  toolInvocation: ToolInvocation;
  className?: string;
}

export function ToolInvocationDisplay({ toolInvocation, className }: ToolInvocationDisplayProps) {
  const label = getToolLabel(toolInvocation);
  const isDone = toolInvocation.state === "result";

  return (
    <div className={cn(
      "inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200",
      className
    )}>
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
