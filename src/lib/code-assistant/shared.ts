// Shared types and utilities for the code assistant

import { SPECIALIZED_PROMPTS } from "./specialized-prompts";

export type Mode =
  | "edit"
  | "generate"
  | "explain"
  | "review"
  | "convert"
  | "custom"
  // Trading
  | "indicators"
  | "bots"
  // Media
  | "image"
  | "video"
  // Content
  | "youtube"
  | "telegram"
  | "tiktok"
  // SEO
  | "seo"
  // Platforms (real API integrations)
  | "youtube-analytics"
  | "telegram-bot";

export type AssistantCategory = "code" | "trading" | "media" | "content" | "seo" | "platforms";

// Returns which special API a mode uses (if any)
export function getSpecialApi(mode: Mode): "image" | "video" | null {
  if (mode === "image") return "image";
  if (mode === "video") return "video";
  return null;
}

// Returns true if the mode requires the chat API (not a special API)
export function usesChatApi(mode: Mode): boolean {
  return getSpecialApi(mode) === null;
}

// Returns the category for a given mode
export function getCategory(mode: Mode): AssistantCategory {
  if (["indicators", "bots"].includes(mode)) return "trading";
  if (["image", "video"].includes(mode)) return "media";
  if (["youtube", "telegram", "tiktok"].includes(mode)) return "content";
  if (mode === "seo") return "seo";
  if (["youtube-analytics", "telegram-bot"].includes(mode)) return "platforms";
  return "code";
}

export interface CodeFile {
  id?: string;
  filename: string;
  language: string;
  content: string;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  mode?: Mode;
  language?: string;
  error?: boolean;
  timestamp?: number;
}

export interface Conversation {
  id: string;
  title: string;
  mode: Mode;
  language: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  files?: CodeFile[];
}

export const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  jsx: "JSX (React)",
  tsx: "TSX (React + TypeScript)",
  python: "Python",
  java: "Java",
  csharp: "C#",
  go: "Go",
  rust: "Rust",
  php: "PHP",
  html: "HTML",
  css: "CSS",
  json: "JSON",
  sql: "SQL",
  bash: "Bash / Shell",
  cpp: "C++",
  ruby: "Ruby",
  swift: "Swift",
  kotlin: "Kotlin",
  plaintext: "Plain Text",
};

// Detect language from filename extension
export function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
    java: "java",
    cs: "csharp",
    go: "go",
    rs: "rust",
    php: "php",
    html: "html",
    htm: "html",
    css: "css",
    scss: "css",
    sass: "css",
    json: "json",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    c: "cpp",
    h: "cpp",
    hpp: "cpp",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
    yml: "json",
    yaml: "json",
    xml: "html",
    md: "plaintext",
    txt: "plaintext",
  };
  return map[ext] || "plaintext";
}

// Generate a conversation title from the first user message
export function generateTitle(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (cleaned.length <= 40) return cleaned || "محادثة جديدة";
  return cleaned.substring(0, 40) + "…";
}

// Build the system prompt based on mode
export function buildSystemPrompt(
  mode: Mode,
  language: string,
  targetLanguage?: string,
  hasMultipleFiles?: boolean,
  userPreferences?: string
): string {
  const langLabel = LANGUAGE_LABELS[language] || language;
  const targetLabel = targetLanguage ? LANGUAGE_LABELS[targetLanguage] || targetLanguage : "";

  const memoryNote = userPreferences
    ? `\n\n## ذاكرة المساعد (تعلم من تفاعلات سابقة)
${userPreferences}

استخدم هذه المعلومات لتخصيص ردودك. تذكّر تفضيلات المستخدم وتجنّب ما يكرهه.`
    : "";

  const base = `أنت "CodeMentor"، مساعد ذكاء اصطناعي خبير في هندسة البرمجيات، تتحدث العربية بطلاقة وتفهم اللهجات المختلفة. مهمتك مساعدة المطورين في كتابة وتحسين وشرح الأكواد البرمجية بدقة واحترافية عالية. أنت تتعلّم من كل تفاعل وتتذكّر سياق المستخدم.${memoryNote}

قواعد الإخراج (مهمة جداً):
1. عند تقديم كود معدّل أو جديد، ضعه داخل كتلة كود Markdown واحدة فقط بهذا الشكل:
\`\`\`${language}
<الكود هنا>
\`\`\`
2. اكتب الشرح والملاحظات بالعربية قبل الكود (إن لزم).
3. لا تكرر الكود نفسه عدة مرات. قدم فقط النسخة النهائية المعدّلة.
4. إن لم يكن هناك كود لتعديله (مثل وضع الشرح فقط)، يمكنك استخدام فقرات عادية.
5. كن دقيقاً وموجزاً. تجنب الحشو. ركّز على الحلول العملية.
6. إن اكتشفت أخطاء أمنية أو مشاكل أداء، اذكرها صراحة مع اقتراح الإصلاح.`;

  const multiFileNote = hasMultipleFiles
    ? `\n7. المستخدم قد يرفع عدة ملفات. عند الإشارة إلى ملف معين، اذكر اسمه بوضوح. إن كان التعديل يخص ملفاً واحداً، اكتب الكود داخل كتلة باسم الملف كتعليق في الأعلى.`
    : "";

  switch (mode) {
    case "edit":
      return `${base}${multiFileNote}

الوضع الحالي: تعديل كود ${langLabel}
المستخدم سيرفق كوداً موجوداً ويطلب تعديلاً محدداً. مهمتك:
- تطبيق التعديل المطلوب بدقة دون تغيير البنية العامة دون داعٍ.
- الحفاظ على أسلوب الكود الأصلي (تسمية المتغيرات، المسافات البادئة، التعليقات).
- إن كان التعديل يتطلب إعادة هيكلة، اشرح السبب بإيجاز.
- قدم الكود المعدّل كاملاً (وليس فقط الجزء المتغير) داخل كتلة كود واحدة.`;

    case "generate":
      return `${base}

الوضع الحالي: توليد كود ${langLabel}
المستخدم سيصف ما يريد بناءه. مهمتك:
- توليد كود كامل وقابل للتشغيل من الوصف النصي.
- اتباع أفضل الممارسات والمعايير الحديثة للغة المختارة.
- إضافة تعليقات توضيحية موجزة بالعربية للأجزاء المعقدة فقط.
- إن كان الكود يتطلب مكتبات خارجية، اذكر اسم المكتبة في تعليق أعلى الكود.
- قدم الكود داخل كتلة كود واحدة.`;

    case "explain":
      return `${base}

الوضع الحالي: شرح كود ${langLabel}
المستخدم سيرفق كوداً ويطلب شرحه. مهمتك:
- شرح وظيفة الكود بشكل عام أولاً (فقرة واحدة).
- ثم شرح الأجزاء المهمة بالتفصيل (نقاط أو فقرات قصيرة).
- ذكر أي مفاهيم برمجية متقدمة قد يحتاج المستخدم معرفتها.
- لا تُعد كتابة الكود، فقط اشرحه. استخدم فقرات عادية بدون كتل كود إلا إذا كنت تقتبس جزءاً صغيراً.`;

    case "review":
      return `${base}

الوضع الحالي: مراجعة كود ${langLabel}
المستخدم سيرفق كوداً ويطلب مراجعته. مهمتك:
- فحص الكود بحثاً عن: أخطاء منطقية، ثغرات أمنية، مشاكل أداء، ممارسات سيئة.
- تقديم تقرير منظم بالعربية بهذا الشكل:
  🔴 مشاكل حرجة: (إن وجدت)
  🟡 تحذيرات: (إن وجدت)
  🟢 اقتراحات تحسين: (إن وجدت)
- بعد التقرير، قدم نسخة محسّنة من الكود داخل كتلة كود واحدة.`;

    case "convert":
      return `${base}

الوضع الحالي: تحويل كود من ${langLabel} إلى ${targetLabel}
المستخدم سيرفق كوداً ويريد تحويله إلى لغة أخرى. مهمتك:
- الحفاظ على نفس الوظيفة والمنطق في الكود المحوّل.
- اتباع أسلوب اللغة الهدف ومعاييرها (مثلاً: استخدم list comprehensions في Python، arrows في JS، إلخ).
- إن لم يكن هناك مقابل مباشر لمكتبة أو دالة، اشرح البديل المقترح.
- قدم الكود المحوّل كاملاً داخل كتلة كود واحدة بلغة الهدف.`;

    case "indicators":
      return SPECIALIZED_PROMPTS.indicators.systemPrompt;

    case "bots":
      return SPECIALIZED_PROMPTS.bots.systemPrompt;

    case "image":
      return SPECIALIZED_PROMPTS.image.systemPrompt;

    case "video":
      return SPECIALIZED_PROMPTS.video.systemPrompt;

    case "youtube":
      return SPECIALIZED_PROMPTS.youtube.systemPrompt;

    case "telegram":
      return SPECIALIZED_PROMPTS.telegram.systemPrompt;

    case "tiktok":
      return SPECIALIZED_PROMPTS.tiktok.systemPrompt;

    case "seo":
      return SPECIALIZED_PROMPTS.seo.systemPrompt;

    case "youtube-analytics":
      return `أنت "YouTube Analytics Mentor"، مساعد متخصص في تحليل بيانات يوتيوب الحقيقية. المستخدم سيشاركك بيانات من YouTube Data API (إحصائيات فيديو، قناة، ترندات، نتائج بحث). مهمتك:
1. تحليل البيانات المُقدّمة واستخراج الرؤى المفيدة.
2. مقارنة الأداء بين الفيديوهات أو القنوات.
3. اقتراح استراتيجيات لتحسين الأداء بناءً على البيانات.
4. تحديد أنماط النجاح (مثلاً: أفضل أوقات النشر، أنواع المحتوى الرائجة).
5. تقديم توصيات عملية وقابلة للتنفيذ.
كن دقيقاً وموضوعياً، استخدم الأرقام لدعم استنتاجاتك.`;

    case "telegram-bot":
      return `أنت "Telegram Bot Mentor"، مساعد متخصص في مساعدة المستخدمين على إدارة بوتات تلجرام. المستخدم يستخدم أدوات حقيقية للتحكم في بوتاته. مهمتك:
1. شرح كيفية استخدام البوت والـ Chat IDs.
2. اقتراح سكربتات ووظائف متقدمة للبوت.
3. حل مشاكل شائعة في بوتات تلجرام (rate limits، privacy mode، inline queries).
4. اقتراح استراتيجيات لإدارة القنوات والمشتركين.
5. شرح ميزات Telegram Bot API المتقدمة (payments, mini apps, webhooks).
كن عملياً ومباشراً.`;

    default:
      return `${base}

الوضع الحالي: محادثة عامة عن البرمجة
أجب على أسئلة المستخدم بدقة واحترافية. إن كان السؤال يتطلب تقديم كود، استخدم كتلة كود Markdown مناسبة.`;
  }
}

// Build the user message body
export function buildUserMessage(
  body: {
    code: string;
    language: string;
    mode: Mode;
    instruction: string;
    targetLanguage?: string;
    files?: Array<{ filename: string; language: string; content: string }>;
  }
): string {
  const langLabel = LANGUAGE_LABELS[body.language] || body.language;
  const hasFiles = body.files && body.files.length > 0;

  // If multiple files, format them as a multi-file context
  if (hasFiles && body.files!.length > 0) {
    const filesSection = body.files!
      .map(
        (f) =>
          `// === الملف: ${f.filename} ===\n\`\`\`${f.language}\n${f.content}\n\`\`\``
      )
      .join("\n\n");

    switch (body.mode) {
      case "edit":
        return `تعديل مطلوب: ${body.instruction}

الملفات المرفقة:
${filesSection}`;
      case "explain":
        return `اشرح الملفات التالية بالتفصيل:
${filesSection}`;
      case "review":
        return `راجع الملفات التالية واكتشف المشاكل والتحسينات الممكنة:
${filesSection}
${body.instruction ? `\nملاحظة إضافية: ${body.instruction}` : ""}`;
      case "convert":
        return `حوّل الملفات التالية من ${langLabel} إلى ${LANGUAGE_LABELS[body.targetLanguage || ""] || body.targetLanguage}:
${filesSection}`;
      default:
        return `${body.instruction}\n\nالملفات:\n${filesSection}`;
    }
  }

  // Single file / inline code path
  switch (body.mode) {
    case "edit":
      return `تعديل مطلوب: ${body.instruction}

الكود الحالي (${langLabel}):
\`\`\`${body.language}
${body.code}
\`\`\``;

    case "generate":
      return `المطلوب: ${body.instruction}
${body.code ? `\nكود مرجعي (إن وجد):\n\`\`\`${body.language}\n${body.code}\n\`\`\`` : ""}`;

    case "explain":
      return `اشرح الكود التالي بالتفصيل:
\`\`\`${body.language}
${body.code}
\`\`\``;

    case "review":
      return `راجع الكود التالي واكتشف المشاكل والتحسينات الممكنة:
\`\`\`${body.language}
${body.code}
\`\`\`
${body.instruction ? `\nملاحظة إضافية: ${body.instruction}` : ""}`;

    case "convert":
      return `حوّل الكود التالي من ${langLabel} إلى ${LANGUAGE_LABELS[body.targetLanguage || ""] || body.targetLanguage}:
\`\`\`${body.language}
${body.code}
\`\`\``;

    case "indicators":
    case "bots":
    case "youtube":
    case "telegram":
    case "tiktok":
    case "seo":
    case "youtube-analytics":
    case "telegram-bot":
      return `${body.instruction}${body.code ? `\n\nالسياق (كود موجود):\n\`\`\`${body.language}\n${body.code}\n\`\`\`` : ""}`;

    case "image":
    case "video":
      return body.instruction;

    default:
      return `${body.instruction}${body.code ? `\n\nالكود:\n\`\`\`${body.language}\n${body.code}\n\`\`\`` : ""}`;
  }
}
