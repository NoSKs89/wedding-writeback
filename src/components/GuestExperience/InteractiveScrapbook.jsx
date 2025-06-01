import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSpring, animated } from 'react-spring';
import { useDrag } from '@use-gesture/react';
import ScrapbookImageItem from '../ScrapbookImageItem'; // Check path relative to new file

// --- Logic and Components from WeddingJourney.tsx (adapted) ---

const springConfigPresets = {
  default: { tension: 170, friction: 26, name: 'Default (react-spring)' },
  gentle: { tension: 120, friction: 14, name: 'Gentle (react-spring)' },
  wobbly: { tension: 180, friction: 12, name: 'Wobbly (react-spring)' },
  stiff: { tension: 210, friction: 20, name: 'Stiff (react-spring)' },
  slow: { tension: 280, friction: 60, name: 'Slow (react-spring)' },
  molasses: { tension: 280, friction: 120, name: 'Molasses (react-spring)' },
};

const parseRotationFromStyle = (transformString) => {
  if (typeof transformString === 'number') return transformString;
  if (!transformString) return 0;
  const rotateMatch = transformString.match(/rotate\(([-\d.]+)deg\)/);
  return rotateMatch && rotateMatch[1] ? parseFloat(rotateMatch[1]) : 0;
};

/*
// Structure for FocusedImageState (for reference in JS)
interface FocusedImageState {
  src: string;
  altText: string;
  initialTopPx: number;
  initialLeftPx: number;
  initialWidthPx: number;
  initialHeightPx: number;
  initialRotateDeg: number;
  naturalWidth: number;
  naturalHeight: number;
  description?: string;
  photographer?: string;
  currentIndex: number;
}
*/

const generateInitialScrapbookStyle = (index, totalImages, currentWindow) => {
  const angle = (Math.random() - 0.5) * 30; // Random angle -15 to 15 (closer to WJ)
  const size = 120 + Math.random() * 80;  // Size 120px to 200px (closer to WJ defaults)
  
  // Adjusted radius calculation to be more like WeddingJourney's effective radius
  // WeddingJourney used: Math.min(currentWindow.innerWidth, currentWindow.innerHeight) * (radiusFactor/100) * (random_scalar)
  // Assuming radiusFactor ~0.8 to 0.9 from WJ's dummy controls for a wider spread.
  const baseRadiusPercentage = 0.35; // Increased from 0.25 for wider spread
  const radiusRandomFactor = 0.6 + Math.random() * 0.4; // Range 0.6 to 1.0

  const radius = currentWindow 
    ? Math.min(currentWindow.innerWidth * 0.45, currentWindow.innerHeight * 0.45) * baseRadiusPercentage * radiusRandomFactor
    : 200 * radiusRandomFactor; // Fallback if currentWindow is not yet available

  // Center calculation with jitter for more organic look
  const centerX = currentWindow ? currentWindow.innerWidth / 2 : 400;
  const centerY = currentWindow ? currentWindow.innerHeight / 2 : 300;
  
  const x = Math.cos((index / totalImages) * 2 * Math.PI) * radius + centerX - (size / 2) + (Math.random() - 0.5) * 50;
  const y = Math.sin((index / totalImages) * 2 * Math.PI) * radius + centerY - (size / 2) + (Math.random() - 0.5) * 50;

  return {
    position: 'absolute',
    width: `${size}px`, 
    height: 'auto', // Maintain aspect ratio
    top: `${Math.max(0, Math.min(y, currentWindow ? currentWindow.innerHeight - size : 600 - size))}px`, // Ensure within bounds
    left: `${Math.max(0, Math.min(x, currentWindow ? currentWindow.innerWidth - size : 800 - size))}px`, // Ensure within bounds
    transform: `rotate(${angle}deg)`,
    border: '7px solid white', 
    boxShadow: '5px 5px 15px rgba(0,0,0,0.25)',
    opacity: 0.85,
    zIndex: index + 1, // Ensure initial stacking order
    transition: 'transform 0.2s ease-out, opacity 0.2s ease-out', // Smooth hover transitions
  };
};

const InteractiveScrapbook = ({ weddingData, config, scrollY }) => {
  const scrapbookImageRefs = useRef([]);
  const [focusedImage, setFocusedImage] = useState(null);
  const [imageReturningToScrapbook, setImageReturningToScrapbook] = useState(null);
  const [pendingImageToFocus, setPendingImageToFocus] = useState(null);
  const [lastPutDownIndex, setLastPutDownIndex] = useState(null);
  const [imageNaturalDimensions, setImageNaturalDimensions] = useState([]);
  const [currentWindow, setCurrentWindow] = useState(undefined);

  const imageReturningToScrapbookRef = useRef(null);
  const pendingImageToFocusRef = useRef(null);

  const activeSpringConfig = springConfigPresets.default;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentWindow(window);
    }
  }, []);

  useEffect(() => {
    imageReturningToScrapbookRef.current = imageReturningToScrapbook;
  }, [imageReturningToScrapbook]);

  useEffect(() => {
    pendingImageToFocusRef.current = pendingImageToFocus;
  }, [pendingImageToFocus]);

  const resolvedScrapbookImages = useMemo(() => {
    if (weddingData && weddingData.scrapbookImages && Array.isArray(weddingData.scrapbookImages)) {
      return weddingData.scrapbookImages.map(img => ({
        src: img.s3Url || img.fileName,
        alt: img.fileName || `Scrapbook image ${img.id || ''}`,
        id: img.id || img.s3Url || img.fileName 
      })).filter(img => img.src);
    }
    return [];
  }, [weddingData]);

  useEffect(() => {
    let isMounted = true;
    if (!resolvedScrapbookImages || resolvedScrapbookImages.length === 0) {
      if (isMounted) setImageNaturalDimensions([]);
      return;
    }
    
    const dimensionsPromises = resolvedScrapbookImages.map(imgInfo =>
      new Promise((resolve) => { 
        if (!imgInfo.src) {
          resolve({ width: 0, height: 0, src: imgInfo.src || '' }); return;
        }
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, src: imgInfo.src });
        img.onerror = () => {
          console.error('Failed to load image for dimensions: ' + imgInfo.src);
          resolve({ width: 0, height: 0, src: imgInfo.src });
        };
        img.src = imgInfo.src;
      })
    );
    Promise.all(dimensionsPromises).then(dims => {
      if (isMounted) setImageNaturalDimensions(dims);
    }).catch(error => {
      if (isMounted) {
        console.error("Error loading image dimensions:", error);
        setImageNaturalDimensions(resolvedScrapbookImages.map(imgInfo => ({ width:0, height:0, src: imgInfo.src || ''})));
      }
    });
    return () => { isMounted = false; };
  }, [resolvedScrapbookImages]);

  const displayedImagesAndTheirData = useMemo(() => {
    if (!resolvedScrapbookImages || resolvedScrapbookImages.length === 0 || !currentWindow || imageNaturalDimensions.length === 0) {
      const allDimsLoaded = resolvedScrapbookImages.every(imgInfo => 
        imageNaturalDimensions.some(dim => dim.src === imgInfo.src && dim.width > 0 && dim.height > 0)
      );
      if (!allDimsLoaded && resolvedScrapbookImages.length > 0 && imageNaturalDimensions.length < resolvedScrapbookImages.length) {
        return []; 
      }
      if (resolvedScrapbookImages.length === 0) return [];
    }

    const maxScrapbookImagesToShow = config?.maxImages || 15;
    const numImagesToDisplay = Math.min(maxScrapbookImagesToShow, resolvedScrapbookImages.length);
    
    let imagesToProcess = []; 
    const allImagesWithOriginalIndex = resolvedScrapbookImages.map((imgInfo, index) => ({ ...imgInfo, originalIndex: index }));

    if (resolvedScrapbookImages.length <= numImagesToDisplay) {
      imagesToProcess = allImagesWithOriginalIndex;
    } else {
      const shuffled = [...allImagesWithOriginalIndex].sort(() => 0.5 - Math.random());
      imagesToProcess = shuffled.slice(0, numImagesToDisplay);
    }
    
    // Default sensitivity values (can be adjusted or made props later)
    const scrollAngleSensitivity = 0.0015; 
    const xMovementSensitivity = 0.05;    
    const yMovementSensitivity = 0.05;    
    const zMovementSensitivity = 0.0001;  
    const baseItemScale = 1;
    const movementScrollCap = 7000;

    return imagesToProcess.map((imageInfo, displayIndex) => {
      const { src, originalIndex, alt, id } = imageInfo;
      const style = generateInitialScrapbookStyle(displayIndex, imagesToProcess.length, currentWindow);
      
      return {
        src, originalIndex, displayIndex, altText: alt, id,
        initialStyle: style, 
        scrollSensitivity: scrollAngleSensitivity,
        xMovementSensitivity: (Math.random() * 0.1 - 0.05) + xMovementSensitivity,
        yMovementSensitivity: (Math.random() * 0.1 - 0.05) + yMovementSensitivity,
        zMovementSensitivity: (Math.random() * 0.0001 - 0.00005) + zMovementSensitivity,
        baseItemScale,
        movementScrollCap,
      };
    });
  }, [resolvedScrapbookImages, imageNaturalDimensions, currentWindow, config?.maxImages]);

  useEffect(() => {
    scrapbookImageRefs.current = Array(displayedImagesAndTheirData.length).fill(null);
  }, [displayedImagesAndTheirData.length]);

  const backdropSpring = useSpring({ 
    opacity: focusedImage ? 1 : 0, 
    pointerEvents: focusedImage ? 'auto' : 'none',
    position: 'fixed', 
    top: 0, left: 0, width: '100vw', height: '100vh', 
    background: 'rgba(0, 0, 0, 0.7)', 
    config: activeSpringConfig 
  });

  const [focusedImageContainerSpring, focusedImageApi] = useSpring(() => ({ 
    opacity: 0, 
    top: '50%', left: '50%', 
    width: '0px', height: '0px', 
    transform: 'translate(-50%, -50%) rotate(0deg) scale(0.5)', 
    position: 'fixed', 
    config: activeSpringConfig 
  }));

  const infoBoxSpring = useSpring({ 
    opacity: focusedImage ? 1 : 0, 
    transform: focusedImage ? 'translateY(0px)' : 'translateY(20px)', 
    config: activeSpringConfig, 
    delay: focusedImage ? 300 : 0 
  });
  
  const updateAndFocusNewImage = useCallback((newDisplayIndex) => { 
    if (!displayedImagesAndTheirData || displayedImagesAndTheirData.length === 0 || newDisplayIndex < 0 || newDisplayIndex >= displayedImagesAndTheirData.length) return null;
    
    setLastPutDownIndex(null);
    const targetImageData = displayedImagesAndTheirData[newDisplayIndex];
    const targetImageElement = scrapbookImageRefs.current[newDisplayIndex];
    const newImageSrc = targetImageData.src;
    const naturalDims = imageNaturalDimensions.find(dim => dim.src === newImageSrc);
    const styleForNewImage = targetImageData.initialStyle;

    if (targetImageElement && newImageSrc && naturalDims && naturalDims.width > 0 && naturalDims.height > 0 && styleForNewImage) {
      const rect = targetImageElement.getBoundingClientRect();
      const baseRotateNav = parseRotationFromStyle(styleForNewImage.transform);
      const itemScrollSensitivityNav = targetImageData.scrollSensitivity;
      const currentDynamicAngleForNavPickUp = Math.sin(scrollY * itemScrollSensitivityNav + newDisplayIndex * 0.5) * 45;
      const fullInitialRotateNav = baseRotateNav + currentDynamicAngleForNavPickUp;
      return {
        src: newImageSrc, altText: targetImageData.altText || `Scrapbook item ${newDisplayIndex + 1}`, 
        initialTopPx: rect.top, initialLeftPx: rect.left, initialWidthPx: rect.width, initialHeightPx: rect.height,
        initialRotateDeg: fullInitialRotateNav, naturalWidth: naturalDims.width, naturalHeight: naturalDims.height, currentIndex: newDisplayIndex,
        description: `Image ${newDisplayIndex + 1}.`, 
        photographer: `Photographer ${newDisplayIndex + 1}.`
      };
    } else { return null; }
  }, [displayedImagesAndTheirData, imageNaturalDimensions, scrollY]);

  const handlePreviousImage = useCallback((e) => { 
    e.stopPropagation(); 
    if (!focusedImage) return;
    const newIndex = (focusedImage.currentIndex - 1 + displayedImagesAndTheirData.length) % displayedImagesAndTheirData.length;
    const newImageDetails = updateAndFocusNewImage(newIndex);
    if (newImageDetails) { 
      setImageReturningToScrapbook(focusedImage); 
      setPendingImageToFocus(newImageDetails); 
      setFocusedImage(null); 
    }
  }, [focusedImage, displayedImagesAndTheirData, updateAndFocusNewImage]);

  const handleNextImage = useCallback((e) => { 
    e.stopPropagation(); 
    if (!focusedImage) return;
    const newIndex = (focusedImage.currentIndex + 1) % displayedImagesAndTheirData.length;
    const newImageDetails = updateAndFocusNewImage(newIndex);
    if (newImageDetails) { 
      setImageReturningToScrapbook(focusedImage); 
      setPendingImageToFocus(newImageDetails); 
      setFocusedImage(null); 
    }
  },[focusedImage, displayedImagesAndTheirData, updateAndFocusNewImage]);

  // Memoize the drag handler
  const dragHandler = useCallback(({ down, movement: [mx], velocity: [vx], direction: [dx], event, last }) => { 
    event?.stopPropagation(); 
    if (!focusedImage || !last) return;
    const viewportWidth = currentWindow ? currentWindow.innerWidth : 1920;
    const distanceThreshold = viewportWidth / 4;
    const velocityThreshold = 0.3;
    if (Math.abs(mx) > distanceThreshold || Math.abs(vx) > velocityThreshold) {
      const syntheticEvent = { stopPropagation: () => {} };
      if (dx > 0) { handlePreviousImage(syntheticEvent); }
      else if (dx < 0) { handleNextImage(syntheticEvent); }
    }
  }, [focusedImage, currentWindow, handlePreviousImage, handleNextImage]); // Added dependencies

  const bindFocusedImageDrag = useDrag(dragHandler, { axis: 'x', filterTaps: true });

  const calculateFocusTargetDimensions = useCallback((naturalW, naturalH, viewportW, viewportH) => { 
    const targetViewportWidth = viewportW * 0.8;
    const targetViewportHeight = viewportH * 0.8;
    const aspectRatio = naturalW / naturalH;
    let targetWidth = targetViewportWidth;
    let targetHeight = targetWidth / aspectRatio;
    if (targetHeight > targetViewportHeight) {
      targetHeight = targetViewportHeight;
      targetWidth = targetHeight * aspectRatio;
    }
    return { targetWidth, targetHeight };
  }, []);

  const getCenteredPosition = useCallback((targetWidth, targetHeight, offsetXvw = 0) => { 
    const vw = currentWindow ? currentWindow.innerWidth : 1920;
    const vh = currentWindow ? currentWindow.innerHeight : 1080;
    let leftPx = (vw - targetWidth) / 2;
    const topPx = (vh - targetHeight) / 2;
    leftPx -= (vw * offsetXvw / 100);
    return { top: topPx, left: leftPx };
  }, [currentWindow]);

  const handleImageClick = useCallback((details) => { 
    console.log('[InteractiveScrapbook] handleImageClick called with details:', details); // DEBUG LOG
    setLastPutDownIndex(null);
    const { imageSrc: clickedSrc, altText: clickedAlt, initialStyle: clickedInitialStyle, currentBoundingClientRect: rect, imageElement, index: clickedDisplayIndex } = details;
    let naturalDims = imageNaturalDimensions.find(dim => dim.src === clickedSrc) || { width: imageElement?.naturalWidth || 0, height: imageElement?.naturalHeight || 0, src: clickedSrc };
    if (!naturalDims.width || !naturalDims.height) { console.error("CANNOT SET FOCUSED IMAGE: Natural dimensions are zero for " + clickedSrc); return; }
    
    const baseRotateOnClick = parseRotationFromStyle(clickedInitialStyle.transform);
    const clickedImageData = displayedImagesAndTheirData.find(d => d.displayIndex === clickedDisplayIndex);
    const itemScrollSensitivityOnClick = clickedImageData ? clickedImageData.scrollSensitivity : 0.001;
    const currentDynamicAngleForPickUp = Math.sin(scrollY * itemScrollSensitivityOnClick + clickedDisplayIndex * 0.5) * 45;
    const fullInitialRotateOnClick = baseRotateOnClick + currentDynamicAngleForPickUp;
    
    const clickedImageDetails = {
      src: clickedSrc, altText: clickedAlt, initialTopPx: rect.top, initialLeftPx: rect.left, initialWidthPx: rect.width, initialHeightPx: rect.height,
      initialRotateDeg: fullInitialRotateOnClick, naturalWidth: naturalDims.width, naturalHeight: naturalDims.height, currentIndex: clickedDisplayIndex,
      description: `Image ${clickedDisplayIndex + 1}.`, // Simplified description
      photographer: `Photographer ${clickedDisplayIndex + 1}.` // Simplified photographer
    };
    if (focusedImage) { 
      setImageReturningToScrapbook(focusedImage); 
      setPendingImageToFocus(clickedImageDetails); 
      setFocusedImage(null); 
    } else { 
      setFocusedImage(clickedImageDetails); 
    }
  }, [focusedImage, imageNaturalDimensions, displayedImagesAndTheirData, scrollY, getCenteredPosition, calculateFocusTargetDimensions]); // Added dependencies

   useEffect(() => { 
    let returnTimeoutId = null;
    if (focusedImage && currentWindow) {
      const { targetWidth, targetHeight } = calculateFocusTargetDimensions(focusedImage.naturalWidth, focusedImage.naturalHeight, currentWindow.innerWidth, currentWindow.innerHeight);
      const { top: calculatedTargetTopPx, left: calculatedTargetLeftPx } = getCenteredPosition(targetWidth, targetHeight, 1.5); 
      
      focusedImageApi.start({ 
        from: { 
          opacity: 0.5, 
          top: `${focusedImage.initialTopPx}px`, 
          left: `${focusedImage.initialLeftPx}px`, 
          width: `${focusedImage.initialWidthPx}px`, 
          height: `${focusedImage.initialHeightPx}px`, 
          transform: `translate(0px, 0px) rotate(${focusedImage.initialRotateDeg}deg) scale(1)` 
        }, 
        to: { 
          opacity: 1, 
          top: `${calculatedTargetTopPx}px`, 
          left: `${calculatedTargetLeftPx}px`, 
          width: `${targetWidth}px`, 
          height: `${targetHeight}px`, 
          transform: 'translate(0px, 0px) rotate(0deg) scale(1)' 
        }, 
        config: activeSpringConfig 
      });
    } else if (imageReturningToScrapbook && currentWindow) {
      const { currentIndex: returningDisplayIndex, initialWidthPx, initialHeightPx, naturalWidth, naturalHeight } = imageReturningToScrapbook;
      const targetScrapbookElement = scrapbookImageRefs.current[returningDisplayIndex];
      const currentItemDataForReturn = displayedImagesAndTheirData.find(d => d.displayIndex === returningDisplayIndex);

      if (targetScrapbookElement && currentItemDataForReturn) {
        const currentRect = targetScrapbookElement.getBoundingClientRect();
        const scrapbookLayoutInfoForReturn = currentItemDataForReturn.initialStyle;
        const baseRotationPutDown = parseRotationFromStyle(scrapbookLayoutInfoForReturn.transform);
        const itemScrollSensitivityPutDown = currentItemDataForReturn.scrollSensitivity;
        const currentDynamicAngleForPutDown = Math.sin(scrollY * itemScrollSensitivityPutDown + returningDisplayIndex * 0.5) * 45;
        const totalCurrentRotationForPutDown = baseRotationPutDown + currentDynamicAngleForPutDown;
        
        const itemXSensitivity = currentItemDataForReturn.xMovementSensitivity;
        const itemYSensitivity = currentItemDataForReturn.yMovementSensitivity;
        const itemZSensitivity = currentItemDataForReturn.zMovementSensitivity;
        const baseItemScale = currentItemDataForReturn.baseItemScale;
        const movementScrollCap = currentItemDataForReturn.movementScrollCap;
        const cappedScrollYForMovement = Math.min(scrollY, movementScrollCap);
        let parallaxScaleValue = baseItemScale + (cappedScrollYForMovement * itemZSensitivity);
        parallaxScaleValue = Math.max(0.1, parallaxScaleValue);

        focusedImageApi.start({ 
          to: { 
            top: `${currentRect.top}px`, 
            left: `${currentRect.left}px`, 
            width: `${initialWidthPx * parallaxScaleValue}px`,
            height: `${initialHeightPx * parallaxScaleValue}px`,
            transform: `translate(0px, 0px) rotate(${totalCurrentRotationForPutDown}deg) scale(${parallaxScaleValue})`,
            opacity: 0,
          }, 
          config: activeSpringConfig,
          onRest: () => {
            const currentReturningImageFromRef = imageReturningToScrapbookRef.current;
            setImageReturningToScrapbook(null);
            if (currentReturningImageFromRef) { setLastPutDownIndex(currentReturningImageFromRef.currentIndex); }
            
            const currentPendingImageFromRef = pendingImageToFocusRef.current;
            if (currentPendingImageFromRef) { 
              setFocusedImage(currentPendingImageFromRef); 
              setPendingImageToFocus(null); 
            }
          }
        });
      } else {
        focusedImageApi.start({ opacity: 0, immediate: true }); 
        setImageReturningToScrapbook(null);
        if (pendingImageToFocusRef.current) {
          setFocusedImage(pendingImageToFocusRef.current); 
          setPendingImageToFocus(null); 
        }
      }
    } else {
      focusedImageApi.start({ opacity: 0, immediate: true });
    }
  }, [focusedImage, imageReturningToScrapbook, pendingImageToFocus, focusedImageApi, currentWindow, displayedImagesAndTheirData, scrollY, activeSpringConfig, calculateFocusTargetDimensions, getCenteredPosition]);

  const handleCloseFocusedImage = useCallback(() => { 
    if (focusedImage) { 
      setImageReturningToScrapbook(focusedImage); 
      setFocusedImage(null); 
      setPendingImageToFocus(null); 
    }
  },[focusedImage]);

  if (!weddingData) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading scrapbook data...</div>;
  }

  if (displayedImagesAndTheirData.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No scrapbook images to display.</div>;
  }

  return (
    <>
      <div style={{
        position: 'relative', 
        width: '100%',
        minHeight: '400px', 
        padding: '20px', 
        boxSizing: 'border-box',
      }}>
        <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#444' }}>Photo Scrapbook</h3>
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '350px' }}>
          {displayedImagesAndTheirData.map((imageData, displayIndex) => {
            const {
              src: imageSrc, altText, initialStyle, id,
              scrollSensitivity: itemScrollSensitivity,
              xMovementSensitivity: itemXSensitivity,
              yMovementSensitivity: itemYSensitivity,
              zMovementSensitivity: itemZSensitivity,
              baseItemScale, movementScrollCap,
            } = imageData;

            if (!initialStyle) return null;

            const dynamicAngle = Math.sin(scrollY * itemScrollSensitivity + displayIndex * 0.5) * 45;
            const cappedScrollYForMovement = Math.min(scrollY, movementScrollCap);
            const parallaxTranslateX = cappedScrollYForMovement * itemXSensitivity;
            const parallaxTranslateY = cappedScrollYForMovement * itemYSensitivity;
            let parallaxScaleValue = baseItemScale + (cappedScrollYForMovement * itemZSensitivity);
            parallaxScaleValue = Math.max(0.1, parallaxScaleValue);

            let isEffectivelyHidden = false;
            if (focusedImage && focusedImage.currentIndex === displayIndex) isEffectivelyHidden = true;
            else if (imageReturningToScrapbook && imageReturningToScrapbook.currentIndex === displayIndex) isEffectivelyHidden = true;

            return (
              <ScrapbookImageItem
                key={id || imageSrc || displayIndex}
                imageSrc={imageSrc}
                initialStyle={initialStyle}
                altText={altText}
                dynamicAngleOffsetDeg={dynamicAngle}
                index={displayIndex}
                isHiddenForFocus={isEffectivelyHidden}
                lastPutDownIndex={lastPutDownIndex}
                ref={(el) => { scrapbookImageRefs.current[displayIndex] = el; }}
                onClick={handleImageClick}
                parallaxTranslateX={parallaxTranslateX}
                parallaxTranslateY={parallaxTranslateY}
                parallaxScale={parallaxScaleValue}
              />
            );
          })}
        </div>
      </div>

      {/* Focused Image Modal and Navigation */}
      <>
        <animated.div style={{ ...backdropSpring, zIndex: 1000 }} onClick={handleCloseFocusedImage} />
        {(focusedImage || imageReturningToScrapbook) && (
          <animated.div {...bindFocusedImageDrag()} style={{ ...focusedImageContainerSpring, zIndex: 1001, touchAction: 'none' }}>
            {(focusedImage || imageReturningToScrapbook) && (
              <div onClick={(e) => e.stopPropagation()} style={{ pointerEvents: 'auto', width: '100%', height: '100%', position: 'relative' }}>
                <img
                  src={focusedImage?.src || imageReturningToScrapbook?.src || ''}
                  alt={focusedImage?.altText || imageReturningToScrapbook?.altText || 'Focused image'}
                  style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', boxShadow: '0px 10px 30px rgba(0,0,0,0.5)', border: '10px solid white', borderRadius: '3px' }}
                />
                {focusedImage && (focusedImage.description || focusedImage.photographer) && (
                  <animated.div style={{
                    ...infoBoxSpring,
                    position: 'absolute',
                    bottom: '-70px', 
                    left: '50%',
                    transform: infoBoxSpring.transform.to(t => `${t} translateX(-50%)`),
                    width: 'calc(100% - 40px)', 
                    maxWidth: '450px', 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    color: 'white',
                    padding: '15px',
                    borderRadius: '6px', 
                    textAlign: 'left',
                    boxSizing: 'border-box',
                    zIndex: 1002,
                  }}>
                    {focusedImage.description && <p style={{ margin: '0 0 8px 0', fontSize: '0.9em' }}><strong>Description:</strong> {focusedImage.description}</p>}
                    {focusedImage.photographer && <p style={{ margin: 0, fontSize: '0.9em' }}><strong>Photographer:</strong> {focusedImage.photographer}</p>}
                  </animated.div>
                )}
              </div>
            )}
          </animated.div>
        )}
        {focusedImage && displayedImagesAndTheirData && displayedImagesAndTheirData.length > 1 && (
          <>
            <button
              onClick={handlePreviousImage}
              aria-label="Previous image"
              style={{ position: 'fixed', left: 'calc(10vw - 25px)', top: '50%', transform: 'translateY(-50%)', zIndex: 1003, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '45px', height: '45px', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', boxShadow: '0 1px 8px rgba(0,0,0,0.2)' }}
            > &lt; </button>
            <button
              onClick={handleNextImage}
              aria-label="Next image"
              style={{ position: 'fixed', right: 'calc(10vw - 25px)', top: '50%', transform: 'translateY(-50%)', zIndex: 1003, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '45px', height: '45px', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', boxShadow: '0 1px 8px rgba(0,0,0,0.2)' }}
            > &gt; </button>
          </>
        )}
      </>
    </>
  );
};

export default InteractiveScrapbook; 