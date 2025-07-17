import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
  parallaxTranslateX?: number; // New prop for X parallax movement
  parallaxTranslateY?: number; // New prop for Y parallax movement
  parallaxScale?: number; // New prop for Z parallax movement (scale)
  onLoad?: () => void; // Callback for when the image has loaded
  // New prop for lazy loading
  enableLazyLoading?: boolean;
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
    parallaxTranslateX = 0, // Destructure with default
    parallaxTranslateY = 0, // Destructure with default
    parallaxScale = 1, // Destructure with default (1 for no scaling)
    onLoad,
    enableLazyLoading = false, // New prop
  } = props;

  const [isHovered, setIsHovered] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!enableLazyLoading); // Load immediately if lazy loading disabled
  const imgRef = useRef<HTMLImageElement>(null);

  // Extract base transform values from initial style
  const baseTransformValues = useMemo(() => {
    const transform = initialStyle.transform || '';
    const rotateMatch = transform.match(/rotate\(([-\d.]+)deg\)/);
    const baseRotation = rotateMatch ? parseFloat(rotateMatch[1]) : 0;
    return { baseRotation };
  }, [initialStyle.transform]);

  // Calculate final values for animations
  const finalRotation = baseTransformValues.baseRotation + dynamicAngleOffsetDeg;
  const hoverScale = isHovered && !isHiddenForFocus ? 1.2 : 1;
  const combinedScale = parallaxScale * hoverScale;

  // Z-index logic (memoized for performance)
  const finalZIndex = useMemo(() => {
    const Z_INDEX_BASE = initialStyle.zIndex || 1;
    const Z_INDEX_HOVER = 100;
    const Z_INDEX_LAST_PUT_DOWN = 5;

    if (isHiddenForFocus) return Z_INDEX_BASE;
    if (isHovered) return Z_INDEX_HOVER;
    if (lastPutDownIndex === index) return Z_INDEX_LAST_PUT_DOWN;
    return Z_INDEX_BASE;
  }, [isHiddenForFocus, isHovered, lastPutDownIndex, index, initialStyle.zIndex]);

  // Use React Spring for all animations with optimized config
  const animatedStyles = useSpring({
    transform: `translate3d(${parallaxTranslateX}px, ${parallaxTranslateY}px, 0) rotate(${finalRotation}deg) scale(${combinedScale})`,
    opacity: isHiddenForFocus ? 0 : (isHovered ? 1 : (initialStyle.opacity || 0.85)),
    boxShadow: isHovered && !isHiddenForFocus
      ? '6px 6px 20px rgba(0,0,0,0.4)'
      : initialStyle.boxShadow || '3px 3px 10px rgba(0,0,0,0.2)',
    config: { 
      tension: 170,  // Reduced for smoother animation
      friction: 26,  // Increased for less bounce
    },
    immediate: isHiddenForFocus && !isHovered, // Only immediate when hiding, not when showing
  });

  // Static styles (separated from animated styles for performance)
  const staticStyles = useMemo(() => {
    const { transform, opacity, boxShadow, ...restStyle } = initialStyle;
    return {
      ...restStyle,
      zIndex: finalZIndex,
      cursor: isHiddenForFocus || !propsOnClick ? 'default' : 'pointer',
      pointerEvents: isHiddenForFocus ? 'none' : 'auto',
      // GPU acceleration hints
      willChange: 'transform, opacity',
      backfaceVisibility: 'hidden' as const,
      WebkitBackfaceVisibility: 'hidden' as const,
    };
  }, [initialStyle, finalZIndex, isHiddenForFocus, propsOnClick]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!enableLazyLoading || shouldLoad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [enableLazyLoading, shouldLoad]);

  const handleClick = useCallback(() => {
    if (isHiddenForFocus) return;

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
        lastPutDownIndex,
      };
      if (typeof propsOnClick === 'function') {
        propsOnClick(details);
      } else {
        console.warn("ScrapbookImageItem: propsOnClick is not a function!", propsOnClick);
      }
    } else {
      console.warn("ScrapbookImageItem: local imgRef.current is null, cannot call propsOnClick.");
    }
  }, [isHiddenForFocus, imageSrc, altText, initialStyle, index, lastPutDownIndex, propsOnClick]);

  const setRefs = useCallback((node: HTMLImageElement | null) => {
    (imgRef as React.MutableRefObject<HTMLImageElement | null>).current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      (forwardedRef as React.MutableRefObject<HTMLImageElement | null>).current = node;
    }
  }, [forwardedRef]);

  const handleMouseEnter = useCallback(() => {
    if (!isHiddenForFocus) setIsHovered(true);
  }, [isHiddenForFocus]);

  const handleMouseLeave = useCallback(() => {
    if (!isHiddenForFocus) setIsHovered(false);
  }, [isHiddenForFocus]);

  const handleLoad = useCallback(() => {
    if (shouldLoad && onLoad) onLoad();
  }, [shouldLoad, onLoad]);

  return (
    <animated.img
      ref={setRefs}
      src={shouldLoad ? imageSrc : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InJnYmEoMCwwLDAsMC4xKSIvPjwvc3ZnPg=='}
      alt={altText}
      style={{
        ...staticStyles,
        ...animatedStyles,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className="scrapbook-image-item"
      onLoad={handleLoad}
    />
  );
});

export default ScrapbookImageItem;