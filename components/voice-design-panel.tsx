import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Play, Download, Loader2 } from "lucide-react";

import { AdvancedSettings, type GenerationConfig } from "./advanced-settings";

interface VoiceDesignPanelProps {
    onGenerate: (text: string, instruct: string) => Promise<Blob | null>;
    genConfig: GenerationConfig;
    setGenConfig: (config: GenerationConfig) => void;
}

export function VoiceDesignPanel({ onGenerate, genConfig, setGenConfig }: VoiceDesignPanelProps) {
    const [text, setText] = useState("");
    const [instruct, setInstruct] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!text || !instruct) return;
        setIsGenerating(true);
        try {
            const blob = await onGenerate(text, instruct);
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
                    <Sparkles className="w-6 h-6 text-primary" />
                    Voice Design Studio
                </h2>
                <p className="text-muted-foreground">Describe a voice, and the AI will create it from scratch.</p>
            </div>

            <Card className="bg-card border-border shadow-md">
                <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-foreground">Voice Description (Instruct)</Label>
                        <Textarea 
                            placeholder="e.g. A deep, raspy male voice, usually sounds calm but has a hidden intensity..."
                            value={instruct}
                            onChange={(e) => setInstruct(e.target.value)}
                            className="bg-input border-border min-h-[100px] text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="text-foreground">Text to Speak</Label>
                        <Textarea 
                            placeholder="What should this voice say?"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                        />
                    </div>

                    <AdvancedSettings config={genConfig} onConfigChange={setGenConfig} />

                    <Button 
                        onClick={handleGenerate} 
                        disabled={isGenerating || !text || !instruct}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Designing Voice...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate Voice
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
                                <p className="text-muted-foreground text-sm">Voice Design Output</p>
                            </div>
                        </div>
                        <audio controls src={audioUrl} className="h-10 accent-primary" />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
