"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FilterControlsProps {
  applyFilter: (filterType: string, frequency: number) => void
  applyEffect: (effectType: string, value: number | number[]) => void
}

const FilterControls: React.FC<FilterControlsProps> = ({ applyFilter, applyEffect }) => {
  const [filterType, setFilterType] = useState("lowpass")
  const [frequency, setFrequency] = useState(1000)
  const [timeStretch, setTimeStretch] = useState(1)
  const [pitchShift, setPitchShift] = useState(0)
  const [reverb, setReverb] = useState(0)
  const [volume, setVolume] = useState(1)
  const [noiseGate, setNoiseGate] = useState(-50)
  const [compression, setCompression] = useState(0)
  const [eq, setEq] = useState([0, 0, 0]) // Low, Mid, High

  const handleApplyFilter = () => {
    applyFilter(filterType, frequency)
  }

  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold mb-2">Audio Processing Controls</h2>
      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        <TabsContent value="basic">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Filter Type</Label>
              <RadioGroup value={filterType} onValueChange={setFilterType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lowpass" id="lowpass" />
                  <Label htmlFor="lowpass">Low Pass</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="highpass" id="highpass" />
                  <Label htmlFor="highpass">High Pass</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bandpass" id="bandpass" />
                  <Label htmlFor="bandpass">Band Pass</Label>
                </div>
              </RadioGroup>
              <Label htmlFor="frequency" className="mt-2 block">
                Frequency (Hz)
              </Label>
              <Input
                type="number"
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                min={20}
                max={20000}
              />
              <Button onClick={handleApplyFilter} className="mt-2">
                Apply Filter
              </Button>
            </div>
            <div>
              <Label>Volume</Label>
              <Slider
                value={[volume]}
                onValueChange={(value) => {
                  setVolume(value[0])
                  applyEffect("volume", value[0])
                }}
                min={0}
                max={2}
                step={0.1}
              />
              <Label>Time Stretch</Label>
              <Slider
                value={[timeStretch]}
                onValueChange={(value) => {
                  setTimeStretch(value[0])
                  applyEffect("timeStretch", value[0])
                }}
                min={0.5}
                max={2}
                step={0.1}
              />
              <Label>Pitch Shift</Label>
              <Slider
                value={[pitchShift]}
                onValueChange={(value) => {
                  setPitchShift(value[0])
                  applyEffect("pitchShift", value[0])
                }}
                min={-12}
                max={12}
                step={1}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="advanced">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Reverb</Label>
              <Slider
                value={[reverb]}
                onValueChange={(value) => {
                  setReverb(value[0])
                  applyEffect("reverb", value[0])
                }}
                min={0}
                max={1}
                step={0.1}
              />
              <Label>Noise Gate Threshold (dB)</Label>
              <Slider
                value={[noiseGate]}
                onValueChange={(value) => {
                  setNoiseGate(value[0])
                  applyEffect("noiseGate", value[0])
                }}
                min={-100}
                max={0}
                step={1}
              />
              <Label>Compression</Label>
              <Slider
                value={[compression]}
                onValueChange={(value) => {
                  setCompression(value[0])
                  applyEffect("compression", value[0])
                }}
                min={0}
                max={1}
                step={0.1}
              />
            </div>
            <div>
              <Label>Equalizer</Label>
              <Label>Low</Label>
              <Slider
                value={[eq[0]]}
                onValueChange={(value) => {
                  const newEq = [value[0], eq[1], eq[2]]
                  setEq(newEq)
                  applyEffect("eq", newEq)
                }}
                min={-12}
                max={12}
                step={1}
              />
              <Label>Mid</Label>
              <Slider
                value={[eq[1]]}
                onValueChange={(value) => {
                  const newEq = [eq[0], value[0], eq[2]]
                  setEq(newEq)
                  applyEffect("eq", newEq)
                }}
                min={-12}
                max={12}
                step={1}
              />
              <Label>High</Label>
              <Slider
                value={[eq[2]]}
                onValueChange={(value) => {
                  const newEq = [eq[0], eq[1], value[0]]
                  setEq(newEq)
                  applyEffect("eq", newEq)
                }}
                min={-12}
                max={12}
                step={1}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default FilterControls

