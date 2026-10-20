// components/AsyncImageLoader.tsx or just embed it in your file
import React, { useState, useEffect } from 'react';
import { Package, RefreshCw } from 'lucide-react';

interface AsyncImageLoaderProps {
  src: string;
  alt: string;
  className: string;
}

const AsyncImageLoader: React.FC<AsyncImageLoaderProps> = ({ src, alt, className }) => {
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [isError, setIsError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');

  // Helper function to handle the URL logic
  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    
    // Assuming VITE_API_URL is defined somewhere
    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8003';
    const filename = imagePath.split(/[\\/]/).pop();
    return `${BACKEND_URL}/uploads/products/${filename}`;
  };

  useEffect(() => {
    const finalSrc = getImageUrl(src);
    if (finalSrc) {
      setImageSrc(finalSrc);
      setIsLoadingImage(true);
      setIsError(false);
    } else {
      setIsError(true);
      setIsLoadingImage(false);
    }
  }, [src]);

  useEffect(() => {
    const finalSrc = getImageUrl(src);
    if (finalSrc) {
      setImageSrc(finalSrc);
      setIsLoadingImage(true);
      setIsError(false);
    } else {
      setIsError(true);
      setIsLoadingImage(false);
    }
  }, [src]);

  if (!imageSrc || isError) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md`}>
        <Package className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoadingImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md">
          <RefreshCw className="w-4 h-4 text-gray-500 animate-spin" /> 
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} object-cover ${isLoadingImage ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => {
         
            setIsLoadingImage(false);
        }}
        onError={(e) => {
            console.error(`❌ Image failed to load: ${imageSrc}`, e);
            setIsLoadingImage(false);
            setIsError(true);
        }}
        style={{ transition: 'opacity 0.3s ease-in-out' }}
      />
    </div>
  );
};

export default AsyncImageLoader; // if in a separate file