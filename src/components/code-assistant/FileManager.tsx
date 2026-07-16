"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, FileCode2, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { detectLanguage, LANGUAGE_LABELS, type CodeFile } from "@/lib/code-assistant/shared";

interface FileManagerProps {
  files: CodeFile[];
  activeFileIndex: number;
  onActiveFileChange: (index: number) => void;
  onFilesChange: (files: CodeFile[]) => void;
  defaultLanguage: string;
}

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
const MAX_FILES = 10;

export default function FileManager({
  files,
  activeFileIndex,
  onActiveFileChange,
  onFilesChange,
  defaultLanguage,
}: FileManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFilesSelected = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const newFiles: CodeFile[] = [];
      const errors: string[] = [];

      for (const file of Array.from(fileList)) {
        if (files.length + newFiles.length >= MAX_FILES) {
          errors.push(`تم تجاوز الحد الأقصى (${MAX_FILES} ملفات)`);
          break;
        }

        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name} يتجاوز 1MB`);
          continue;
        }

        try {
          const content = await file.text();
          const language = detectLanguage(file.name);
          newFiles.push({
            filename: file.name,
            language,
            content,
          });
        } catch (err: any) {
          errors.push(`تعذّر قراءة ${file.name}`);
        }
      }

      if (newFiles.length > 0) {
        const updated = [...files, ...newFiles];
        onFilesChange(updated);
        onActiveFileChange(updated.length - newFiles.length);
        toast.success(`تمت إضافة ${newFiles.length} ملف`);
      }

      if (errors.length > 0) {
        toast.error(errors[0]);
      }

      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    },
    [files, onFilesChange, onActiveFileChange]
  );

  const handleCreateBlank = useCallback(() => {
    if (files.length >= MAX_FILES) {
      toast.error(`تم تجاوز الحد الأقصى (${MAX_FILES} ملفات)`);
      return;
    }
    const name = `untitled-${files.length + 1}.txt`;
    const newFile: CodeFile = {
      filename: name,
      language: defaultLanguage,
      content: "",
    };
    onFilesChange([...files, newFile]);
    onActiveFileChange(files.length);
  }, [files, onFilesChange, onActiveFileChange, defaultLanguage]);

  const handleRemoveFile = useCallback(
    (index: number) => {
      const updated = files.filter((_, i) => i !== index);
      onFilesChange(updated);
      if (activeFileIndex >= updated.length) {
        onActiveFileChange(Math.max(0, updated.length - 1));
      } else if (activeFileIndex > index) {
        onActiveFileChange(activeFileIndex - 1);
      }
    },
    [files, activeFileIndex, onFilesChange, onActiveFileChange]
  );

  const handleRenameFile = useCallback(
    (index: number, newFilename: string) => {
      const updated = [...files];
      updated[index] = {
        ...updated[index],
        filename: newFilename,
        language: detectLanguage(newFilename),
      };
      onFilesChange(updated);
    },
    [files, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFilesSelected(e.dataTransfer.files);
    },
    [handleFilesSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  return (
    <div
      className="flex flex-col h-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* File tabs */}
      <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-2 py-1.5 overflow-x-auto">
        {files.length === 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2">
            <FileText className="h-3.5 w-3.5" />
            <span>لا توجد ملفات - ارفع ملفاً أو أنشئ واحداً</span>
          </div>
        ) : (
          files.map((file, idx) => (
            <div
              key={idx}
              className={`group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs cursor-pointer transition-colors shrink-0 ${
                idx === activeFileIndex
                  ? "bg-background text-foreground border border-border shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
              onClick={() => onActiveFileChange(idx)}
            >
              <FileCode2 className="h-3 w-3 text-primary" />
              <input
                type="text"
                value={file.filename}
                onChange={(e) => handleRenameFile(idx, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-none outline-none w-24 text-xs focus:bg-muted/50 px-1 rounded"
                aria-label="اسم الملف"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(idx);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                aria-label="إزالة"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))
        )}

        <div className="flex items-center gap-1 ml-auto shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCreateBlank}
                disabled={files.length >= MAX_FILES}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>ملف جديد</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => inputRef.current?.click()}
                disabled={files.length >= MAX_FILES}
              >
                <Upload className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>رفع ملفات (حتى {MAX_FILES} ملفات، 1MB لكل ملف)</TooltipContent>
          </Tooltip>

          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
            accept=".js,.mjs,.cjs,.jsx,.ts,.tsx,.py,.java,.cs,.go,.rs,.php,.html,.htm,.css,.scss,.sass,.json,.sql,.sh,.bash,.zsh,.cpp,.cc,.cxx,.c,.h,.hpp,.rb,.swift,.kt,.yml,.yaml,.xml,.md,.txt"
          />
        </div>
      </div>

      {/* Drag overlay */}
      {dragActive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto text-primary mb-1" />
            <p className="text-xs font-medium text-primary">أفلت الملفات هنا</p>
          </div>
        </div>
      )}
    </div>
  );
}
