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
  dynamicAngleOffsetDeg?: number; // Prop for scroll-dependent tilt
}

const ScrapbookImageItem: React.FC<ScrapbookImageItemProps> = ({
  imageSrc,
  initialStyle,
  onClick,
  altText,
  dynamicAngleOffsetDeg = 0, // Default to 0 if not provided
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null); // Ref for the image element

  // Destructure the original transform from initialStyle. All other properties are in restInitialStyle.
  const { transform: baseTransformFromStyle, ...restInitialStyle } = initialStyle;

  // Construct the parts of the transform string
  const baseRotate = baseTransformFromStyle || ''; // Should be like "rotate(Xdeg)"
  const dynamicRotate = `rotate(${dynamicAngleOffsetDeg}deg)`; // Dynamic scroll-based rotation
  const hoverScale = isHovered ? 'scale(1.2)' : 'scale(1)';

  // Combine them: base rotation, then dynamic rotation, then scale
  const finalTransform = `${baseRotate} ${dynamicRotate} ${hoverScale}`.trim();

  const hoverSpring = useSpring({
    transform: finalTransform,
    zIndex: isHovered ? 100 : (initialStyle.zIndex || 1),
    boxShadow: isHovered
      ? '6px 6px 20px rgba(0,0,0,0.4)'
      : initialStyle.boxShadow || '3px 3px 10px rgba(0,0,0,0.2)',
    config: { tension: 300, friction: 20 },
  });

  const handleClick = () => {
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      onClick({
        imageSrc,
        altText,
        initialStyle, // Pass the original full initialStyle (including its base transform)
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
        ...restInitialStyle, // Spread styles from initialStyle (excluding transform)
        ...hoverSpring,      // Spread spring styles (which includes the combined transform)
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