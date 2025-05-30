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
import { useTrackedControls } from '../hooks/useTrackedControls';
import { useLevaStore, LevaFolderSchema } from '../stores/levaStore';
import { useSetupMode } from '../contexts/SetupModeContext';
import { ElementConfig, TimelineMarker } from './ExperienceSetupPage/ExperienceSetupPage'; // Import new types

// Type Definitions
interface WeddingData {
  brideName: string;
  groomName: string;
  weddingDate: string;
  introBackground: string;
  introCouple: string;
  rsvpEndpoint: string;
  id: string | number;
  isPlated?: boolean;
  platedOptions?: any[];
  eventName?: string; // Added
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

// Helper functions for color manipulation (can be removed if not used by dynamic background colors)
/*
function hexToRgb(hex: string): number[] | null {
  const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}

function rgbToCss(r: number, g: number, b: number): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}
*/

// Define the schema for Leva controls - COMMENTED OUT
/*
const backgroundAnimationSchema: LevaFolderSchema = {
  opacityGentleEnd: { value: 500, min: 0, max: 5000, step: 10, label: 'Opacity Gentle End (px)' },
  // ... other background animation controls
};

const backgroundColorControlsSchema: LevaFolderSchema = {
  colorStop1_Bottom: { value: '#ff3c00', label: 'Stop 1 Bottom' },
  // ... other background color controls
};

const scrapbookControlsSchema: LevaFolderSchema = {
  angleMin: { value: -6, min: -90, max: 90, step: 1, label: 'Min Angle (deg)' },
  // ... other scrapbook layout controls
  maxImages: { value: 12, min: 1, max: 50, step: 1, label: 'Max Images to Display' }, // MOBILE: Reduced
};

const scrapbookMovementControlsSchema: LevaFolderSchema = {
  minXMovementSensitivity: { value: -0.08, min: -0.4, max: 0.4, step: 0.01, label: 'Min X Parallax Sens.' },
  // ... other scrapbook movement controls
};

const introImageControlsSchema: LevaFolderSchema = {
  introImageScaleStart: { value: 1, min: 0.1, max: 5, step: 0.05, label: 'Start Scale' },
  // ... other intro image controls
};
*/

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
  const rotateMatch = transformString.match(/rotate\(([-\d.]+)deg\)/);
  return rotateMatch && rotateMatch[1] ? parseFloat(rotateMatch[1]) : 0;
};

// REMOVED generateScrapbookImageStyle from here

const WeddingJourneyMobile: React.FC<WeddingJourneyProps> = ({ weddingData, resolvedScrapbookImages, experienceSettings }) => {
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
    'Overall Controls (Mobile)', // Differentiated label for mobile
    overallControlsSchema,
    { collapsed: isSetupMode, hidden: !isSetupMode }
  );

  const overallControlsValues = overallControls?.values || {};
  const {
    showHUD: showGlobalHUDEnabled = overallControlsSchemaDefinition(isSetupMode).showHUD.value,
    toggleGuideLines: guideLinesEnabled = overallControlsSchemaDefinition(isSetupMode).toggleGuideLines.value,
    springPreset: selectedSpringPresetKey = overallControlsSchemaDefinition(isSetupMode).springPreset.value
  } = overallControlsValues;

  const activeSpringConfig = springConfigPresets[selectedSpringPresetKey as keyof typeof springConfigPresets] || springConfigPresets.default;
  const activeSpringConfigName = activeSpringConfig.name;

  // --- Simplified Parallax Page Calculation ---
  const TOTAL_PAGES = experienceSettings.timelineLength > 0 ? experienceSettings.timelineLength / (currentWindow?.innerHeight || 700) : 3;

  // ADDED generateScrapbookImageStyle here
  // Dummy/default style generation for scrapbook if Leva controls are removed
  const generateScrapbookImageStyle = useCallback((
    index: number, totalImages: number, currentWindow: Window | undefined,
    _controls: any // Dummy controls for now, marked as unused
  ): React.CSSProperties => {
    // Simplified for mobile: Stack them more or less vertically, with some overlap and rotation
    const angle = (Math.random() - 0.5) * 10; // Smaller angle range
    const size = 80 + Math.random() * 40; // Smaller size range for mobile (80px to 120px)
    
    // For mobile, let's try to arrange them in a slightly cascading vertical stack
    // The "radius" concept might not fit as well.
    // Let x be somewhat centered, and y be spaced out.
    const xOffset = (Math.random() - 0.5) * (currentWindow ? currentWindow.innerWidth * 0.2 : 40); // Smaller horizontal spread
    const x = (currentWindow ? currentWindow.innerWidth / 2 : 150) - (size / 2) + xOffset;
    const y = (index * (size * 0.3)) + (currentWindow ? currentWindow.innerHeight * 0.1 : 50); // Staggered Y position

    return {
      position: 'absolute',
      width: `${size}px`, height: 'auto',
      top: `${y}px`, left: `${x}px`,
      transform: `rotate(${angle}deg)`,
      border: '3px solid white', boxShadow: '2px 2px 8px rgba(0,0,0,0.2)', // Slightly smaller shadow
      opacity: 0.85, // Slightly higher opacity might be better on mobile
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

        const offset = startMarker.position * (TOTAL_PAGES -1); // Adjusted for 0-indexed pages
        const endPage = endMarker.position * (TOTAL_PAGES-1);   // Adjusted for 0-indexed pages

        return {
          ...element,
          key: `exp-el-${element.id}`,
          pageOffset: offset,
          sticky: { start: offset, end: endPage }
        };
      }).filter(el => el !== null) as Array<ElementConfig & { key: string; pageOffset: number; sticky: { start: number; end: number; } }>;
  }, [experienceSettings, TOTAL_PAGES]);


  // --- Scrapbook related memoizations (can remain for now) ---
  // Mobile: Simplified scrapbook display logic
  const displayedImagesAndTheirData = useMemo(() => {
    if (!resolvedScrapbookImages || resolvedScrapbookImages.length === 0 || !currentWindow || imageNaturalDimensions.length === 0) {
      const allDimsLoaded = resolvedScrapbookImages.every(src => imageNaturalDimensions.some(dim => dim.src === src && dim.width > 0 && dim.height > 0));
      if (!allDimsLoaded && resolvedScrapbookImages.length > 0) return [];
      if (resolvedScrapbookImages.length === 0) return [];
    }

    const scrapbookElement = experienceSettings.elements.find(el => el.type === 'component' && el.name === 'Scrapbook');
    const maxScrapbookImagesToShow = (typeof scrapbookElement?.content === 'object' && scrapbookElement.content && 'maxImages' in scrapbookElement.content)
                                   ? (scrapbookElement.content as {maxImages: number}).maxImages
                                   : 10; // Mobile: Default to a smaller number, e.g., 10

    const numImagesToDisplay = Math.min(maxScrapbookImagesToShow, resolvedScrapbookImages.length);
    let imagesToProcess: Array<{ src: string; originalIndex: number }> = [];

    if (resolvedScrapbookImages.length <= numImagesToDisplay) {
      imagesToProcess = resolvedScrapbookImages.map((src, index) => ({ src, originalIndex: index }));
    } else {
      const indexedImages = resolvedScrapbookImages.map((src, index) => ({ src, originalIndex: index }));
      const shuffled = [...indexedImages].sort(() => 0.5 - Math.random());
      imagesToProcess = shuffled.slice(0, numImagesToDisplay);
    }

    // No complex controls needed for mobile scrapbook, pass undefined or null for controls
    return imagesToProcess.map((imageInfo, displayIndex) => {
      const { src, originalIndex } = imageInfo;
      const style = generateScrapbookImageStyle(displayIndex, imagesToProcess.length, currentWindow, undefined); // Pass undefined for controls

      // Simplified movement sensitivities for mobile
      const scrollSensitivity = (Math.random() * (0.0015 - 0.0005) + 0.0005); // Reduced range
      const xMovementSensitivity = (Math.random() * (0.05 - (-0.05)) + (-0.05)); // Tighter horizontal movement
      const yMovementSensitivity = (Math.random() * (0.05 - (-0.05)) + (-0.05)); // Tighter vertical movement
      const zMovementSensitivity = 0; // No Z movement for simplicity on mobile

      return {
        src, originalIndex, displayIndex, altText: `Scrapbook item ${displayIndex + 1}`,
        initialStyle: style, scrollSensitivity, xMovementSensitivity, yMovementSensitivity, zMovementSensitivity,
      };
    });
  }, [resolvedScrapbookImages, imageNaturalDimensions, currentWindow, experienceSettings.elements, generateScrapbookImageStyle]);


  useEffect(() => {
    scrapbookImageRefs.current = Array(displayedImagesAndTheirData.length).fill(null);
  }, [displayedImagesAndTheirData.length]);


  // --- Simplified HUD Data ---
  const hudString = React.useMemo(() => { // RENAME TO hudString
    return `ScrollY: ${scrollY.toFixed(0)}\nTotal Pages: ${TOTAL_PAGES.toFixed(1)}\nRenderable Elements: ${renderableElements.length}`;
  }, [scrollY, TOTAL_PAGES, renderableElements.length]);

  // --- Focused Image Animation (Simplified for Mobile) ---
  const backdropSpring = useSpring({ opacity: focusedImage ? 1 : 0, pointerEvents: focusedImage ? 'auto' : 'none' as 'auto' | 'none', position: 'fixed' as any, top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.8)', config: activeSpringConfig });

  // Animation spring for the focused image container
  const [focusedImageContainerSpring, focusedImageApi] = useSpring(() => ({
      opacity: 0,
      top: '50%',
      left: '50%',
      width: '0px',
      height: '0px',
      transform: 'translate(-50%, -50%) rotate(0deg) scale(0.5)',
      position: 'fixed' as any,
      config: activeSpringConfig,
  }));

  // Animation spring for the info box content
  const infoBoxSpring = useSpring({
      opacity: focusedImage ? 1 : 0,
      transform: focusedImage ? 'translateY(0px)' : 'translateY(20px)',
      config: activeSpringConfig,
      delay: focusedImage ? 300 : 0
  });

  // Calculate target dimensions for focused image
  const calculateFocusTargetDimensions = (
      naturalW: number,
      naturalH: number,
      viewportW: number,
      viewportH: number
  ): { targetWidth: number; targetHeight: number } => {
      const targetViewportWidth = viewportW * 0.9; // Larger for mobile
      const targetViewportHeight = viewportH * 0.7; // Allow more height
      const aspectRatio = naturalW / naturalH;

      let targetWidth = targetViewportWidth;
      let targetHeight = targetWidth / aspectRatio;

      if (targetHeight > targetViewportHeight) {
      targetHeight = targetViewportHeight;
      targetWidth = targetHeight * aspectRatio;
      }
      return { targetWidth, targetHeight };
  };

  // Calculate centered position with optional offset
  function getCenteredPosition(targetWidth: number, targetHeight: number, offsetXvw: number = 0) {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
      let leftPx = (vw - targetWidth) / 2;
      const topPx = (vh - targetHeight) / 2;
      leftPx -= (vw * offsetXvw / 100);
      return { top: topPx, left: leftPx };
  }

  // Handle scrapbook image click
  const handleImageClick = (details: ScrapbookClickDetails) => {
    setLastPutDownIndex(null);
    const { imageSrc: clickedSrc, altText: clickedAlt, initialStyle: clickedInitialStyle, currentBoundingClientRect: rect, imageElement, index: clickedDisplayIndex } = details;
    let naturalDims = imageNaturalDimensions.find(dim => dim.src === clickedSrc) || { width: imageElement?.naturalWidth || 0, height: imageElement?.naturalHeight || 0, src: clickedSrc };
    if (!naturalDims.width || !naturalDims.height) { console.error("CANNOT SET FOCUSED IMAGE: Natural dimensions are zero."); return; }
    const baseRotateOnClick = parseRotationFromStyle(clickedInitialStyle.transform);
    const clickedImageData = displayedImagesAndTheirData.find(d => d.displayIndex === clickedDisplayIndex);
    const itemScrollSensitivityOnClick = clickedImageData ? clickedImageData.scrollSensitivity : 0.001; // Default if not found
    const currentDynamicAngleForPickUp = Math.sin(scrollY * itemScrollSensitivityOnClick + clickedDisplayIndex * 0.5) * 20; // Reduced angle for mobile
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
      const { targetWidth, targetHeight } = calculateFocusTargetDimensions(focusedImage.naturalWidth, focusedImage.naturalHeight, currentWindow?.innerWidth || 375, currentWindow?.innerHeight || 667);
      const { top: calculatedTargetTopPx, left: calculatedTargetLeftPx } = getCenteredPosition(targetWidth, targetHeight, 0); // No X offset for mobile focus
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
        const currentDynamicAngleForPutDown = Math.sin(scrollY * itemScrollSensitivityPutDown + returningDisplayIndex * 0.5) * 20; // Reduced angle
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
  }, [focusedImage, imageReturningToScrapbook, pendingImageToFocus, focusedImageApi, currentWindow, displayedImagesAndTheirData, scrollY, activeSpringConfig, calculateFocusTargetDimensions, getCenteredPosition]); // Added generateScrapbookImageStyle to dependencies

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
      const currentDynamicAngleForNavPickUp = Math.sin(scrollY * itemScrollSensitivityNav + newDisplayIndex * 0.5) * 20; // Reduced angle
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

  const centerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  };

  const handleSaveLayout = async () => {
    // This will be less relevant until Leva controls for layout are re-integrated
    console.log("[WeddingJourneyMobile] Save Layout clicked - Leva controls might be removed/changed.");
  };

  const saveLayoutButtonRef = useRef<HTMLButtonElement>(null);
  const [saveLayoutButtonHeight, setSaveLayoutButtonHeight] = useState(0);
  useEffect(() => { if (saveLayoutButtonRef.current) setSaveLayoutButtonHeight(saveLayoutButtonRef.current.offsetHeight); }, [isSetupMode]);

  useEffect(() => { console.log(`[WeddingJourneyMobile] Path: ${location.pathname}, isSetupMode: ${isSetupMode}`); }, [location.pathname, isSetupMode]);
  useEffect(() => {
    if (currentWeddingId && isSetupMode) {
      // Leva store loading for 'mobile' can remain if overall controls are still used
    }
  }, [currentWeddingId, isSetupMode]);


  const bindFocusedImageDrag = useDrag(({ down, movement: [mx], velocity: [vx], direction: [dx], event, last }) => {
    event?.stopPropagation();
    if (!focusedImage || !last) return;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 375;
    const distanceThreshold = viewportWidth / 3; // Shorter drag for mobile
    const velocityThreshold = 0.25; // Lower velocity threshold
    if (Math.abs(mx) > distanceThreshold || Math.abs(vx) > velocityThreshold) {
      const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent;
      if (dx > 0) { handlePreviousImage(syntheticEvent); }
      else if (dx < 0) { handleNextImage(syntheticEvent); }
    }
  }, { axis: 'x', filterTaps: true });

  // Simplified intro image logic for mobile - basic fade or fixed position for now
  const introImageStyle: React.CSSProperties = {
    ...centerStyle,
    zIndex: 1,
    opacity: scrollY < (currentWindow?.innerHeight || 667) * 0.5 ? 1 : 0, // Simple fade based on scroll
    transition: 'opacity 0.5s ease-out',
    transform: `scale(${scrollY < (currentWindow?.innerHeight || 667) * 0.2 ? 1 : 0.8})`, // Simple scale
  };


  return (
    <>
      <Leva theme={levaTheme} hidden={!isSetupMode} />

      <animated.div
        className="wedding-journey-wrapper"
        style={{
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          background: '#E9Ecce', // Use a simple static background from WeddingJourney.tsx
        }}
      >
        {isSetupMode && (
          <div style={{ position: 'fixed', top: '10px', left: '10px', zIndex: 10001 }}>
            {/* <button ref={saveLayoutButtonRef} onClick={handleSaveLayout} style={{ ... }}> Save Layout </button> */}
          </div>
        )}

        {isSetupMode && showGlobalHUDEnabled && (
          <div style={{ position: 'fixed', top: `${10 + saveLayoutButtonHeight + 5}px`, left: '10px', zIndex: 10000, fontSize: '10px', background: 'rgba(255,255,255,0.8)', padding: '5px', borderRadius: '3px', whiteSpace: 'pre-wrap' }}>
            {hudString}
          </div>
        )}

        <Parallax
          ref={parallaxRef}
          pages={TOTAL_PAGES} // Use TOTAL_PAGES from experienceSettings
          style={{ top: '0', left: '0' }}
        >
          {/* Static Background Layer */}
          <ParallaxLayer
            offset={0}
            speed={0} // Static
            factor={TOTAL_PAGES} // Span all pages
            style={{ zIndex: -10 }}
          >
            <div style={{
              width: '100%', height: '100%',
              backgroundImage: `url(${introBackground})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }} />
          </ParallaxLayer>

          {/* Render dynamic elements from experienceSettings */}
          {renderableElements.map(element => (
            <ParallaxLayer
              key={element.key}
              sticky={element.sticky}
              style={{
                ...centerStyle, 
                zIndex: element.type === 'background-image' ? -5 : (experienceSettings.elements.length - element.id + 1)
              }}
            >
              <div style={{
                padding: element.type === 'background-image' ? '0px' : '15px', 
                textAlign: 'center', 
                background: element.type === 'background-image' ? 'transparent' : 'rgba(255,255,255,0.2)', 
                borderRadius: element.type === 'background-image' ? '0px' : '8px', 
                margin: element.type === 'background-image' ? '0' : '0 10px',
                width: element.type === 'background-image' ? '100%' : 'auto',
                height: element.type === 'background-image' ? '100%' : 'auto'
              }}>
                {element.type === 'text' && typeof element.content === 'string' && (
                  <h3 style={{ color: element.timelineColor !== '#FFFFFF' ? element.timelineColor : '#444', fontSize: '1.5rem' }}>{element.content}</h3>
                )}
                {(element.type === 'photo' || element.type === 'background-image') && typeof element.content === 'string' && (
                  <img 
                    src={element.content} 
                    alt={element.name || 'Wedding image'} 
                    style={{
                      maxWidth: '100%',
                      maxHeight: element.type === 'background-image' ? '100vh' : '250px',
                      width: element.type === 'background-image' ? '100vw' : 'auto',
                      height: element.type === 'background-image' ? '100vh' : 'auto',
                      objectFit: element.type === 'background-image' ? 'cover' : 'contain',
                      borderRadius: element.type === 'background-image' ? '0px' : '5px', 
                      border: element.type === 'background-image' ? 'none' : `${2}px solid ${element.timelineColor}`
                    }}
                  />
                )}
              </div>
            </ParallaxLayer>
          ))}

          {/* Intro Couple Image Layer - Simplified for Mobile */}
           <ParallaxLayer
            offset={0.1} // Appears early
            speed={0.3} // Moves a bit with scroll
            style={introImageStyle} // Apply simplified style
          >
            <img src={introCouple} alt="Couple" className="introCoupleImage" style={{ maxWidth: '70%', maxHeight: '200px' }}/>
          </ParallaxLayer>


          {/* RSVP Form Layer - towards the end */}
           <ParallaxLayer
            offset={TOTAL_PAGES - 1} // Positioned at the start of the last page for mobile
            speed={0.5}
            style={{ ...centerStyle, zIndex: 100, width: '100%' }} // High z-index for RSVP
          >
            <div style={{width: '90%', maxWidth: '400px'}}>
              <RSVPForm weddingData={weddingData} backendUrl={rsvpEndpoint} />
            </div>
          </ParallaxLayer>


          {/* Hardcoded Scrapbook Layer - Mobile: more compact */}
          <ParallaxLayer
            offset={Math.min(1, TOTAL_PAGES - 1.8)} // Adjust offset for mobile, maybe page 1 or 1.2
            speed={0.3} // Slightly different speed
            style={{ ...centerStyle, zIndex: (experienceSettings.elements.length + 2), width: '100%' }} // Ensure scrapbook is above dynamic text/photos but below RSVP
          >
            <div style={{ position: 'relative', width: '100%', height: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, marginTop: '20px' }}>
              {displayedImagesAndTheirData.map((imageData, displayIndex) => {
                 if (!imageData || !imageData.initialStyle) return null;
                 const { src: imageSrc, altText, initialStyle } = imageData;

                const dynamicAngle = 0; // Simplified for mobile
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
             <h3 style={{ position: 'relative', zIndex: 2, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '5px', marginTop: '15px', fontSize: '1.2em' }}>Scrapbook</h3>
          </ParallaxLayer>


        </Parallax>

        {/* Focused Image Modal for Scrapbook (retained) */}
        <>
        <animated.div
            style={{ ...backdropSpring, zIndex: 1000 }}
            onClick={handleCloseFocusedImage}
        />
        {(focusedImage || imageReturningToScrapbook) && (
            <animated.div
                {...bindFocusedImageDrag()}
                style={{ ...focusedImageContainerSpring, zIndex: 1001, touchAction: 'pan-y' }} // allow vertical scroll
            >
              {(focusedImage || imageReturningToScrapbook) && (
                <div onClick={(e) => e.stopPropagation()} style={{ pointerEvents: 'auto', width: '100%', height: '100%', position: 'relative' }}>
                  <img
                    src={focusedImage?.src || imageReturningToScrapbook?.src || ''}
                    alt={focusedImage?.altText || imageReturningToScrapbook?.altText || 'Focused image'}
                    style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', boxShadow: '0px 5px 20px rgba(0,0,0,0.4)', border: '8px solid white', borderRadius: '2px' }}
                  />
                  {/* Info box can be simplified or removed for mobile if too cluttered */}
                </div>
              )}
            </animated.div>
        )}
        {/* Navigation Arrows for scrapbook focused image (can be smaller/simpler for mobile) */}
         {focusedImage && displayedImagesAndTheirData && displayedImagesAndTheirData.length > 1 && (
            <>
                <button onClick={handlePreviousImage} aria-label="Previous image" style={{ position: 'fixed', left: '5vw', top: '50%', transform: 'translateY(-50%)', zIndex: 1003, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', boxShadow: '0 1px 5px rgba(0,0,0,0.2)' }}> &lt; </button>
                <button onClick={handleNextImage} aria-label="Next image" style={{ position: 'fixed', right: '5vw', top: '50%', transform: 'translateY(-50%)', zIndex: 1003, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', boxShadow: '0 1px 5px rgba(0,0,0,0.2)' }}> &gt; </button>
            </>
        )}
        </>
      </animated.div>
    </>
  );
};

export default WeddingJourneyMobile;
