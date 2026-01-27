import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Cpu } from "lucide-react";

interface ModelSwitcherProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  isLoading: boolean;
}

export function ModelSwitcher({ currentModel, onModelChange, isLoading }: ModelSwitcherProps) {
  return (
    <div className="flex items-center gap-3 bg-card p-3 rounded-lg border border-border mb-6 shadow-sm">
        <div className="bg-primary/10 p-2 rounded-full">
            <Cpu className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold block mb-1">Active AI Model</Label>
            <Select value={currentModel} onValueChange={onModelChange} disabled={isLoading}>
                <SelectTrigger className="w-full bg-input border-input text-foreground h-9 focus:ring-primary">
                    <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="base">🎙️ Voice Cloning (Default)</SelectItem>
                    <SelectItem value="design">🎨 Voice Design (Text-to-Voice)</SelectItem>
                    <SelectItem value="custom">🎭 Preset Characters (High Quality)</SelectItem>
                    <SelectItem value="dialogue">💬 Multi-Speaker Dialogue (Beta)</SelectItem>
                </SelectContent>
            </Select>
        </div>
        {isLoading && (
             <div className="flex items-center gap-2 px-3">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-xs text-primary font-mono">LOADING...</span>
             </div>
        )}
    </div>
  );
}
