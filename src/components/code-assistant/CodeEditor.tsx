"use client";

import { useCallback, useSyncExternalStore } from "react";
import Editor, { type OnMount, type OnChange } from "@monaco-editor/react";
import { useTheme } from "next-themes";

// Track mounted state without setState-in-effect lint error
const emptySubscribe = () => () => {};
function getMountedSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
  placeholder?: string;
}

// Map our internal language identifiers to Monaco language IDs
const MONACO_LANG_MAP: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  jsx: "javascript",
  tsx: "typescript",
  python: "python",
  java: "java",
  csharp: "csharp",
  go: "go",
  rust: "rust",
  php: "php",
  html: "html",
  css: "css",
  json: "json",
  sql: "sql",
  bash: "shell",
  cpp: "cpp",
  ruby: "ruby",
  swift: "swift",
  kotlin: "kotlin",
};

export default function CodeEditor({
  value,
  onChange,
  language,
  height = "100%",
  placeholder,
}: CodeEditorProps) {
  const monacoLang = MONACO_LANG_MAP[language] || "plaintext";
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getMountedSnapshot,
    getServerSnapshot
  );

  const isDark = (resolvedTheme || "dark") === "dark";

  const handleMount: OnMount = useCallback((editor, monaco) => {
    // Define a custom dark theme matching our VS Code-like palette
    monaco.editor.defineTheme("codementor-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6b7280", fontStyle: "italic" },
        { token: "keyword", foreground: "c084fc" },
        { token: "string", foreground: "86efac" },
        { token: "number", foreground: "fbbf24" },
        { token: "regexp", foreground: "f9a8d4" },
        { token: "type", foreground: "67e8f9" },
        { token: "function", foreground: "60a5fa" },
        { token: "variable", foreground: "e5e7eb" },
      ],
      colors: {
        "editor.background": "#0f1729",
        "editor.foreground": "#e5e7eb",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#94a3b8",
        "editorCursor.foreground": "#34d399",
        "editor.selectionBackground": "#1e3a5f",
        "editor.inactiveSelectionBackground": "#1e293b",
        "editor.lineHighlightBackground": "#1e293b",
        "editor.lineHighlightBorder": "#00000000",
        "editorIndentGuide.background": "#1e293b",
        "editorIndentGuide.activeBackground": "#475569",
        "editorWidget.background": "#0f1729",
        "editorWidget.border": "#1e293b",
        "editorSuggestWidget.background": "#0f1729",
        "editorSuggestWidget.border": "#1e293b",
        "editorSuggestWidget.selectedBackground": "#1e3a5f",
        "input.background": "#1e293b",
        "input.border": "#334155",
        "scrollbarSlider.background": "#33415580",
        "scrollbarSlider.hoverBackground": "#47556980",
        "scrollbarSlider.activeBackground": "#64748b80",
      },
    });

    // Define a light theme
    monaco.editor.defineTheme("codementor-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6b7280", fontStyle: "italic" },
        { token: "keyword", foreground: "9333ea" },
        { token: "string", foreground: "166534" },
        { token: "number", foreground: "b45309" },
        { token: "regexp", foreground: "be185d" },
        { token: "type", foreground: "0e7490" },
        { token: "function", foreground: "2563eb" },
        { token: "variable", foreground: "1f2937" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#1f2937",
        "editorLineNumber.foreground": "#9ca3af",
        "editorLineNumber.activeForeground": "#374151",
        "editorCursor.foreground": "#0d9488",
        "editor.selectionBackground": "#ccfbf1",
        "editor.inactiveSelectionBackground": "#e0f2fe",
        "editor.lineHighlightBackground": "#f3f4f6",
        "editor.lineHighlightBorder": "#00000000",
        "editorIndentGuide.background": "#e5e7eb",
        "editorIndentGuide.activeBackground": "#9ca3af",
        "editorWidget.background": "#ffffff",
        "editorWidget.border": "#e5e7eb",
        "editorSuggestWidget.background": "#ffffff",
        "editorSuggestWidget.border": "#e5e7eb",
        "editorSuggestWidget.selectedBackground": "#ccfbf1",
        "input.background": "#f9fafb",
        "input.border": "#e5e7eb",
        "scrollbarSlider.background": "#d1d5db80",
        "scrollbarSlider.hoverBackground": "#9ca3af80",
        "scrollbarSlider.activeBackground": "#6b728080",
      },
    });

    monaco.editor.setTheme(isDark ? "codementor-dark" : "codementor-light");

    editor.updateOptions({
      padding: { top: 12, bottom: 12 },
    });
  }, [isDark]);

  const handleChange: OnChange = useCallback(
    (val) => {
      onChange(val ?? "");
    },
    [onChange]
  );

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
        جارٍ تحميل المحرر...
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Editor
        height={height}
        language={monacoLang}
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        theme={isDark ? "codementor-dark" : "codementor-light"}
        loading={
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
            جارٍ تحميل المحرر...
          </div>
        }
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
          fontLigatures: true,
          lineNumbers: "on",
          renderWhitespace: "selection",
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          wordWrap: "on",
          tabSize: 2,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          fixedOverflowWidgets: true,
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            useShadows: false,
          },
        }}
      />
      {!value && placeholder && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-sm">
          {placeholder}
        </div>
      )}
    </div>
  );
}
