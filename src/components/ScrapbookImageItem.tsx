import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSpring, animated } from 'react-spring';

// Define and export a type for the details passed on click
export interface ScrapbookClickDetails {
  imageSrc: string;
  altText: string;
  initialStyle: React.CSSProperties; // The original style object
  currentBoundingClientRect: DOMRect;
  imageElement: HTMLImageElement; // To access naturalWidth/naturalHeight
  index: number;
  lastPutDownIndex?: number | null; // New prop
}

interface ScrapbookImageItemProps {
  imageSrc: string;
  initialStyle: React.CSSProperties;
  onClick: (details: ScrapbookClickDetails) => void;
  altText: string;
  dynamicAngleOffsetDeg?: number;
  index: number;
  isHiddenForFocus?: boolean; // Controls visibility when the item is "focused"
  lastPutDownIndex?: number | null; // Destructure new prop
}

const ScrapbookImageItem = React.forwardRef<HTMLImageElement, ScrapbookImageItemProps>((props, forwardedRef) => {
  const {
    imageSrc,
    initialStyle,
    onClick: propsOnClick,
    altText,
    dynamicAngleOffsetDeg = 0,
    index,
    isHiddenForFocus = false,
    lastPutDownIndex = null, // Destructure new prop
  } = props;

  const [isHovered, setIsHovered] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Destructure initial styles, separating transform and opacity
  const {
    transform: baseTransformFromStyle,
    opacity: baseOpacityFromStyle, // This is the scrapbook item's base visible opacity
    ...restInitialStyle
  } = initialStyle;

  const baseRotate = baseTransformFromStyle || ''; // e.g., "rotate(10deg)"
  const dynamicRotate = `rotate(${dynamicAngleOffsetDeg}deg)`; // Scroll-based rotation
  
  // Determine hover scale only if the item is not hidden for focus
  const hoverScale = isHovered && !isHiddenForFocus ? 'scale(1.2)' : 'scale(1)';
  const finalTransform = `${baseRotate} ${dynamicRotate} ${hoverScale}`.trim();

  // Store the previous state of isHiddenForFocus to correctly apply 'immediate'
  const prevIsHiddenForFocusRef = useRef<boolean>(isHiddenForFocus);
  useEffect(() => {
    prevIsHiddenForFocusRef.current = isHiddenForFocus;
  }, [isHiddenForFocus]);


  const imageSpringStyles = useSpring({
    transform: finalTransform,
    // Opacity logic: 0 if hidden, otherwise based on hover or initial style
    opacity: isHiddenForFocus ? 0 : (isHovered ? 1 : (baseOpacityFromStyle ?? 0.8)),
    
    // Updated zIndex logic
    zIndex: (() => {
      const Z_INDEX_BASE = initialStyle.zIndex || 1;
      const Z_INDEX_HOVER = 100;
      const Z_INDEX_LAST_PUT_DOWN = 5; // Higher than base, lower than hover

      if (isHiddenForFocus) {
        return Z_INDEX_BASE; // Or a very low zIndex like 0 if preferred when hidden
      }
      if (isHovered) {
        return Z_INDEX_HOVER;
      }
      if (lastPutDownIndex === index) {
        return Z_INDEX_LAST_PUT_DOWN;
      }
      return Z_INDEX_BASE;
    })(),

    boxShadow: isHovered && !isHiddenForFocus
      ? '6px 6px 20px rgba(0,0,0,0.4)'
      : initialStyle.boxShadow || '3px 3px 10px rgba(0,0,0,0.2)',
    config: { tension: 300, friction: 20 },
    // Make opacity changes immediate ONLY when isHiddenForFocus status changes
    // This ensures the item vanishes/reappears instantly without affecting hover animations
    immediate: (key: string) =>
        key === 'opacity' &&
        (isHiddenForFocus !== prevIsHiddenForFocusRef.current || // Catches the toggle
         (isHiddenForFocus && prevIsHiddenForFocusRef.current === undefined) // Initial hide
        ),
    onRest: () => {
        // Update ref after spring settles if needed, esp. for immediate changes
        prevIsHiddenForFocusRef.current = isHiddenForFocus;
    }
  });

  const handleClick = () => {
    if (isHiddenForFocus) return; // Don't process click if hidden

    if (imgRef.current) {
      const currentImageElement = imgRef.current;
      const rect = currentImageElement.getBoundingClientRect();
      const details: ScrapbookClickDetails = {
        imageSrc,
        altText,
        initialStyle, // Pass the original, unmodified initialStyle
        currentBoundingClientRect: rect,
        imageElement: currentImageElement,
        index,
        lastPutDownIndex, // Pass the new prop
      };
      if (typeof propsOnClick === 'function') {
        propsOnClick(details);
      } else {
        console.warn("ScrapbookImageItem: propsOnClick is not a function!", propsOnClick);
      }
    } else {
      console.warn("ScrapbookImageItem: local imgRef.current is null, cannot call propsOnClick.");
    }
  };

  const setRefs = useCallback((node: HTMLImageElement | null) => {
    (imgRef as React.MutableRefObject<HTMLImageElement | null>).current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      (forwardedRef as React.MutableRefObject<HTMLImageElement | null>).current = node;
    }
  }, [forwardedRef]);

  return (
    <animated.img
      ref={setRefs}
      src={imageSrc}
      alt={altText}
      style={{
        ...restInitialStyle, // Apply other initial styles (width, height, position)
        ...imageSpringStyles, // Apply spring-animated styles (transform, opacity, zIndex, boxShadow)
        cursor: isHiddenForFocus || !propsOnClick ? 'default' : 'pointer',
        // Explicitly set pointerEvents based on isHiddenForFocus, not via spring
        // This ensures the item is not interactive when hidden.
        pointerEvents: isHiddenForFocus ? 'none' : 'auto',
      }}
      onMouseEnter={() => {
        if (!isHiddenForFocus) setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (!isHiddenForFocus) setIsHovered(false);
      }}
      onClick={handleClick}
      className="scrapbook-image-item" // Keep any existing class names
    />
  );
});

export default ScrapbookImageItem;