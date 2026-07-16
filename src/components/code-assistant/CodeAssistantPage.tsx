"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Bot,
  Code2,
  Sparkles,
  Wand2,
  BookOpen,
  ShieldCheck,
  RefreshCw,
  Send,
  Trash2,
  User,
  Copy,
  Check,
  FileCode2,
  Zap,
  Github,
  Loader2,
  PanelRightOpen,
  PanelRightClose,
  Square,
  TrendingUp,
  Cpu,
  ImageIcon,
  VideoIcon,
  Youtube,
  Send as TelegramIcon,
  Music2,
  Search as SearchIcon,
  Brain,
  Settings,
  X,
  Plus,
  Key,
  Plug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import CodeEditor from "./CodeEditor";
import MessageRenderer from "./MessageRenderer";
import ErrorBoundary from "./ErrorBoundary";
import ConversationsSidebar from "./ConversationsSidebar";
import FileManager from "./FileManager";
import { ThemeToggle } from "@/components/theme-toggle";
import { useStreamChat } from "@/hooks/use-stream-chat";
import { useApiKeys } from "@/hooks/use-api-keys";
import {
  LANGUAGE_LABELS,
  detectLanguage,
  generateTitle,
  getCategory,
  getSpecialApi,
  type Mode,
  type CodeFile,
  type Conversation,
  type AssistantCategory,
} from "@/lib/code-assistant/shared";
import ApiKeysDialog from "@/components/platform-integration/ApiKeysDialog";
import YouTubeTools from "@/components/platform-integration/YouTubeTools";
import TelegramTools from "@/components/platform-integration/TelegramTools";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: Mode;
  language?: string;
  error?: boolean;
  timestamp: number;
  streaming?: boolean;
  loading?: boolean; // for image/video generation
  loadingType?: "image" | "video";
}

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "jsx", label: "JSX (React)" },
  { value: "tsx", label: "TSX (React + TS)" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" },
  { value: "cpp", label: "C++" },
  { value: "ruby", label: "Ruby" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "plaintext", label: "Plain Text" },
];

interface ModeInfo {
  value: Mode;
  label: string;
  icon: React.ElementType;
  description: string;
  placeholder: string;
  requiresCode: boolean;
  category: AssistantCategory;
}

const MODES: ModeInfo[] = [
  // Code category
  {
    value: "edit",
    label: "تعديل",
    icon: Wand2,
    description: "عدّل الكود الموجود حسب طلبك",
    placeholder: "صف التعديل المطلوب... مثال: أضف معالجة الأخطاء، حوّل الـ callback إلى async/await، أضف تعليقات...",
    requiresCode: true,
    category: "code",
  },
  {
    value: "generate",
    label: "توليد",
    icon: Sparkles,
    description: "اكتب كوداً جديداً من وصف نصي",
    placeholder: "صف الكود الذي تريد توليده... مثال: دالة لحساب Fibonacci بطريقة memoization، مكون React لعرض بطاقة منتج...",
    requiresCode: false,
    category: "code",
  },
  {
    value: "explain",
    label: "شرح",
    icon: BookOpen,
    description: "اشرح الكود الموجود بالتفصيل",
    placeholder: "أي جانب من الكود تريد شرحه بالتفصيل؟ (اتركه فارغاً لشرح شامل)",
    requiresCode: true,
    category: "code",
  },
  {
    value: "review",
    label: "مراجعة",
    icon: ShieldCheck,
    description: "افحص الكود بحثاً عن الأخطاء والثغرات",
    placeholder: "أي جوانب تريد التركيز عليها؟ (اتركه فارغاً لمراجعة شاملة)",
    requiresCode: true,
    category: "code",
  },
  {
    value: "convert",
    label: "تحويل",
    icon: RefreshCw,
    description: "حوّل الكود إلى لغة برمجة أخرى",
    placeholder: "سيتم تحويل الكود إلى اللغة المختارة في الأسفل",
    requiresCode: true,
    category: "code",
  },
  {
    value: "custom",
    label: "محادثة",
    icon: Bot,
    description: "اسأل أي سؤال برمجي",
    placeholder: "اكتب سؤالك أو طلبك البرمجي...",
    requiresCode: false,
    category: "code",
  },
  // Trading category
  {
    value: "indicators",
    label: "مؤشرات",
    icon: TrendingUp,
    description: "برمجة مؤشرات التداول (Pine Script, MQL4/5, ThinkScript)",
    placeholder: "صف المؤشر المطلوب... مثال: مؤشر RSI مع تنبيهات في TradingView، مؤشر MACD مخصص لميتاتريدر 5، مؤشر VWAP بجلسات...",
    requiresCode: false,
    category: "trading",
  },
  {
    value: "bots",
    label: "بوتات تداول",
    icon: Cpu,
    description: "برمجة بوتات تداول آلية (Python, MQL, freqtrade)",
    placeholder: "صف البوت المطلوب... مثال: بوت grid trading لـ Binance، EA لميتاتريدر باستخدام crossover، استراتيجية mean-reversion بـ ccxt...",
    requiresCode: false,
    category: "trading",
  },
  // Media category
  {
    value: "image",
    label: "توليد صور",
    icon: ImageIcon,
    description: "توليد صور بالذكاء الاصطناعي من وصف نصي",
    placeholder: "صف الصورة التي تريد توليدها... مثال: غروب الشمس على شاطئ استوائي بأسلوب واقعي، شعار شركة تقنية بأسلوب مينيمال، شخصية أنمي في مدينة مستقبلية...",
    requiresCode: false,
    category: "media",
  },
  {
    value: "video",
    label: "توليد فيديو",
    icon: VideoIcon,
    description: "توليد فيديوهات قصيرة بالذكاء الاصطناعي",
    placeholder: "صف الفيديو الذي تريد توليده... مثال: طائرة درون تحلق فوق جبال الألب وقت الغروب، موجة بحر تتحطم على صخرة بطريقة بطيئة، مدينة مستقبلية بإضاءة نيون ليلية...",
    requiresCode: false,
    category: "media",
  },
  // Content category
  {
    value: "youtube",
    label: "يوتيوب",
    icon: Youtube,
    description: "عناوين، أوصاف، سكربتات، و SEO ليوتيوب",
    placeholder: "صف الفيديو أو المحتوى المطلوب... مثال: فيديو تعليمي عن البدء في Docker للمبتدئين، عنوان جذاب لمراجعة iPhone 15 Pro، سكربت فيديو عن نصائح إنتاجية...",
    requiresCode: false,
    category: "content",
  },
  {
    value: "telegram",
    label: "تلجرام",
    icon: TelegramIcon,
    description: "بوتات تلجرام، قنوات، ومنشورات",
    placeholder: "صف ما تريد بناءه... مثال: بوت تلجرام للرد التلقائي على الأسئلة الشائعة، بوت لجدولة المنشورات في قناة، كود bot مع inline keyboards و payments...",
    requiresCode: false,
    category: "content",
  },
  {
    value: "tiktok",
    label: "تيك توك",
    icon: Music2,
    description: "أفكار فيديوهات، hooks، وهاشتاجات تيك توك",
    placeholder: "صف محتوى تيك توك المطلوب... مثال: 5 أفكار فيديو عن تداول العملات الرقمية للمبتدئين، hooks قوية لفيديو عن نصائح CV، سكربت فيديو توعوي عن الاحتيال الإلكتروني...",
    requiresCode: false,
    category: "content",
  },
  // SEO category
  {
    value: "seo",
    label: "SEO",
    icon: SearchIcon,
    description: "تحسين محركات البحث: كلمات مفتاحية، meta، schema",
    placeholder: "اطلب تحليل أو تحسين SEO... مثال: تحليل SEO لمقال عن 'تعلم البرمجة'، اكتب meta tags لصفحة بيع منتج، اقترح كلمات مفتاحية لمتجر إلكتروني للملابس...",
    requiresCode: false,
    category: "seo",
  },
  // Platforms category (real API integrations)
  {
    value: "youtube-analytics",
    label: "YouTube تحليل",
    icon: Youtube,
    description: "تحليل حقيقي لفيديوهات وقنوات يوتيوب باستخدام YouTube Data API",
    placeholder: "أدخل رابط فيديو أو اسم قناة لتحليلها... (يتطلب مفتاح API)",
    requiresCode: false,
    category: "platforms",
  },
  {
    value: "telegram-bot",
    label: "Telegram بوت",
    icon: TelegramIcon,
    description: "تحكم حقيقي في بوت تلجرام: إرسال رسائل، قراءة تحديثات، معلومات البوت",
    placeholder: "أدخل Chat ID أو استخدم أدوات البوت... (يتطلب Bot Token)",
    requiresCode: false,
    category: "platforms",
  },
];

const CATEGORY_INFO: Record<AssistantCategory, { label: string; icon: React.ElementType }> = {
  code: { label: "برمجة", icon: Code2 },
  trading: { label: "تداول", icon: TrendingUp },
  media: { label: "وسائط", icon: ImageIcon },
  content: { label: "محتوى", icon: Youtube },
  seo: { label: "SEO", icon: SearchIcon },
  platforms: { label: "منصات", icon: Plug },
};

const DEFAULT_CODE = `// اكتب أو الصق الكود هنا...

function example() {
  console.log("مرحباً بالعالم!");
  return 42;
}`;

const QUICK_ACTIONS: Record<Mode, string[]> = {
  edit: ["أضف معالجة أخطاء شاملة", "حوّل إلى async/await", "أضف تعليقات توضيحية", "حسّن الأداء"],
  generate: ["دالة لحساب Fibonacci", "مكوّن React لبطاقة منتج", "API endpoint لـ CRUD", "خوارزمية ترتيب سريع"],
  explain: ["اشرح الكود خطوة بخطوة", "ما هي التعقيد الزمني؟", "اشرح المفاهيم البرمجية"],
  review: ["افحص الثغرات الأمنية", "افحص مشاكل الأداء", "اقترح تحسينات للقراءة"],
  convert: [],
  custom: ["ما الفرق بين let و const؟", "اشرح closures", "كيف أبدأ مع Docker؟"],
  indicators: [
    "مؤشر RSI مع تنبيهات في TradingView",
    "مؤشر MACD مخصص لـ MetaTrader 5",
    "مؤشر Volume Weighted Average Price",
    "مؤشر Bollinger Bands مع إشارات",
  ],
  bots: [
    "بوت Grid Trading لـ Binance",
    "EA crossover لميتاتريدر",
    "استراتيجية mean-reversion بـ ccxt",
    "بوت arbitrage بين بورصتين",
  ],
  image: [
    "غروب على شاطئ استوائي واقعي",
    "شعار شركة تقنية مينيمال",
    "شخصية أنمي في مدينة مستقبلية",
    "منظر جبلي بأسلوب oil painting",
  ],
  video: [
    "طائرة درون فوق جبال الألب",
    "موجة بحر تتحطم بطيئة",
    "مدينة مستقبلية بإضاءة نيون",
    "زهرة تتفتح بتسارع زمني",
  ],
  youtube: [
    "عناوين لمراجعة iPhone 15",
    "سكربت فيديو تعليمي Docker",
    "أفكار缩略图 لقناة تقنية",
    "وصف SEO لمقطع طبخ",
  ],
  telegram: [
    "بوت رد تلقائي على الأسئلة",
    "بوت جدولة المنشورات",
    "بوت inline keyboard و payments",
    "قناة أخف تقنية مع تنسيق",
  ],
  tiktok: [
    "5 أفكار فيديو تداول للمبتدئين",
    "hooks قوية لفيديو نصائح CV",
    "سكربت توعوي عن الاحتيال",
    "هاشتاجات لمحتوى طبخ",
  ],
  seo: [
    "تحليل SEO لمقال 'تعلم البرمجة'",
    "meta tags لصفحة منتج",
    "كلمات مفتاحية لمتجر ملابس",
    "JSON-LD schema لمقال",
  ],
  "youtube-analytics": [],
  "telegram-bot": [],
};

const DEFAULT_PREFERENCES = `تفضيلاتي:
- اللغة المفضلة للأكواد: TypeScript
- أسلوب الكتابة: تعليقات بالعربية، أسلوب حديث (ES6+/modern syntax)
- التقنيات المفضلة: React, Next.js, Tailwind
- المستوى: متقدم`;

export default function CodeAssistantPage() {
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Code/files state
  const [inlineCode, setInlineCode] = useState<string>(DEFAULT_CODE);
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [useFileMode, setUseFileMode] = useState(false);

  // Mode/language state
  const [activeCategory, setActiveCategory] = useState<AssistantCategory>("code");
  const [language, setLanguage] = useState<string>("javascript");
  const [targetLanguage, setTargetLanguage] = useState<string>("python");
  const [mode, setMode] = useState<Mode>("edit");
  const [instruction, setInstruction] = useState<string>("");

  // Memory/learning state
  const [userPreferences, setUserPreferences] = useState<string>(DEFAULT_PREFERENCES);
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const [memoryDraft, setMemoryDraft] = useState<string>(DEFAULT_PREFERENCES);

  // API keys state
  const { hasYouTube, hasTelegram } = useApiKeys();
  const [apiKeysDialogOpen, setApiKeysDialogOpen] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { stream, abort, isStreaming } = useStreamChat();
  const videoPollRef = useRef<NodeJS.Timeout | null>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("codementor-preferences");
      if (saved) {
        setUserPreferences(saved);
        setMemoryDraft(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback(() => {
    try {
      localStorage.setItem("codementor-preferences", memoryDraft);
      setUserPreferences(memoryDraft);
      setMemoryDialogOpen(false);
      toast.success("تم حفظ تفضيلاتك");
    } catch {
      toast.error("تعذّر حفظ التفضيلات");
    }
  }, [memoryDraft]);

  // Cleanup video polling on unmount
  useEffect(() => {
    return () => {
      if (videoPollRef.current) {
        clearInterval(videoPollRef.current);
      }
    };
  }, []);

  // Auto-scroll on new messages or streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // When files are present, use them; otherwise use inline code
  const activeCode = useFileMode && files.length > 0
    ? files[activeFileIndex]?.content || ""
    : inlineCode;
  const activeLanguage = useFileMode && files.length > 0
    ? files[activeFileIndex]?.language || language
    : language;

  const currentMode = MODES.find((m) => m.value === mode)!;
  const modesForCategory = MODES.filter((m) => m.category === activeCategory);

  // When category changes, switch to first mode of that category
  const handleCategoryChange = useCallback((cat: AssistantCategory) => {
    setActiveCategory(cat);
    const firstMode = MODES.find((m) => m.category === cat);
    if (firstMode) setMode(firstMode.value);
  }, []);

  // Update active file content when editor changes (in file mode)
  const handleCodeChange = useCallback(
    (val: string) => {
      if (useFileMode && files.length > 0) {
        const updated = [...files];
        updated[activeFileIndex] = { ...updated[activeFileIndex], content: val };
        setFiles(updated);
      } else {
        setInlineCode(val);
      }
    },
    [useFileMode, files, activeFileIndex]
  );

  // Load a conversation from the database
  const handleLoadConversation = useCallback(async (conv: Conversation) => {
    setLoadingConversation(true);
    try {
      const res = await fetch(`/api/conversations/${conv.id}`);
      if (!res.ok) throw new Error("فشل تحميل المحادثة");
      const data: Conversation = await res.json();
      setActiveConversationId(data.id);
      const loadedMode = data.mode as Mode;
      setMode(loadedMode);
      setActiveCategory(getCategory(loadedMode));
      setLanguage(data.language);

      if (data.files && data.files.length > 0) {
        setFiles(data.files);
        setUseFileMode(true);
        setActiveFileIndex(0);
      } else {
        setFiles([]);
        setUseFileMode(false);
        setInlineCode(DEFAULT_CODE);
      }

      setMessages(
        (data.messages || []).map((m) => ({
          id: m.id || `msg-${Date.now()}-${Math.random()}`,
          role: m.role,
          content: m.content,
          mode: m.mode as Mode | undefined,
          language: m.language,
          error: m.error,
          timestamp: m.timestamp || Date.now(),
        }))
      );
    } catch (err: any) {
      toast.error("تعذّر تحميل المحادثة");
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  // New conversation
  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setFiles([]);
    setUseFileMode(false);
    setInlineCode(DEFAULT_CODE);
    setInstruction("");
    setMode("edit");
    setLanguage("javascript");
    setActiveCategory("code");
    setActiveFileIndex(0);
  }, []);

  // Persist files to DB when they change (debounced)
  useEffect(() => {
    if (!activeConversationId || !useFileMode || files.length === 0) return;
    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/conversations/${activeConversationId}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: files.map((f) => ({
              filename: f.filename,
              content: f.content,
              language: f.language,
            })),
          }),
        });
      } catch (err) {
        // Silent fail for autosave
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [files, activeConversationId, useFileMode]);

  // Image generation handler
  const handleImageGeneration = useCallback(
    async (userInstruction: string, conversationId: string | null) => {
      let convId = conversationId;
      const assistantMsgId = `a-${Date.now()}`;

      // Add loading message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          mode: "image",
          timestamp: Date.now(),
          loading: true,
          loadingType: "image",
        },
      ]);

      try {
        // First, ask the AI to optimize the prompt
        const promptRes = await fetch("/api/code-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: "",
            language: "plaintext",
            mode: "image",
            instruction: userInstruction,
            conversationId: convId,
            userPreferences,
            history: [],
          }),
        });

        if (!promptRes.ok) {
          const errData = await promptRes.json().catch(() => ({}));
          throw new Error(errData.error || "فشل توليد الـ prompt");
        }

        const promptData = await promptRes.json();
        const assistantContent: string = promptData.response || "";
        convId = promptData.conversationId || convId;
        if (convId && !activeConversationId) {
          setActiveConversationId(convId);
        }

        // Update message with the optimized prompt
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: assistantContent }
              : m
          )
        );

        // Extract the optimized English prompt from the response (between code blocks)
        const codeMatch = assistantContent.match(/```[a-zA-Z]*\n?([\s\S]*?)```/);
        let optimizedPrompt = codeMatch ? codeMatch[1].trim() : userInstruction;
        // Remove any "Dimensions:" line from the prompt
        optimizedPrompt = optimizedPrompt.replace(/^Dimensions:.*$/gm, "").trim();
        // Limit to first paragraph
        optimizedPrompt = optimizedPrompt.split("\n\n")[0].trim();

        // Generate the image
        const imgRes = await fetch("/api/image-generation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: optimizedPrompt,
            userInstruction,
            conversationId: convId,
          }),
        });

        if (!imgRes.ok) {
          const errData = await imgRes.json().catch(() => ({}));
          throw new Error(errData.error || "فشل توليد الصورة");
        }

        const imgData = await imgRes.json();

        // Update message with the image (use base64 data URL on Vercel)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: `${assistantContent}\n\n[[IMAGE_URL:${imgData.imageUrl}]]`,
                  loading: false,
                }
              : m
          )
        );

        setRefreshKey((k) => k + 1);
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: `تعذّر توليد الصورة: ${err.message}`,
                  loading: false,
                  error: true,
                }
              : m
          )
        );
        toast.error("فشل توليد الصورة");
      }
    },
    [activeConversationId, userPreferences]
  );

  // Video generation handler
  const handleVideoGeneration = useCallback(
    async (userInstruction: string, conversationId: string | null) => {
      let convId = conversationId;
      const assistantMsgId = `a-${Date.now()}`;

      // Add loading message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          mode: "video",
          timestamp: Date.now(),
          loading: true,
          loadingType: "video",
        },
      ]);

      try {
        // First, ask the AI to optimize the prompt
        const promptRes = await fetch("/api/code-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: "",
            language: "plaintext",
            mode: "video",
            instruction: userInstruction,
            conversationId: convId,
            userPreferences,
            history: [],
          }),
        });

        if (!promptRes.ok) {
          const errData = await promptRes.json().catch(() => ({}));
          throw new Error(errData.error || "فشل توليد الـ prompt");
        }

        const promptData = await promptRes.json();
        const assistantContent: string = promptData.response || "";
        convId = promptData.conversationId || convId;
        if (convId && !activeConversationId) {
          setActiveConversationId(convId);
        }

        // Update message with the optimized prompt
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: `${assistantContent}\n\n⏳ جارٍ توليد الفيديو... قد يستغرق 30-60 ثانية.` }
              : m
          )
        );

        // Extract the optimized English prompt
        const codeMatch = assistantContent.match(/```\n?([\s\S]*?)```/);
        const optimizedPrompt = codeMatch ? codeMatch[1].trim() : userInstruction;

        // Start video generation
        const vidRes = await fetch("/api/video-generation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: optimizedPrompt,
            userInstruction,
            conversationId: convId,
          }),
        });

        if (!vidRes.ok) {
          const errData = await vidRes.json().catch(() => ({}));
          throw new Error(errData.error || "فشل بدء توليد الفيديو");
        }

        const vidData = await vidRes.json();
        const taskId = vidData.taskId;

        // Poll for status
        const pollVideo = async () => {
          try {
            const statusRes = await fetch("/api/video-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                taskId,
                prompt: optimizedPrompt,
                conversationId: convId,
                saveOnComplete: true,
              }),
            });

            if (!statusRes.ok) return;
            const statusData = await statusRes.json();

            if (statusData.status === "SUCCESS") {
              if (videoPollRef.current) {
                clearInterval(videoPollRef.current);
                videoPollRef.current = null;
              }
              const videoMarker = statusData.localPath
                ? `[[VIDEO:${statusData.localPath}]]`
                : `[[VIDEO_URL:${statusData.videoUrl}]]`;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: `${assistantContent}\n\n${videoMarker}`,
                        loading: false,
                      }
                    : m
                )
              );
              setRefreshKey((k) => k + 1);
            } else if (statusData.status === "FAIL") {
              if (videoPollRef.current) {
                clearInterval(videoPollRef.current);
                videoPollRef.current = null;
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: `${assistantContent}\n\n❌ فشل توليد الفيديو: ${statusData.error || "خطأ غير معروف"}`,
                        loading: false,
                        error: true,
                      }
                    : m
                )
              );
            }
            // else: still processing, continue polling
          } catch (err) {
            // ignore poll errors
          }
        };

        // Start polling every 5 seconds
        videoPollRef.current = setInterval(pollVideo, 5000);
        // Also poll immediately
        setTimeout(pollVideo, 3000);
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: `تعذّر بدء توليد الفيديو: ${err.message}`,
                  loading: false,
                  error: true,
                }
              : m
          )
        );
        toast.error("فشل توليد الفيديو");
      }
    },
    [activeConversationId, userPreferences]
  );

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!instruction.trim() && mode !== "explain" && mode !== "review") {
      toast.error("اكتب طلبك أولاً");
      return;
    }

    if (currentMode.requiresCode && !useFileMode && !inlineCode.trim()) {
      toast.error("الصق الكود في المحرر، أو ارفع ملفات، أو استخدم وضع آخر");
      return;
    }

    if (currentMode.requiresCode && useFileMode && files.length === 0) {
      toast.error("ارفع ملفاً واحداً على الأقل، أو استخدم وضع آخر");
      return;
    }

    const userContent = instruction ||
      (mode === "explain" ? "اشرح هذا الكود" : mode === "review" ? "راجع هذا الكود" : "");

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: userContent,
      mode,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInstruction("");

    // Handle special APIs (image/video)
    if (mode === "image") {
      await handleImageGeneration(userContent, activeConversationId);
      return;
    }
    if (mode === "video") {
      await handleVideoGeneration(userContent, activeConversationId);
      return;
    }

    // Standard streaming chat
    const assistantMsgId = `a-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      mode,
      timestamp: Date.now(),
      streaming: true,
    };

    setMessages((prev) => [...prev, assistantMsg]);

    // Prepare request body
    const body: Record<string, unknown> = {
      code: useFileMode ? (files[activeFileIndex]?.content || "") : inlineCode,
      language: activeLanguage,
      mode,
      instruction: userContent,
      history: messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      userPreferences,
    };

    if (mode === "convert") {
      body.targetLanguage = targetLanguage;
    }

    if (useFileMode && files.length > 0) {
      body.files = files.map((f) => ({
        filename: f.filename,
        language: f.language,
        content: f.content,
      }));
    }

    if (activeConversationId) {
      body.conversationId = activeConversationId;
    }

    await stream(body, {
      onInit: (convId) => {
        if (!activeConversationId && convId) {
          setActiveConversationId(convId);
          setRefreshKey((k) => k + 1);
        }
      },
      onDelta: (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: m.content + chunk }
              : m
          )
        );
      },
      onDone: () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, streaming: false, content: m.content || "عذراً، لم أتلقّ رداً صالحاً." }
              : m
          )
        );
        setRefreshKey((k) => k + 1);
      },
      onError: (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  streaming: false,
                  error: true,
                  content: m.content || `حدث خطأ: ${err}`,
                }
              : m
          )
        );
        toast.error("فشل في الحصول على الرد");
      },
    });
  }, [
    instruction,
    mode,
    currentMode,
    useFileMode,
    files,
    activeFileIndex,
    inlineCode,
    activeLanguage,
    targetLanguage,
    messages,
    activeConversationId,
    stream,
    userPreferences,
    handleImageGeneration,
    handleVideoGeneration,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!isStreaming) handleSubmit();
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCode);
    setCopiedCode(true);
    toast.success("تم نسخ الكود");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleClearChat = () => {
    if (activeConversationId) {
      toast.info("استخدم زر 'محادثة جديدة' لبدء محادثة جديدة");
      return;
    }
    setMessages([]);
    toast.success("تم مسح المحادثة");
  };

  const handleClearCode = () => {
    if (useFileMode) {
      setFiles([]);
      setActiveFileIndex(0);
      setUseFileMode(false);
    } else {
      setInlineCode("");
    }
    toast.success("تم المسح");
  };

  // Hide code editor for media modes (image/video) and platform integration modes
  const showCodeEditor = !["image", "video", "youtube-analytics", "telegram-bot"].includes(mode);
  const showPlatformTools = mode === "youtube-analytics" || mode === "telegram-bot";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-72 shrink-0 border-l border-sidebar-border">
            <ConversationsSidebar
              activeId={activeConversationId}
              onSelect={handleLoadConversation}
              onNew={handleNewConversation}
              refreshKey={refreshKey}
            />
          </aside>
        )}

        {/* Main content */}
        <div className="flex flex-1 min-w-0 flex-col">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-border bg-card/50 px-4 py-2.5 backdrop-blur">
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                  >
                    {sidebarOpen ? (
                      <PanelRightClose className="h-4 w-4" />
                    ) : (
                      <PanelRightOpen className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {sidebarOpen ? "إخفاء المحادثات" : "إظهار المحادثات"}
                </TooltipContent>
              </Tooltip>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight">مساعد الأكواد الذكي</h1>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  CodeMentor Pro — 14 مساعد متخصص
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 hidden sm:flex">
                <span className={`h-1.5 w-1.5 rounded-full ${isStreaming ? "bg-amber-500 pulse-glow" : "bg-primary"}`} />
                {isStreaming ? "يعمل الآن" : "متصل"}
              </Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setMemoryDraft(userPreferences);
                      setMemoryDialogOpen(true);
                    }}
                  >
                    <Brain className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>ذاكرة المساعد (تفضيلاتك)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 relative"
                    onClick={() => setApiKeysDialogOpen(true)}
                  >
                    <Key className="h-4 w-4" />
                    {(hasYouTube || hasTelegram) && (
                      <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  مفاتيح تكامل المنصات
                  {(hasYouTube || hasTelegram) && " (مُفعّل)"}
                </TooltipContent>
              </Tooltip>
              <ThemeToggle />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>المستودع</TooltipContent>
              </Tooltip>
            </div>
          </header>

          {/* Category selector */}
          <div className="border-b border-border bg-card/30 px-3 py-2">
            <div className="flex items-center gap-1 overflow-x-auto">
              {(Object.keys(CATEGORY_INFO) as AssistantCategory[]).map((cat) => {
                const info = CATEGORY_INFO[cat];
                const Icon = info.icon;
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors shrink-0 ${
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {info.label}
                    <span className="text-[10px] opacity-70">
                      ({MODES.filter((m) => m.category === cat).length})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode tabs (filtered by category) */}
          <div className="border-b border-border bg-card/20 px-3 py-1.5">
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <div className="flex items-center gap-2 overflow-x-auto">
                <TabsList className="bg-transparent p-0 h-auto gap-1">
                  {modesForCategory.map((m) => {
                    const Icon = m.icon;
                    return (
                      <TabsTrigger
                        key={m.value}
                        value={m.value}
                        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="whitespace-nowrap">{m.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
            </Tabs>
          </div>

          {/* Main content - two panes */}
          <div className="flex flex-1 min-h-0">
            {/* Left pane: Code editor + files (hidden for media modes) */}
            {showCodeEditor ? (
              <div className="flex flex-col lg:w-1/2 lg:border-l border-border min-h-0 min-w-0">
                <div className="border-b border-border bg-muted/20">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setUseFileMode(false)}
                        className={`rounded px-2 py-1 text-xs transition-colors ${
                          !useFileMode
                            ? "bg-background text-foreground shadow-sm border border-border"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Code2 className="h-3.5 w-3.5 inline ml-1" />
                        محرر واحد
                      </button>
                      <button
                        onClick={() => {
                          setUseFileMode(true);
                          if (files.length === 0) {
                            setFiles([
                              {
                                filename: "main.js",
                                language: "javascript",
                                content: DEFAULT_CODE,
                              },
                            ]);
                            setActiveFileIndex(0);
                          }
                        }}
                        className={`rounded px-2 py-1 text-xs transition-colors ${
                          useFileMode
                            ? "bg-background text-foreground shadow-sm border border-border"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <FileCode2 className="h-3.5 w-3.5 inline ml-1" />
                        ملفات متعددة ({files.length})
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="h-7 w-[120px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value} className="text-xs">
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyCode}>
                            {copiedCode ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>نسخ الكود</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClearCode}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>مسح المحرر</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {mode === "convert" && (
                    <div className="flex items-center gap-2 border-t border-border bg-muted/10 px-3 py-1.5 text-xs">
                      <RefreshCw className="h-3.5 w-3.5 text-primary" />
                      <span className="text-muted-foreground">التحويل إلى:</span>
                      <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                        <SelectTrigger className="h-7 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.filter((l) => l.value !== language).map((lang) => (
                            <SelectItem key={lang.value} value={lang.value} className="text-xs">
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {useFileMode && (
                    <FileManager
                      files={files}
                      activeFileIndex={activeFileIndex}
                      onActiveFileChange={setActiveFileIndex}
                      onFilesChange={setFiles}
                      defaultLanguage={language}
                    />
                  )}
                </div>

                <div className="flex-1 min-h-0">
                  {useFileMode && files.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                      <FileCode2 className="h-12 w-12 text-muted-foreground/40 mb-3" />
                      <h3 className="text-sm font-semibold mb-1">لا توجد ملفات</h3>
                      <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                        ارفع ملفاتك من زر الرفع في الأعلى، أو اسحبها وأفلتها هنا
                      </p>
                    </div>
                  ) : (
                    <CodeEditor
                      value={activeCode}
                      onChange={handleCodeChange}
                      language={activeLanguage}
                      placeholder={currentMode.requiresCode ? "الصق الكود هنا..." : "اكتب الكود (اختياري لهذا الوضع)..."}
                    />
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-1 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>{activeCode.split("\n").length} سطر</span>
                    <span>·</span>
                    <span>{activeCode.length} حرف</span>
                    {useFileMode && files.length > 0 && (
                      <>
                        <span>·</span>
                        <span>{files.length} ملفات</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono ltr-text">UTF-8</span>
                    <span>·</span>
                    <span className="font-mono ltr-text">LF</span>
                    <span>·</span>
                    <span className="font-mono ltr-text">{activeLanguage}</span>
                  </div>
                </div>
              </div>
            ) : showPlatformTools ? (
              // For platform integration modes: show the appropriate tools panel
              <div className="flex flex-col lg:w-1/2 lg:border-l border-border min-h-0">
                <div className="border-b border-border bg-muted/20 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {mode === "youtube-analytics" ? (
                      <Youtube className="h-4 w-4 text-primary" />
                    ) : (
                      <TelegramIcon className="h-4 w-4 text-primary" />
                    )}
                    {mode === "youtube-analytics" ? "أدوات YouTube الحقيقية" : "أدوات Telegram Bot الحقيقية"}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {mode === "youtube-analytics"
                      ? "تكامل مباشر مع YouTube Data API v3: بحث، ترندات، تحليل فيديوهات حقيقي."
                      : "تكامل مباشر مع Telegram Bot API: إرسال رسائل، قراءة تحديثات، معلومات البوت."}
                  </p>
                </div>
                <div className="flex-1 min-h-0">
                  {mode === "youtube-analytics" ? <YouTubeTools /> : <TelegramTools />}
                </div>
              </div>
            ) : (
              // For media modes: show a preview/info panel
              <div className="flex flex-col lg:w-1/2 lg:border-l border-border min-h-0">
                <div className="border-b border-border bg-muted/20 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {mode === "image" ? <ImageIcon className="h-4 w-4 text-primary" /> : <VideoIcon className="h-4 w-4 text-primary" />}
                    {mode === "image" ? "توليد الصور" : "توليد الفيديو"}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {mode === "image"
                      ? "اكتب وصفاً للصورة بالعربية. سيتم تحسينه تلقائياً إلى prompt احترافي بالإنجليزية وتوليد الصورة."
                      : "اكتب وصفاً للمشهد. سيتم تحسينه وتوليد فيديو قصير (5-10 ثوانٍ). قد يستغرق 30-60 ثانية."}
                  </p>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center max-w-sm">
                    {mode === "image" ? (
                      <ImageIcon className="h-16 w-16 text-primary/30 mx-auto mb-3" />
                    ) : (
                      <VideoIcon className="h-16 w-16 text-primary/30 mx-auto mb-3" />
                    )}
                    <h3 className="text-sm font-semibold mb-2">
                      {mode === "image" ? "مولّد الصور بالذكاء الاصطناعي" : "مولّد الفيديو بالذكاء الاصطناعي"}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {mode === "image"
                        ? "صف ما تتخيله بالعربية، وسأحوّله إلى prompt احترافي وأولّد لك صورة عالية الجودة. الصور تُحفظ تلقائياً ويمكنك تحميلها."
                        : "صف مشهداً سينمائياً، وسأحوّله إلى فيديو قصير بجودة عالية. سيظهر فيديو في المحادثة عند الانتهاء."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Right pane: Chat panel */}
            <div className="flex flex-col lg:w-1/2 min-h-0 min-w-0">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">المساعد الذكي</span>
                  <span className="text-[10px] text-muted-foreground">— {currentMode.description}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] py-0 h-4">
                    {messages.length} رسالة
                  </Badge>
                  {messages.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClearChat}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>مسح المحادثة</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Messages area */}
              <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
                {loadingConversation ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyState mode={mode} />
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}
                  </div>
                )}
              </div>

              {/* Quick actions */}
              {QUICK_ACTIONS[mode] && QUICK_ACTIONS[mode].length > 0 && !isStreaming && !showPlatformTools && (
                <div className="border-t border-border bg-muted/20 px-3 py-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <Zap className="h-3 w-3 shrink-0 text-primary" />
                    {QUICK_ACTIONS[mode].map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInstruction(action)}
                        className="shrink-0 rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input area - hidden for platform tools (they have their own UI) */}
              {!showPlatformTools && (
                <div className="border-t border-border bg-card/50 p-3">
                  <div className="relative">
                    <Textarea
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={currentMode.placeholder}
                      className="min-h-[60px] max-h-[160px] resize-none border-border bg-background pl-12 pr-3 pt-2.5 text-sm focus-visible:ring-primary/40"
                      disabled={isStreaming}
                  />
                  {isStreaming ? (
                    <Button
                      onClick={abort}
                      size="icon"
                      variant="destructive"
                      className="absolute left-1.5 bottom-1.5 h-8 w-8 rounded-md"
                      aria-label="إيقاف"
                    >
                      <Square className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={!instruction.trim() && mode !== "explain" && mode !== "review"}
                      size="icon"
                      className="absolute left-1.5 bottom-1.5 h-8 w-8 rounded-md"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>
                    {mode === "image" || mode === "video"
                      ? "اكتب الوصف بالعربية وسيتم تحسينه تلقائياً"
                      : currentMode.requiresCode
                      ? useFileMode && files.length > 0
                        ? `سيتم إرسال ${files.length} ملفات`
                        : "سيتم إرسال الكود الموجود في المحرر"
                      : "اكتب طلبك وسأقوم بالرد"}
                  </span>
                  <span className="hidden sm:inline">
                    <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px]">Ctrl</kbd>
                    {" + "}
                    <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px]">Enter</kbd>
                  </span>
                </div>
              </div>
              )}
              {/* For platform tools: show a notice instead of input */}
              {showPlatformTools && (
                <div className="border-t border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground text-center">
                  استخدم الأدوات في اليسار للتفاعل مع المنصة. النتائج تظهر هنا.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* API Keys Dialog */}
        <ApiKeysDialog open={apiKeysDialogOpen} onOpenChange={setApiKeysDialogOpen} />

        {/* Memory/Preferences Dialog */}
        <Dialog open={memoryDialogOpen} onOpenChange={setMemoryDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                ذاكرة المساعد — تفضيلاتك
              </DialogTitle>
              <DialogDescription>
                اكتب تفضيلاتك هنا ليتم تضمينها في كل محادثة جديدة. هذا يعطي المساعد "ذاكرة" تتعلم منها.
                مثلاً: لغتك المفضلة، أسلوب الكتابة، التقنيات المفضلة، مستواك التقني.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="preferences" className="text-xs">
                  التفضيلات (تُحفظ محلياً في متصفحك)
                </Label>
                <Textarea
                  id="preferences"
                  value={memoryDraft}
                  onChange={(e) => setMemoryDraft(e.target.value)}
                  placeholder={DEFAULT_PREFERENCES}
                  className="min-h-[200px] mt-1.5 font-mono text-xs"
                />
              </div>
              <div className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded">
                💡 سيتم تضمين هذا النص كـ "ذاكرة" في كل طلب ترسله للمساعد، ليصبح أكثر تخصيصاً لك مع الوقت.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMemoryDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={savePreferences}>
                حفظ التفضيلات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function EmptyState({ mode }: { mode: Mode }) {
  const modeInfo = MODES.find((m) => m.value === mode)!;
  const Icon = modeInfo.icon;

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-base font-semibold mb-1.5">{modeInfo.label}</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
        {modeInfo.description}
      </p>
      <Separator className="my-4 max-w-[200px]" />
      <p className="text-xs text-muted-foreground/70">
        اكتب طلبك في الأسفل للبدء
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const modeInfo = message.mode ? MODES.find((m) => m.value === message.mode) : null;

  return (
    <div className={`fade-in-up flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-secondary text-secondary-foreground"
            : message.error
            ? "bg-destructive/20 text-destructive"
            : "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm shadow-primary/30"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div className={`flex-1 min-w-0 ${isUser ? "text-right" : "text-right"}`}>
        <div className="mb-1 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="font-medium">{isUser ? "أنت" : "CodeMentor"}</span>
          {modeInfo && !isUser && (
            <>
              <span>·</span>
              <Badge variant="outline" className="py-0 h-4 text-[9px] gap-1">
                <modeInfo.icon className="h-2.5 w-2.5" />
                {modeInfo.label}
              </Badge>
            </>
          )}
          <span>·</span>
          <span>{new Date(message.timestamp).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <div
          className={`inline-block max-w-full rounded-lg px-3 py-2 text-right ${
            isUser
              ? "bg-secondary text-secondary-foreground"
              : message.error
              ? "bg-destructive/10 text-destructive border border-destructive/30"
              : "bg-card border border-border"
          } ${message.streaming && !message.content ? "min-h-[40px]" : ""} ${
            message.loading ? "min-h-[60px]" : ""
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          ) : message.loading ? (
            <div className="flex items-center gap-2 py-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">
                {message.loadingType === "image"
                  ? "جارٍ توليد الصورة... (10-20 ثانية)"
                  : "جارٍ توليد الفيديو... (30-60 ثانية)"}
              </span>
            </div>
          ) : message.streaming && !message.content ? (
            <div className="flex items-center gap-1 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary typing-dot" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary typing-dot" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary typing-dot" />
            </div>
          ) : (
            <div className={message.streaming ? "streaming-cursor" : ""}>
              <ErrorBoundary>
                <MessageRenderer content={message.content} />
              </ErrorBoundary>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
