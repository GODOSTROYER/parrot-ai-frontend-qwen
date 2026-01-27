"use client"

import * as React from "react"
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export interface GenerationConfig {
  temperature: number
  top_p: number
  top_k: number
  repetition_penalty: number
}

interface AdvancedSettingsProps {
  config: GenerationConfig
  onConfigChange: (config: GenerationConfig) => void
}

export function AdvancedSettings({ config, onConfigChange }: AdvancedSettingsProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleChange = (key: keyof GenerationConfig, value: number) => {
    onConfigChange({ ...config, [key]: value })
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full space-y-2">
      <div className="flex items-center justify-between px-1">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between p-0 hover:bg-transparent text-muted-foreground hover:text-foreground group">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="h-4 w-4" />
              Advanced Settings
            </span>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
            ) : (
              <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
            )}
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="space-y-4 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
        <Card className="border-primary/10 bg-card/50 shadow-inner">
            <CardContent className="p-4 space-y-4">
                {/* Temperature */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Temperature</Label>
                    <span className="text-xs text-muted-foreground w-12 text-right">{config.temperature.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[config.temperature]}
                    onValueChange={(vals) => handleChange("temperature", vals[0])}
                    min={0.1}
                    max={1.5}
                    step={0.05}
                    className="[&_.bg-primary]:bg-violet-500"
                  />
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Controls randomness. Lower is more stable/robotic, higher is more creative/emotional.
                  </p>
                </div>

                {/* Top P */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Top P</Label>
                    <span className="text-xs text-muted-foreground w-12 text-right">{config.top_p.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[config.top_p]}
                    onValueChange={(vals) => handleChange("top_p", vals[0])}
                    min={0.05}
                    max={1.0}
                    step={0.05}
                    className="[&_.bg-primary]:bg-teal-500"
                  />
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Nucleus sampling. Limits choices to top percentage of probability mass.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Top K */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium">Top K</Label>
                        <Input
                            type="number"
                            value={config.top_k}
                            onChange={(e) => handleChange("top_k", parseInt(e.target.value) || 50)}
                            className="h-8 text-xs bg-background/50"
                            min={1}
                            max={100}
                        />
                    </div>
                    
                    {/* Repetition Penalty */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium">Repetition Penalty</Label>
                        <Input
                            type="number"
                            value={config.repetition_penalty}
                            onChange={(e) => handleChange("repetition_penalty", parseFloat(e.target.value) || 1.1)}
                            className="h-8 text-xs bg-background/50"
                            min={1.0}
                            max={2.0}
                            step={0.05}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  )
}
