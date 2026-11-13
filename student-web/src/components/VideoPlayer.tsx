import React from 'react';

interface VideoPlayerProps {
  src: string;
  title?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, title }) => {
  return (
    <div className="w-full bg-black rounded-lg overflow-hidden shadow-lg">
      {title && (
        <div className="px-4 py-2 bg-gray-900 text-white text-sm font-medium">
          {title}
        </div>
      )}
      <video
        src={src}
        controls
        controlsList="nodownload"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        className="w-full max-h-[500px] object-contain"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};
