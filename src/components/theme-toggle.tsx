"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Track whether the component has mounted on the client
const emptySubscribe = () => () => {};
function getMountedSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getMountedSnapshot,
    getServerSnapshot
  );
  // Local click state to avoid hydration mismatch warnings on toggle
  const [forceLight, setForceLight] = useState<boolean | null>(null);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const current = theme === "system" ? resolvedTheme : theme;
  const isDark = forceLight !== null ? !forceLight : current === "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            const next = !isDark;
            setForceLight(!next);
            setTheme(next ? "dark" : "light");
          }}
          aria-label="تبديل الوضع"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isDark ? "التبديل للوضع الفاتح" : "التبديل للوضع الداكن"}
      </TooltipContent>
    </Tooltip>
  );
}
