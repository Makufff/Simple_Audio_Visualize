export async function applyTimeStretch(
    audioContext: AudioContext,
    inputBuffer: AudioBuffer,
    stretchFactor: number,
  ): Promise<AudioBuffer> {
    const offlineContext = new OfflineAudioContext(
      inputBuffer.numberOfChannels,
      Math.ceil(inputBuffer.length * stretchFactor),
      inputBuffer.sampleRate,
    )
  
    const source = offlineContext.createBufferSource()
    source.buffer = inputBuffer
    source.playbackRate.value = 1 / stretchFactor
  
    source.connect(offlineContext.destination)
    source.start()
  
    return offlineContext.startRendering()
  }
  
  export async function applyPitchShift(
    audioContext: AudioContext,
    inputBuffer: AudioBuffer,
    semitones: number,
  ): Promise<AudioBuffer> {
    const pitchFactor = Math.pow(2, semitones / 12)
    const offlineContext = new OfflineAudioContext(
      inputBuffer.numberOfChannels,
      inputBuffer.length,
      inputBuffer.sampleRate,
    )
  
    const source = offlineContext.createBufferSource()
    source.buffer = inputBuffer
  
    const pitchShifter = offlineContext.createScriptProcessor(4096, 1, 1)
    pitchShifter.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0)
      const outputData = event.outputBuffer.getChannelData(0)
  
      for (let i = 0; i < inputData.length; i++) {
        const index = Math.round(i * pitchFactor)
        outputData[i] = index < inputData.length ? inputData[index] : 0
      }
    }
  
    source.connect(pitchShifter)
    pitchShifter.connect(offlineContext.destination)
    source.start()
  
    return offlineContext.startRendering()
  }
  
  export async function applyReverb(
    audioContext: AudioContext,
    inputBuffer: AudioBuffer,
    reverbAmount: number,
  ): Promise<AudioBuffer> {
    const offlineContext = new OfflineAudioContext(
      inputBuffer.numberOfChannels,
      inputBuffer.length + audioContext.sampleRate * 2, // Add 2 seconds for reverb tail
      inputBuffer.sampleRate,
    )
  
    const source = offlineContext.createBufferSource()
    source.buffer = inputBuffer
  
    const convolver = offlineContext.createConvolver()
    const impulseResponse = await createImpulseResponse(offlineContext)
    convolver.buffer = impulseResponse
  
    const dryGain = offlineContext.createGain()
    const wetGain = offlineContext.createGain()
  
    dryGain.gain.value = 1 - reverbAmount
    wetGain.gain.value = reverbAmount
  
    source.connect(dryGain)
    source.connect(convolver)
    convolver.connect(wetGain)
    dryGain.connect(offlineContext.destination)
    wetGain.connect(offlineContext.destination)
  
    source.start()
  
    return offlineContext.startRendering()
  }
  
  export async function applyNoiseGate(
    audioContext: AudioContext,
    inputBuffer: AudioBuffer,
    threshold: number,
  ): Promise<AudioBuffer> {
    const offlineContext = new OfflineAudioContext(
      inputBuffer.numberOfChannels,
      inputBuffer.length,
      inputBuffer.sampleRate,
    )
  
    const source = offlineContext.createBufferSource()
    source.buffer = inputBuffer
  
    const processor = offlineContext.createScriptProcessor(4096, 1, 1)
    processor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0)
      const outputData = event.outputBuffer.getChannelData(0)
  
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = Math.abs(inputData[i]) > Math.pow(10, threshold / 20) ? inputData[i] : 0
      }
    }
  
    source.connect(processor)
    processor.connect(offlineContext.destination)
    source.start()
  
    return offlineContext.startRendering()
  }
  
  export async function applyCompression(
    audioContext: AudioContext,
    inputBuffer: AudioBuffer,
    amount: number,
  ): Promise<AudioBuffer> {
    const offlineContext = new OfflineAudioContext(
      inputBuffer.numberOfChannels,
      inputBuffer.length,
      inputBuffer.sampleRate,
    )
  
    const source = offlineContext.createBufferSource()
    source.buffer = inputBuffer
  
    const compressor = offlineContext.createDynamicsCompressor()
    compressor.threshold.value = -50 + amount * 50 // -50 to 0
    compressor.knee.value = 40
    compressor.ratio.value = 12
    compressor.attack.value = 0
    compressor.release.value = 0.25
  
    source.connect(compressor)
    compressor.connect(offlineContext.destination)
    source.start()
  
    return offlineContext.startRendering()
  }
  
  export async function applyEQ(
    audioContext: AudioContext,
    inputBuffer: AudioBuffer,
    eqValues: number[],
  ): Promise<AudioBuffer> {
    const offlineContext = new OfflineAudioContext(
      inputBuffer.numberOfChannels,
      inputBuffer.length,
      inputBuffer.sampleRate,
    )
  
    const source = offlineContext.createBufferSource()
    source.buffer = inputBuffer
  
    const lowShelf = offlineContext.createBiquadFilter()
    lowShelf.type = "lowshelf"
    lowShelf.frequency.value = 320
    lowShelf.gain.value = eqValues[0]
  
    const peaking = offlineContext.createBiquadFilter()
    peaking.type = "peaking"
    peaking.frequency.value = 1000
    peaking.Q.value = 0.5
    peaking.gain.value = eqValues[1]
  
    const highShelf = offlineContext.createBiquadFilter()
    highShelf.type = "highshelf"
    highShelf.frequency.value = 3200
    highShelf.gain.value = eqValues[2]
  
    source.connect(lowShelf)
    lowShelf.connect(peaking)
    peaking.connect(highShelf)
    highShelf.connect(offlineContext.destination)
    source.start()
  
    return offlineContext.startRendering()
  }
  
  async function createImpulseResponse(context: AudioContext | OfflineAudioContext): Promise<AudioBuffer> {
    const sampleRate = context.sampleRate
    const length = sampleRate * 2 // 2 seconds
    const impulse = context.createBuffer(2, length, sampleRate)
  
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2)
      }
    }
  
    return impulse
  }
  
  