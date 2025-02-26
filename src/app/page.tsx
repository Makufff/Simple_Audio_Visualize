"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type React from "react";
import AudioVisualizer from "@/components/AudioVisualizer";
import FilterControls from "@/components/FilterControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  applyTimeStretch,
  applyPitchShift,
  applyReverb,
  applyNoiseGate,
  applyCompression,
  applyEQ,
} from "@/utils/audioEffects";

export default function Home() {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.connect(audioContextRef.current.destination);

    return () => {
      audioContextRef.current?.close().catch(() => null);
    };
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && audioContextRef.current) {
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      setAudioBuffer(decodedBuffer);
      setProcessedBuffer(decodedBuffer);
    }
  }, []);

  const applyFilter = (filterType: string, frequency: number) => {
    if (!audioBuffer || !audioContextRef.current) return;

    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = processedBuffer || audioBuffer;

    const filter = offlineContext.createBiquadFilter();
    filter.type = filterType as BiquadFilterType; // ✅ Fixed: Explicitly cast string to BiquadFilterType
    filter.frequency.value = frequency;

    source.connect(filter);
    filter.connect(offlineContext.destination);

    source.start();

    offlineContext.startRendering().then((renderedBuffer) => {
      setProcessedBuffer(renderedBuffer);
    });
  };

  const applyEffect = async (effectType: string, value: number | number[]) => {
    if (!audioBuffer || !audioContextRef.current) return;

    let newBuffer: AudioBuffer | null = null;

    switch (effectType) {
      case "timeStretch":
        newBuffer = await applyTimeStretch(audioContextRef.current, processedBuffer || audioBuffer, value as number);
        break;
      case "pitchShift":
        newBuffer = await applyPitchShift(audioContextRef.current, processedBuffer || audioBuffer, value as number);
        break;
      case "reverb":
        newBuffer = await applyReverb(audioContextRef.current, processedBuffer || audioBuffer, value as number);
        break;
      case "noiseGate":
        newBuffer = await applyNoiseGate(audioContextRef.current, processedBuffer || audioBuffer, value as number);
        break;
      case "compression":
        newBuffer = await applyCompression(audioContextRef.current, processedBuffer || audioBuffer, value as number);
        break;
      case "eq":
        newBuffer = await applyEQ(audioContextRef.current, processedBuffer || audioBuffer, value as number[]);
        break;
      case "volume":
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.setValueAtTime(value as number, audioContextRef.current.currentTime);
        }
        return;
      default:
        console.error("Unknown effect type:", effectType);
        return;
    }

    if (newBuffer) {
      setProcessedBuffer(newBuffer);
    }
  };

  const playAudio = async () => {
    if (processedBuffer && audioContextRef.current && gainNodeRef.current) {
      await audioContextRef.current.resume(); // Ensure audio context is active
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }
      const newSource = audioContextRef.current.createBufferSource();
      newSource.buffer = processedBuffer;
      newSource.connect(gainNodeRef.current);
      newSource.start();
      sourceNodeRef.current = newSource;
    }
  };

  const stopAudio = () => {
    sourceNodeRef.current?.stop();
  };

  const downloadProcessedAudio = () => {
    if (processedBuffer && audioContextRef.current) {
      const offlineContext = new OfflineAudioContext(
        processedBuffer.numberOfChannels,
        processedBuffer.length,
        processedBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = processedBuffer;
      source.connect(offlineContext.destination);
      source.start();

      offlineContext.startRendering().then((renderedBuffer) => {
        const wav = bufferToWav(renderedBuffer);
        const blob = new Blob([wav], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "processed_audio.wav";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
  };

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
  );
}

// Helper function to convert AudioBuffer to WAV format
function bufferToWav(buffer: AudioBuffer): Uint8Array {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length * numChannels * 2 + 44;
  const outputBuffer = new ArrayBuffer(length);
  const view = new DataView(outputBuffer);

  const writeString = (str: string, offset: number) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString("RIFF", 0);
  view.setUint32(4, length - 8, true);
  writeString("WAVE", 8);
  writeString("fmt ", 12);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString("data", 36);
  view.setUint32(40, length - 44, true);

  let offset = 44;
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < buffer.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Uint8Array(outputBuffer);
}
