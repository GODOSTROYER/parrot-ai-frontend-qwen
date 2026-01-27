import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Play, Loader2 } from "lucide-react";

import { AdvancedSettings, type GenerationConfig } from "./advanced-settings";

interface CustomVoicePanelProps {
    onGenerate: (text: string, speaker: string) => Promise<Blob | null>;
    genConfig: GenerationConfig;
    setGenConfig: (config: GenerationConfig) => void;
}

const PRESETS = [
    { id: "Vivian", name: "Vivian (Chinese - Bright)", lang: "Chinese" },
    { id: "Ryan", name: "Ryan (English - Dynamic)", lang: "English" },
    { id: "Ono_Anna", name: "Ono Anna (Japanese - Playful)", lang: "Japanese" },
    { id: "Serena", name: "Serena (Chinese - Gentle)", lang: "Chinese" },
    { id: "Uncle_Fu", name: "Uncle Fu (Chinese - Mellow)", lang: "Chinese" },
    { id: "Dylan", name: "Dylan (Beijing Dialect)", lang: "Chinese" },
    { id: "Eric", name: "Eric (Sichuan Dialect)", lang: "Chinese" },
    { id: "Aiden", name: "Aiden (English - Clear)", lang: "English" },
    { id: "Sohee", name: "Sohee (Korean - Warm)", lang: "Korean" },
];

export function CustomVoicePanel({ onGenerate, genConfig, setGenConfig }: CustomVoicePanelProps) {
    const [text, setText] = useState("");
    const [speaker, setSpeaker] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!text || !speaker) return;
        setIsGenerating(true);
        try {
            const blob = await onGenerate(text, speaker);
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
                    <Users className="w-6 h-6 text-primary" />
                    Preset Characters
                </h2>
                <p className="text-muted-foreground">Use high-quality pre-trained voices tuned for specific styles.</p>
            </div>

            <Card className="bg-card border-border shadow-md">
                <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-foreground">Select Character</Label>
                        <Select value={speaker} onValueChange={setSpeaker}>
                            <SelectTrigger className="bg-input border-border text-foreground focus:ring-primary">
                                <SelectValue placeholder="Choose a character..." />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border text-popover-foreground">
                                {PRESETS.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="text-foreground">Text to Speak</Label>
                        <Textarea 
                            placeholder="What should they say?"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                        />
                    </div>

                    <AdvancedSettings config={genConfig} onConfigChange={setGenConfig} />

                    <Button 
                        onClick={handleGenerate} 
                        disabled={isGenerating || !text || !speaker}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Users className="w-4 h-4 mr-2" />
                                Generate Speech
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {audioUrl && (
                <Card className="bg-secondary/30 border-primary/20 animate-in zoom-in-95">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Play className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-primary font-medium">Generated Result</h3>
                                <p className="text-muted-foreground text-sm">Preset Character Output</p>
                            </div>
                        </div>
                        <audio controls src={audioUrl} className="h-10 accent-primary" />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
