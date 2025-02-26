"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import AudioVisualizer from "../components/AudioVisualizer"
import FilterControls from "../components/FilterControls"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  applyTimeStretch,
  applyPitchShift,
  applyReverb,
  applyNoiseGate,
  applyCompression,
  applyEQ,
} from "../utils/audioEffects"

export default function Home() {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    gainNodeRef.current = audioContextRef.current.createGain()
    gainNodeRef.current.connect(audioContextRef.current.destination)
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && audioContextRef.current) {
      const arrayBuffer = await file.arrayBuffer()
      const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      setAudioBuffer(decodedBuffer)
      setProcessedBuffer(decodedBuffer)
    }
  }

  const applyFilter = (filterType: string, frequency: number) => {
    if (!audioBuffer || !audioContextRef.current) return

    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate,
    )

    const source = offlineContext.createBufferSource()
    source.buffer = processedBuffer || audioBuffer

    const filter = offlineContext.createBiquadFilter()
    filter.type = filterType as BiquadFilterType
    filter.frequency.value = frequency

    source.connect(filter)
    filter.connect(offlineContext.destination)

    source.start()

    offlineContext.startRendering().then((renderedBuffer) => {
      setProcessedBuffer(renderedBuffer)
    })
  }

  const applyEffect = async (effectType: string, value: number | number[]) => {
    if (!audioBuffer || !audioContextRef.current) return

    let newBuffer: AudioBuffer | null = null

    switch (effectType) {
      case "timeStretch":
        newBuffer = await applyTimeStretch(audioContextRef.current, processedBuffer || audioBuffer, value as number)
        break
      case "pitchShift":
        newBuffer = await applyPitchShift(audioContextRef.current, processedBuffer || audioBuffer, value as number)
        break
      case "reverb":
        newBuffer = await applyReverb(audioContextRef.current, processedBuffer || audioBuffer, value as number)
        break
      case "noiseGate":
        newBuffer = await applyNoiseGate(audioContextRef.current, processedBuffer || audioBuffer, value as number)
        break
      case "compression":
        newBuffer = await applyCompression(audioContextRef.current, processedBuffer || audioBuffer, value as number)
        break
      case "eq":
        newBuffer = await applyEQ(audioContextRef.current, processedBuffer || audioBuffer, value as number[])
        break
      case "volume":
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.setValueAtTime(value as number, audioContextRef.current.currentTime)
        }
        return
      default:
        console.error("Unknown effect type:", effectType)
        return
    }

    if (newBuffer) {
      setProcessedBuffer(newBuffer)
    }
  }

  const playAudio = () => {
    if (processedBuffer && audioContextRef.current && gainNodeRef.current) {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop()
      }
      sourceNodeRef.current = audioContextRef.current.createBufferSource()
      sourceNodeRef.current.buffer = processedBuffer
      sourceNodeRef.current.connect(gainNodeRef.current)
      sourceNodeRef.current.start()
    }
  }

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
    }
  }

  const downloadProcessedAudio = () => {
    if (processedBuffer && audioContextRef.current) {
      const offlineContext = new OfflineAudioContext(
        processedBuffer.numberOfChannels,
        processedBuffer.length,
        processedBuffer.sampleRate,
      )

      const source = offlineContext.createBufferSource()
      source.buffer = processedBuffer
      source.connect(offlineContext.destination)
      source.start()

      offlineContext.startRendering().then((renderedBuffer) => {
        const wav = bufferToWav(renderedBuffer)
        const blob = new Blob([wav], { type: "audio/wav" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = "processed_audio.wav"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
    }
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Audio FFT Visualizer and Processor</h1>
      <Input type="file" accept="audio/*" onChange={handleFileUpload} className="mb-4" />
      {audioBuffer && (
        <>
          <AudioVisualizer audioBuffer={processedBuffer || audioBuffer} />
          <FilterControls applyFilter={applyFilter} applyEffect={applyEffect} />
          <div className="mt-4 space-x-2">
            <Button onClick={playAudio}>Play Processed Audio</Button>
            <Button onClick={stopAudio}>Stop Audio</Button>
            <Button onClick={() => setProcessedBuffer(audioBuffer)}>Reset Effects</Button>
            <Button onClick={downloadProcessedAudio}>Download Processed Audio</Button>
          </div>
        </>
      )}
    </main>
  )
}

// Helper function to convert AudioBuffer to WAV format
function bufferToWav(buffer: AudioBuffer) {
  const numOfChan = buffer.numberOfChannels
  const length = buffer.length * numOfChan * 2 + 44
  const out = new ArrayBuffer(length)
  const view = new DataView(out)
  const channels = []
  let sample
  let offset = 0
  let pos = 0

  // write WAVE header
  setUint32(0x46464952) // "RIFF"
  setUint32(length - 8) // file length - 8
  setUint32(0x45564157) // "WAVE"

  setUint32(0x20746d66) // "fmt " chunk
  setUint32(16) // length = 16
  setUint16(1) // PCM (uncompressed)
  setUint16(numOfChan)
  setUint32(buffer.sampleRate)
  setUint32(buffer.sampleRate * 2 * numOfChan) // avg. bytes/sec
  setUint16(numOfChan * 2) // block-align
  setUint16(16) // 16-bit (hardcoded in this demo)

  setUint32(0x61746164) // "data" - chunk
  setUint32(length - pos - 4) // chunk length

  // write interleaved data
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i))
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])) // clamp
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      pos += 2
    }
    offset++ // next source sample
  }

  function setUint16(data: number) {
    view.setUint16(pos, data, true)
    pos += 2
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true)
    pos += 4
  }

  return new Uint8Array(out)
}

