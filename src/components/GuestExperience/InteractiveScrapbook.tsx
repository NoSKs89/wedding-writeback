import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from 'react';
import { useSpring, animated } from 'react-spring';
import { useGesture } from '@use-gesture/react';
import { useControls } from 'leva';
import { useLevaStore } from '../../stores/levaStore';
import { useSetupMode } from '../../contexts/SetupModeContext';
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
  dynamicRotationRange: { value: 25, min: 0, max: 90, step: 1, label: 'Dynamic Rotation Range (±deg)' },
  scrollSensitivityFactor: { value: 0.0003, min: 0, max: 0.001, step: 0.00001, label: 'Scroll Sensitivity Factor' },
  parallaxDepthFactor: { value: 0.01, min: 0, max: 0.1, step: 0.001, label: 'Parallax Depth Factor' },
  itemBaseScale: { value: 1, min: 0.5, max: 2, step: 0.01, label: 'Item Base Scale' },
  movementScrollCap: { value: 5000, min: 1000, max: 10000, step: 100, label: 'Movement Scroll Cap' },
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
    left: `${Math.max(0, Math.min(x, windowDims.innerWidth ? windowDims.innerWidth - size : 800 - size))}px`,
    transform: `rotate(${angle}deg)`,
    border: `${borderWidth}px solid ${borderColor}`,
    boxShadow: `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`,
    opacity: baseOpacity,
    zIndex: index + 1,
    transition: 'transform 0.2s ease-out, opacity 0.2s ease-out', // For hover
  };
};

// --- Helper: Calculate Dynamic Parallax Values (renamed for clarity) ---
// This function now returns values to be directly used by ScrapbookImageItem's spring
const calculateScrollDependentValues = (displayIndex: any, scrollY: any, layoutValues: any, itemData: any) => {
  const {
    dynamicRotationRange, // From global layout controls
    scrollSensitivityFactor, // From global layout controls
    parallaxDepthFactor,     // From global layout controls
    itemBaseScale,          // From global layout controls
    movementScrollCap       // From global layout controls
  } = layoutValues;

  // Use item-specific sensitivities if available, otherwise global
  // These would be part of itemData if we decide to make them per-item configurable
  const currentScrollSensitivity = itemData.scrollSensitivityFactorOverride || scrollSensitivityFactor;
  const currentDynamicRotationRange = itemData.dynamicRotationRangeOverride || dynamicRotationRange;
  const currentParallaxDepthFactor = itemData.parallaxDepthFactorOverride || parallaxDepthFactor;
  const currentItemBaseScale = itemData.itemBaseScaleOverride || itemBaseScale;

  const cappedScrollYForMovement = Math.min(scrollY, movementScrollCap);
  const indexFactor = Math.sin(displayIndex * 0.5); // Varies between -1 and 1

  const dynamicAngleOffsetDeg = Math.sin(cappedScrollYForMovement * currentScrollSensitivity + displayIndex * 0.5) * currentDynamicRotationRange;
  const parallaxTranslateX = cappedScrollYForMovement * currentParallaxDepthFactor * (1 + indexFactor * 0.2) * (itemData.parallaxXDirection || 1); 
  const parallaxTranslateY = cappedScrollYForMovement * currentParallaxDepthFactor * (1 - indexFactor * 0.3) * (itemData.parallaxYDirection || 1); 
  let parallaxScale = currentItemBaseScale + (cappedScrollYForMovement * (currentParallaxDepthFactor * 0.05)); // Example: make scale change less drastic
  parallaxScale = Math.max(0.5, Math.min(parallaxScale, currentItemBaseScale * 1.5)); // Clamp scale relative to base

  return {
    dynamicAngleOffsetDeg, 
    parallaxTranslateX,
    parallaxTranslateY,
    parallaxScale,
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
  config: any;
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
  } = props;

  const { isSetupMode } = useSetupMode();
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const [loadedImageCount, setLoadedImageCount] = useState(0);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

  const defaultLayoutValues = useMemo(() => Object.entries(scrapbookLayoutControlsSchema).reduce((acc: any, [key, val]: [string, any]) => {
    acc[key] = val.value;
    return acc;
  }, {}), []);
  
  const layoutValues = useMemo(() => {
    return { ...defaultLayoutValues, ...(layoutControlsFromProp || {}) };
  }, [layoutControlsFromProp, defaultLayoutValues]);

  const { 
    centerXOffset, centerYOffset, spreadRadiusFactor, maxImages, 
    baseRotationRange, baseSizeMin, baseSizeMax,
    borderWidth, borderColor, shadowOffsetX, shadowOffsetY, shadowBlur, shadowColor, baseOpacity,
    dynamicRotationRange, scrollSensitivityFactor, parallaxDepthFactor,
    itemBaseScale, movementScrollCap
  } = layoutValues;

  // --- Derived State & Memoizations ---
  const resolvedImageSrcs = useMemo(() => {
    if (weddingData && weddingData.scrapbookImages && Array.isArray(weddingData.scrapbookImages)) {
      return weddingData.scrapbookImages.map((img: any) => ({
        src: img.s3Url || img.fileName, // Prefer s3Url if available
        alt: img.caption || img.fileName || `Scrapbook image ${img.id || ''}`,
        id: img.id || img.s3Url || img.fileName, // Ensure unique ID for keys
        originalIndex: -1 // Will be populated later if needed
      })).filter((img: any) => img.src);
    }
    return [];
  }, [weddingData]);

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
      style={{ position: 'relative', width: '100%', minHeight: containerHeight ? `${containerHeight}px` : '100vh' }}
    >
      {displayedImagesAndTheirData.map((itemData: DisplayedImageData, displayIndex: number) => {
        if (!itemData || !itemData.initialStyle) {
          console.warn("Skipping render for scrapbook image due to missing data:", itemData);
          return null;
        }

        const isEffectivelyHidden = focusedImageGlobal !== null && focusedImageGlobal.displayIndex !== displayIndex;

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
            onClick={() => {
              onImageClick(itemData);
            }}
          />
        );
      })}
    </div>
  );
});

export default InteractiveScrapbook; 