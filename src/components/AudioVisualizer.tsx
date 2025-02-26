"use client"

import type React from "react"

import { useRef, useEffect } from "react"
import { drawWaveform, drawSpectrogram } from "@/utils/audioVisualization"

interface AudioVisualizerProps {
  audioBuffer: AudioBuffer
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioBuffer }) => {
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null)
  const spectrogramCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (waveformCanvasRef.current && spectrogramCanvasRef.current) {
      drawWaveform(waveformCanvasRef.current, audioBuffer)
      drawSpectrogram(spectrogramCanvasRef.current, audioBuffer)
    }
  }, [audioBuffer])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">Waveform</h2>
        <canvas ref={waveformCanvasRef} width={600} height={200} className="w-full border" />
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2">Spectrogram</h2>
        <canvas ref={spectrogramCanvasRef} width={600} height={200} className="w-full border" />
      </div>
    </div>
  )
}

export default AudioVisualizer

