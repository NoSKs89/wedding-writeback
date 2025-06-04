import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Parallax, ParallaxLayer, IParallax } from '@react-spring/parallax';
import { useSpring, animated, config as springConfigs } from 'react-spring';
import { useDrag } from '@use-gesture/react'; // ADD THIS LINE
import { Leva } from 'leva';
import { useLocation } from 'react-router-dom';
import RSVPForm from './RSVPForm';
import styles from './styles.module.css';
import '../App.css';
import ScrapbookImageItem, { ScrapbookClickDetails } from './ScrapbookImageItem';
// import ParallaxBackgroundImage from './ParallaxBackgroundImage'; // Comment out for now
import { useTrackedControls } from '../hooks/useTrackedControls';
import { useLevaStore, LevaFolderSchema, LevaControlSchemaItem } from '../stores/levaStore';
import { useSetupMode } from '../contexts/SetupModeContext';
import { ElementConfig, TimelineMarker } from './ExperienceSetupPage/ExperienceSetupPage'; // Import new types

// Type Definitions
interface WeddingData {
  brideName: string;
  groomName: string;
  weddingDate: string;
  introBackground: string; // Still used for a static background for now
  introCouple: string; // Still used for a static intro image for now
  rsvpEndpoint: string;
  id: string | number;
  isPlated?: boolean;
  platedOptions?: any[];
  eventName?: string; // Added from previous changes
  // experienceSettings will be passed as a separate prop
}

// NEW: Interface for Experience Settings Prop
interface ExperienceSettingsData {
  elements: ElementConfig[];
  markers: TimelineMarker[];
  timelineLength: number; // This might define the total scroll length or pages
}

interface WeddingJourneyProps {
  weddingData: WeddingData;
  resolvedScrapbookImages: string[];
  experienceSettings: ExperienceSettingsData; // Add new prop
}

// Updated FocusedImageState for precise animation control
interface FocusedImageState {
  src: string;
  altText: string;
  // Original scrapbook item's state for return animation
  initialTopPx: number;
  initialLeftPx: number;
  initialWidthPx: number;
  initialHeightPx: number;
  initialRotateDeg: number;
  // Natural dimensions for aspect ratio calculation
  naturalWidth: number;
  naturalHeight: number;
  // Optional details
  description?: string;
  photographer?: string;
  currentIndex: number; // Added for navigation
}

const levaTheme = {
  sizes: {
    rootWidth: '400px', // Increase panel width
  },
  // You can add other theme customizations here if needed
};

// Define the spring configuration presets
const springConfigPresets = {
  default: { tension: 170, friction: 26, name: 'Default (react-spring)' },
  gentle: { tension: 120, friction: 14, name: 'Gentle (react-spring)' },
  wobbly: { tension: 180, friction: 12, name: 'Wobbly (react-spring)' },
  stiff: { tension: 210, friction: 20, name: 'Stiff (react-spring)' },
  slow: { tension: 280, friction: 60, name: 'Slow (react-spring)' },
  molasses: { tension: 280, friction: 120, name: 'Molasses (react-spring)' },
  responsive: { tension: 200, friction: 22, name: 'Responsive (Custom)' },
  snappy: { tension: 250, friction: 18, name: 'Snappy (Custom)' },
  delicate: { tension: 100, friction: 10, name: 'Delicate (Custom)' },
  strong: { tension: 300, friction: 30, name: 'Strong (Custom)' },
};


// Modify overallControlsSchemaDefinition slightly for clarity with isSetupMode
const overallControlsSchemaDefinition = (isSetupModeFromContext: boolean): LevaFolderSchema => ({
  showHUD: { value: isSetupModeFromContext, label: 'Show Debug HUD' }, // Default based on setup mode
  toggleGuideLines: { value: isSetupModeFromContext, label: 'Toggle Guide Lines' }, // Default based on setup mode
  springPreset: {
    value: 'default', // Default preset key
    options: Object.keys(springConfigPresets), // Use keys from our presets
    label: 'Animation Physics Preset',
  }
});


// Helper function to parse rotation from transform string
const parseRotationFromStyle = (transformString?: string | number): number => {
  if (typeof transformString === 'number') return transformString;
  if (!transformString) return 0;
  const rotateMatch = transformString.match(/rotate\\(([-\\d.]+)deg\\)/);
  return rotateMatch && rotateMatch[1] ? parseFloat(rotateMatch[1]) : 0;
};

const WeddingJourney: React.FC<WeddingJourneyProps> = ({ weddingData, resolvedScrapbookImages, experienceSettings }) => {
  const { isSetupMode } = useSetupMode();
  const location = useLocation();

  const { id: currentWeddingId } = weddingData;

  const {
    brideName, groomName, weddingDate,
    introBackground, introCouple, rsvpEndpoint
  } = weddingData;

  const parallaxRef = React.useRef<IParallax>(null);
  const scrapbookImageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const [scrollY, setScrollY] = useState(0);
  const [currentWindow, setCurrentWindow] = useState<Window | undefined>(undefined);

  // --- State for Focused Image Logic (Scrapbook - can remain for now) ---
  const [focusedImage, setFocusedImage] = useState<FocusedImageState | null>(null);
  const [imageReturningToScrapbook, setImageReturningToScrapbook] = useState<FocusedImageState | null>(null);
  const [pendingImageToFocus, setPendingImageToFocus] = useState<FocusedImageState | null>(null);
  const [lastPutDownIndex, setLastPutDownIndex] = useState<number | null>(null);
  // --- End State for Focused Image Logic ---

  const [imageNaturalDimensions, setImageNaturalDimensions] = useState<Array<{width: number; height: number; src: string}>>([]);

  // Refs for state values used in timeouts
  const imageReturningToScrapbookRef = useRef<FocusedImageState | null>(null);
  const pendingImageToFocusRef = useRef<FocusedImageState | null>(null);

  useEffect(() => {
    imageReturningToScrapbookRef.current = imageReturningToScrapbook;
  }, [imageReturningToScrapbook]);

  useEffect(() => {
    pendingImageToFocusRef.current = pendingImageToFocus;
  }, [pendingImageToFocus]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentWindow(window);
    }
  }, []);

  // Effect for loading natural dimensions of scrapbook images (can remain)
  useEffect(() => {
    let isMounted = true;
    if (!resolvedScrapbookImages || resolvedScrapbookImages.length === 0) {
      if (isMounted) setImageNaturalDimensions([]);
    } else {
      const dimensionsPromises = resolvedScrapbookImages.map(src =>
        new Promise<{width: number; height: number; src: string}>((resolve) => {
          if (!src) {
            resolve({ width: 0, height: 0, src: src || '' }); return;
          }
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, src });
          img.onerror = () => {
            console.error('Failed to load image for dimensions: ' + src);
            resolve({ width: 0, height: 0, src });
          };
          img.src = src;
        })
      );
      Promise.all(dimensionsPromises).then(dims => {
        if (isMounted) setImageNaturalDimensions(dims);
      }).catch(error => {
        if (isMounted) {
          console.error("Error loading image dimensions:", error);
          setImageNaturalDimensions(resolvedScrapbookImages.map(s => ({ width:0, height:0, src: s || ''})));
        }
      });
    }
    return () => { isMounted = false; };
  }, [resolvedScrapbookImages]);


  const updateScrollPosition = useCallback(() => {
    if (parallaxRef.current && parallaxRef.current.container.current) {
      setScrollY(parallaxRef.current.container.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const scrollContainer = parallaxRef.current?.container.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateScrollPosition);
      updateScrollPosition();
      return () => {
        scrollContainer.removeEventListener('scroll', updateScrollPosition);
      };
    }
  }, [updateScrollPosition]);

  // Initialize overallControlsSchema with the current setup mode
  const overallControlsSchema = useMemo(() => overallControlsSchemaDefinition(isSetupMode), [isSetupMode]);

  const overallControls = useTrackedControls(
    'Overall Controls',
    overallControlsSchema,
    { collapsed: isSetupMode, hidden: !isSetupMode }
  );

  const overallControlsValues = overallControls?.values || {};
  const {
    showHUD: showGlobalHUDEnabled = (overallControlsSchemaDefinition(isSetupMode).showHUD as LevaControlSchemaItem).value,
    toggleGuideLines: guideLinesEnabled = (overallControlsSchemaDefinition(isSetupMode).toggleGuideLines as LevaControlSchemaItem).value,
    springPreset: selectedSpringPresetKey = (overallControlsSchemaDefinition(isSetupMode).springPreset as LevaControlSchemaItem).value
  } = overallControlsValues;

  const activeSpringConfig = springConfigPresets[selectedSpringPresetKey as keyof typeof springConfigPresets] || springConfigPresets.default;
  const activeSpringConfigName = activeSpringConfig.name;


  // --- HUD DATA ---
  const hudData = React.useMemo(() => {
    return useLevaStore.getState().getDisplayDataForHUD();
  }, [useLevaStore(state => state.controlValues), useLevaStore(state => state.changedKeys), useLevaStore(state => state.schemas)]);

  // --- Simplified Parallax Page Calculation ---
  const TOTAL_PAGES = experienceSettings.timelineLength > 0 ? experienceSettings.timelineLength / (currentWindow?.innerHeight || 700) : 3;

  // Dummy/default style generation for scrapbook if Leva controls are removed
  const generateScrapbookImageStyle = useCallback((
    index: number, totalImages: number, currentWindow: Window | undefined,
    _controls: any // Dummy controls for now, marked as unused
  ): React.CSSProperties => {
    const angle = (Math.random() - 0.5) * 20; // Random angle -10 to 10
    const size = 100 + Math.random() * 50; // Size 100px to 150px
    const radius = (currentWindow ? Math.min(currentWindow.innerWidth, currentWindow.innerHeight) * 0.3 : 200) * (0.5 + Math.random() * 0.5);
    const x = Math.cos((index / totalImages) * 2 * Math.PI) * radius + (currentWindow ? currentWindow.innerWidth / 2 : 500) - size / 2;
    const y = Math.sin((index / totalImages) * 2 * Math.PI) * radius + (currentWindow ? currentWindow.innerHeight / 2 : 400) - size / 2;

    return {
      position: 'absolute',
      width: `${size}px`, height: 'auto',
      top: `${y}px`, left: `${x}px`,
      transform: `rotate(${angle}deg)`,
      border: '5px solid white', boxShadow: '3px 3px 10px rgba(0,0,0,0.2)',
      opacity: 0.8,
    };
  }, []); // Added dependency array for useCallback

  // --- Process experienceSettings to create renderable elements ---
  const renderableElements = useMemo(() => {
    if (!experienceSettings || !experienceSettings.elements || !experienceSettings.markers) {
      return [];
    }
    return experienceSettings.elements
      .filter(el => el.type === 'text' || el.type === 'photo' || el.type === 'background-image') // Include 'background-image'
      .map(element => {
        const startMarker = experienceSettings.markers.find(m => m.elementId === element.id && m.type === 'start');
        const endMarker = experienceSettings.markers.find(m => m.elementId === element.id && m.type === 'end');

        if (!startMarker || !endMarker) return null;

        const offset = startMarker.position * (TOTAL_PAGES -1) ;
        const endPage = endMarker.position * (TOTAL_PAGES-1) ;
        // const durationInPages = Math.max(0.1, endPage - offset);

        return {
          ...element,
          key: `exp-el-${element.id}`,
          pageOffset: offset,
          sticky: { start: offset, end: endPage }
        };
      }).filter(el => el !== null) as Array<ElementConfig & { key: string; pageOffset: number; sticky: { start: number; end: number; } }>; // Added type assertion
  }, [experienceSettings, TOTAL_PAGES, generateScrapbookImageStyle]);


  // --- Scrapbook related memoizations (can remain for now) ---
    const displayedImagesAndTheirData = useMemo(() => {
    if (!resolvedScrapbookImages || resolvedScrapbookImages.length === 0 || !currentWindow || imageNaturalDimensions.length === 0) {
      const allDimsLoaded = resolvedScrapbookImages.every(src => imageNaturalDimensions.some(dim => dim.src === src && dim.width > 0 && dim.height > 0));
      if (!allDimsLoaded && resolvedScrapbookImages.length > 0) return [];
      if (resolvedScrapbookImages.length === 0) return [];
    }
    // Max images for scrapbook can come from experienceSettings if a scrapbook element exists
    const scrapbookElement = experienceSettings.elements.find(el => el.type === 'component' && el.name === 'Scrapbook');
    const maxScrapbookImagesToShow = (typeof scrapbookElement?.content === 'object' && scrapbookElement.content && 'maxImages' in scrapbookElement.content)
                                   ? (scrapbookElement.content as {maxImages: number}).maxImages
                                   : 15; // Default if not set

    const numImagesToDisplay = Math.min(maxScrapbookImagesToShow, resolvedScrapbookImages.length);
    let imagesToProcess: Array<{ src: string; originalIndex: number }> = [];

    if (resolvedScrapbookImages.length <= numImagesToDisplay) {
      imagesToProcess = resolvedScrapbookImages.map((src, index) => ({ src, originalIndex: index }));
    } else {
      const indexedImages = resolvedScrapbookImages.map((src, index) => ({ src, originalIndex: index }));
      const shuffled = [...indexedImages].sort(() => 0.5 - Math.random());
      imagesToProcess = shuffled.slice(0, numImagesToDisplay);
    }
   // Dummy values for scrapbook layout, as these controls are removed
    const dummyScrapbookLayoutControls = {
        angleMin: -5, angleMax: 5, radiusFactor: 90, sizeMinPx: 100, sizeRangePx: 150,
        scrollAngleSensitivityMin: 0.001, scrollAngleSensitivityMax: 0.002
    };
    const dummyScrapbookMovementControls = {
        minXMovementSensitivity: -0.1, maxXMovementSensitivity: 0.1,
        minYMovementSensitivity: -0.1, maxYMovementSensitivity: 0.1,
        minZMovementSensitivity: 0, maxZMovementSensitivity: 0,
        baseItemScale: 1, movementScrollCap: 7000
    };


    return imagesToProcess.map((imageInfo, displayIndex) => {
      const { src, originalIndex } = imageInfo;
      const style = generateScrapbookImageStyle(displayIndex, imagesToProcess.length, currentWindow, dummyScrapbookLayoutControls); // Use dummy controls
      const scrollSensitivity = (Math.random() * (dummyScrapbookLayoutControls.scrollAngleSensitivityMax - dummyScrapbookLayoutControls.scrollAngleSensitivityMin) + dummyScrapbookLayoutControls.scrollAngleSensitivityMin);
      const xMovementSensitivity = (Math.random() * (dummyScrapbookMovementControls.maxXMovementSensitivity - dummyScrapbookMovementControls.minXMovementSensitivity) + dummyScrapbookMovementControls.minXMovementSensitivity);
      const yMovementSensitivity = (Math.random() * (dummyScrapbookMovementControls.maxYMovementSensitivity - dummyScrapbookMovementControls.minYMovementSensitivity) + dummyScrapbookMovementControls.minYMovementSensitivity);
      const zMovementSensitivity = (Math.random() * (dummyScrapbookMovementControls.maxZMovementSensitivity - dummyScrapbookMovementControls.minZMovementSensitivity) + dummyScrapbookMovementControls.minZMovementSensitivity);

      return {
        src, originalIndex, displayIndex, altText: `Scrapbook item ${displayIndex + 1}`,
        initialStyle: style, scrollSensitivity, xMovementSensitivity, yMovementSensitivity, zMovementSensitivity,
      };
    });
  }, [resolvedScrapbookImages, imageNaturalDimensions, currentWindow, experienceSettings.elements, generateScrapbookImageStyle]);


  useEffect(() => {
    scrapbookImageRefs.current = Array(displayedImagesAndTheirData.length).fill(null);
  }, [displayedImagesAndTheirData.length]);

  // --- Focused Image Animation (Scrapbook - can remain) ---
  const backdropSpring = useSpring({ opacity: focusedImage ? 1 : 0, pointerEvents: focusedImage ? 'auto' : 'none' as 'auto' | 'none', position: 'fixed' as any, top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.7)', config: activeSpringConfig });
  const [focusedImageContainerSpring, focusedImageApi] = useSpring(() => ({ opacity: 0, top: '50%', left: '50%', width: '0px', height: '0px', transform: 'translate(-50%, -50%) rotate(0deg) scale(0.5)', position: 'fixed' as any, config: activeSpringConfig }));
  const infoBoxSpring = useSpring({ opacity: focusedImage ? 1 : 0, transform: focusedImage ? 'translateY(0px)' : 'translateY(20px)', config: activeSpringConfig, delay: focusedImage ? 300 : 0 });
  const bindFocusedImageDrag = useDrag(({ down, movement: [mx], velocity: [vx], direction: [dx], event, last }) => { 
    event?.stopPropagation(); 
    if (!focusedImage || !last) return;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const distanceThreshold = viewportWidth / 4;
    const velocityThreshold = 0.3;
    if (Math.abs(mx) > distanceThreshold || Math.abs(vx) > velocityThreshold) {
      const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent;
      if (dx > 0) { handlePreviousImage(syntheticEvent); }
      else if (dx < 0) { handleNextImage(syntheticEvent); }
    }
  }, { axis: 'x', filterTaps: true });
  const calculateFocusTargetDimensions = (naturalW: number, naturalH: number, viewportW: number, viewportH: number): { targetWidth: number; targetHeight: number } => { 
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
  };
  const getCenteredPosition = (targetWidth: number, targetHeight: number, offsetXvw: number = 0): { top: number; left: number} => { 
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
    let leftPx = (vw - targetWidth) / 2;
    const topPx = (vh - targetHeight) / 2;
    leftPx -= (vw * offsetXvw / 100);
    return { top: topPx, left: leftPx };
  };
  const handleImageClick = (details: ScrapbookClickDetails) => { 
    setLastPutDownIndex(null);
    const { imageSrc: clickedSrc, altText: clickedAlt, initialStyle: clickedInitialStyle, currentBoundingClientRect: rect, imageElement, index: clickedDisplayIndex } = details;
    let naturalDims = imageNaturalDimensions.find(dim => dim.src === clickedSrc) || { width: imageElement?.naturalWidth || 0, height: imageElement?.naturalHeight || 0, src: clickedSrc };
    if (!naturalDims.width || !naturalDims.height) { console.error("CANNOT SET FOCUSED IMAGE: Natural dimensions are zero."); return; }
    const baseRotateOnClick = parseRotationFromStyle(clickedInitialStyle.transform);
    const clickedImageData = displayedImagesAndTheirData.find(d => d.displayIndex === clickedDisplayIndex);
    const itemScrollSensitivityOnClick = clickedImageData ? clickedImageData.scrollSensitivity : 0.001;
    const currentDynamicAngleForPickUp = Math.sin(scrollY * itemScrollSensitivityOnClick + clickedDisplayIndex * 0.5) * 45;
    const fullInitialRotateOnClick = baseRotateOnClick + currentDynamicAngleForPickUp;
    const clickedImageDetails: FocusedImageState = {
      src: clickedSrc, altText: clickedAlt, initialTopPx: rect.top, initialLeftPx: rect.left, initialWidthPx: rect.width, initialHeightPx: rect.height,
      initialRotateDeg: fullInitialRotateOnClick, naturalWidth: naturalDims.width, naturalHeight: naturalDims.height, currentIndex: clickedDisplayIndex,
      description: `Image ${clickedDisplayIndex + 1} description.`, photographer: `Photographer ${clickedDisplayIndex + 1}.`
    };
    if (focusedImage) { setImageReturningToScrapbook(focusedImage); setPendingImageToFocus(clickedImageDetails); setFocusedImage(null); }
    else { setFocusedImage(clickedImageDetails); }
  };
   useEffect(() => { 
    let returnTimeoutId: NodeJS.Timeout | null = null;
    if (focusedImage) {
      const { targetWidth, targetHeight } = calculateFocusTargetDimensions(focusedImage.naturalWidth, focusedImage.naturalHeight, currentWindow?.innerWidth || 1920, currentWindow?.innerHeight || 1080);
      const { top: calculatedTargetTopPx, left: calculatedTargetLeftPx } = getCenteredPosition(targetWidth, targetHeight, 1.5);
      focusedImageApi.start({ from: { opacity: 0.5, top: `${focusedImage.initialTopPx}px`, left: `${focusedImage.initialLeftPx}px`, width: `${focusedImage.initialWidthPx}px`, height: `${focusedImage.initialHeightPx}px`, transform: `translate(0px, 0px) rotate(${focusedImage.initialRotateDeg}deg) scale(1)` }, to: { opacity: 1, top: `${calculatedTargetTopPx}px`, left: `${calculatedTargetLeftPx}px`, width: `${targetWidth}px`, height: `${targetHeight}px`, transform: 'translate(0px, 0px) rotate(0deg) scale(1)' }, config: activeSpringConfig });
    } else if (imageReturningToScrapbook) {
      const { currentIndex: returningDisplayIndex, initialWidthPx, initialHeightPx } = imageReturningToScrapbook;
      const targetScrapbookElement = scrapbookImageRefs.current[returningDisplayIndex];
      const currentItemDataForReturn = displayedImagesAndTheirData.find(d => d.displayIndex === returningDisplayIndex);
      if (targetScrapbookElement && currentItemDataForReturn) {
        const currentRect = targetScrapbookElement.getBoundingClientRect();
        const scrapbookLayoutInfoForReturn = currentItemDataForReturn.initialStyle;
        const baseRotationPutDown = parseRotationFromStyle(scrapbookLayoutInfoForReturn.transform);
        const itemScrollSensitivityPutDown = currentItemDataForReturn.scrollSensitivity;
        const currentDynamicAngleForPutDown = Math.sin(scrollY * itemScrollSensitivityPutDown + returningDisplayIndex * 0.5) * 45;
        const totalCurrentRotationForPutDown = baseRotationPutDown + currentDynamicAngleForPutDown;
        focusedImageApi.start({ to: { top: `${currentRect.top}px`, left: `${currentRect.left}px`, width: `${initialWidthPx}px`, height: `${initialHeightPx}px`, transform: `translate(0px, 0px) rotate(${totalCurrentRotationForPutDown}deg) scale(1)`}, config: activeSpringConfig });
        focusedImageApi.start({ to: { opacity: 0 }, config: { tension: 300, friction: 20 }});
        returnTimeoutId = setTimeout(() => {
          const currentReturningImageFromRef = imageReturningToScrapbookRef.current;
          setImageReturningToScrapbook(null);
          if (currentReturningImageFromRef) { setLastPutDownIndex(currentReturningImageFromRef.currentIndex); }
          const currentPendingImageFromRef = pendingImageToFocusRef.current;
          if (currentPendingImageFromRef) { setFocusedImage(currentPendingImageFromRef); setPendingImageToFocus(null); }
        }, 50);
      } else {
        focusedImageApi.start({ opacity: 0, immediate: true }); setImageReturningToScrapbook(null);
        if (pendingImageToFocus) { setFocusedImage(pendingImageToFocus); setPendingImageToFocus(null); }
      }
    } else {
      focusedImageApi.start({ opacity: 0, immediate: true });
    }
    return () => { if (returnTimeoutId) { clearTimeout(returnTimeoutId); } };
  }, [focusedImage, imageReturningToScrapbook, pendingImageToFocus, focusedImageApi, currentWindow, displayedImagesAndTheirData, scrollY, activeSpringConfig, calculateFocusTargetDimensions, getCenteredPosition]);
  const handleCloseFocusedImage = () => { 
    if (focusedImage) { setImageReturningToScrapbook(focusedImage); setFocusedImage(null); setPendingImageToFocus(null); }
    else if (imageReturningToScrapbook) { setImageReturningToScrapbook(null); setFocusedImage(null); setPendingImageToFocus(null); }
  };
  const updateAndFocusNewImage = (newDisplayIndex: number): FocusedImageState | null => { 
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
        src: newImageSrc, altText: `Scrapbook item ${newDisplayIndex + 1}`, initialTopPx: rect.top, initialLeftPx: rect.left, initialWidthPx: rect.width, initialHeightPx: rect.height,
        initialRotateDeg: fullInitialRotateNav, naturalWidth: naturalDims.width, naturalHeight: naturalDims.height, currentIndex: newDisplayIndex,
        description: `Image ${newDisplayIndex + 1} description.`, photographer: `Photographer ${newDisplayIndex + 1}.`
      };
    } else { return null; }
  };
  const handlePreviousImage = (e: React.MouseEvent) => { 
    e.stopPropagation(); if (!focusedImage) return;
    const newIndex = (focusedImage.currentIndex - 1 + displayedImagesAndTheirData.length) % displayedImagesAndTheirData.length;
    const newImageDetails = updateAndFocusNewImage(newIndex);
    if (newImageDetails) { setImageReturningToScrapbook(focusedImage); setPendingImageToFocus(newImageDetails); setFocusedImage(null); }
  };
  const handleNextImage = (e: React.MouseEvent) => { 
    e.stopPropagation(); if (!focusedImage) return;
    const newIndex = (focusedImage.currentIndex + 1) % displayedImagesAndTheirData.length;
    const newImageDetails = updateAndFocusNewImage(newIndex);
    if (newImageDetails) { setImageReturningToScrapbook(focusedImage); setPendingImageToFocus(newImageDetails); setFocusedImage(null); }
  };
  // --- End Scrapbook Focused Image ---


  const centerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  };

  const handleSaveLayout = async () => {
     // This function might be removed or adapted if Leva controls for layout are gone
    console.log("Save Layout clicked - Leva controls might be removed.");
  };

  const saveLayoutButtonRef = useRef<HTMLButtonElement>(null);
  const [saveLayoutButtonHeight, setSaveLayoutButtonHeight] = useState(0);
  useEffect(() => { if (saveLayoutButtonRef.current) setSaveLayoutButtonHeight(saveLayoutButtonRef.current.offsetHeight); }, [isSetupMode]);


  // LOGGING
  useEffect(() => { console.log(`[WeddingJourney] Path: ${location.pathname}, isSetupMode: ${isSetupMode}`); }, [location.pathname, isSetupMode]);
  useEffect(() => {
    if (currentWeddingId && isSetupMode) {
      // Leva store loading for 'desktop' can remain if overall controls are still used
    }
  }, [currentWeddingId, isSetupMode]);


  return (
    <>
      <Leva theme={levaTheme} hidden={!isSetupMode} />

      <animated.div
        className="wedding-journey-wrapper"
        style={{
          width: '100%',
          height: '100vh',
          background: '#E9Ecce', // Simple background for now
        }}
      >
        {isSetupMode && (
          <div style={{ position: 'fixed', top: '10px', left: '10px', zIndex: 10001 }}>
            {/* <button ref={saveLayoutButtonRef} onClick={handleSaveLayout} style={{ ... }}> Save Layout </button> */}
          </div>
        )}

        {isSetupMode && showGlobalHUDEnabled && (
          <div style={{ position: 'fixed', top: `${10 + saveLayoutButtonHeight + 5}px`, left: '10px', zIndex: 10000 /* ...HUD styles... */ }}>
            <div style={{ /* ... */ }}>
              {/* HUD content, e.g., ScrollY, number of pages */}
              {`ScrollY: ${scrollY.toFixed(0)}\nTotal Pages: ${TOTAL_PAGES.toFixed(1)}\nRenderable Elements: ${renderableElements.length}`}
            </div>
             {/* Display Experience Settings for Debugging */}
            <div style={{ background: 'rgba(0,0,0,0.1)', padding: '5px', marginTop: '5px', maxHeight: '200px', overflowY: 'auto' }}>
              <pre style={{ fontSize: '10px' }}>{JSON.stringify(experienceSettings, null, 2)}</pre>
            </div>
          </div>
        )}

        <Parallax ref={parallaxRef} pages={TOTAL_PAGES} style={{ top: '0', left: '0' }}>
          {/* Static Background Layer (if needed) */}
          <ParallaxLayer
            offset={0}
            speed={0} // Static
            factor={TOTAL_PAGES} // Span all pages
            style={{ zIndex: -10 }} // Keep this one very low for the absolute fallback background
          >
            <div style={{
              width: '100%', height: '100%',
              backgroundImage: `url(${introBackground})`, // Use the main intro background for now
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              // opacity: 0.7 // Optional: slight dimming
            }} />
          </ParallaxLayer>

          {/* Render dynamic elements from experienceSettings */}
          {renderableElements.map(element => (
            <ParallaxLayer
              key={element.key}
              sticky={element.sticky}
              style={{
                ...centerStyle,
                // Higher ID = lower zIndex. Element 1 is highest.
                // Background image should be lowest.
                zIndex: element.type === 'background-image' ? -5 : (experienceSettings.elements.length - element.id + 1)
              }}
            >
              <div style={{ 
                padding: element.type === 'background-image' ? '0px' : '20px', // No padding for background image container
                textAlign: 'center', 
                background: element.type === 'background-image' ? 'transparent' : 'rgba(255,255,255,0.3)', 
                borderRadius:element.type === 'background-image' ? '0px' : '10px',
                width: element.type === 'background-image' ? '100%' : 'auto', // Full width for background image container
                height: element.type === 'background-image' ? '100%' : 'auto' // Full height for background image container
              }}>
                {element.type === 'text' && typeof element.content === 'string' && (
                  <h2 style={{ color: element.timelineColor !== '#FFFFFF' ? element.timelineColor : '#333' }}>{element.content}</h2>
                )}
                {(element.type === 'photo' || element.type === 'background-image') && typeof element.content === 'string' && ( // Render background-image as well
                  <img
                    src={element.content}
                    alt={element.name || 'Wedding image'}
                    style={{
                      maxWidth: '100%', // Allow full width for both, container will limit photo
                      maxHeight: element.type === 'background-image' ? '100vh' : '300px',
                      width: element.type === 'background-image' ? '100vw' : 'auto',
                      height: element.type === 'background-image' ? '100vh' : 'auto',
                      objectFit: element.type === 'background-image' ? 'cover' : 'contain',
                      borderRadius: element.type === 'background-image' ? '0px' : '8px',
                      border: element.type === 'background-image' ? 'none' : `${3}px solid ${element.timelineColor}`
                    }}
                  />
                )}
              </div>
            </ParallaxLayer>
          ))}


          {/* Hardcoded RSVP Form Layer - towards the end */}
           <ParallaxLayer
            offset={TOTAL_PAGES - 1.1} // Appears near the end
            speed={0.5} // Moves with scroll a bit
            style={{ ...centerStyle, zIndex: 100 }} // High z-index for RSVP
          >
            <RSVPForm weddingData={weddingData} backendUrl={rsvpEndpoint} />
          </ParallaxLayer>


          {/* Hardcoded Scrapbook Layer - can be placed based on a fixed page or derived */}
          {/* For now, placing it on a middle page, e.g. page 1 if TOTAL_PAGES = 3 */}
          <ParallaxLayer
            offset={Math.min(1.5, TOTAL_PAGES - 1.5)} // Example: middle page for scrapbook
            speed={0.2}
            style={{ ...centerStyle, zIndex: (experienceSettings.elements.length + 2) }} // Ensure scrapbook is above dynamic text/photos but below RSVP
          >
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
              {displayedImagesAndTheirData.map((imageData, displayIndex) => {
                 if (!imageData || !imageData.initialStyle) return null;
                 const { src: imageSrc, altText, initialStyle } = imageData;

                const dynamicAngle = 0; // Simplified
                const parallaxTranslateX = 0; // Simplified
                const parallaxTranslateY = 0; // Simplified
                let parallaxScale = 1; // Simplified

                let isEffectivelyHidden = false;
                if (focusedImage && focusedImage.currentIndex === displayIndex) isEffectivelyHidden = true;
                else if (imageReturningToScrapbook && imageReturningToScrapbook.currentIndex === displayIndex) isEffectivelyHidden = true;

                return (
                  <ScrapbookImageItem
                    key={imageSrc || displayIndex}
                    imageSrc={imageSrc!}
                    initialStyle={initialStyle}
                    altText={altText}
                    dynamicAngleOffsetDeg={dynamicAngle}
                    index={displayIndex}
                    isHiddenForFocus={isEffectivelyHidden}
                    lastPutDownIndex={lastPutDownIndex}
                    ref={(el: HTMLImageElement | null) => { scrapbookImageRefs.current[displayIndex] = el; }}
                    onClick={handleImageClick}
                    parallaxTranslateX={parallaxTranslateX}
                    parallaxTranslateY={parallaxTranslateY}
                    parallaxScale={parallaxScale}
                  />
                );
              })}
            </div>
             <h2 style={{ position: 'relative', zIndex: 2, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '5px', marginTop: '20px' }}>Photo Scrapbook</h2>
          </ParallaxLayer>


        </Parallax>

        {/* Focused Image Modal for Scrapbook (can remain) */}
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
                  {/* Info box for focused image */}
                </div>
              )}
            </animated.div>
        )}
          {/* Navigation arrows for scrapbook focused image */}
        </>
      </animated.div>
    </>
  );
};

export default WeddingJourney;
