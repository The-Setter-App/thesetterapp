import { useState, useRef, useCallback } from 'react';

export interface AudioRecorderState {
  isRecording: boolean;
  recordingTime: number;
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartMsRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Prefer mp4 or webm; browser support varies
      let mimeType = '';
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      }

      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Collect data in small chunks (100ms) to ensure we have data available quickly
      recorder.start(100); 
      setIsRecording(true);
      setRecordingTime(0);
      recordingStartMsRef.current = Date.now();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        const startMs = recordingStartMsRef.current;
        if (!startMs) {
          setRecordingTime(0);
          return;
        }
        const elapsedSeconds = Math.floor((Date.now() - startMs) / 1000);
        setRecordingTime(elapsedSeconds);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback((): Promise<{ audioBlob: Blob; duration: number } | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }

      const recorder = mediaRecorderRef.current;

      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const startMs = recordingStartMsRef.current;
        const duration = startMs ? Math.max(0, Math.floor((Date.now() - startMs) / 1000)) : recordingTime;
        
        // Cleanup
        if (timerRef.current) clearInterval(timerRef.current);
        recorder.stream.getTracks().forEach(track => track.stop());
        
        setIsRecording(false);
        setRecordingTime(0);
        mediaRecorderRef.current = null;
        recordingStartMsRef.current = null;
        chunksRef.current = [];
        
        resolve({ audioBlob: blob, duration });
      };

      recorder.stop();
    });
  }, [recordingTime]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    mediaRecorderRef.current = null;
    recordingStartMsRef.current = null;
    chunksRef.current = [];
  }, []);

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    cancelRecording
  };
}
