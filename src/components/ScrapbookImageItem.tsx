import React, { useState, useRef } from 'react';
import { useSpring, animated } from 'react-spring';

// NEW: Define and export a type for the details passed on click
export interface ScrapbookClickDetails {
  imageSrc: string;
  altText: string;
  initialStyle: React.CSSProperties; // The original style object from generateScrapbookImageStyle
  currentBoundingClientRect: DOMRect;
  imageElement: HTMLImageElement; // To access naturalWidth/naturalHeight
}

interface ScrapbookImageItemProps {
  imageSrc: string;
  initialStyle: React.CSSProperties;
  onClick: (details: ScrapbookClickDetails) => void; // Updated onClick prop type
  altText: string;
}

const ScrapbookImageItem: React.FC<ScrapbookImageItemProps> = ({ imageSrc, initialStyle, onClick, altText }) => {
  const [isHovered, setIsHovered] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null); // Ref for the image element

  // Destructure the initial transform from initialStyle.
  const { transform: initialTransformValue, ...restInitialStyle } = initialStyle;

  const hoverSpring = useSpring({
    // Combine the initial transform (rotation) with the hover scale.
    transform: isHovered
      ? `${initialTransformValue || ''} scale(1.2)`
      : `${initialTransformValue || ''} scale(1)`,
    zIndex: isHovered ? 100 : (initialStyle.zIndex || 1),
    boxShadow: isHovered ? '6px 6px 20px rgba(0,0,0,0.4)' : (initialStyle.boxShadow || '3px 3px 10px rgba(0,0,0,0.2)'),
    config: { tension: 300, friction: 20 }
  });

  const handleClick = () => {
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      onClick({ // Pass the detailed object
        imageSrc,
        altText,
        initialStyle, // Pass the original initialStyle back
        currentBoundingClientRect: rect,
        imageElement: imgRef.current,
      });
    }
  };

  return (
    <animated.img
      ref={imgRef} // Assign ref
      src={imageSrc}
      alt={altText}
      style={{
        ...restInitialStyle, // Apply rest of initial styles (excluding transform)
        ...hoverSpring,      // Apply spring (which includes combined transform)
        cursor: 'pointer',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick} // Use wrapped handleClick
      className="scrapbook-image-item"
    />
  );
};

export default ScrapbookImageItem; 