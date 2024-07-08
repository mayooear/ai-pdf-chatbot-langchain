import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAudioPlayerProps {
  src: string;
  startTime: number;
  endTime?: number;
  audioId: string;
  isGloballyPlaying: boolean;
}

export function useAudioPlayer({ src, startTime, endTime, audioId, isGloballyPlaying }: UseAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      audio.currentTime = startTime;
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [startTime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (endTime && audio.currentTime >= endTime) {
        audio.pause();
        setIsPlaying(false);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // Don't reset the currentTime here
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [endTime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isGloballyPlaying && !isPlaying) {
      audio.play().catch(error => console.error('Error playing audio:', error));
      setIsPlaying(true);
    } else if (!isGloballyPlaying && isPlaying) {
      audio.pause();
      setIsPlaying(false);
    }
  }, [isGloballyPlaying, isPlaying]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // If at the end, start from the beginning
      if (audio.currentTime >= (endTime || audio.duration)) {
        audio.currentTime = startTime;
      }
      audio.play().catch(error => console.error('Error playing audio:', error));
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, startTime, endTime]);

  const setAudioTime = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
    }
  }, []);

  const resetAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = startTime;
      setCurrentTime(startTime);
      if (isPlaying) {
        audio.play().catch(error => console.error('Error playing audio:', error));
      }
    }
  }, [startTime, isPlaying]);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    setAudioTime,
    resetAudio,
  };
}