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

  // Destructure initial styles, separating transform and opacity
  const {
    transform: baseTransformFromStyle,
    opacity: baseOpacityFromStyle, // This is the scrapbook item's base visible opacity
    ...restInitialStyle
  } = initialStyle;

  const baseRotate = baseTransformFromStyle || ''; // e.g., "rotate(10deg)"
  const dynamicRotate = `rotate(${dynamicAngleOffsetDeg}deg)`; // Scroll-based rotation
  
  const currentHoverScale = isHovered && !isHiddenForFocus ? 1.2 : 1;
  // Combine parallax scale and hover scale
  const combinedScale = parallaxScale * currentHoverScale;
  const scaleTransform = `scale(${combinedScale})`;
  
  // Use translate3d for GPU acceleration
  const parallaxTranslation = `translate3d(${parallaxTranslateX}px, ${parallaxTranslateY}px, 0)`;
  
  const finalTransform = `${parallaxTranslation} ${baseRotate} ${dynamicRotate} ${scaleTransform}`.trim();

  // Determine opacity - hide when focused elsewhere
  let finalOpacity = baseOpacityFromStyle;
  if (isHiddenForFocus) {
    finalOpacity = 0;
  } else if (isHovered) {
    finalOpacity = 1;
  }

  // Z-index logic
  const finalZIndex = (() => {
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
  })();

  // Performance optimization: Use CSS custom properties for will-change
  const optimizedStyle = {
    ...restInitialStyle,
    transform: finalTransform,
    opacity: finalOpacity,
    zIndex: finalZIndex,
    willChange: 'transform, opacity', // Hint browser to use GPU acceleration
    backfaceVisibility: 'hidden' as const, // Prevent rendering glitches
    WebkitBackfaceVisibility: 'hidden' as const,
  };

  // Store the previous state of isHiddenForFocus to correctly apply 'immediate'
  const prevIsHiddenForFocusRef = useRef<boolean>(isHiddenForFocus);
  useEffect(() => {
    prevIsHiddenForFocusRef.current = isHiddenForFocus;
  }, [isHiddenForFocus]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!enableLazyLoading || shouldLoad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect(); // Stop observing once loaded
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [enableLazyLoading, shouldLoad]);

  // Spring for hover effects (only box-shadow now, transform/opacity handled directly)
  const imageSpringStyles = useSpring({
    boxShadow: isHovered && !isHiddenForFocus
      ? '6px 6px 20px rgba(0,0,0,0.4)'
      : initialStyle.boxShadow || '3px 3px 10px rgba(0,0,0,0.2)',
    config: { tension: 300, friction: 20 },
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
      src={shouldLoad ? imageSrc : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InJnYmEoMCwwLDAsMC4xKSIvPjwvc3ZnPg=='} // Placeholder while loading
      alt={altText}
      style={{
        ...optimizedStyle, // Apply optimized styles (transform, opacity, will-change, backfaceVisibility)
        ...imageSpringStyles, // Apply spring-animated box-shadow
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
      onLoad={() => {
        if (shouldLoad && onLoad) onLoad();
      }}
    />
  );
});

export default ScrapbookImageItem;