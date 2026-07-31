import { Search, Bell, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar";
import { Input } from "@components/ui/input";

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
        <button className="p-2 rounded-xl hover:bg-[var(--surface-card)] transition-colors text-muted-foreground relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-background"></span>
        </button>
        <button className="p-2 rounded-xl hover:bg-[var(--surface-card)] transition-colors text-muted-foreground">
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
