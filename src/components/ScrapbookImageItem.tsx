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
    const Z_INDEX_BASE = initialStyle.zIndex || 200; // Increased from 1 to 200
    const Z_INDEX_HOVER = 300; // Increased from 100 to 300
    const Z_INDEX_LAST_PUT_DOWN = 250; // Increased from 5 to 250

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
      pointerEvents: 'auto' as 'auto' | 'none', // DEBUG: force pointer-events auto for all images
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

  const handleClick = useCallback((event: React.MouseEvent<HTMLImageElement>) => {
    console.log('[SCRAPBOOK_CLICK_START] ===== CLICK EVENT STARTED =====', {
      timestamp: Date.now(),
      eventType: event.type,
      eventPhase: event.eventPhase,
      bubbles: event.bubbles,
      cancelable: event.cancelable,
      defaultPrevented: event.defaultPrevented,
      isTrusted: event.isTrusted,
      timeStamp: event.timeStamp
    });

    if (isHiddenForFocus) {
      console.log('[SCRAPBOOK_CLICK_BLOCKED] Image is hidden for focus, ignoring click');
      return;
    }

    if (!imgRef.current) {
      console.warn('[SCRAPBOOK_CLICK_ERROR] imgRef.current is null, cannot process click');
      return;
    }

    const imgElement = imgRef.current;
    const rect = imgElement.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(imgElement);
    
    // Log comprehensive DOM state
    console.log('[SCRAPBOOK_DOM_STATE] ===== COMPREHENSIVE DOM STATE =====', {
      timestamp: Date.now(),
      elementExists: !!imgElement,
      elementConnected: imgElement.isConnected,
      elementTagName: imgElement.tagName,
      elementClassName: imgElement.className,
      elementId: imgElement.id,
      
      // Bounding rect details
      boundingRect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        toJSON: rect.toJSON()
      },
      
      // Computed styles
      computedStyles: {
        position: computedStyle.position,
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        zIndex: computedStyle.zIndex,
        pointerEvents: computedStyle.pointerEvents,
        transform: computedStyle.transform,
        top: computedStyle.top,
        left: computedStyle.left,
        width: computedStyle.width,
        height: computedStyle.height,
        backfaceVisibility: computedStyle.backfaceVisibility,
        willChange: computedStyle.willChange,
        transition: computedStyle.transition,
        cursor: computedStyle.cursor,
        boxShadow: computedStyle.boxShadow,
        border: computedStyle.border,
        borderRadius: computedStyle.borderRadius
      },
      
      // Inline styles
      inlineStyles: {
        position: imgElement.style.position,
        display: imgElement.style.display,
        visibility: imgElement.style.visibility,
        opacity: imgElement.style.opacity,
        zIndex: imgElement.style.zIndex,
        pointerEvents: imgElement.style.pointerEvents,
        transform: imgElement.style.transform,
        top: imgElement.style.top,
        left: imgElement.style.left,
        width: imgElement.style.width,
        height: imgElement.style.height,
        backfaceVisibility: imgElement.style.backfaceVisibility,
        willChange: imgElement.style.willChange,
        transition: imgElement.style.transition,
        cursor: imgElement.style.cursor,
        boxShadow: imgElement.style.boxShadow,
        border: imgElement.style.border,
        borderRadius: imgElement.style.borderRadius
      },
      
      // Element properties
      elementProperties: {
        naturalWidth: imgElement.naturalWidth,
        naturalHeight: imgElement.naturalHeight,
        src: imgElement.src,
        alt: imgElement.alt,
        complete: imgElement.complete,
        currentSrc: imgElement.currentSrc
      },
      
      // Parent element info
      parentElement: {
        exists: !!imgElement.parentElement,
        tagName: imgElement.parentElement?.tagName,
        className: imgElement.parentElement?.className,
        id: imgElement.parentElement?.id,
        computedPosition: imgElement.parentElement ? window.getComputedStyle(imgElement.parentElement).position : 'N/A',
        computedOverflow: imgElement.parentElement ? window.getComputedStyle(imgElement.parentElement).overflow : 'N/A'
      },
      
      // Event details
      eventDetails: {
        target: {
          tagName: (event.target as HTMLElement)?.tagName,
          className: (event.target as HTMLElement)?.className,
          id: (event.target as HTMLElement)?.id,
          isSameAsImgRef: event.target === imgElement
        },
        currentTarget: {
          tagName: event.currentTarget?.tagName,
          className: event.currentTarget?.className,
          id: event.currentTarget?.id,
          isSameAsImgRef: event.currentTarget === imgElement
        },
        clientX: event.clientX,
        clientY: event.clientY,
        pageX: event.pageX,
        pageY: event.pageY,
        screenX: event.screenX,
        screenY: event.screenY,
        offsetX: (event.nativeEvent as MouseEvent).offsetX,
        offsetY: (event.nativeEvent as MouseEvent).offsetY,
        button: event.button,
        buttons: event.buttons,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey
      },
      
      // Component state
      componentState: {
        index,
        isHiddenForFocus,
        isHovered,
        shouldLoad,
        enableLazyLoading,
        lastPutDownIndex,
        imageSrc,
        altText
      },
      
      // Static styles from component
      staticStyles: {
        zIndex: staticStyles.zIndex,
        pointerEvents: staticStyles.pointerEvents,
        cursor: staticStyles.cursor,
        willChange: staticStyles.willChange,
        backfaceVisibility: staticStyles.backfaceVisibility
      }
    });

    // Log event propagation path
    console.log('[SCRAPBOOK_EVENT_PATH] ===== EVENT PROPAGATION PATH =====', {
      timestamp: Date.now(),
      eventPath: (event.nativeEvent as Event).composedPath().map((target: EventTarget, index: number) => ({
        index,
        tagName: (target as HTMLElement)?.tagName,
        className: (target as HTMLElement)?.className,
        id: (target as HTMLElement)?.id,
        isImgElement: target === imgElement,
        isPortalRoot: (target as HTMLElement)?.id === 'portal-root',
        isRoot: (target as HTMLElement)?.id === 'root'
      }))
    });

    // Log initial style object
    console.log('[SCRAPBOOK_INITIAL_STYLE] ===== INITIAL STYLE OBJECT =====', {
      timestamp: Date.now(),
      initialStyle: {
        ...initialStyle,
        // Log all properties explicitly
        position: initialStyle.position,
        width: initialStyle.width,
        height: initialStyle.height,
        top: initialStyle.top,
        left: initialStyle.left,
        transform: initialStyle.transform,
        border: initialStyle.border,
        boxShadow: initialStyle.boxShadow,
        opacity: initialStyle.opacity,
        zIndex: initialStyle.zIndex,
        transition: initialStyle.transition,
        cursor: initialStyle.cursor,
        pointerEvents: initialStyle.pointerEvents,
        willChange: initialStyle.willChange,
        backfaceVisibility: initialStyle.backfaceVisibility
      }
    });

    const details: ScrapbookClickDetails = {
      imageSrc,
      altText,
      initialStyle,
      currentBoundingClientRect: rect,
      imageElement: imgElement,
      index,
      lastPutDownIndex,
    };

    console.log('[SCRAPBOOK_CLICK_DETAILS] ===== CLICK DETAILS OBJECT =====', {
      timestamp: Date.now(),
      details: {
        imageSrc: details.imageSrc,
        altText: details.altText,
        index: details.index,
        lastPutDownIndex: details.lastPutDownIndex,
        currentBoundingClientRect: {
          x: details.currentBoundingClientRect.x,
          y: details.currentBoundingClientRect.y,
          width: details.currentBoundingClientRect.width,
          height: details.currentBoundingClientRect.height,
          top: details.currentBoundingClientRect.top,
          left: details.currentBoundingClientRect.left,
          right: details.currentBoundingClientRect.right,
          bottom: details.currentBoundingClientRect.bottom
        },
        imageElement: {
          exists: !!details.imageElement,
          tagName: details.imageElement?.tagName,
          className: details.imageElement?.className,
          id: details.imageElement?.id,
          naturalWidth: details.imageElement?.naturalWidth,
          naturalHeight: details.imageElement?.naturalHeight,
          src: details.imageElement?.src
        }
      }
    });

    if (typeof propsOnClick === 'function') {
      console.log('[SCRAPBOOK_CALLING_ONCLICK] ===== CALLING PARENT ONCLICK =====', {
        timestamp: Date.now(),
        propsOnClickType: typeof propsOnClick,
        propsOnClickName: propsOnClick.name || 'anonymous',
        willCallWithDetails: true
      });
      
      try {
        propsOnClick(details);
        console.log('[SCRAPBOOK_ONCLICK_SUCCESS] ===== PARENT ONCLICK CALLED SUCCESSFULLY =====', {
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('[SCRAPBOOK_ONCLICK_ERROR] ===== ERROR IN PARENT ONCLICK =====', {
          timestamp: Date.now(),
          error: error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : 'No stack trace'
        });
      }
    } else {
      console.warn('[SCRAPBOOK_ONCLICK_WARNING] ===== PROPSONCLICK IS NOT A FUNCTION =====', {
        timestamp: Date.now(),
        propsOnClickType: typeof propsOnClick,
        propsOnClickValue: propsOnClick
      });
    }

    console.log('[SCRAPBOOK_CLICK_END] ===== CLICK EVENT COMPLETED =====', {
      timestamp: Date.now()
    });
  }, [isHiddenForFocus, imageSrc, altText, initialStyle, index, lastPutDownIndex, propsOnClick, staticStyles, isHovered, shouldLoad, enableLazyLoading]);

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