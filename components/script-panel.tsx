"use client"

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Play, Plus, Trash2, Mic, Users, MessageSquare } from "lucide-react";
import { type Voice } from "./voice-library";
import { AdvancedSettings, type GenerationConfig } from "./advanced-settings";

interface ScriptLine {
    id: string;
    text: string;
    speaker: string; // voice_id for cloned, name for preset
    speakerType: "preset" | "cloned";
    config: GenerationConfig; // Per-line settings? Or global? MVP: Global first, or per line? Let's do Global for MVP to keep UI clean, but backend supports per line.
}

interface ScriptPanelProps {
    savedVoices: Voice[];
    onGenerate: (lines: any[]) => Promise<Blob | null>;
}

const PRESETS = [
    { id: "Vivian", name: "Vivian (Chinese)", type: "preset" },
    { id: "Ryan", name: "Ryan (English)", type: "preset" },
    { id: "Ono_Anna", name: "Ono Anna (Japanese)", type: "preset" },
    { id: "Serena", name: "Serena (Chinese)", type: "preset" },
    { id: "Uncle_Fu", name: "Uncle Fu (Chinese)", type: "preset" },
    { id: "Dylan", name: "Dylan (Beijing Dialect)", type: "preset" },
    { id: "Eric", name: "Eric (Sichuan Dialect)", type: "preset" },
    { id: "Aiden", name: "Aiden (English)", type: "preset" },
    { id: "Sohee", name: "Sohee (Korean)", type: "preset" },
];

export function ScriptPanel({ savedVoices, onGenerate }: ScriptPanelProps) {
    const [lines, setLines] = useState<ScriptLine[]>([
        { id: "1", text: "Hello! This is a multi-speaker conversation.", speaker: "Ryan", speakerType: "preset", config: { temperature: 0.8, top_p: 0.8, top_k: 50, repetition_penalty: 1.1 } },
        { id: "2", text: "And I can reply using details from another voice.", speaker: "Vivian", speakerType: "preset", config: { temperature: 0.8, top_p: 0.8, top_k: 50, repetition_penalty: 1.1 } }
    ]);
    
    // Global Config for new lines (and maybe applied to all?)
    const [globalConfig, setGlobalConfig] = useState<GenerationConfig>({
        temperature: 0.7,
        top_p: 0.8,
        top_k: 50,
        repetition_penalty: 1.1
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const addLine = () => {
        setLines([...lines, { 
            id: Date.now().toString(), 
            text: "", 
            speaker: PRESETS[0].id, 
            speakerType: "preset",
            config: { ...globalConfig }
        }]);
    };

    const removeLine = (id: string) => {
        if (lines.length > 1) {
            setLines(lines.filter(l => l.id !== id));
        }
    };

    const updateLine = (id: string, field: keyof ScriptLine, value: any) => {
        setLines(lines.map(line => {
            if (line.id === id) {
                // If changing speaker, detect type
                if (field === "speaker") {
                    const isPreset = PRESETS.some(p => p.id === value);
                    return { ...line, speaker: value, speakerType: isPreset ? "preset" : "cloned" };
                }
                return { ...line, [field]: value };
            }
            return line;
        }));
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            // Map lines to backend format, merging global config if we want specific overrides
            // For this MVP, let's use the global config for all lines for simplicity in UI,
            // OR pass the per-line config if we exposed it. 
            // Let's pass the global config for now to avoid UI clutter.
            
            const payload = lines.map(line => ({
                text: line.text,
                speaker: line.speaker,
                type: line.speakerType,
                ...globalConfig
            }));

            const blob = await onGenerate(payload);
            if (blob) {
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <h2 className="text-2xl font-light text-foreground flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-primary" />
                    Multi-Speaker Dialogue
                </h2>
                <p className="text-muted-foreground">Create conversations between Preset Characters and your Cloned Voices.</p>
            </div>

            <div className="grid gap-6">
                <div className="space-y-4">
                    {lines.map((line, index) => (
                        <Card key={line.id} className="bg-card border-border/50 shadow-sm transition-all hover:bg-card/80">
                           <CardContent className="p-4 flex gap-4 items-start">
                               <div className="w-8 pt-3 text-center text-xs font-mono text-muted-foreground">
                                   {(index + 1).toString().padStart(2, '0')}
                               </div>
                               
                               <div className="flex-1 space-y-3">
                                   <div className="flex gap-2">
                                       <Select 
                                           value={line.speaker} 
                                           onValueChange={(val) => updateLine(line.id, "speaker", val)}
                                       >
                                           <SelectTrigger className="w-[200px] h-8 text-xs bg-muted/20">
                                               <SelectValue />
                                           </SelectTrigger>
                                           <SelectContent>
                                               <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Presets</div>
                                               {PRESETS.map(p => (
                                                   <SelectItem key={p.id} value={p.id} className="text-xs">
                                                       <span className="flex items-center gap-2">
                                                           <Users className="w-3 h-3 text-indigo-400" />
                                                           {p.name}
                                                       </span>
                                                   </SelectItem>
                                               ))}
                                               
                                               {savedVoices.length > 0 && (
                                                   <>
                                                       <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2 border-t">Your Voices</div>
                                                       {savedVoices.map(v => (
                                                           <SelectItem key={v.id} value={v.id} className="text-xs">
                                                               <span className="flex items-center gap-2">
                                                                   <Mic className="w-3 h-3 text-emerald-400" />
                                                                   {v.name}
                                                               </span>
                                                           </SelectItem>
                                                       ))}
                                                   </>
                                               )}
                                           </SelectContent>
                                       </Select>
                                       
                                       <div className="flex-1" />
                                       
                                       <Button 
                                           variant="ghost" 
                                           size="icon" 
                                           className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                           onClick={() => removeLine(line.id)}
                                           disabled={lines.length === 1}
                                       >
                                           <Trash2 className="w-4 h-4" />
                                       </Button>
                                   </div>

                                   <Textarea
                                       value={line.text}
                                       onChange={(e) => updateLine(line.id, "text", e.target.value)}
                                       placeholder="Enter dialogue line..."
                                       className="min-h-[60px] bg-background/50 text-sm"
                                       rows={2}
                                   />
                               </div>
                           </CardContent> 
                        </Card>
                    ))}
                    
                    <Button variant="outline" onClick={addLine} className="w-full border-dashed">
                        <Plus className="w-4 h-4 mr-2" /> Add Line
                    </Button>
                </div>
                
                <Card className="bg-card border-border shadow-md sticky bottom-4 z-10">
                    <CardContent className="p-6 space-y-4">
                         
                         <AdvancedSettings config={globalConfig} onConfigChange={setGlobalConfig} />
                         
                         <Button 
                             onClick={handleGenerate} 
                             disabled={isGenerating || lines.some(l => !l.text)}
                             className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 h-12 text-lg"
                         >
                             {isGenerating ? (
                                 <>
                                     <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                     Generating Dialogue...
                                 </>
                             ) : (
                                 <>
                                     <Play className="w-5 h-5 mr-2" />
                                     Generate Full Conversation
                                 </>
                             )}
                         </Button>
                    </CardContent>
                </Card>
            </div>

            {audioUrl && (
                <Card className="bg-secondary/30 border-primary/20 animate-in zoom-in-95">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Play className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-primary font-medium">Dialogue Result</h3>
                                <p className="text-muted-foreground text-sm">{lines.length} lines stitched</p>
                            </div>
                        </div>
                        <audio controls src={audioUrl} className="h-10 accent-primary" />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
