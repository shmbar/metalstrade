'use client';

import { Search, Bell, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar.jsx";
import { Input } from "./input.jsx";
import { useEffect, useState } from "react";

function LiveClock() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return null;

  const day  = now.toLocaleDateString(undefined, { weekday: 'long' });
  const date = now.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const tz   = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="hidden md:flex flex-col items-end leading-tight select-none">
      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--chathams-blue)' }}>
        {day}, {date}
      </span>
      <span style={{ fontSize: '11px', color: '#6b8fb5' }}>
        {time} &nbsp;·&nbsp; {tz}
      </span>
    </div>
  );
}

export function Header() {
  return (
    <header className="h-16 bg-background/50 backdrop-blur-sm border-b border-transparent px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center w-96">
        <div className="relative w-full">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search anything..."
            className="pl-9 bg-transparent border-none shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <LiveClock />
        <button className="p-2 rounded-xl hover:bg-white transition-colors text-muted-foreground relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-background"></span>
        </button>
        <button className="p-2 rounded-xl hover:bg-white transition-colors text-muted-foreground">
          <MessageSquare className="h-5 w-5" />
        </button>
        <Avatar className="h-9 w-9 border border-white shadow-sm cursor-pointer">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>AD</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
