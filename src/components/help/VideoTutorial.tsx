'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoTutorialProps {
  url: string;
  title: string;
  thumbnail?: string;
  duration?: string;
  className?: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

export function VideoTutorial({ url, title, thumbnail, duration, className }: VideoTutorialProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const youtubeId = extractYouTubeId(url);
  const vimeoId = extractVimeoId(url);

  const getEmbedUrl = () => {
    if (youtubeId) {
      return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
    }
    if (vimeoId) {
      return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
    }
    return url;
  };

  const getThumbnailUrl = () => {
    if (thumbnail) return thumbnail;
    if (youtubeId) {
      return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    }
    return null;
  };

  const thumbnailUrl = getThumbnailUrl();

  if (isPlaying) {
    return (
      <div className={cn('aspect-video rounded-lg overflow-hidden bg-black', className)}>
        <iframe
          src={getEmbedUrl()}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'aspect-video rounded-lg overflow-hidden bg-gray-900 relative cursor-pointer group',
        className
      )}
      onClick={() => setIsPlaying(true)}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <span className="text-gray-400">Video Preview</span>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />

      {/* Play Button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center transition-all group-hover:scale-110 shadow-lg">
          <Play className="w-7 h-7 text-gray-900 ml-1" fill="currentColor" />
        </div>
      </div>

      {/* Duration Badge */}
      {duration && (
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 rounded text-white text-sm font-medium">
          {duration}
        </div>
      )}
    </div>
  );
}
