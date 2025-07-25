import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from 'react';
import { useSpring, animated } from 'react-spring';
import { useGesture } from '@use-gesture/react';
import { useControls } from 'leva';
import { useLevaStore } from '../../stores/levaStore';
import { useSetupMode } from '../../contexts/SetupModeContext';
import { useIsMobile } from '../../utils/deviceDetect';
import { animationCurves } from './levaSchemas';
import ScrapbookImageItem from '../ScrapbookImageItem';
// import { useTrackedControls } from '../../hooks/useTrackedControls';

// A simple seeded pseudo-random number generator for deterministic layouts
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// --- Leva Schema for Scrapbook Layout (Local to this component) ---
export const scrapbookLayoutControlsSchema = {
  scrapbookDisabled: { value: false, label: 'Disable Scrapbook (No S3 Costs)' },
  showCaptions: { value: true, label: 'Show Captions' },
  showInstructionText: { value: true, label: 'Show Instruction Text' },
  instructionTextStartOpacity: { 
    value: 0, 
    min: 0, 
    max: 1, 
    step: 0.01, 
    label: 'Instruction Start Opacity'
  },
  instructionTextEndOpacity: { 
    value: 1, 
    min: 0, 
    max: 1, 
    step: 0.01, 
    label: 'Instruction End Opacity'
  },
  instructionTextOpacityCurve: { 
    value: 'linear', 
    options: ['disabled', ...Object.keys(animationCurves)], 
    label: 'Instruction Opacity Curve' 
  },
  centerXOffset: { value: 0, min: -100, max: 100, step: 1, label: 'Center X Offset (%)' },
  centerYOffset: { value: 0, min: -100, max: 100, step: 1, label: 'Center Y Offset (%)' },
  spreadRadiusFactor: { value: 0.35, min: 0.1, max: 5, step: 0.01, label: 'Spread Radius Factor' },
  maxImages: { value: 15, min: 1, max: 50, step: 1, label: 'Max Images Displayed' },
  baseRotationRange: { value: 15, min: 0, max: 90, step: 1, label: 'Base Rotation Range (±deg)'},
  baseSizeMin: { value: 100, min: 50, max: 300, step: 1, label: 'Base Size Min (px)' },
  baseSizeMax: { value: 180, min: 50, max: 400, step: 1, label: 'Base Size Max (px)' },
  borderWidth: { value: 7, min: 0, max: 20, step: 1, label: 'Border Width (px)' },
  borderColor: { value: '#FFFFFF', label: 'Border Color' },
  shadowOffsetX: { value: 5, min: 0, max: 20, step: 1, label: 'Shadow X Offset (px)' },
  shadowOffsetY: { value: 5, min: 0, max: 20, step: 1, label: 'Shadow Y Offset (px)' },
  shadowBlur: { value: 15, min: 0, max: 50, step: 1, label: 'Shadow Blur (px)' },
  shadowColor: { value: 'rgba(0,0,0,0.25)', label: 'Shadow Color' },
  baseOpacity: { value: 0.85, min: 0, max: 1, step: 0.01, label: 'Base Opacity' },
  dynamicRotationRange: { value: 35, min: 0, max: 90, step: 1, label: 'Dynamic Rotation Range (±deg)' }, // Increased to 35 for more visible rotation
  scrollSensitivityFactor: { value: 0.003, min: 0, max: 0.01, step: 0.0001, label: 'Scroll Sensitivity Factor' }, // Increased to 0.003 for more visible movement
  parallaxDepthFactor: { value: 0.08, min: 0, max: 0.5, step: 0.001, label: 'Parallax Depth Factor' }, // Increased to 0.08 for more visible parallax movement
  itemBaseScale: { value: 1, min: 0.5, max: 2, step: 0.01, label: 'Item Base Scale' },
};

// --- Helper: Generate Initial Style for a Scrapbook Image ---
const generateInitialScrapbookStyle = (index: any, totalImages: any, windowDims: any, layoutValues: any): React.CSSProperties => {
  const {
    centerXOffset, centerYOffset, spreadRadiusFactor,
    baseRotationRange, baseSizeMin, baseSizeMax,
    borderWidth, borderColor,
    shadowOffsetX, shadowOffsetY, shadowBlur, shadowColor,
    baseOpacity
  } = layoutValues;

  const rand = mulberry32(index); // Use seeded random for deterministic layouts

  const angle = (rand() - 0.5) * (baseRotationRange * 2);
  const size = baseSizeMin + rand() * (baseSizeMax - baseSizeMin);

  const baseRadiusPercentage = spreadRadiusFactor;
  const radiusRandomFactor = 0.6 + rand() * 0.4;

  const radius = windowDims.innerWidth
    ? Math.min(windowDims.innerWidth * 0.45, windowDims.innerHeight * 0.45) * baseRadiusPercentage * radiusRandomFactor
    : 200 * radiusRandomFactor;

  const baseCenterX = windowDims.innerWidth ? windowDims.innerWidth / 2 : 400;
  const baseCenterY = windowDims.innerHeight ? windowDims.innerHeight / 2 : 300;

  const offsetX = windowDims.innerWidth ? (windowDims.innerWidth * centerXOffset / 100) : (800 * centerXOffset / 100);
  const offsetY = windowDims.innerHeight ? (windowDims.innerHeight * centerYOffset / 100) : (600 * centerYOffset / 100);

  const finalCenterX = baseCenterX + offsetX;
  const finalCenterY = baseCenterY + offsetY;

  const x = Math.cos((index / totalImages) * 2 * Math.PI) * radius + finalCenterX - (size / 2) + (rand() - 0.5) * 50;
  const y = Math.sin((index / totalImages) * 2 * Math.PI) * radius + finalCenterY - (size / 2) + (rand() - 0.5) * 50;

  return {
    position: 'absolute',
    width: `${size}px`,
    height: 'auto',
    top: `${Math.max(0, Math.min(y, windowDims.innerHeight ? windowDims.innerHeight - size : 600 - size))}px`,
    left: `${x}px`,
    transform: `rotate(${angle}deg)`,
    border: `${borderWidth}px solid ${borderColor}`,
    boxShadow: `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`,
    opacity: baseOpacity,
    zIndex: index + 1,
    transition: 'transform 0.2s ease-out, opacity 0.2s ease-out', // For hover
  };
};

interface DisplayedImageData {
  src: string;
  originalIndex: number;
  displayIndex: number;  
  altText: string;
  id: string; 
  initialStyle: React.CSSProperties;
  parallaxXDirection: number;
  parallaxYDirection: number;
  itemScrollSensitivity: number;
  itemDynamicRotationRange: number;
}

interface InteractiveScrapbookProps {
  weddingData: any;
  config: {
    content?: string | { maxImages?: number };
  } | null;
  scrollY: number;
  onImageClick: (details: any) => void;
  focusedImageGlobal: any;
  imageReturningToScrapbookGlobal: any;
  lastPutDownIndexGlobal: number | null;
  scrapbookImageRefs: React.RefObject<(HTMLImageElement | null)[]>;
  onDisplayedImagesUpdate: (images: any[]) => void;
  windowWidth: number;
  windowHeight: number;
  layoutControlsFromProp: any;
  TOTAL_PAGES?: number; // Add TOTAL_PAGES for opacity calculations
  elementSticky: { start: number; end: number };
  animationParentRef?: React.RefObject<HTMLDivElement | null>; // <-- Add this line
}

const InteractiveScrapbook = forwardRef<HTMLDivElement, InteractiveScrapbookProps>((props, ref) => {
  const {
    weddingData,
    config,
    scrollY,
    onImageClick,
    focusedImageGlobal,
    imageReturningToScrapbookGlobal,
    lastPutDownIndexGlobal,
    scrapbookImageRefs,
    onDisplayedImagesUpdate,
    windowWidth,
    windowHeight,
    layoutControlsFromProp,
    TOTAL_PAGES = 3,
    elementSticky,
    animationParentRef, // <-- Add this line
  } = props;

  // --- Helper: Calculate Dynamic Parallax Values (renamed for clarity) ---
  // This function now returns values to be directly used by ScrapbookImageItem's spring
  const calculateScrollDependentValues = (displayIndex: any, scrollY: any, layoutValues: any, itemData: any) => {
      const {
        dynamicRotationRange, // From global layout controls
        scrollSensitivityFactor, // From global layout controls
        parallaxDepthFactor,     // From global layout controls
        itemBaseScale,          // From global layout controls
      } = layoutValues;

      // Use item-specific sensitivities if available, otherwise global
      // These would be part of itemData if we decide to make them per-item configurable
      const currentScrollSensitivity = itemData.scrollSensitivityFactorOverride || scrollSensitivityFactor;
      const currentDynamicRotationRange = itemData.dynamicRotationRangeOverride || dynamicRotationRange;
      const currentParallaxDepthFactor = itemData.parallaxDepthFactorOverride || parallaxDepthFactor;
      const currentItemBaseScale = itemData.itemBaseScaleOverride || itemBaseScale;

      const elementStartPx = elementSticky.start * windowHeight;
      const elementEndPx = elementSticky.end * windowHeight;
      const elementDurationPx = Math.max(0, elementEndPx - elementStartPx);
  
      // Calculate the user's scroll position relative to the element's start
      const scrollYWithinElement = scrollY - elementStartPx;
  
      // The scroll value used for animation is clamped between 0 and the element's duration
      const scrollYForAnim = Math.max(0, Math.min(scrollYWithinElement, elementDurationPx));
      
      // The final value is further capped by the user-defined control
      const cappedScrollYForMovement = scrollYForAnim;

      const indexFactor = Math.sin(displayIndex * 0.5); // Varies between -1 and 1

      const dynamicAngleOffsetDeg = Math.sin(cappedScrollYForMovement * currentScrollSensitivity + displayIndex * 0.5) * currentDynamicRotationRange;
      const parallaxTranslateX = cappedScrollYForMovement * currentParallaxDepthFactor * (1 + indexFactor * 0.2) * (itemData.parallaxXDirection || 1); 
      const parallaxTranslateY = cappedScrollYForMovement * currentParallaxDepthFactor * (1 - indexFactor * 0.3) * (itemData.parallaxYDirection || 1); 
      let parallaxScale = currentItemBaseScale + (cappedScrollYForMovement * (currentParallaxDepthFactor * 0.05)); // Example: make scale change less drastic
      parallaxScale = Math.max(0.5, Math.min(parallaxScale, currentItemBaseScale * 1.5)); // Clamp scale relative to base

      const result = {
        dynamicAngleOffsetDeg, 
        parallaxTranslateX,
        parallaxTranslateY,
        parallaxScale,
      };

      return result;
  };

  const { isSetupMode } = useSetupMode();
  const isMobile = useIsMobile();
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const [loadedImageCount, setLoadedImageCount] = useState(0);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

  const defaultLayoutValues = useMemo(() => Object.entries(scrapbookLayoutControlsSchema).reduce((acc: any, [key, val]: [string, any]) => {
    acc[key] = val.value;
    return acc;
  }, {}), []);
  
  const layoutValues = useMemo(() => {
    const result = { ...defaultLayoutValues, ...(layoutControlsFromProp || {}) };
    return result;
  }, [layoutControlsFromProp, defaultLayoutValues]);

  const { 
    scrapbookDisabled, showCaptions, showInstructionText, instructionTextStartOpacity, instructionTextEndOpacity,
    instructionTextOpacityCurve,
    centerXOffset, centerYOffset, spreadRadiusFactor, maxImages, 
    baseRotationRange, baseSizeMin, baseSizeMax,
    borderWidth, borderColor, shadowOffsetX, shadowOffsetY, shadowBlur, shadowColor, baseOpacity,
    dynamicRotationRange, scrollSensitivityFactor, parallaxDepthFactor,
    itemBaseScale,
  } = layoutValues;

  // --- Derived State & Memoizations ---
  const resolvedImageSrcs = useMemo(() => {
    // If scrapbook is disabled, return empty array to prevent S3 calls
    if (scrapbookDisabled) {
      return [];
    }

    if (weddingData && weddingData.scrapbookImages && Array.isArray(weddingData.scrapbookImages)) {
      return weddingData.scrapbookImages.map((img: any) => ({
        src: img.s3Url || img.fileName, // Prefer s3Url if available
        alt: img.caption || img.fileName || `Scrapbook image ${img.id || ''}`,
        id: img.id || img.s3Url || img.fileName, // Ensure unique ID for keys
        originalIndex: -1 // Will be populated later if needed
      })).filter((img: any) => img.src);
    }
    return [];
  }, [weddingData, scrapbookDisabled]);

  const displayedImagesAndTheirData = useMemo(() => {
    if (!resolvedImageSrcs || resolvedImageSrcs.length === 0 || !windowWidth || !windowHeight) {
      if (resolvedImageSrcs.length === 0) return [];
    }

    const numImagesToDisplay = Math.min(maxImages, resolvedImageSrcs.length);
    let imagesToProcess = [];
    const allImagesWithOriginalIndex = resolvedImageSrcs.map((imgInfo: any, index: any) => ({ ...imgInfo, originalIndex: index }));

    if (resolvedImageSrcs.length <= numImagesToDisplay) {
      imagesToProcess = allImagesWithOriginalIndex;
    } else {
      // Use a STABLE shuffle based on a fixed seed
      const rand = mulberry32(0);
      const shuffled = [...allImagesWithOriginalIndex].sort(() => 0.5 - rand());
      imagesToProcess = shuffled.slice(0, numImagesToDisplay);
    }
    
    const windowDims = { innerWidth: windowWidth, innerHeight: windowHeight };

    // This map now produces data that is STABLE with respect to scrollY.
    // It contains base styles and parameters for dynamic calculation.
    return imagesToProcess.map((imageInfo: any, displayIndex: any) => {
      const { src, originalIndex, alt, id } = imageInfo;
      const style = generateInitialScrapbookStyle(displayIndex, imagesToProcess.length, windowDims, layoutValues);
      
      const rand = mulberry32(displayIndex + 100); // Use a different seed for parallax directions
      const parallaxXDirection = rand() < 0.5 ? -1 : 1;
      const parallaxYDirection = rand() < 0.5 ? -1 : 1;

      return {
        src,
        originalIndex, 
        displayIndex,  
        altText: alt || `Scrapbook item ${displayIndex + 1}`,
        id: id || src, 
        initialStyle: style,
        parallaxXDirection, 
        parallaxYDirection,
        itemScrollSensitivity: layoutValues.scrollSensitivityFactor,
        itemDynamicRotationRange: layoutValues.dynamicRotationRange,
      };
    });
  }, [
    resolvedImageSrcs,
    windowWidth,
    windowHeight,
    // All values from layoutValues that affect generateInitialScrapbookStyle
    // or are parameters for dynamic calculation (even if used globally later)
    // need to be listed if they should trigger a re-calculation of this memo.
    centerXOffset, centerYOffset, spreadRadiusFactor, maxImages, 
    baseRotationRange, baseSizeMin, baseSizeMax,
    borderWidth, borderColor, shadowOffsetX, shadowOffsetY, shadowBlur, shadowColor, baseOpacity,
    // Note: dynamicRotationRange, scrollSensitivityFactor, etc., are NOT direct dependencies here
    // because displayedImagesAndTheirData itself doesn't change when *only* scrollY changes.
    // They are used in calculateScrollDependentValues, which is called fresh on each render inside the .map().
    // However, if these global factors change, the *potential output* of calculateScrollDependentValues changes,
    // but not necessarily displayedImagesAndTheirData itself unless they also affect generateInitialScrapbookStyle.
    // For safety and clarity, if generateInitialScrapbookStyle *also* uses them (it doesn't currently for dynamic ones),
    // they would belong here. Let's keep it clean for now.
    layoutValues // Simplest way to capture all layout control changes that *might* affect base styles.
  ]);

  const allImagesLoaded = loadedImageCount > 0 && loadedImageCount === displayedImagesAndTheirData.length;

  useEffect(() => {
    if (allImagesLoaded) {
      let maxBottom = 0;
      imageRefs.current.forEach(img => {
        if (img) {
          const bottom = img.offsetTop + img.offsetHeight;
          if (bottom > maxBottom) {
            maxBottom = bottom;
          }
        }
      });
      // Add a little buffer
      setContainerHeight(maxBottom + 50); 
    }
  }, [allImagesLoaded]);

  // Update GuestExperience with the images that will be displayed and their data
  useEffect(() => {
    if (onDisplayedImagesUpdate) {
      onDisplayedImagesUpdate(displayedImagesAndTheirData);
    }
  }, [displayedImagesAndTheirData, onDisplayedImagesUpdate]);

  // Calculate instruction text opacity based on scroll position
  const calculateInstructionOpacity = useMemo(() => {
    if (!showInstructionText) return 0;
    
    // Calculate total scrollable height based on TOTAL_PAGES and windowHeight
    const totalScrollableHeight = (TOTAL_PAGES - 1) * windowHeight;
    
    // If no scrollable height, return end opacity
    if (totalScrollableHeight <= 0) return instructionTextEndOpacity;
    
    // Calculate scroll progress (0 to 1)
    const scrollProgress = Math.min(1, Math.max(0, scrollY / totalScrollableHeight));
    
    // Apply animation curve if not disabled
    let easedProgress = scrollProgress;
    if (instructionTextOpacityCurve && instructionTextOpacityCurve !== 'disabled') {
      const curveFunction = animationCurves[instructionTextOpacityCurve as keyof typeof animationCurves];
      if (curveFunction) {
        easedProgress = curveFunction(scrollProgress);
      }
    }
    
    // Interpolate between start and end opacity using the eased progress
    return instructionTextStartOpacity + (instructionTextEndOpacity - instructionTextStartOpacity) * easedProgress;
  }, [showInstructionText, scrollY, TOTAL_PAGES, windowHeight, instructionTextStartOpacity, instructionTextEndOpacity, instructionTextOpacityCurve]);
  
  // Render logic
  return (
    <div 
      ref={(node) => {
        (innerContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      }} 
      style={{ 
        position: 'relative', // Changed back to relative for proper centering
        width: '100%', // Use 100% instead of 100vw
        height: '100%', // Use 100% instead of 100vh
        minHeight: containerHeight ? `${containerHeight}px` : '100vh',
        overflow: 'visible', // Allow content to extend beyond boundaries
        pointerEvents: 'auto', // Ensure pointer events are enabled
      }}
    >
      {/* Scrapbook Disabled Message */}
      {scrapbookDisabled && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100,
            textAlign: 'center',
            color: 'rgba(150, 150, 150, 0.8)',
            fontSize: isMobile ? '1.1rem' : '1.3rem',
            fontWeight: '500',
            textShadow: '1px 1px 2px rgba(255, 255, 255, 0.8)',
            pointerEvents: 'none',
            userSelect: 'none',
            padding: isMobile ? '16px 24px' : '20px 32px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(5px)',
            border: '2px dashed rgba(150, 150, 150, 0.3)',
            maxWidth: isMobile ? '90vw' : '400px',
          }}
        >
          📸 Scrapbook Disabled<br />
          <span style={{ fontSize: '0.85em', opacity: 0.7 }}>
            (S3 costs saved)
          </span>
        </div>
      )}

      {/* Instruction Text */}
      {showInstructionText && displayedImagesAndTheirData.length > 0 && calculateInstructionOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 50,
            textAlign: 'center',
            color: 'rgba(0, 0, 0, 0.6)',
            fontSize: isMobile ? '1.2rem' : '1.5rem',
            fontWeight: '500',
            textShadow: '1px 1px 2px rgba(255, 255, 255, 0.8)',
            pointerEvents: 'none',
            userSelect: 'none',
            padding: isMobile ? '12px 24px' : '16px 32px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(5px)',
            opacity: calculateInstructionOpacity,
            transition: 'opacity 0.3s ease-out',
            minWidth: isMobile ? '200px' : '280px',
            maxWidth: isMobile ? '90vw' : '400px',
            whiteSpace: 'nowrap',
          }}
        >
          {isMobile ? 'Tap' : 'Click'} An Image To View
        </div>
      )}

      {displayedImagesAndTheirData.map((itemData: DisplayedImageData, displayIndex: number) => {
        if (!itemData || !itemData.initialStyle) {
          console.warn("Skipping render for scrapbook image due to missing data:", itemData);
          return null;
        }

        const isEffectivelyHidden = focusedImageGlobal !== null && focusedImageGlobal.displayIndex === displayIndex;

        const scrollDependent = calculateScrollDependentValues(displayIndex, scrollY, layoutValues, itemData);

        return (
          <ScrapbookImageItem
            key={itemData.id}
            ref={el => {
              imageRefs.current[displayIndex] = el;
              if (scrapbookImageRefs && scrapbookImageRefs.current) {
                scrapbookImageRefs.current[displayIndex] = el;
              }
            }}
            onLoad={() => setLoadedImageCount(prev => prev + 1)}
            imageSrc={itemData.src}
            initialStyle={itemData.initialStyle}
            altText={itemData.altText}
            index={displayIndex}
            isHiddenForFocus={isEffectivelyHidden}
            lastPutDownIndex={lastPutDownIndexGlobal}
            dynamicAngleOffsetDeg={scrollDependent.dynamicAngleOffsetDeg}
            parallaxTranslateX={scrollDependent.parallaxTranslateX}
            parallaxTranslateY={scrollDependent.parallaxTranslateY}
            parallaxScale={scrollDependent.parallaxScale}
            onClick={onImageClick}
          />
        );
      })}
    </div>
  );
});

export default InteractiveScrapbook; 