import React, { useEffect, useMemo, useRef } from 'react';
// import { useSpring, animated } from 'react-spring'; // No longer directly used here for item animation
import ScrapbookImageItem from '../ScrapbookImageItem';
import { useTrackedControls } from '../../hooks/useTrackedControls';

// --- Leva Schema for Scrapbook Layout (Local to this component) ---
const scrapbookLayoutControlsSchema = {
  centerXOffset: { value: 0, min: -100, max: 100, step: 1, label: 'Center X Offset (%)' },
  centerYOffset: { value: 0, min: -100, max: 100, step: 1, label: 'Center Y Offset (%)' },
  spreadRadiusFactor: { value: 0.35, min: 0.1, max: 0.7, step: 0.01, label: 'Spread Radius Factor' },
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
const generateInitialScrapbookStyle = (index, totalImages, windowDims, layoutValues) => {
  const {
    centerXOffset, centerYOffset, spreadRadiusFactor,
    baseRotationRange, baseSizeMin, baseSizeMax,
    borderWidth, borderColor,
    shadowOffsetX, shadowOffsetY, shadowBlur, shadowColor,
    baseOpacity
  } = layoutValues;

  const angle = (Math.random() - 0.5) * (baseRotationRange * 2);
  const size = baseSizeMin + Math.random() * (baseSizeMax - baseSizeMin);

  const baseRadiusPercentage = spreadRadiusFactor;
  const radiusRandomFactor = 0.6 + Math.random() * 0.4;

  const radius = windowDims.innerWidth
    ? Math.min(windowDims.innerWidth * 0.45, windowDims.innerHeight * 0.45) * baseRadiusPercentage * radiusRandomFactor
    : 200 * radiusRandomFactor;

  const baseCenterX = windowDims.innerWidth ? windowDims.innerWidth / 2 : 400;
  const baseCenterY = windowDims.innerHeight ? windowDims.innerHeight / 2 : 300;

  const offsetX = windowDims.innerWidth ? (windowDims.innerWidth * centerXOffset / 100) : (800 * centerXOffset / 100);
  const offsetY = windowDims.innerHeight ? (windowDims.innerHeight * centerYOffset / 100) : (600 * centerYOffset / 100);

  const finalCenterX = baseCenterX + offsetX;
  const finalCenterY = baseCenterY + offsetY;

  const x = Math.cos((index / totalImages) * 2 * Math.PI) * radius + finalCenterX - (size / 2) + (Math.random() - 0.5) * 50;
  const y = Math.sin((index / totalImages) * 2 * Math.PI) * radius + finalCenterY - (size / 2) + (Math.random() - 0.5) * 50;

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
const calculateScrollDependentValues = (displayIndex, scrollY, layoutValues, itemData) => {
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
  const parallaxTranslateX = cappedScrollYForMovement * currentParallaxDepthFactor * (1 + indexFactor * 0.2); 
  const parallaxTranslateY = cappedScrollYForMovement * currentParallaxDepthFactor * (1 - indexFactor * 0.3); 
  let parallaxScale = currentItemBaseScale + (cappedScrollYForMovement * (currentParallaxDepthFactor * 0.05)); // Example: make scale change less drastic
  parallaxScale = Math.max(0.5, Math.min(parallaxScale, currentItemBaseScale * 1.5)); // Clamp scale relative to base

  return {
    dynamicAngleOffsetDeg, 
    parallaxTranslateX,
    parallaxTranslateY,
    parallaxScale,
  };
};


// --- InteractiveScrapbook Component ---
const InteractiveScrapbook = ({
  weddingData,
  config, // This is the element.content for the scrapbook component
  scrollY,
  // Focus-related props & handlers from GuestExperience
  onImageClick,
  focusedImageGlobal,
  imageReturningToScrapbookGlobal,
  lastPutDownIndexGlobal,
  scrapbookImageRefs, // The ref array from GuestExperience
  onDisplayedImagesUpdate, // Callback to GuestExperience
  windowWidth,
  windowHeight,
}) => {
  // --- Leva Controls for Scrapbook Layout (Local to this component) ---
  // These controls are now part of InteractiveScrapbook and not WeddingJourney
  const layoutControls = useTrackedControls(
    'Scrapbook Layout (Guest)',
    scrapbookLayoutControlsSchema,
    { collapsed: true } // Initially collapsed in guest view
  );
  const { 
    centerXOffset, centerYOffset, spreadRadiusFactor, maxImages, 
    baseRotationRange, baseSizeMin, baseSizeMax,
    borderWidth, borderColor, shadowOffsetX, shadowOffsetY, shadowBlur, shadowColor, baseOpacity,
    dynamicRotationRange, scrollSensitivityFactor, parallaxDepthFactor,
    itemBaseScale, movementScrollCap
  } = layoutControls.values;

  // --- Derived State & Memoizations ---
  const resolvedImageSrcs = useMemo(() => {
    if (weddingData && weddingData.scrapbookImages && Array.isArray(weddingData.scrapbookImages)) {
      return weddingData.scrapbookImages.map(img => ({
        src: img.s3Url || img.fileName, // Prefer s3Url if available
        alt: img.caption || img.fileName || `Scrapbook image ${img.id || ''}`,
        id: img.id || img.s3Url || img.fileName, // Ensure unique ID for keys
        originalIndex: -1 // Will be populated later if needed
      })).filter(img => img.src);
    }
    return [];
  }, [weddingData]);

  const displayedImagesAndTheirData = useMemo(() => {
    if (!resolvedImageSrcs || resolvedImageSrcs.length === 0 || !windowWidth || !windowHeight) {
      if (resolvedImageSrcs.length === 0) return [];
    }

    const numImagesToDisplay = Math.min(maxImages, resolvedImageSrcs.length);
    let imagesToProcess = [];
    const allImagesWithOriginalIndex = resolvedImageSrcs.map((imgInfo, index) => ({ ...imgInfo, originalIndex: index }));

    if (resolvedImageSrcs.length <= numImagesToDisplay) {
      imagesToProcess = allImagesWithOriginalIndex;
    } else {
      // Simple shuffle and slice if more images available than max to display
      const shuffled = [...allImagesWithOriginalIndex].sort(() => 0.5 - Math.random());
      imagesToProcess = shuffled.slice(0, numImagesToDisplay);
    }
    
    const windowDims = { innerWidth: windowWidth, innerHeight: windowHeight };

    // This map now produces data that is STABLE with respect to scrollY.
    // It contains base styles and parameters for dynamic calculation.
    return imagesToProcess.map((imageInfo, displayIndex) => {
      const { src, originalIndex, alt, id } = imageInfo;
      const style = generateInitialScrapbookStyle(displayIndex, imagesToProcess.length, windowDims, layoutControls.values);
      
      return {
        src,
        originalIndex, 
        displayIndex,  
        altText: alt || `Scrapbook item ${displayIndex + 1}`,
        id: id || src, 
        initialStyle: style,
        // Per-item parameters for scroll-dependent calculations can be stored here if they vary
        // For now, we assume calculateScrollDependentValues will use global layoutControls.values for these.
        // Example: 
        // itemScrollSensitivityFactor: layoutControls.values.scrollSensitivityFactor, 
        // itemDynamicRotationRange: layoutControls.values.dynamicRotationRange, 
        // etc.
      };
    });
  }, [
    resolvedImageSrcs,
    windowWidth,
    windowHeight,
    // All values from layoutControls.values that affect generateInitialScrapbookStyle
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
    layoutControls.values // Simplest way to capture all layout control changes that *might* affect base styles.
  ]);

  // Update GuestExperience with the images that will be displayed and their data
  useEffect(() => {
    if (typeof onDisplayedImagesUpdate === 'function') {
      onDisplayedImagesUpdate(displayedImagesAndTheirData);
    }
    // IMPORTANT: scrapbookImageRefs (the prop) is a mutable ref object passed from GuestExperience.
    // We should update ITS .current property here, not re-assign the prop itself.
    if (scrapbookImageRefs && scrapbookImageRefs.current) {
        // Ensure the ref array in GuestExperience has the correct length
        if (scrapbookImageRefs.current.length !== displayedImagesAndTheirData.length) {
            scrapbookImageRefs.current = Array(displayedImagesAndTheirData.length).fill(null);
        }
    }
  }, [displayedImagesAndTheirData, onDisplayedImagesUpdate, scrapbookImageRefs]);

  if (!weddingData || !config) {
    return <div style={{ padding: '20px', textAlign: 'center', color: 'white' }}>Loading scrapbook...</div>;
  }
  
  // Use a title from the scrapbook element's config if available, or default
  const scrapbookTitle = (typeof config === 'object' && config?.title) || "Photo Scrapbook";


  return (
    <>
      {/* <h2 style={{ position: 'relative', zIndex: 2, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: '5px', marginTop: '20px', textAlign: 'center' }}>
        {scrapbookTitle}
      </h2> */}
      <div style={{ position: 'relative', width: '100%', height: 'calc(100% - 0px)', minHeight: '350px' /* Adjust if title height changes, removed 70px for title */ }}>
        {displayedImagesAndTheirData.map((imageData, displayIndex) => {
          if (!imageData || !imageData.initialStyle) {
            console.warn("Skipping render for scrapbook image due to missing data:", imageData);
            return null;
          }
          
          const isEffectivelyHidden = focusedImageGlobal?.currentIndex === displayIndex || imageReturningToScrapbookGlobal?.currentIndex === displayIndex;

          // Calculate scroll-dependent values IN THE RENDER LOOP
          const scrollDependent = calculateScrollDependentValues(
            displayIndex, 
            scrollY, 
            layoutControls.values, // Pass all layout controls
            imageData // Pass the current item's data (might contain overrides in the future)
          );

          return (
            <ScrapbookImageItem
              key={imageData.id} // Use the unique ID from imageData
              imageSrc={imageData.src}
              initialStyle={imageData.initialStyle} // Base style, scroll-independent
              altText={imageData.altText}
              index={imageData.displayIndex} // This is the displayIndex
              isHiddenForFocus={isEffectivelyHidden}
              lastPutDownIndex={lastPutDownIndexGlobal}
              ref={(el) => {
                // Ensure scrapbookImageRefs (the prop) and its .current are valid before assigning
                if (scrapbookImageRefs && scrapbookImageRefs.current) {
                  scrapbookImageRefs.current[imageData.displayIndex] = el;
                }
              }}
              onClick={onImageClick} // Propagated from GuestExperience
              // Pass SCROLL-DEPENDENT values directly, calculated in this render pass:
              dynamicAngleOffsetDeg={scrollDependent.dynamicAngleOffsetDeg}
              parallaxTranslateX={scrollDependent.parallaxTranslateX}
              parallaxTranslateY={scrollDependent.parallaxTranslateY}
              parallaxScale={scrollDependent.parallaxScale}
            />
          );
        })}
      </div>
    </>
  );
};

// Wrap InteractiveScrapbook with React.memo
const MemoizedInteractiveScrapbook = React.memo(InteractiveScrapbook);

export default MemoizedInteractiveScrapbook; 