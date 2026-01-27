"use client"

import React from "react"
import { History, Play, Download, Trash2, Calendar, MessageSquare, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export interface HistoryItem {
  id: string
  timestamp: number
  text: string
  mode: "cloning" | "design" | "preset"
  audioBase64?: string // Optional, as we might not store all
  duration?: number
  configSummary?: string
}

interface HistorySidebarProps {
  items: HistoryItem[]
  onPlay: (item: HistoryItem) => void
  onDelete: (id: string) => void
  onClear: () => void
}

export function HistorySidebar({ items, onPlay, onDelete, onClear }: HistorySidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    }).format(new Date(ts))
  }

  const getModeIcon = (mode: string) => {
      switch(mode) {
          case 'cloning': return <Mic className="w-3 h-3" />
          case 'design': return <MessageSquare className="w-3 h-3" />
          case 'preset': return <div className="w-3 h-3 font-bold text-[10px] flex items-center justify-center">P</div>
          default: return <Mic className="w-3 h-3" />
      }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative" title="History">
          <History className="h-5 w-5" />
          {items.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border border-background" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><History className="w-5 h-5" /> Generation History</span>
              {items.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={onClear} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8">
                      <Trash2 className="w-4 h-4 mr-2" /> Clear All
                  </Button>
              )}
          </SheetTitle>
          <SheetDescription>
              Your recent generations (stored locally).
          </SheetDescription>
        </SheetHeader>
        
        <Separator />

        <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 py-4">
                {items.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-3">
                        <History className="w-12 h-12 opacity-20" />
                        <p>No history yet. Generate something!</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className="group relative flex flex-col gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="secondary" className="gap-1 h-5 px-1.5 uppercase text-[10px]">
                                        {getModeIcon(item.mode)}
                                        {item.mode}
                                    </Badge>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(item.timestamp)}
                                    </span>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                    onClick={() => onDelete(item.id)}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>

                            <p className="text-sm font-medium leading-normal line-clamp-2 text-foreground/90 font-mono bg-muted/30 p-2 rounded">
                                "{item.text}"
                            </p>
                            
                            {item.configSummary && (
                                <p className="text-[10px] text-muted-foreground font-mono">
                                    {item.configSummary}
                                </p>
                            )}

                            <div className="flex items-center gap-2 mt-1">
                                <Button size="sm" className="w-full gap-2" onClick={() => onPlay(item)}>
                                    <Play className="w-3 h-3" /> Play
                                </Button>
                                {item.audioBase64 && (
                                    <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => {
                                        const link = document.createElement("a");
                                        link.href = item.audioBase64!;
                                        link.download = `generation_${item.timestamp}.wav`;
                                        link.click();
                                    }}>
                                        <Download className="w-3 h-3" /> Download
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
