export function drawWaveform(canvas: HTMLCanvasElement, audioBuffer: AudioBuffer) {
    const ctx = canvas.getContext("2d")
    if (!ctx) return
  
    const width = canvas.width
    const height = canvas.height
    const data = audioBuffer.getChannelData(0)
    const step = Math.ceil(data.length / width)
  
    ctx.clearRect(0, 0, width, height)
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
  
    for (let i = 0; i < width; i++) {
      const index = Math.floor(i * step)
      const x = i
      const y = ((1 + data[index]) * height) / 2
      ctx.lineTo(x, y)
    }
  
    ctx.strokeStyle = "#3b82f6"
    ctx.stroke()
  }
  
  export function drawSpectrogram(canvas: HTMLCanvasElement, audioBuffer: AudioBuffer) {
    const ctx = canvas.getContext("2d")
    if (!ctx) return
  
    const width = canvas.width
    const height = canvas.height
    const fftSize = 2048
    const data = audioBuffer.getChannelData(0)
  
    const offlineContext = new OfflineAudioContext(1, data.length, audioBuffer.sampleRate)
    const source = offlineContext.createBufferSource()
    source.buffer = audioBuffer
  
    const analyser = offlineContext.createAnalyser()
    analyser.fftSize = fftSize
    source.connect(analyser)
    analyser.connect(offlineContext.destination)
  
    source.start()
  
    const frequencyData = new Uint8Array(analyser.frequencyBinCount)
    const sliceWidth = width / (data.length / fftSize)
  
    offlineContext.startRendering().then(() => {
      let x = 0

      function draw() {
        if (!ctx) return
        analyser.getByteFrequencyData(frequencyData)
  
        for (let i = 0; i < frequencyData.length; i++) {
          const value = frequencyData[i]
          const percent = value / 256
          const hue = (1 - percent) * 240
          ctx.fillStyle = `hsl(${hue}, 100%, 50%)`
          ctx.fillRect(x, height - (i * height) / frequencyData.length, sliceWidth, height / frequencyData.length)
        }
  
        x += sliceWidth
  
        if (x < width) {
          requestAnimationFrame(draw)
        }
      }
  
      draw()
    })
  }
  
  