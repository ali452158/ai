"use client";

import { useState, useMemo, useCallback } from "react";
import { Check, Copy, FileCode2, ImageIcon, VideoIcon, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";

interface MessageRendererProps {
  content: string;
}

interface Segment {
  type: "text" | "code" | "image" | "image_url" | "video" | "video_url";
  content: string;
  language?: string;
}

// Parses content into segments: text, code blocks, image markers, video markers
function parseContent(content: string): Segment[] {
  const segments: Segment[] = [];
  const lines = content.split("\n");
  let currentText: string[] = [];
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];

  const flushText = () => {
    if (currentText.length > 0) {
      const text = currentText.join("\n");
      if (text.trim()) {
        // Check for image/video markers within text
        const markerRegex = /\[\[(IMAGE|IMAGE_URL|IMAGE_BASE64|VIDEO|VIDEO_URL):([^\]]+)\]\]/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        const parts: Array<{ text?: string; type?: string; value?: string }> = [];

        while ((match = markerRegex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            parts.push({ text: text.slice(lastIndex, match.index) });
          }
          parts.push({ type: match[1], value: match[2] });
          lastIndex = markerRegex.lastIndex;
        }
        if (lastIndex < text.length) {
          parts.push({ text: text.slice(lastIndex) });
        }

        if (parts.length === 0) {
          segments.push({ type: "text", content: text.trim() });
        } else {
          for (const part of parts) {
            if (part.text && part.text.trim()) {
              segments.push({ type: "text", content: part.text.trim() });
            } else if (part.type === "IMAGE") {
              segments.push({ type: "image", content: part.value! });
            } else if (part.type === "IMAGE_URL") {
              segments.push({ type: "image_url", content: part.value! });
            } else if (part.type === "IMAGE_BASE64") {
              // Skip - stored as truncated base64 in DB, can't display
              segments.push({ type: "text", content: "[صورة محفوظة في الجلسة السابقة]" });
            } else if (part.type === "VIDEO") {
              segments.push({ type: "video", content: part.value! });
            } else if (part.type === "VIDEO_URL") {
              segments.push({ type: "video_url", content: part.value! });
            }
          }
        }
      }
      currentText = [];
    }
  };

  const flushCode = () => {
    if (codeLines.length > 0) {
      segments.push({
        type: "code",
        language: codeLang || "plaintext",
        content: codeLines.join("\n"),
      });
    }
    codeLines = [];
    codeLang = "";
  };

  for (const line of lines) {
    const codeStartMatch = line.match(/^```(\w*)$/);
    const codeEndMatch = line.match(/^```$/);

    if (codeStartMatch && !inCodeBlock) {
      flushText();
      inCodeBlock = true;
      codeLang = codeStartMatch[1] || "";
      continue;
    }

    if (codeEndMatch && inCodeBlock) {
      flushCode();
      inCodeBlock = false;
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
    } else {
      currentText.push(line);
    }
  }

  if (inCodeBlock) {
    flushCode();
  } else {
    flushText();
  }

  return segments.length > 0 ? segments : [{ type: "text", content }];
}

function CodeBlockView({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("تم نسخ الكود إلى الحافظة");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذّر نسخ الكود");
    }
  }, [code]);

  const lineCount = code.split("\n").length;

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-[#0f1729]" dir="ltr">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileCode2 className="h-3.5 w-3.5" />
          <span className="font-mono">{language}</span>
          <span className="text-muted-foreground/60">·</span>
          <span>{lineCount} {lineCount === 1 ? "سطر" : "أسطر"}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="نسخ الكود"
          type="button"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-primary" />
              <span className="text-primary">تم النسخ</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>نسخ</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed" dir="ltr">
        <code className="font-mono text-foreground/90">{code}</code>
      </pre>
    </div>
  );
}

function ImageView({ imagepath }: { imagepath: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // imagepath is like "images/xxx.png"
  const src = `/api/media/${imagepath}`;

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = src;
    a.download = imagepath.split("/").pop() || "image.png";
    a.click();
  }, [src, imagepath]);

  if (error) {
    return (
      <div className="my-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
        <ImageIcon className="h-4 w-4" />
        تعذّر تحميل الصورة
      </div>
    );
  }

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-muted/20">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" />
          <span>صورة مُولّدة</span>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          type="button"
        >
          <Download className="h-3 w-3" />
          تحميل
        </button>
      </div>
      <div className="relative flex items-center justify-center bg-black/5 min-h-[150px]">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            جارٍ تحميل الصورة...
          </div>
        )}
        <img
          src={src}
          alt="صورة مُولّدة"
          className="max-w-full max-h-[400px] object-contain"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          loading="lazy"
        />
      </div>
    </div>
  );
}

function ImageUrlView({ imageUrl }: { imageUrl: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `image-${Date.now()}.png`;
    a.click();
  }, [imageUrl]);

  if (error) {
    return (
      <div className="my-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
        <ImageIcon className="h-4 w-4" />
        تعذّر تحميل الصورة
      </div>
    );
  }

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-muted/20">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" />
          <span>صورة مُولّدة</span>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          type="button"
        >
          <Download className="h-3 w-3" />
          تحميل
        </button>
      </div>
      <div className="relative flex items-center justify-center bg-black/5 min-h-[150px]">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            جارٍ عرض الصورة...
          </div>
        )}
        <img
          src={imageUrl}
          alt="صورة مُولّدة"
          className="max-w-full max-h-[400px] object-contain"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          loading="lazy"
        />
      </div>
    </div>
  );
}

function VideoView({ videopath, isUrl }: { videopath: string; isUrl?: boolean }) {
  const [error, setError] = useState(false);

  // If isUrl, videopath is the direct URL. Otherwise it's "videos/xxx.mp4"
  const src = isUrl ? videopath : `/api/media/${videopath}`;

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = src;
    a.download = isUrl ? "video.mp4" : (videopath.split("/").pop() || "video.mp4");
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }, [src, videopath, isUrl]);

  if (error) {
    return (
      <div className="my-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
        <VideoIcon className="h-4 w-4" />
        تعذّر تحميل الفيديو
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="ms-auto flex items-center gap-1 underline hover:opacity-80"
        >
          <ExternalLink className="h-3 w-3" />
          فتح في تبويب
        </a>
      </div>
    );
  }

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-muted/20">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <VideoIcon className="h-3.5 w-3.5" />
          <span>فيديو مُولّد</span>
        </div>
        <div className="flex items-center gap-1">
          {!isUrl && (
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              فتح
            </a>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            type="button"
          >
            <Download className="h-3 w-3" />
            تحميل
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center bg-black min-h-[150px]">
        <video
          src={src}
          controls
          className="max-w-full max-h-[400px]"
          onError={() => setError(true)}
        >
          متصفحك لا يدعم تشغيل الفيديو.
        </video>
      </div>
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    try {
      if (match[2]) {
        parts.push(
          <strong key={key++} className="font-bold text-foreground">
            {match[2]}
          </strong>
        );
      } else if (match[3] !== undefined) {
        parts.push(
          <code
            key={key++}
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary ltr-text inline-block"
            dir="ltr"
          >
            {match[3]}
          </code>
        );
      } else if (match[4] && match[5]) {
        parts.push(
          <a
            key={key++}
            href={match[5]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            {match[4]}
          </a>
        );
      }
    } catch {
      parts.push(match[0]);
    }
    lastIndex = pattern.lastIndex;
    if (pattern.lastIndex === match.index) {
      pattern.lastIndex++;
    }
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function TextView({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={idx} className="h-2" />);
      return;
    }

    if (/^#{1,3}\s/.test(trimmed)) {
      const level = trimmed.match(/^(#+)/)?.[1].length || 1;
      const content = trimmed.replace(/^#+\s/, "");
      const cls =
        level === 1
          ? "text-base font-bold mt-3 mb-1"
          : level === 2
          ? "text-sm font-bold mt-2 mb-1"
          : "text-sm font-semibold mt-2 mb-1";
      elements.push(
        <div key={idx} className={cls}>
          {renderInline(content)}
        </div>
      );
      return;
    }

    if (/^[-*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      const content = trimmed.replace(/^[-*]\s|^\d+\.\s/, "");
      elements.push(
        <div key={idx} className="flex gap-2 my-0.5 text-sm">
          <span className="text-primary mt-0.5">•</span>
          <span className="flex-1">{renderInline(content)}</span>
        </div>
      );
      return;
    }

    elements.push(
      <p key={idx} className="text-sm leading-relaxed my-1">
        {renderInline(trimmed)}
      </p>
    );
  });

  return <>{elements}</>;
}

export default function MessageRenderer({ content }: MessageRendererProps) {
  const segments = useMemo(() => parseContent(content), [content]);

  return (
    <div className="space-y-1" dir="rtl">
      {segments.map((seg, idx) => {
        if (seg.type === "code") {
          return (
            <CodeBlockView
              key={idx}
              language={seg.language || "plaintext"}
              code={seg.content}
            />
          );
        }
        if (seg.type === "image") {
          return <ImageView key={idx} imagepath={seg.content} />;
        }
        if (seg.type === "image_url") {
          return <ImageUrlView key={idx} imageUrl={seg.content} />;
        }
        if (seg.type === "video") {
          return <VideoView key={idx} videopath={seg.content} />;
        }
        if (seg.type === "video_url") {
          return <VideoView key={idx} videopath={seg.content} isUrl />;
        }
        return <TextView key={idx} text={seg.content} />;
      })}
    </div>
  );
}
