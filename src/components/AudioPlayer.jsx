import { useState, useRef, useEffect } from 'react';
import './AudioPlayer.css';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';

const AUDIO_SRC = '/nemoc-law-ai-deep-dive.mp3';

export default function AudioPlayer() {
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onMeta = () => setDuration(a.duration);
    const onTime = () => setCurrent(a.currentTime);
    const onEnd = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);

    return () => {
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    
    if (a.paused) {
      const playPromise = a.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Audio playback error:", error);
          setPlaying(false);
        });
      }
    } else {
      a.pause();
    }
  };

  const seek = (e) => {
    const bar = progressRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`audio-player ${playing ? 'is-playing' : ''}`}>
      <audio ref={audioRef} src={AUDIO_SRC} preload="none" />

      {/* Play / Pause Button */}
      <button className="ap-play-btn" onClick={toggle} type="button" aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>

      {/* Track Info + Progress */}
      <div className="ap-center">
        <div className="ap-info">
          <span className="ap-title">🎧 NemoC LAW AI — AI and the Agentic Legal Revolution</span>
        </div>
        <div className="ap-progress-row">
          <span className="ap-time">{fmt(currentTime)}</span>
          <div className="ap-progress-bar" ref={progressRef} onClick={seek}>
            <div className="ap-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="ap-time">{fmt(duration)}</span>
        </div>
      </div>

      {/* Visualizer (EQ bars) */}
      <div className={`ap-visualizer ${playing ? 'active' : ''}`}>
        <span className="ap-bar" /><span className="ap-bar" /><span className="ap-bar" />
        <span className="ap-bar" /><span className="ap-bar" />
      </div>

      {/* Mute */}
      <button className="ap-mute-btn" onClick={() => { setMuted(!muted); audioRef.current.muted = !muted; }} type="button" aria-label={muted ? 'Unmute' : 'Mute'}>
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
    </div>
  );
}
