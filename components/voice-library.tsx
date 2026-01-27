
import React, { useState } from "react"
import { Play, Pause, Trash2, Mic, Calendar, Check, Sparkles, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// Interfaces
export interface Voice {
  id: string
  name: string
  filename: string
  transcript?: string
  created_at: string
}

interface VoiceLibraryProps {
  voices: Voice[]
  selectedVoiceId: string | null
  onSelect: (voice: Voice) => void
  onDelete: (voiceId: string) => void
  isLoading?: boolean
}

export function VoiceLibrary({ 
  voices, 
  selectedVoiceId, 
  onSelect, 
  onDelete,
  isLoading = false
}: VoiceLibraryProps) {
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-8 h-8 mb-4 animate-spin opacity-50" />
        <p>Loading your voice library...</p>
      </div>
    )
  }

  if (voices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border/50 rounded-xl bg-card/50">
        <div className="w-16 h-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Mic className="w-8 h-8 text-primary/60" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No saved voices yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-[280px]">
          Upload or record audio, then click "Save Voice" to build your personal library.
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {voices.map((voice) => (
          <VoiceCard
            key={voice.id}
            voice={voice}
            isSelected={selectedVoiceId === voice.id}
            onSelect={() => onSelect(voice)}
            onDelete={() => onDelete(voice.id)}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

function VoiceCard({ 
  voice, 
  isSelected, 
  onSelect, 
  onDelete 
}: { 
  voice: Voice
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void 
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative group flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md",
        isSelected
          ? "bg-primary/5 border-primary ring-1 ring-primary/20"
          : "bg-card border-border hover:border-primary/50"
      )}
    >
      {/* Icon / Avatar */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
        isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
      )}>
        <User className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className={cn(
            "font-medium text-sm truncate pr-6",
            isSelected ? "text-primary" : "text-foreground"
          )}>
            {voice.name}
          </h4>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Calendar className="w-3 h-3" />
          <span>{new Date(voice.created_at).toLocaleDateString()}</span>
        </div>

        {voice.transcript && (
          <p className="text-xs text-muted-foreground/80 line-clamp-2 italic bg-muted/50 p-1.5 rounded">
            "{voice.transcript}"
          </p>
        )}
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 text-primary animate-in zoom-in duration-200">
          <Check className="w-4 h-4" />
        </div>
      )}

      {/* Actions */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

interface SaveVoiceDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string) => Promise<void>
  defaultName?: string
}

export function SaveVoiceDialog({ 
  isOpen, 
  onOpenChange, 
  onSave, 
  defaultName = "" 
}: SaveVoiceDialogProps) {
  const [name, setName] = useState(defaultName)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    
    setIsSaving(true)
    try {
      await onSave(name)
      onOpenChange(false)
      setName("") // Reset after save
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Voice Profile</DialogTitle>
          <DialogDescription>
             Save this voice to reuse it later without re-uploading audio.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Voice Name</Label>
            <Input
              id="name"
              placeholder="e.g. My Narrator Voice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Voice"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
