import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, Square } from 'lucide-react';
import { storage } from '@/firebase/clientApp';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface AudioRecorderProps {
  onAudioUpload: (url: string) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioUpload }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioBlob(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAudio = async () => {
    if (!audioBlob) return;

    const storageRef = ref(storage, `audio/${Date.now()}_recording.webm`);

    try {
      const snapshot = await uploadBytes(storageRef, audioBlob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      onAudioUpload(downloadURL);
      setAudioBlob(null);
    } catch (error) {
      console.error("Error uploading audio: ", error);
    }
  };

  return (
    <div className="space-y-2">
      {isRecording ? (
        <Button onClick={stopRecording} variant="destructive">
          <Square className="mr-2 h-4 w-4" /> Stop Recording
        </Button>
      ) : (
        <Button onClick={startRecording}>
          <Mic className="mr-2 h-4 w-4" /> Start Recording
        </Button>
      )}
      {audioBlob && (
        <Button onClick={uploadAudio}>
          <Mic className="mr-2 h-4 w-4" /> Upload Recording
        </Button>
      )}
    </div>
  );
};

export default AudioRecorder;