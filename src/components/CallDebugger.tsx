'use client';

import { useState, useEffect, useRef } from 'react';

interface CallDebuggerProps {
  sipService: any;
  isVisible: boolean;
  onClose: () => void;
}

interface DebugLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  data?: any;
}

export default function CallDebugger({ sipService, isVisible, onClose }: CallDebuggerProps) {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [audioLevels, setAudioLevels] = useState({ local: 0, remote: 0 });
  const [webrtcStats, setWebrtcStats] = useState<any>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) return;

    // Override console methods to capture logs
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (level: 'info' | 'warn' | 'error' | 'success', message: string, data?: any) => {
      setLogs(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        data
      }].slice(-100)); // Keep only last 100 logs
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('info', args.join(' '));
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args.join(' '));
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args.join(' '));
    };

    // Start audio level monitoring
    const audioInterval = setInterval(() => {
      if (sipService && sipService.currentSession) {
        analyzeAudioLevels();
      }
    }, 1000);

    // Start WebRTC stats monitoring
    const statsInterval = setInterval(() => {
      if (sipService && sipService.currentSession) {
        getWebRtcStats();
      }
    }, 2000);

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      clearInterval(audioInterval);
      clearInterval(statsInterval);
    };
  }, [isVisible, sipService]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const analyzeAudioLevels = async () => {
    try {
      const sessionDescriptionHandler = sipService.currentSession?.sessionDescriptionHandler;
      if (!sessionDescriptionHandler) return;

      const peerConnection = sessionDescriptionHandler.peerConnection;
      if (!peerConnection) return;

      // Get local and remote streams
      const localStreams = peerConnection.getLocalStreams?.() || [];
      const remoteStreams = peerConnection.getRemoteStreams?.() || [];

      // Analyze audio levels (simplified - you'd need Web Audio API for real analysis)
      setAudioLevels({
        local: localStreams.length > 0 ? Math.random() * 100 : 0, // Mock data
        remote: remoteStreams.length > 0 ? Math.random() * 100 : 0 // Mock data
      });
    } catch (error) {
      console.warn('Failed to analyze audio levels:', error);
    }
  };

  const getWebRtcStats = async () => {
    try {
      const sessionDescriptionHandler = sipService.currentSession?.sessionDescriptionHandler;
      if (!sessionDescriptionHandler) return;

      const peerConnection = sessionDescriptionHandler.peerConnection;
      if (!peerConnection) return;

      const stats = await peerConnection.getStats();
      const statsData: any = {};

      stats.forEach((report: any) => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
          statsData.inboundAudio = {
            packetsReceived: report.packetsReceived,
            packetsLost: report.packetsLost,
            jitter: report.jitter,
            bytesReceived: report.bytesReceived
          };
        } else if (report.type === 'outbound-rtp' && report.mediaType === 'audio') {
          statsData.outboundAudio = {
            packetsSent: report.packetsSent,
            bytesSent: report.bytesSent
          };
        } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          statsData.connection = {
            currentRoundTripTime: report.currentRoundTripTime,
            availableOutgoingBitrate: report.availableOutgoingBitrate,
            state: report.state
          };
        }
      });

      setWebrtcStats(statsData);
    } catch (error) {
      console.warn('Failed to get WebRTC stats:', error);
    }
  };

  const testAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

      // Test microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Audio device test failed:', error);
    }
  };

  const testVitalPbxConnection = async () => {
    try {
      const ws = new WebSocket('wss://pbx.echodesk.ge:8089/ws');

      ws.onopen = () => {
        ws.close();
      };

      ws.onerror = (error) => {
        console.error('WebSocket connection failed:', error);
      };

      ws.onclose = (event) => {
        // WebSocket connection closed
      };
    } catch (error) {
      console.error('WebSocket test failed:', error);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        width: '90%',
        height: '90%',
        padding: '20px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '2px solid #e1e5e9',
          paddingBottom: '15px'
        }}>
          <h2 style={{ margin: 0, color: '#333' }}>🔍 Call Debugger</h2>
          <button
            onClick={onClose}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ✕ Close
          </button>
        </div>

        <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
          {/* Left Panel - Controls */}
          <div style={{
            width: '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            {/* Test Buttons */}
            <div style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h4 style={{ margin: '0 0 10px 0' }}>🧪 Tests</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={testAudioDevices}
                  style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  🎤 Test Audio Devices
                </button>
                <button
                  onClick={testVitalPbxConnection}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  🌐 Test VitalPBX WebSocket
                </button>
                <button
                  onClick={clearLogs}
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  🗑️ Clear Logs
                </button>
              </div>
            </div>

            {/* Audio Levels */}
            <div style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h4 style={{ margin: '0 0 10px 0' }}>🎵 Audio Levels</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '12px', marginBottom: '4px' }}>Local: {audioLevels.local.toFixed(0)}%</div>
                  <div style={{
                    background: '#e9ecef',
                    height: '8px',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: '#28a745',
                      height: '100%',
                      width: `${audioLevels.local}%`,
                      transition: 'width 0.3s'
                    }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', marginBottom: '4px' }}>Remote: {audioLevels.remote.toFixed(0)}%</div>
                  <div style={{
                    background: '#e9ecef',
                    height: '8px',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: '#007bff',
                      height: '100%',
                      width: `${audioLevels.remote}%`,
                      transition: 'width 0.3s'
                    }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* WebRTC Stats */}
            {webrtcStats && (
              <div style={{
                background: '#f8f9fa',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <h4 style={{ margin: '0 0 10px 0' }}>📊 WebRTC Stats</h4>
                <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                  {webrtcStats.connection && (
                    <div>RTT: {(webrtcStats.connection.currentRoundTripTime * 1000).toFixed(0)}ms</div>
                  )}
                  {webrtcStats.inboundAudio && (
                    <div>RX: {webrtcStats.inboundAudio.packetsReceived} pkts</div>
                  )}
                  {webrtcStats.outboundAudio && (
                    <div>TX: {webrtcStats.outboundAudio.packetsSent} pkts</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Logs */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h4 style={{ margin: '0 0 10px 0' }}>📋 Debug Logs</h4>
            <div style={{
              flex: 1,
              background: '#000',
              color: '#fff',
              padding: '15px',
              borderRadius: '8px',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: '1.4'
            }}>
              {logs.map((log, index) => (
                <div key={index} style={{
                  marginBottom: '4px',
                  color: log.level === 'error' ? '#ff6b6b' :
                         log.level === 'warn' ? '#feca57' :
                         log.level === 'success' ? '#48dbfb' :
                         '#fff'
                }}>
                  <span style={{ color: '#6c757d' }}>[{log.timestamp}]</span> {log.message}
                </div>
              ))}
              <div ref={logsEndRef}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
