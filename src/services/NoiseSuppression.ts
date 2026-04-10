/**
 * RNNoise-based noise suppression for WebRTC calls.
 * Processes microphone audio through the RNNoise ML model (WASM)
 * to remove background noise before sending to the peer connection.
 */

let rnnoiseInstance: any = null;

async function getRnnoise() {
  if (rnnoiseInstance) return rnnoiseInstance;
  const { Rnnoise } = await import('@shiguredo/rnnoise-wasm');
  rnnoiseInstance = await Rnnoise.load();
  return rnnoiseInstance;
}

export class NoiseSuppression {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private denoiseState: any = null;
  private enabled = true;
  private originalStream: MediaStream | null = null;
  private cleanStream: MediaStream | null = null;

  /**
   * Process a MediaStream through RNNoise and return a clean stream.
   * The original stream's audio track is replaced with the denoised version.
   */
  async process(stream: MediaStream): Promise<MediaStream> {
    this.originalStream = stream;

    try {
      const rnnoise = await getRnnoise();
      this.denoiseState = rnnoise.createDenoiseState();
      const frameSize = rnnoise.frameSize; // 480 samples for 48kHz

      // Create audio processing pipeline
      this.audioContext = new AudioContext({ sampleRate: 48000 });
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.destinationNode = this.audioContext.createMediaStreamDestination();

      // ScriptProcessorNode for real-time processing
      // 2048 buffer = ~43ms latency at 48kHz (lower = less delay but more CPU)
      this.processorNode = this.audioContext.createScriptProcessor(2048, 1, 1);

      // Accumulator for RNNoise frame processing
      let inputBuffer = new Float32Array(0);

      this.processorNode.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const output = event.outputBuffer.getChannelData(0);

        if (!this.enabled || !this.denoiseState) {
          // Bypass: copy input to output directly
          output.set(input);
          return;
        }

        // Accumulate input samples
        const newBuffer = new Float32Array(inputBuffer.length + input.length);
        newBuffer.set(inputBuffer);
        newBuffer.set(input, inputBuffer.length);
        inputBuffer = newBuffer;

        // Process complete frames through RNNoise
        let outputOffset = 0;
        while (inputBuffer.length >= frameSize && outputOffset + frameSize <= output.length) {
          const frame = inputBuffer.slice(0, frameSize);

          // RNNoise expects 16-bit PCM range (-32768 to 32767)
          const pcmFrame = new Float32Array(frameSize);
          for (let i = 0; i < frameSize; i++) {
            pcmFrame[i] = frame[i] * 32768;
          }

          this.denoiseState.processFrame(pcmFrame);

          // Convert back to float range (-1 to 1)
          for (let i = 0; i < frameSize; i++) {
            output[outputOffset + i] = pcmFrame[i] / 32768;
          }

          inputBuffer = inputBuffer.slice(frameSize);
          outputOffset += frameSize;
        }

        // Fill remaining output with silence
        for (let i = outputOffset; i < output.length; i++) {
          output[i] = 0;
        }
      };

      // Connect the pipeline
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.destinationNode);

      // Build clean stream: use denoised audio + original video tracks (if any)
      this.cleanStream = this.destinationNode.stream;
      const resultStream = new MediaStream();

      // Add denoised audio track
      this.cleanStream.getAudioTracks().forEach(track => {
        resultStream.addTrack(track);
      });

      // Preserve video tracks from original stream
      stream.getVideoTracks().forEach(track => {
        resultStream.addTrack(track);
      });

      return resultStream;
    } catch (error) {
      console.warn('Failed to initialize noise suppression, using original stream:', error);
      return stream;
    }
  }

  /** Toggle noise suppression on/off */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /** Check if noise suppression is active */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** Clean up all resources */
  destroy() {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.denoiseState) {
      this.denoiseState.destroy();
      this.denoiseState = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.cleanStream = null;
    this.originalStream = null;
  }
}
