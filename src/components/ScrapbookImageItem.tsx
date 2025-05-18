import React, { useState, useRef, useCallback } from 'react';
import { useSpring, animated } from 'react-spring';

// NEW: Define and export a type for the details passed on click
export interface ScrapbookClickDetails {
  imageSrc: string;
  altText: string;
  initialStyle: React.CSSProperties; // The original style object from generateScrapbookImageStyle
  currentBoundingClientRect: DOMRect;
  imageElement: HTMLImageElement; // To access naturalWidth/naturalHeight
  index: number; // Add index
}

interface ScrapbookImageItemProps {
  imageSrc: string;
  initialStyle: React.CSSProperties;
  onClick: (details: ScrapbookClickDetails) => void; // Updated onClick prop type
  altText: string;
  dynamicAngleOffsetDeg?: number; // Prop for scroll-dependent tilt
  index: number; // Add index prop
}

const ScrapbookImageItem = React.forwardRef<HTMLImageElement, ScrapbookImageItemProps>((props, forwardedRef) => {
  const {
    imageSrc,
    initialStyle,
    onClick: propsOnClick,
    altText,
    dynamicAngleOffsetDeg = 0,
    index,
  } = props;

  const [isHovered, setIsHovered] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null); // Local ref for this component's direct use

  const { transform: baseTransformFromStyle, ...restInitialStyle } = initialStyle;
  const baseRotate = baseTransformFromStyle || '';
  const dynamicRotate = `rotate(${dynamicAngleOffsetDeg}deg)`;
  const hoverScale = isHovered ? 'scale(1.2)' : 'scale(1)';
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
    console.log("ScrapbookImageItem: handleClick triggered. Image src:", imageSrc);
    console.log("ScrapbookImageItem: Type of propsOnClick:", typeof propsOnClick);

    // Use the local imgRef.current, which should be more reliable here
    if (imgRef.current) {
      const currentImageElement = imgRef.current;
      const rect = currentImageElement.getBoundingClientRect();
      const details: ScrapbookClickDetails = {
        imageSrc,
        altText,
        initialStyle,
        currentBoundingClientRect: rect,
        imageElement: currentImageElement,
        index,
      };
      console.log("ScrapbookImageItem: About to call propsOnClick with details (using local imgRef):", details);
      if (typeof propsOnClick === 'function') {
        try {
          propsOnClick(details);
          console.log("ScrapbookImageItem: propsOnClick was called successfully.");
        } catch (e) {
          console.error("ScrapbookImageItem: Error occurred while calling propsOnClick:", e);
        }
      } else {
        console.warn("ScrapbookImageItem: propsOnClick is not a function! Received:", propsOnClick);
      }
    } else {
      console.warn("ScrapbookImageItem: local imgRef.current is null, cannot prepare or call propsOnClick.");
    }
  };

  // Callback ref to set both local and forwarded refs
  const setRefs = useCallback((node: HTMLImageElement | null) => {
    // Set our own local ref
    (imgRef as React.MutableRefObject<HTMLImageElement | null>).current = node;
    // Handle the forwarded ref
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      // If it's a mutable ref object
      (forwardedRef as React.MutableRefObject<HTMLImageElement | null>).current = node;
    }
  }, [forwardedRef]);

  return (
    <animated.img
      ref={setRefs} // Use the combined ref setter
      src={imageSrc}
      alt={altText}
      style={{
        ...restInitialStyle,
        ...hoverSpring,
        cursor: 'pointer',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      className="scrapbook-image-item"
    />
  );
});

export default ScrapbookImageItem; 