import { DSPConfig } from "../types";

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  
  // Nodes
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private inputGainNode: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private eqNodes: BiquadFilterNode[] = [];
  private masterOutputNode: GainNode | null = null; // The final node before destination/analyser
  private analyser: AnalyserNode | null = null;
  
  // Recording internals
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingDestination: MediaStreamAudioDestinationNode | null = null;

  // Streaming internals
  private streamRecorder: MediaRecorder | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;

  async initialize(deviceId?: string): Promise<void> {
    if (this.audioContext) {
      await this.cleanup();
    }

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const constraints: MediaStreamConstraints = {
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false
    };

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create Nodes
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.inputGainNode = this.audioContext.createGain();
      this.compressorNode = this.audioContext.createDynamicsCompressor();
      this.masterOutputNode = this.audioContext.createGain();
      this.analyser = this.audioContext.createAnalyser();

      // Create EQ Bands (5 Bands)
      const frequencies = [60, 250, 1000, 4000, 12000];
      this.eqNodes = frequencies.map((freq, index) => {
        const filter = this.audioContext!.createBiquadFilter();
        filter.frequency.value = freq;
        // First band: Lowshelf, Last band: Highshelf, Others: Peaking
        if (index === 0) filter.type = 'lowshelf';
        else if (index === frequencies.length - 1) filter.type = 'highshelf';
        else filter.type = 'peaking';
        filter.Q.value = 1.0; 
        filter.gain.value = 0;
        return filter;
      });

      // Config Analyser
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // --- ROUTING CHAIN ---
      // Source -> Input Gain -> Compressor -> EQ[0]->...->EQ[4] -> Master Output -> Analyser
      
      this.sourceNode.connect(this.inputGainNode);
      this.inputGainNode.connect(this.compressorNode);
      
      // Connect EQ Chain
      let previousNode: AudioNode = this.compressorNode;
      this.eqNodes.forEach(node => {
        previousNode.connect(node);
        previousNode = node;
      });
      
      // Connect End of EQ to Master Output
      previousNode.connect(this.masterOutputNode);
      
      // Master Output to Analyser (Visualizer)
      this.masterOutputNode.connect(this.analyser);
      
    } catch (error) {
      console.error("Error initializing audio engine:", error);
      throw error;
    }
  }

  /**
   * Updates DSP settings in real-time
   */
  setDSPConfig(config: DSPConfig) {
    if (!this.audioContext || !this.compressorNode || this.eqNodes.length === 0) return;

    // Apply Compressor Settings
    if (config.compressor.enabled) {
      this.compressorNode.threshold.setTargetAtTime(config.compressor.threshold, this.audioContext.currentTime, 0.1);
      this.compressorNode.ratio.setTargetAtTime(config.compressor.ratio, this.audioContext.currentTime, 0.1);
      this.compressorNode.attack.setTargetAtTime(config.compressor.attack, this.audioContext.currentTime, 0.1);
      this.compressorNode.release.setTargetAtTime(config.compressor.release, this.audioContext.currentTime, 0.1);
    } else {
      // Bypass: Threshold to 0 (no compression), Ratio to 1 (no reduction)
      this.compressorNode.threshold.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
      this.compressorNode.ratio.setTargetAtTime(1, this.audioContext.currentTime, 0.1);
    }

    // Apply EQ Settings
    if (config.equalizer.enabled) {
      config.equalizer.bands.forEach((band, index) => {
        if (this.eqNodes[index]) {
          this.eqNodes[index].gain.setTargetAtTime(band.gain, this.audioContext!.currentTime, 0.1);
        }
      });
    } else {
      // Bypass EQ: Set all gains to 0
      this.eqNodes.forEach(node => {
        node.gain.setTargetAtTime(0, this.audioContext!.currentTime, 0.1);
      });
    }
  }

  getByteFrequencyData(): Uint8Array | null {
    if (!this.analyser) return null;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  getVolumeData(): { left: number, right: number } {
    if (!this.analyser) return { left: 0, right: 0 };
    
    const array = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(array);
    
    // Simple average for volume estimation
    let values = 0;
    const length = array.length;
    for (let i = 0; i < length; i++) {
      values += array[i];
    }
    const average = values / length;
    
    // Normalize to 0-1 range roughly
    const volume = Math.min(1, average / 128);
    
    return { left: volume, right: volume };
  }

  setGain(value: number) {
    if (this.inputGainNode) {
      this.inputGainNode.gain.value = value;
    }
  }

  private getMimeTypeForCodec(codec: string): string {
    switch (codec) {
      case 'MP3': return 'audio/mpeg'; 
      case 'AAC': return 'audio/aac';
      case 'OGG': return 'audio/ogg;codecs=opus'; 
      case 'OPUS': return 'audio/webm;codecs=opus';
      default: return 'audio/webm';
    }
  }

  // --- LOCAL RECORDING METHODS ---

  async startRecording(codec: string, bitrateKbps: number): Promise<{ usedMimeType: string }> {
    if (!this.audioContext || !this.masterOutputNode) {
      throw new Error("Audio Engine not initialized");
    }

    this.recordingDestination = this.audioContext.createMediaStreamDestination();
    this.masterOutputNode.connect(this.recordingDestination);
    this.recordedChunks = [];
    
    let requestedMime = this.getMimeTypeForCodec(codec);
    let finalMimeType = requestedMime;

    if (!MediaRecorder.isTypeSupported(requestedMime)) {
      if (codec === 'OGG' && MediaRecorder.isTypeSupported('audio/ogg')) finalMimeType = 'audio/ogg';
      else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) finalMimeType = 'audio/webm;codecs=opus';
      else finalMimeType = 'audio/webm';
    }

    const options: MediaRecorderOptions = {
      mimeType: finalMimeType,
      audioBitsPerSecond: bitrateKbps * 1000 
    };

    this.mediaRecorder = new MediaRecorder(this.recordingDestination.stream, options);
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.recordedChunks.push(event.data);
    };

    this.mediaRecorder.start(1000); 
    return { usedMimeType: finalMimeType };
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        return reject("No active recording");
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        this.recordedChunks = [];
        if (this.masterOutputNode && this.recordingDestination) {
          this.masterOutputNode.disconnect(this.recordingDestination);
        }
        this.recordingDestination = null;
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  // --- STREAMING METHODS (For Live Broadcast) ---

  async startStreaming(codec: string, bitrateKbps: number, onDataAvailable: (data: Blob) => void): Promise<{ usedMimeType: string }> {
    if (!this.audioContext || !this.masterOutputNode) {
      throw new Error("Audio Engine not initialized");
    }

    this.streamDestination = this.audioContext.createMediaStreamDestination();
    this.masterOutputNode.connect(this.streamDestination);

    let requestedMime = this.getMimeTypeForCodec(codec);
    let finalMimeType = requestedMime;

    if (!MediaRecorder.isTypeSupported(requestedMime)) {
       // Fallbacks
       if (MediaRecorder.isTypeSupported('audio/mpeg')) finalMimeType = 'audio/mpeg';
       else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) finalMimeType = 'audio/webm;codecs=opus';
       else finalMimeType = 'audio/webm';
       console.warn(`Streaming Codec fallback: requested ${requestedMime}, using ${finalMimeType}`);
    }

    const options: MediaRecorderOptions = {
      mimeType: finalMimeType,
      audioBitsPerSecond: bitrateKbps * 1000
    };

    this.streamRecorder = new MediaRecorder(this.streamDestination.stream, options);
    
    this.streamRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        onDataAvailable(event.data);
      }
    };

    // Slice every 500ms to ensure low latency delivery to the socket
    this.streamRecorder.start(500); 

    return { usedMimeType: finalMimeType };
  }

  async stopStreaming(): Promise<void> {
    if (this.streamRecorder && this.streamRecorder.state !== 'inactive') {
      this.streamRecorder.stop();
    }
    if (this.masterOutputNode && this.streamDestination) {
      this.masterOutputNode.disconnect(this.streamDestination);
    }
    this.streamRecorder = null;
    this.streamDestination = null;
  }

  // --- DEVICE MANAGEMENT ---

  async getInputDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
  }

  async cleanup() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.inputGainNode = null;
    this.compressorNode = null;
    this.masterOutputNode = null;
    this.analyser = null;
    this.eqNodes = [];
    this.mediaRecorder = null;
    this.recordingDestination = null;
    this.streamRecorder = null;
    this.streamDestination = null;
  }
}

export const audioEngine = new AudioEngine();