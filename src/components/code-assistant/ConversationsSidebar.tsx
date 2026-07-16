"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Search,
  Clock,
  MoreVertical,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { Conversation, Mode } from "@/lib/code-assistant/shared";

interface ConversationsSidebarProps {
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
  onNew: () => void;
  refreshKey: number;
}

interface ConversationListItem {
  id: string;
  title: string;
  mode: Mode;
  language: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

const MODE_LABELS: Record<Mode, string> = {
  edit: "تعديل",
  generate: "توليد",
  explain: "شرح",
  review: "مراجعة",
  convert: "تحويل",
  custom: "محادثة",
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `قبل ${diffMin} دقيقة`;
  if (diffH < 24) return `قبل ${diffH} ساعة`;
  if (diffD < 7) return `قبل ${diffD} يوم`;
  return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

export default function ConversationsSidebar({
  activeId,
  onSelect,
  onNew,
  refreshKey,
}: ConversationsSidebarProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("فشل الجلب");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err: any) {
      console.error("Fetch conversations error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations, refreshKey]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/conversations/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("فشل الحذف");
      toast.success("تم حذف المحادثة");
      if (activeId === deleteId) onNew();
      setDeleteId(null);
      fetchConversations();
    } catch (err: any) {
      toast.error("تعذّر حذف المحادثة");
    }
  };

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="p-3 border-b border-sidebar-border">
        <Button
          onClick={onNew}
          className="w-full justify-start gap-2"
          variant="default"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          محادثة جديدة
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="relative">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في المحادثات..."
            className="pr-8 h-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-md bg-muted/40 animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {search ? "لا توجد نتائج مطابقة" : "لا توجد محادثات بعد"}
            </div>
          ) : (
            filtered.map((conv) => (
              <div
                key={conv.id}
                className={`group relative rounded-md p-2 cursor-pointer transition-colors ${
                  activeId === conv.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50"
                }`}
                onClick={() =>
                  onSelect({
                    id: conv.id,
                    title: conv.title,
                    mode: conv.mode,
                    language: conv.language,
                    createdAt: conv.createdAt,
                    updatedAt: conv.updatedAt,
                    messages: [],
                    files: [],
                  })
                }
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {conv.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[9px] py-0 h-3.5 px-1 gap-0.5">
                        <Code2 className="h-2.5 w-2.5" />
                        {MODE_LABELS[conv.mode] || conv.mode}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatRelativeTime(conv.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                        aria-label="حذف"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">حذف المحادثة</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer stats */}
      <div className="border-t border-sidebar-border p-2 text-[10px] text-muted-foreground text-center">
        {conversations.length} محادثة محفوظة
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المحادثة؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف المحادثة وكل رسائلها وملفاتها نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
