import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ToolInvocation } from "ai";
import { ToolInvocationDisplay, getToolLabel } from "../ToolInvocationDisplay";

afterEach(() => {
  cleanup();
});

// --- getToolLabel unit tests ---

test("getToolLabel: str_replace_editor create, pending", () => {
  const tool = { state: "call", toolCallId: "1", toolName: "str_replace_editor", args: { command: "create", path: "src/Card.jsx" } } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("Creating Card.jsx");
});

test("getToolLabel: str_replace_editor create, done", () => {
  const tool = { state: "result", toolCallId: "1", toolName: "str_replace_editor", args: { command: "create", path: "src/Card.jsx" }, result: "" } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("Created Card.jsx");
});

test("getToolLabel: str_replace_editor str_replace, pending", () => {
  const tool = { state: "call", toolCallId: "1", toolName: "str_replace_editor", args: { command: "str_replace", path: "src/App.jsx" } } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("Editing App.jsx");
});

test("getToolLabel: str_replace_editor str_replace, done", () => {
  const tool = { state: "result", toolCallId: "1", toolName: "str_replace_editor", args: { command: "str_replace", path: "src/App.jsx" }, result: "" } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("Edited App.jsx");
});

test("getToolLabel: str_replace_editor insert, pending", () => {
  const tool = { state: "call", toolCallId: "1", toolName: "str_replace_editor", args: { command: "insert", path: "src/App.jsx" } } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("Editing App.jsx");
});

test("getToolLabel: str_replace_editor insert, done", () => {
  const tool = { state: "result", toolCallId: "1", toolName: "str_replace_editor", args: { command: "insert", path: "src/App.jsx" }, result: "" } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("Edited App.jsx");
});

test("getToolLabel: str_replace_editor view, pending", () => {
  const tool = { state: "call", toolCallId: "1", toolName: "str_replace_editor", args: { command: "view", path: "src/lib/utils.ts" } } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("Reading utils.ts");
});

test("getToolLabel: str_replace_editor view, done", () => {
  const tool = { state: "result", toolCallId: "1", toolName: "str_replace_editor", args: { command: "view", path: "src/lib/utils.ts" }, result: "" } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("Read utils.ts");
});

test("getToolLabel: str_replace_editor undo_edit, pending", () => {
  const tool = { state: "call", toolCallId: "1", toolName: "str_replace_editor", args: { command: "undo_edit", path: "src/index.tsx" } } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("Undoing edit in index.tsx");
});

test("getToolLabel: str_replace_editor undo_edit, done", () => {
  const tool = { state: "result", toolCallId: "1", toolName: "str_replace_editor", args: { command: "undo_edit", path: "src/index.tsx" }, result: "" } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("Undid edit in index.tsx");
});

test("getToolLabel: file_manager rename, pending", () => {
  const tool = { state: "call", toolCallId: "1", toolName: "file_manager", args: { command: "rename", path: "src/Old.jsx", new_path: "src/New.jsx" } } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("Renaming Old.jsx");
});

test("getToolLabel: file_manager rename, done", () => {
  const tool = { state: "result", toolCallId: "1", toolName: "file_manager", args: { command: "rename", path: "src/Old.jsx", new_path: "src/New.jsx" }, result: {} } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("Renamed Old.jsx to New.jsx");
});

test("getToolLabel: file_manager delete, pending", () => {
  const tool = { state: "call", toolCallId: "1", toolName: "file_manager", args: { command: "delete", path: "src/Unused.jsx" } } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("Deleting Unused.jsx");
});

test("getToolLabel: file_manager delete, done", () => {
  const tool = { state: "result", toolCallId: "1", toolName: "file_manager", args: { command: "delete", path: "src/Unused.jsx" }, result: {} } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("Deleted Unused.jsx");
});

test("getToolLabel: flat path with no slashes", () => {
  const tool = { state: "call", toolCallId: "1", toolName: "str_replace_editor", args: { command: "create", path: "App.jsx" } } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("Creating App.jsx");
});

test("getToolLabel: unknown toolName falls back to toolName", () => {
  const tool = { state: "call", toolCallId: "1", toolName: "other_tool", args: {} } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("other_tool");
});

test("getToolLabel: unknown command falls back to toolName", () => {
  const tool = { state: "call", toolCallId: "1", toolName: "str_replace_editor", args: { command: "unknown_cmd", path: "src/file.ts" } } as ToolInvocation;
  expect(getToolLabel(tool)).toBe("str_replace_editor");
});

// --- ToolInvocationDisplay render tests ---

test("ToolInvocationDisplay shows spinner when pending", () => {
  const tool = { state: "call", toolCallId: "1", toolName: "str_replace_editor", args: { command: "create", path: "Card.jsx" } } as ToolInvocation;
  const { container } = render(<ToolInvocationDisplay toolInvocation={tool} />);
  expect(container.querySelector(".animate-spin")).not.toBeNull();
});

test("ToolInvocationDisplay shows green dot when done", () => {
  const tool = { state: "result", toolCallId: "1", toolName: "str_replace_editor", args: { command: "create", path: "Card.jsx" }, result: "" } as ToolInvocation;
  const { container } = render(<ToolInvocationDisplay toolInvocation={tool} />);
  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolInvocationDisplay shows friendly done label", () => {
  const tool = { state: "result", toolCallId: "1", toolName: "str_replace_editor", args: { command: "create", path: "src/components/Card.jsx" }, result: "" } as ToolInvocation;
  render(<ToolInvocationDisplay toolInvocation={tool} />);
  expect(screen.getByText("Created Card.jsx")).toBeDefined();
});

test("ToolInvocationDisplay shows friendly pending label", () => {
  const tool = { state: "call", toolCallId: "1", toolName: "str_replace_editor", args: { command: "str_replace", path: "src/App.jsx" } } as ToolInvocation;
  render(<ToolInvocationDisplay toolInvocation={tool} />);
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("ToolInvocationDisplay falls back to toolName for unknown tool", () => {
  const tool = { state: "call", toolCallId: "1", toolName: "other_tool", args: {} } as ToolInvocation;
  render(<ToolInvocationDisplay toolInvocation={tool} />);
  expect(screen.getByText("other_tool")).toBeDefined();
});

test("ToolInvocationDisplay accepts extra className", () => {
  const tool = { state: "call", toolCallId: "1", toolName: "str_replace_editor", args: { command: "create", path: "Card.jsx" } } as ToolInvocation;
  const { container } = render(<ToolInvocationDisplay toolInvocation={tool} className="custom-class" />);
  expect(container.firstElementChild?.className).toContain("custom-class");
});
