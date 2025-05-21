import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Parallax, ParallaxLayer, IParallax } from '@react-spring/parallax';
import { useSpring, animated, config as springConfigs } from 'react-spring';
import { Leva, useControls as useLevaControls } from 'leva';
import RSVPForm from './RSVPForm';
import styles from './styles.module.css';
import '../App.css';
import ScrapbookImageItem, { ScrapbookClickDetails } from './ScrapbookImageItem';
import ParallaxBackgroundImage from './ParallaxBackgroundImage';

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
}

// This interface should match the AnimControlValues in ParallaxBackgroundImage.tsx
interface BackgroundAnimControlValues {
  opacityGentleEnd: number;
  opacityTargetAtGentleEnd: number;
  opacityDrasticStartPixels: number;
  opacityTargetAtDrasticStart: number;
  opacityFullTransparent: number;
  translateYThreshold: number;
  translateYMultiplier: number;
  scaleInitialRate: number;
  scaleDrasticStartPx: number;
  scaleDrasticRate: number;
  borderRadiusStartScrollY: number;
  clipPathVanishScrollY: number;
}

interface WeddingJourneyProps {
  weddingData: WeddingData;
  resolvedScrapbookImages: string[];
  setShowGuideLines: (show: boolean) => void;
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

// Helper functions for color manipulation
function hexToRgb(hex: string): number[] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}

function rgbToCss(r: number, g: number, b: number): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

// Custom hook to track changed Leva controls
// Keeping it simple for now, will cast where needed.
function useTrackedControls(folderName: string, schema: any, options?: object) {
  const [values, set] = useLevaControls(folderName, () => schema, options, [schema]);
  const initialValues = useRef(values);
  const [changedKeys, setChangedKeys] = useState(new Set<string>());

  useEffect(() => {
    const newChanged = new Set<string>();
    if (Object.keys(initialValues.current).length === 0 && Object.keys(values).length > 0) {
        initialValues.current = values;
    }
    for (const key in values) {
      if (initialValues.current.hasOwnProperty(key)) {
        if (values[key] !== initialValues.current[key]) {
          newChanged.add(key);
        }
      }
    }
    setChangedKeys(newChanged);
  }, [values]);

  useEffect(() => {
    initialValues.current = values;
  }, [Object.keys(values).join(',')]);

  return { values, changedKeys, set };
}

// Define the schema for Leva controls
const backgroundAnimationSchema = {
  opacityGentleEnd: { value: 500, min: 0, max: 5000, step: 10, label: 'Opacity Gentle End (px)' },
  opacityTargetAtGentleEnd: { value: 0.8, min: 0, max: 1, step: 0.01, label: 'Opacity at Gentle End' },
  opacityDrasticStartPixels: { value: 700, min: 0, max: 5000, step: 10, label: 'Opacity Drastic Start (px)' },
  opacityTargetAtDrasticStart: { value: 0.3, min: 0, max: 1, step: 0.01, label: 'Opacity at Drastic Start' },
  opacityFullTransparent: { value: 900, min: 0, max: 5000, step: 10, label: 'Opacity Full Transparent (px)' },
  translateYThreshold: { value: 200, min: 0, max: 5000, step: 10, label: 'Translate Y Start (px)' },
  translateYMultiplier: { value: 650, min: 0, max: 1000, step: 10, label: 'Translate Y Multiplier (%)' },
  scaleInitialRate: { value: 4, min: 0, max: 50, step: 0.1, label: 'Initial Scale Rate' },
  scaleDrasticStartPx: { value: 494, min: 0, max: 5000, step: 1, label: 'Drastic Scale Start (px)' },
  scaleDrasticRate: { value: 10.6, min: 0, max: 100, step: 0.1, label: 'Drastic Scale Rate' },
  borderRadiusStartScrollY: { value: 500, min: 0, max: 5000, step: 10, label: 'ClipPath Start Shrink (px)' },
  clipPathVanishScrollY: { value: 597, min: 0, max: 5000, step: 10, label: 'ClipPath Vanish End (px)' },
};

// NEW: Schema for BackgroundColor Leva controls
const backgroundColorControlsSchema = {
  colorStop1_Bottom: { value: '#ff3c00', label: 'Stop 1 Bottom' },
  colorStop1_Top:    { value: '#ff7e33', label: 'Stop 1 Top' },
  colorStop2_Bottom: { value: '#ff5a00', label: 'Stop 2 Bottom' },
  colorStop2_Top:    { value: '#ff9966', label: 'Stop 2 Top' },
  colorStop3_Bottom: { value: '#ff7043', label: 'Stop 3 Bottom' },
  colorStop3_Top:    { value: '#ffc107', label: 'Stop 3 Top' },
  colorStop4_Bottom: { value: '#ff5722', label: 'Stop 4 Bottom' },
  colorStop4_Top:    { value: '#ffab91', label: 'Stop 4 Top' },
  colorStop5_Bottom: { value: '#ff3c00', label: 'Stop 5 Bottom (Loop)' },
  colorStop5_Top:    { value: '#ff7e33', label: 'Stop 5 Top (Loop)' },
  // gradientAngle: { value: 0, min: 0, max: 360, label: 'Gradient Angle (deg)'} // Example if we add angle later
};

// NEW: Schema for Scrapbook Layout Leva controls
const scrapbookControlsSchema = {
  angleMin: { value: -6, min: -90, max: 90, step: 1, label: 'Min Angle (deg)' },
  angleMax: { value: 15, min: -90, max: 90, step: 1, label: 'Max Angle (deg)' },
  radiusFactor: { value: 95, min: 20, max: 300, step: 1, label: 'Spread Radius (%)' },
  sizeMinPx: { value: 110, min: 50, max: 500, step: 10, label: 'Min Size (px)' },
  sizeRangePx: { value: 160, min: 0, max: 400, step: 10, label: 'Size Range (px)' },
  scrollAngleSensitivityMin: { value: 0.0001, min: 0.00001, max: 0.01, step: 0.00001, label: 'Min Scroll Tilt Speed' },
  scrollAngleSensitivityMax: { value: 0.002, min: 0.00001, max: 0.01, step: 0.00001, label: 'Max Scroll Tilt Speed' },
  maxImages: { value: 20, min: 1, max: 100, step: 1, label: 'Max Images to Display' },
};

// NEW: Schema for Scrapbook Parallax Movement Leva controls
const scrapbookMovementControlsSchema = {
  minXMovementSensitivity: { value: -0.08, min: -0.4, max: 0.4, step: 0.01, label: 'Min X Parallax Sens.' },
  maxXMovementSensitivity: { value: 0.17, min: -0.4, max: 0.4, step: 0.01, label: 'Max X Parallax Sens.' },
  minYMovementSensitivity: { value: -0.2, min: -0.4, max: 0.4, step: 0.01, label: 'Min Y Parallax Sens.' },
  maxYMovementSensitivity: { value: 0.23, min: -0.4, max: 0.4, step: 0.01, label: 'Max Y Parallax Sens.' },
  minZMovementSensitivity: { value: -0.0001, min: -0.001, max: 0.001, step: 0.000001, label: 'Min Z Parallax Sens.' },
  maxZMovementSensitivity: { value: 0.0001, min: -0.001, max: 0.001, step: 0.000001, label: 'Max Z Parallax Sens.' },
  baseItemScale: { value: 1, min: 0.1, max: 2, step: 0.05, label: 'Base Item Scale' },
  movementScrollCap: { value: 7150, min: 200, max: 10000, step: 50, label: 'Scroll Cap for Movement (px)'}
};

// Updated generateScrapbookImageStyle to use Leva controls
const generateScrapbookImageStyle = (
  index: number, 
  totalImages: number, 
  currentWindow: Window | undefined,
  controls: {
    angleMin: number; // For individual image tilt
    angleMax: number; // For individual image tilt
    radiusFactor: number; // For circular placement radius
    sizeMinPx: number;
    sizeRangePx: number;
  }
): React.CSSProperties => {
  const { angleMin, angleMax, radiusFactor, sizeMinPx, sizeRangePx } = controls;

  const imageWidthPx = Math.random() * sizeRangePx + sizeMinPx;
  // Assuming aspect ratio is roughly 1 for height, or using auto-height.
  // For centering adjustment, we'll primarily use imageWidthPx.

  let individualImageTiltDeg = 0;
  const minTilt = Math.min(angleMin, angleMax);
  const maxTilt = Math.max(angleMin, angleMax);
  if (Math.random() < 0.8) { // 80% chance of being tilted
    individualImageTiltDeg = Math.random() * (maxTilt - minTilt) + minTilt;
  }

  const effectiveWindowWidth = typeof currentWindow !== 'undefined' ? currentWindow.innerWidth : 1000;
  const effectiveWindowHeight = typeof currentWindow !== 'undefined' ? currentWindow.innerHeight : 1000;

  // Circular placement logic
  const centerXPercent = 50;
  const centerYPercent = 50;

  // radiusFactor (0-100) determines how spread out. 
  // If 100, images can reach edges. Max radius is 50% of min(viewportWidth, viewportHeight)
  // To make radiusFactor more intuitive for spread:
  // Let radiusFactor=100 mean images can spread to 90% of the container radius (45% from center)
  // Let radiusFactor=0 mean images are very close to center (e.g. 5% radius)
  const minPlacementRadiusPercent = 5; 
  const maxPlacementRadiusPercent = 45; // Max distance from center for the *average* image
  
  const basePlacementRadiusPercent = minPlacementRadiusPercent + (radiusFactor / 100) * (maxPlacementRadiusPercent - minPlacementRadiusPercent);

  // Add some randomness to the radius for each image
  const radiusJitterPercent = (Math.random() - 0.5) * basePlacementRadiusPercent * 0.4; // +/- 20% of base radius
  const actualPlacementRadiusPercent = Math.max(0, basePlacementRadiusPercent + radiusJitterPercent);

  const placementAngleRad = (index / totalImages) * 2 * Math.PI + (Math.random() - 0.5) * 0.3; // Add slight angle jitter

  // Calculate position based on a circular distribution.
  // We need to consider if the container is not square.
  // For now, use actualPlacementRadiusPercent for both axes, which will look elliptical on non-square viewports.
  let leftPercent = centerXPercent + actualPlacementRadiusPercent * Math.cos(placementAngleRad);
  let topPercent = centerYPercent + actualPlacementRadiusPercent * Math.sin(placementAngleRad);

  // Adjust for image size to center the image on the calculated point
  const imageWidthAsPercentOfContainer = (imageWidthPx / effectiveWindowWidth) * 100;
  // Assuming roughly square images for height adjustment, or that 'height: auto' will manage aspect ratio.
  // For a more accurate centering of height, we'd need naturalHeight or assume aspect ratio.
  // Let's estimate imageHeightAsPercentOfContainer similar to width for centering.
  // This is an approximation if height is 'auto' and aspect ratios vary wildly.
  const imageHeightAsPercentOfContainer = (imageWidthPx / effectiveWindowHeight) * 100; 

  leftPercent -= imageWidthAsPercentOfContainer / 2;
  topPercent -= imageHeightAsPercentOfContainer / 2;
  
  // Clamping (slightly adjusted to be relative to image size for better visibility)
  // Allow up to 90% of the image to be off-screen
  const visblePortion = 10; // 10% of image must be visible
  topPercent = Math.max(-imageHeightAsPercentOfContainer + visblePortion, Math.min(topPercent, 100 - visblePortion));
  leftPercent = Math.max(-imageWidthAsPercentOfContainer + visblePortion, Math.min(leftPercent, 100 - visblePortion));

  return {
    position: 'absolute',
    width: `${imageWidthPx}px`,
    height: 'auto', // Keep height auto to respect aspect ratio
    boxShadow: '3px 3px 10px rgba(0,0,0,0.2)',
    border: '5px solid white',
    transform: `rotate(${individualImageTiltDeg}deg)`,
    top: `${topPercent}%`,
    left: `${leftPercent}%`,
    opacity: 0.8, // Base opacity
    transition: 'transform 0.3s ease-out',
  };
};

const WeddingJourney: React.FC<WeddingJourneyProps> = ({ weddingData, resolvedScrapbookImages, setShowGuideLines }) => {
  const {
    brideName, groomName, weddingDate,
    introBackground, introCouple, rsvpEndpoint
  } = weddingData;

  const parallaxRef = React.useRef<IParallax>(null);
  const scrapbookImageRefs = useRef<(HTMLImageElement | null)[]>([]); // Refs for scrapbook image elements
  const [scrollY, setScrollY] = useState(0);
  const [currentWindow, setCurrentWindow] = useState<Window | undefined>(undefined);
  
  // --- State for Focused Image Logic ---
  const [focusedImage, setFocusedImage] = useState<FocusedImageState | null>(null);
  const [imageReturningToScrapbook, setImageReturningToScrapbook] = useState<FocusedImageState | null>(null);
  const [pendingImageToFocus, setPendingImageToFocus] = useState<FocusedImageState | null>(null);
  const [lastPutDownIndex, setLastPutDownIndex] = useState<number | null>(null); // New state
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

  useEffect(() => {
    let isMounted = true; // To prevent state updates on unmounted component or from stale effects
    console.log('WeddingJourney resolvedScrapbookImages effect running. Length:', resolvedScrapbookImages ? resolvedScrapbookImages.length : 0);

    if (!resolvedScrapbookImages || resolvedScrapbookImages.length === 0) {
      if (isMounted) {
        setImageNaturalDimensions([]);
        console.log('Cleared image natural dimensions due to empty resolvedScrapbookImages.');
      }
    } else {
      // Ensure refs array is sized correctly - This might be better placed elsewhere or be more resilient
      // For now, let's assume it's handled or verify its necessity later.
      // scrapbookImageRefs.current = Array(resolvedScrapbookImages.length).fill(null);

      const dimensionsPromises = resolvedScrapbookImages.map(src => {
        return new Promise<{width: number; height: number; src: string}>((resolve) => {
          if (!src) {
            console.warn("A null or empty image source was provided for dimension loading.");
            resolve({ width: 0, height: 0, src: src || '' }); // Ensure src is a string
            return;
          }
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, src });
          img.onerror = () => {
            console.error(`Failed to load image for dimensions: ${src}`);
            resolve({ width: 0, height: 0, src }); // Resolve with 0 dimensions on error
          };
          img.src = src;
        });
      });

      Promise.all(dimensionsPromises).then(dims => {
        if (isMounted) {
          // More detailed logging for the dimensions being set
          console.log('WJ: DimLoadEffect - SUCCESS. Dims to be set (first 3): ', JSON.stringify(dims.slice(0,3)));
          if (dims.length > 0 && dims.every(d => d.width === 0 && d.height === 0)) {
            console.warn("WJ: DimLoadEffect - WARNING: All loaded image dimensions are 0x0. Check image sources/paths.");
          }
          setImageNaturalDimensions(dims);
        } else {
          console.log('WJ: DimLoadEffect - SKIPPED setting dimensions (effect was stale). Dims would have been (first 3):', JSON.stringify(dims.slice(0,3)));
        }
      }).catch(error => {
        if (isMounted) {
          console.error("Error loading image dimensions:", error);
          // Set to an array of zero dimensions matching the structure
          setImageNaturalDimensions(resolvedScrapbookImages.map(s => ({ width:0, height:0, src: s || ''})));
        } else {
          console.log('Skipped setting error image dimensions, effect was stale.');
        }
      });
    }
    return () => {
      isMounted = false; // Cleanup when effect re-runs or component unmounts
    };
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

  const { values: animControlsFromLeva, changedKeys: animChangedKeys } = useTrackedControls('Background Animation', backgroundAnimationSchema, { collapsed: true });
  
  const animControls = animControlsFromLeva as BackgroundAnimControlValues;

  const {
    opacityGentleEnd,
    opacityTargetAtGentleEnd,
    opacityDrasticStartPixels,
    opacityTargetAtDrasticStart,
    opacityFullTransparent,
    translateYThreshold,
    translateYMultiplier,
    scaleInitialRate,
    scaleDrasticStartPx,
    scaleDrasticRate,
    borderRadiusStartScrollY,
    clipPathVanishScrollY,
  } = animControls;

  const { values: bgControls, changedKeys: bgChangedKeys } = useTrackedControls('BackgroundColor Controls', backgroundColorControlsSchema, { collapsed: true });
  const {
    colorStop1_Bottom, colorStop1_Top,
    colorStop2_Bottom, colorStop2_Top,
    colorStop3_Bottom, colorStop3_Top,
    colorStop4_Bottom, colorStop4_Top,
    colorStop5_Bottom, colorStop5_Top
  } = bgControls;

  const { values: scrapbookCtrl, changedKeys: scrapbookChangedKeys } = useTrackedControls('Scrapbook Layout', scrapbookControlsSchema, { collapsed: true });
  const {
    angleMin,
    angleMax,
    radiusFactor,
    sizeMinPx,
    sizeRangePx,
    scrollAngleSensitivityMin,
    scrollAngleSensitivityMax,
    maxImages
  } = scrapbookCtrl;

  const { values: scrapbookMoveCtrl, changedKeys: scrapbookMoveChangedKeys } = useTrackedControls('Scrapbook Parallax', scrapbookMovementControlsSchema, { collapsed: true });
  const {
    minXMovementSensitivity,
    maxXMovementSensitivity,
    minYMovementSensitivity,
    maxYMovementSensitivity,
    minZMovementSensitivity,
    maxZMovementSensitivity,
    baseItemScale,
    movementScrollCap
  } = scrapbookMoveCtrl;

  // HUD Springs - defined at the top level
  const [{ opacity: hudOpacitySpring }] = useSpring(() => ({
    opacity: animControls.opacityFullTransparent, 
    from: { opacity: 1 },
    config: { duration: 300 } // Optional: Add a subtle config if desired
  }), [animControls.opacityFullTransparent]);

  const [{ scale: hudScaleSpring }] = useSpring(() => ({
    scale: 1 + animControls.scaleInitialRate * (scrollY / (animControls.opacityFullTransparent || 1)),
    from: { scale: 1 },
    config: { duration: 300 } // Optional: Add a subtle config if desired
  }), [animControls.scaleInitialRate, animControls.opacityFullTransparent, scrollY]);

  // Helper function to parse rotation from transform string
  const parseRotationFromStyle = (transformString?: string | number): number => {
    if (typeof transformString === 'number') return transformString;
    if (!transformString) return 0;
    const rotateMatch = transformString.match(/rotate\(([-\d.]+)deg\)/);
    return rotateMatch && rotateMatch[1] ? parseFloat(rotateMatch[1]) : 0;
  };

  // Leva controls for HUD and Guide Lines visibility
  const { showHUD, toggleGuideLines } = useLevaControls('Overall Controls', {
    showHUD: { value: true, label: 'Show Debug HUD' },
    toggleGuideLines: { value: true, label: 'Toggle Guide Lines' }
  }, { collapsed: true });

  // useEffect to update App.js state when Leva control for guide lines changes
  useEffect(() => {
    if (setShowGuideLines) { // Directly use the prop passed from App.js
      setShowGuideLines(toggleGuideLines); // toggleGuideLines is the boolean value from Leva
    }
  }, [toggleGuideLines, setShowGuideLines]);

  // Log received scrapbook images
  useEffect(() => {
    console.log('[WeddingJourney.tsx] Received resolvedScrapbookImages prop:', JSON.stringify(resolvedScrapbookImages));
  }, [resolvedScrapbookImages]);

  const gradientColorRGBs = useMemo(() => {
    const currentHexColors = [
      { bottom: colorStop1_Bottom, top: colorStop1_Top },
      { bottom: colorStop2_Bottom, top: colorStop2_Top },
      { bottom: colorStop3_Bottom, top: colorStop3_Top },
      { bottom: colorStop4_Bottom, top: colorStop4_Top },
      { bottom: colorStop5_Bottom, top: colorStop5_Top },
    ];
    return currentHexColors.map(colors => ({
      bottom: hexToRgb(colors.bottom),
      top: hexToRgb(colors.top)
    })).filter(colors => colors.bottom && colors.top) as { bottom: number[]; top: number[] }[]; // Ensure structure and filter out nulls
  }, [
    colorStop1_Bottom, colorStop1_Top,
    colorStop2_Bottom, colorStop2_Top,
    colorStop3_Bottom, colorStop3_Top,
    colorStop4_Bottom, colorStop4_Top,
    colorStop5_Bottom, colorStop5_Top
  ]);

  // --- Animation Calculations (using values from Leva controls) ---
  const FADE_OUT_SCROLL_RANGE_PIXELS = opacityFullTransparent; 
  const overallScrollProgress = FADE_OUT_SCROLL_RANGE_PIXELS > 0 ? Math.min(1, Math.max(0, scrollY / FADE_OUT_SCROLL_RANGE_PIXELS)) : 0;

  // Opacity Calculation (three-stage)
  let calculatedBackgroundOpacity = 1.0;
  if (scrollY <= 0) {
    calculatedBackgroundOpacity = 1.0;
  } else if (opacityGentleEnd > 0 && scrollY <= opacityGentleEnd) { 
    const progress = scrollY / opacityGentleEnd;
    calculatedBackgroundOpacity = 1.0 - progress * (1.0 - opacityTargetAtGentleEnd);
  } else if (scrollY > opacityGentleEnd && scrollY <= opacityDrasticStartPixels) { 
    const durationOfMediumFade = opacityDrasticStartPixels - opacityGentleEnd;
    if (durationOfMediumFade > 0) {
      const progressInMediumFade = (scrollY - opacityGentleEnd) / durationOfMediumFade;
      calculatedBackgroundOpacity = opacityTargetAtGentleEnd - progressInMediumFade * (opacityTargetAtGentleEnd - opacityTargetAtDrasticStart);
    } else {
      calculatedBackgroundOpacity = (scrollY > opacityGentleEnd) ? opacityTargetAtDrasticStart : opacityTargetAtGentleEnd;
    }
  } else if (scrollY > opacityDrasticStartPixels && scrollY <= opacityFullTransparent) { 
    const durationOfDrasticFade = opacityFullTransparent - opacityDrasticStartPixels;
    if (durationOfDrasticFade > 0) {
      const progressInDrasticFade = (scrollY - opacityDrasticStartPixels) / durationOfDrasticFade;
      calculatedBackgroundOpacity = opacityTargetAtDrasticStart - progressInDrasticFade * opacityTargetAtDrasticStart;
    } else {
      calculatedBackgroundOpacity = (scrollY > opacityDrasticStartPixels) ? 0.0 : opacityTargetAtDrasticStart;
    }
  } else if (scrollY > opacityFullTransparent) { 
    calculatedBackgroundOpacity = 0.0;
  }
  const backgroundOpacity = Math.min(1, Math.max(0, calculatedBackgroundOpacity));

  // Scale Calculation (two-stage rate)
  let scaleIncrease = 0;
  const scaleThresholdProgress = FADE_OUT_SCROLL_RANGE_PIXELS > 0 ? Math.min(1, Math.max(0, scaleDrasticStartPx / FADE_OUT_SCROLL_RANGE_PIXELS)) : 0;

  if (scaleDrasticStartPx <= 0 || overallScrollProgress <= scaleThresholdProgress || scaleDrasticStartPx >= FADE_OUT_SCROLL_RANGE_PIXELS) {
    // Only initial rate applies if threshold is at start, or we are before threshold, or threshold is at/after end
    scaleIncrease = scaleInitialRate * overallScrollProgress;
  } else { // overallScrollProgress > scaleThresholdProgress and threshold is within range
    const scaleAtThresholdPoint = scaleInitialRate * scaleThresholdProgress;
    const progressAfterThreshold = overallScrollProgress - scaleThresholdProgress;
    // Ensure the denominator for the rate of drastic scale is not zero
    const remainingProgressRangeForDrasticScale = 1 - scaleThresholdProgress;
    if (remainingProgressRangeForDrasticScale > 0) {
         scaleIncrease = scaleAtThresholdPoint + scaleDrasticRate * progressAfterThreshold;
    } else {
        scaleIncrease = scaleAtThresholdPoint; // Should not happen if threshold is correctly within range and not at 100%
    }
  }
  const currentScale = 1 + scaleIncrease; 

  // TranslateY Calculation (remains the same)
  let currentTranslateY = 0;
  if (scrollY > animControls.translateYThreshold) {
    const effectiveScrollRangeForTranslate = FADE_OUT_SCROLL_RANGE_PIXELS - animControls.translateYThreshold;
    if (effectiveScrollRangeForTranslate > 0) {
      const scrollYAfterThreshold = scrollY - animControls.translateYThreshold;
      const translateYProgress = Math.min(1, Math.max(0, scrollYAfterThreshold / effectiveScrollRangeForTranslate));
      currentTranslateY = animControls.translateYMultiplier * translateYProgress;
    } else {
      currentTranslateY = (scrollY > animControls.translateYThreshold) ? animControls.translateYMultiplier : 0;
    }
  } else {
    currentTranslateY = 0;
  }
  
  // NEW: Clip-Path Calculation for circular effect
  let calculatedClipPathValue = 'circle(70.7107% at 50% 50%)'; // Default: circle covering the farthest corners (effectively no clip for rect content)
  const localRoundingStart = borderRadiusStartScrollY;
  const localRoundingEnd = clipPathVanishScrollY; // Use new control for vanish point

  if (currentWindow && localRoundingEnd > localRoundingStart && scrollY > localRoundingStart) {
    const linearProgress = Math.min(1, Math.max(0, (scrollY - localRoundingStart) / (localRoundingEnd - localRoundingStart)));
    const easedProgress = Math.pow(linearProgress, 0.5);
    const w = currentWindow.innerWidth;
    const h = currentWindow.innerHeight;

    // Radius of circle circumscribing the rectangle (touches farthest corners)
    const R_start_px = Math.sqrt(Math.pow(w / 2, 2) + Math.pow(h / 2, 2));
    // R_end_px is effectively 0 for the shrinking animation to vanish

    // Animate radius from R_start_px down to 0
    const current_R_px = R_start_px * (1 - easedProgress);

    // For circle(), percentage radius is relative to sqrt(width^2 + height^2) / sqrt(2)
    const referenceLengthForCirclePercentage = Math.sqrt(Math.pow(w, 2) + Math.pow(h, 2)) / Math.sqrt(2);
    let current_R_percentage = 70.7107;
    if (referenceLengthForCirclePercentage > 0) {
        current_R_percentage = (current_R_px / referenceLengthForCirclePercentage) * 100;
    }
    calculatedClipPathValue = `circle(${current_R_percentage.toFixed(2)}% at 50% 50%)`;
  } else if (currentWindow && scrollY >= localRoundingEnd && localRoundingEnd > localRoundingStart) {
    // Animation is complete, ensure it's a zero-radius circle (vanished)
    calculatedClipPathValue = 'circle(0% at 50% 50%)';
  } else if (scrollY <= localRoundingStart) {
    calculatedClipPathValue = 'circle(70.7107% at 50% 50%)'; 
  }
  
  const backgroundSpring = useSpring({
    opacity: backgroundOpacity,
    transform: `scale(${currentScale})`,
    clipPath: calculatedClipPathValue, 
    config: { tension: 80, friction: 26 },
  });
  
  // --- Scroll-driven gradient calculation ---
  const GRADIENT_SCROLL_RANGE_PIXELS = opacityFullTransparent; // Tied to Leva control
  const scrollGradientProgress = GRADIENT_SCROLL_RANGE_PIXELS > 0 ? Math.min(1, Math.max(0, scrollY / GRADIENT_SCROLL_RANGE_PIXELS)) : 0;

  let currentGradientString = 'linear-gradient(to top, #111111, #000000)'; // Fallback
  const numPoints = gradientColorRGBs.length;

  if (numPoints >= 2 && gradientColorRGBs.every(c => c && c.bottom && c.top)) {
    const val = scrollGradientProgress;
    const scaledVal = val * (numPoints - 1); // val is 0-1, scaledVal is 0 to (numPoints-1)
    let segmentIdx = Math.floor(scaledVal);
    let segmentProgress = scaledVal - segmentIdx;

    // Clamp segmentIdx to ensure fromColors and toColors are valid
    if (segmentIdx >= numPoints - 1) {
      segmentIdx = numPoints - 2;
      segmentProgress = 1.0;
    }

    const fromColors = gradientColorRGBs[segmentIdx];
    const toColors = gradientColorRGBs[segmentIdx + 1];

    if (fromColors && toColors) { // Should always be true due to clamping and array structure
        const lerp = (start: number, end: number, t_lerp: number) => start + (end - start) * t_lerp;

        const currentBottomRGB = fromColors.bottom.map((startChannel, i) => lerp(startChannel, toColors.bottom[i], segmentProgress));
        const currentTopRGB = fromColors.top.map((startChannel, i) => lerp(startChannel, toColors.top[i], segmentProgress));

        const bottomCss = rgbToCss(currentBottomRGB[0], currentBottomRGB[1], currentBottomRGB[2]);
        const topCss = rgbToCss(currentTopRGB[0], currentTopRGB[1], currentTopRGB[2]);
        currentGradientString = `linear-gradient(to top, ${bottomCss}, ${topCss})`;
    } else {
      // This case should ideally not be reached if gradientColorRGBs is structured correctly.
      console.error("Error calculating gradient: Invalid color segments.");
    }
  } else {
    console.error("Error calculating gradient: gradientColorRGBs is not properly initialized.");
  }
  // --- End of scroll-driven gradient calculation ---

    const totalPages = 3;
    const backgroundStickyStart = 0;
    const backgroundStickyEnd = 1; // Layer remains sticky for 1 page height

    const coupleImageOffset = 0.3;
    const coupleImageSpeed = 0.4;

    const textStartOffset = 0.6;
    const textSpeed = 0.5;

    const rsvpFormOffset = 2;
    const rsvpFormSpeed = 0.1;

    const centerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
    };

    // Merge all changedKeys for the HUD
    const allChangedKeys = useMemo(() => 
        new Set([...Array.from(animChangedKeys), ...Array.from(bgChangedKeys), ...Array.from(scrapbookChangedKeys), ...Array.from(scrapbookMoveChangedKeys)])
    , [animChangedKeys, bgChangedKeys, scrapbookChangedKeys, scrapbookMoveChangedKeys]);

    // NEW: Generate the detailed string for changed values for the HUD
    const changedKeyDetailsOutput = useMemo(() => {
        if (allChangedKeys.size === 0) {
        return ""; // Return empty if no keys changed
        }
        let details = "Change useControl Defaults To:\n";
        for (const key of Array.from(allChangedKeys)) {
        let value: any = undefined;
        // Check each controls object for the key
        if (animControls.hasOwnProperty(key)) {
            value = animControls[key as keyof typeof animControls];
        } else if (bgControls.hasOwnProperty(key)) {
            value = bgControls[key as keyof typeof bgControls];
        } else if (scrapbookCtrl.hasOwnProperty(key)) {
            value = scrapbookCtrl[key as keyof typeof scrapbookCtrl];
        } else if (scrapbookMoveCtrl.hasOwnProperty(key)) { // Check new controls
            value = scrapbookMoveCtrl[key as keyof typeof scrapbookMoveCtrl];
        }

        let formattedValue = String(value);
        if (typeof value === 'number') {
            formattedValue = Number(value.toFixed(3)).toString(); // Format numbers nicely
        } else if (typeof value === 'string' && value.startsWith('#')) {
            // Hex color string, keep as is
            formattedValue = value;
        } 
        // Add other specific formatting if needed, otherwise String(value) is used

        details += `${key}: ${formattedValue}\n`;
        }
        return details;
    }, [allChangedKeys, animControls, bgControls, scrapbookCtrl, scrapbookMoveCtrl]); // Added scrapbookMoveCtrl

    // Memoize the scrapbook image styles
    const memoizedScrapbookImageStyles = useMemo(() => {
        if (!resolvedScrapbookImages || resolvedScrapbookImages.length === 0) return [];
        const layoutControls = {
        angleMin: scrapbookCtrl.angleMin,
        angleMax: scrapbookCtrl.angleMax,
        radiusFactor: scrapbookCtrl.radiusFactor,
        sizeMinPx: scrapbookCtrl.sizeMinPx,
        sizeRangePx: scrapbookCtrl.sizeRangePx,
        };
        // Ensure refs array is ready
        // This will be handled by displayedImagesAndTheirData logic now
        // if (scrapbookImageRefs.current.length !== resolvedScrapbookImages.length) {
        //     scrapbookImageRefs.current = Array(resolvedScrapbookImages.length).fill(null);
        // }
        return resolvedScrapbookImages.map((_, index) => 
        generateScrapbookImageStyle(index, resolvedScrapbookImages.length, currentWindow, layoutControls)
        );
    }, [resolvedScrapbookImages, currentWindow, scrapbookCtrl.angleMin, scrapbookCtrl.angleMax, scrapbookCtrl.radiusFactor, scrapbookCtrl.sizeMinPx, scrapbookCtrl.sizeRangePx]);

    // NEW: Memoize scroll sensitivities for each image
    const memoizedScrollSensitivities = useMemo(() => {
        if (!resolvedScrapbookImages || resolvedScrapbookImages.length === 0) return [];
        // Ensure scrapbookCtrl is initialized before accessing its properties
        const minSens = scrapbookCtrl.scrollAngleSensitivityMin || 0.0001;
        const maxSens = scrapbookCtrl.scrollAngleSensitivityMax || 0.002;
        return resolvedScrapbookImages.map(() => 
        Math.random() * (maxSens - minSens) + minSens
        );
    }, [resolvedScrapbookImages, scrapbookCtrl.scrollAngleSensitivityMin, scrapbookCtrl.scrollAngleSensitivityMax]);

    // NEW: This will be our primary source for rendering scrapbook items
    const displayedImagesAndTheirData = useMemo(() => {
      if (!resolvedScrapbookImages || resolvedScrapbookImages.length === 0 || !currentWindow || imageNaturalDimensions.length === 0) {
        // Ensure imageNaturalDimensions is also populated before proceeding
        // or that resolvedScrapbookImages aligns with imageNaturalDimensions if it's partially loaded.
        // For safety, check if imageNaturalDimensions has entries for all resolvedScrapbookImages
        const allDimsLoaded = resolvedScrapbookImages.every(src => imageNaturalDimensions.some(dim => dim.src === src && dim.width > 0 && dim.height > 0));
        if (!allDimsLoaded && resolvedScrapbookImages.length > 0) {
            // console.warn("WJ: displayedImagesAndTheirData - Not all natural dimensions loaded yet or mismatch. Waiting.");
            return []; 
        }
        if (resolvedScrapbookImages.length === 0) return [];
      }
    
      const numImagesToDisplay = Math.min(scrapbookCtrl.maxImages, resolvedScrapbookImages.length);
      let imagesToProcess: Array<{ src: string; originalIndex: number }> = [];
    
      if (resolvedScrapbookImages.length <= numImagesToDisplay) {
        imagesToProcess = resolvedScrapbookImages.map((src, index) => ({ src, originalIndex: index }));
      } else {
        // Shuffle resolvedScrapbookImages along with their original indices
        const indexedImages = resolvedScrapbookImages.map((src, index) => ({ src, originalIndex: index }));
        const shuffled = [...indexedImages].sort(() => 0.5 - Math.random());
        imagesToProcess = shuffled.slice(0, numImagesToDisplay);
      }
      
      const layoutStyleControls = {
        angleMin: scrapbookCtrl.angleMin,
        angleMax: scrapbookCtrl.angleMax,
        radiusFactor: scrapbookCtrl.radiusFactor,
        sizeMinPx: scrapbookCtrl.sizeMinPx,
        sizeRangePx: scrapbookCtrl.sizeRangePx,
      };
    
      return imagesToProcess.map((imageInfo, displayIndex) => {
        const { src, originalIndex } = imageInfo;
        
        // Generate style using displayIndex and the current number of images being processed for layout
        const style = generateScrapbookImageStyle(displayIndex, imagesToProcess.length, currentWindow, layoutStyleControls);
        
        // Sensitivities are randomized per item instance in the displayed set
        const scrollSensitivity = (Math.random() * (scrapbookCtrl.scrollAngleSensitivityMax - scrapbookCtrl.scrollAngleSensitivityMin) + scrapbookCtrl.scrollAngleSensitivityMin);
        const xMovementSensitivity = (Math.random() * (scrapbookMoveCtrl.maxXMovementSensitivity - scrapbookMoveCtrl.minXMovementSensitivity) + scrapbookMoveCtrl.minXMovementSensitivity);
        const yMovementSensitivity = (Math.random() * (scrapbookMoveCtrl.maxYMovementSensitivity - scrapbookMoveCtrl.minYMovementSensitivity) + scrapbookMoveCtrl.minYMovementSensitivity);
        const zMovementSensitivity = (Math.random() * (scrapbookMoveCtrl.maxZMovementSensitivity - scrapbookMoveCtrl.minZMovementSensitivity) + scrapbookMoveCtrl.minZMovementSensitivity);
    
        return {
          src,
          originalIndex, 
          displayIndex,  
          altText: \`Scrapbook item \${displayIndex + 1}\`,
          initialStyle: style,
          scrollSensitivity,
          xMovementSensitivity,
          yMovementSensitivity,
          zMovementSensitivity,
          // Natural dimensions will be looked up via src when needed for focus
        };
      });
    }, [
      resolvedScrapbookImages, 
      imageNaturalDimensions, // Added: ensure this is a dependency
      currentWindow,
      scrapbookCtrl.maxImages, 
      scrapbookCtrl.angleMin, scrapbookCtrl.angleMax, scrapbookCtrl.radiusFactor, scrapbookCtrl.sizeMinPx, scrapbookCtrl.sizeRangePx,
      scrapbookCtrl.scrollAngleSensitivityMin, scrapbookCtrl.scrollAngleSensitivityMax,
      scrapbookMoveCtrl.minXMovementSensitivity, scrapbookMoveCtrl.maxXMovementSensitivity, 
      scrapbookMoveCtrl.minYMovementSensitivity, scrapbookMoveCtrl.maxYMovementSensitivity,
      scrapbookMoveCtrl.minZMovementSensitivity, scrapbookMoveCtrl.maxZMovementSensitivity,
      // scrapbookMoveCtrl.baseItemScale, // This is global in ScrapbookImageItem
      // scrapbookMoveCtrl.movementScrollCap // This is global in ScrapbookImageItem
    ]);

    // Update scrapbookImageRefs based on the length of displayed images
    useEffect(() => {
      scrapbookImageRefs.current = Array(displayedImagesAndTheirData.length).fill(null);
    }, [displayedImagesAndTheirData.length]);

    // Animation spring for the focused image backdrop
    const backdropSpring = useSpring({
        opacity: focusedImage ? 1 : 0,
        pointerEvents: focusedImage ? 'auto' : 'none' as 'auto' | 'none',
        config: { tension: 250, friction: 30 },
    });

    // Animation spring for the focused image container
    const [focusedImageContainerSpring, focusedImageApi] = useSpring(() => ({
        opacity: 0,
        top: '50%', 
        left: '50%',
        width: '0px',
        height: '0px',
        transform: 'translate(-50%, -50%) rotate(0deg) scale(0.5)',
        config: { tension: 220, friction: 22 }, 
    }));

    // Animation spring for the info box content
    const infoBoxSpring = useSpring({
        opacity: focusedImage ? 1 : 0,
        transform: focusedImage ? 'translateY(0px)' : 'translateY(20px)',
        config: { tension: 250, friction: 26, delay: focusedImage ? 300 : 0 }, // Delay appearance
    });

    // NEW HELPER FUNCTION: Calculate target dimensions for focused image
    const calculateFocusTargetDimensions = (
        naturalW: number,
        naturalH: number,
        viewportW: number,
        viewportH: number
    ): { targetWidth: number; targetHeight: number } => {
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

    // USER PROVIDED HELPER FUNCTION: Calculate centered position with optional offset
    function getCenteredPosition(targetWidth: number, targetHeight: number, offsetYvh: number = 0) {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1920; // Fallback for vw
        const vh = typeof window !== 'undefined' ? window.innerHeight : 1080; // Fallback for vh
        
        const leftPx = (vw - targetWidth) / 2;
        const topPx = (vh - targetHeight) / 2 - (vh * offsetYvh / 100);
    
        return { top: topPx, left: leftPx };
    }

    // Moved onClick logic to a dedicated handler
    const handleImageClick = (details: ScrapbookClickDetails) => {
      console.log("WJ: ScrapbookImageItem's onClick prop INVOKED. Click Details:", details);
      console.log("WJ: Current State before click logic: focusedImage:", focusedImage, "imageReturning:", imageReturningToScrapbook, "pendingFocus:", pendingImageToFocus);
      setLastPutDownIndex(null); // Clear last put down index on new pick up
      
      const {
        imageSrc: clickedSrc,
        altText: clickedAlt,
        initialStyle: clickedInitialStyle, // This 'initialStyle' is the base style from memoizedScrapbookImageStyles
        currentBoundingClientRect: rect,
        imageElement,
        index: clickedDisplayIndex // This is now displayIndex from ScrapbookImageItem
      } = details;

      let naturalDims = imageNaturalDimensions.find(dim => dim.src === clickedSrc);
      if (!naturalDims || naturalDims.width === 0 || naturalDims.height === 0) {
        console.warn(`Natural dimensions for ${clickedSrc} not found or are zero. Using imageElement.naturalWidth/Height as fallback.`, naturalDims, imageElement?.naturalWidth, imageElement?.naturalHeight);
        naturalDims = { width: imageElement?.naturalWidth || 0, height: imageElement?.naturalHeight || 0, src: clickedSrc };
      }

      if (!naturalDims.width || !naturalDims.height) {
        console.error("CANNOT SET FOCUSED IMAGE: Natural dimensions are zero or missing after fallback.", { src: clickedSrc, naturalDims });
        return;
      }

      const baseRotateOnClick = parseRotationFromStyle(clickedInitialStyle.transform);
      // Get the correct scroll sensitivity for the clicked image using its displayIndex from displayedImagesAndTheirData
      const clickedImageData = displayedImagesAndTheirData.find(d => d.displayIndex === clickedDisplayIndex);
      const itemScrollSensitivityOnClick = clickedImageData ? clickedImageData.scrollSensitivity : ((scrapbookCtrl.scrollAngleSensitivityMin + scrapbookCtrl.scrollAngleSensitivityMax) / 2);
      
      // This is the DYNAMIC part of the angle, matching what's visually rendered
      // The 'clickedDisplayIndex * 0.5' part is an arbitrary phase offset, ensure it matches rendering if it matters
      const currentDynamicAngleForPickUp = Math.sin(scrollY * itemScrollSensitivityOnClick + clickedDisplayIndex * 0.5) * 45;
      const fullInitialRotateOnClick = baseRotateOnClick + currentDynamicAngleForPickUp;

      // Logging for pick-up:
      console.log(\`WJ: PICK UP IMAGE - Display Index: \${clickedDisplayIndex} ('\${clickedSrc}')\`, {
          topPx: rect.top,
          leftPx: rect.left,
          widthPx: rect.width,
          heightPx: rect.height,
          calculatedInitialRotateDeg: fullInitialRotateOnClick,
          baseRotateDeg: baseRotateOnClick,
          dynamicAngleDeg: currentDynamicAngleForPickUp,
          rawInitialStyleTransform: clickedInitialStyle.transform
      });
      
      const description = \`Image \${clickedDisplayIndex + 1} description.\`; // Placeholder
      const photographer = \`Photographer \${clickedDisplayIndex + 1}.\`; // Placeholder

      const clickedImageDetails: FocusedImageState = {
        src: clickedSrc,
        altText: clickedAlt,
        initialTopPx: rect.top,
        initialLeftPx: rect.left,
        initialWidthPx: rect.width,
        initialHeightPx: rect.height,
        initialRotateDeg: fullInitialRotateOnClick, // Use the full current rotation
        naturalWidth: naturalDims.width,
        naturalHeight: naturalDims.height,
        currentIndex: clickedDisplayIndex, // Store displayIndex as currentIndex
        description: description,
        photographer: photographer
      };

      console.log("WJ: Attempting to set focused image with:", clickedImageDetails);

      if (focusedImage) { // If an image is already focused, put it down first
        setImageReturningToScrapbook(focusedImage);
        setPendingImageToFocus(clickedImageDetails);
        setFocusedImage(null);
      } else { // No image focused, just pick this one up
        setFocusedImage(clickedImageDetails);
      }
    };

    useEffect(() => {
      let returnTimeoutId: NodeJS.Timeout | null = null;

      if (focusedImage) {
        // === ANIMATE TO CENTER (PICK UP) ===
        const { targetWidth, targetHeight } = calculateFocusTargetDimensions(
          focusedImage.naturalWidth,
          focusedImage.naturalHeight,
          typeof window !== 'undefined' ? window.innerWidth : 1920,
          typeof window !== 'undefined' ? window.innerHeight : 1080
        );
        const { top: calculatedTargetTopPx, left: calculatedTargetLeftPx } = getCenteredPosition(targetWidth, targetHeight, 0);
        
        // focusedImage.initial* properties are used here for the "from" state
        focusedImageApi.start({
          from: { 
            opacity: 0.5, 
            top: \`\${focusedImage.initialTopPx}px\`,
            left: \`\${focusedImage.initialLeftPx}px\`,
            width: \`\${focusedImage.initialWidthPx}px\`,
            height: \`\${focusedImage.initialHeightPx}px\`,
            transform: \`translate(0px, 0px) rotate(\${focusedImage.initialRotateDeg}deg) scale(1)\`,
          },
          to: { 
            opacity: 1,
            top: \`\${calculatedTargetTopPx}px\`,
            left: \`\${calculatedTargetLeftPx}px\`,
            width: \`\${targetWidth}px\`,
            height: \`\${targetHeight}px\`,
            transform: 'translate(0px, 0px) rotate(0deg) scale(1)',
          },
          config: springConfigs.gentle, // Explicitly set gentle config for pick-up
          onRest: () => {
            // Potentially clear pending states
          }
        });
      } else if (imageReturningToScrapbook) {
        // === ANIMATE BACK TO SCRAPBOOK (PUT DOWN) ===
        const { currentIndex: returningDisplayIndex, initialWidthPx, initialHeightPx, src: returningSrc } = imageReturningToScrapbook;
        const targetScrapbookElement = scrapbookImageRefs.current[returningDisplayIndex];
        // Get the current style info from displayedImagesAndTheirData for the returning item
        const currentItemDataForReturn = displayedImagesAndTheirData.find(d => d.displayIndex === returningDisplayIndex);

        if (targetScrapbookElement && currentItemDataForReturn) {
          const currentRect = targetScrapbookElement.getBoundingClientRect(); // Current position of the slot
          const scrapbookLayoutInfoForReturn = currentItemDataForReturn.initialStyle; // Base style of the slot from displayed data

          const baseRotationPutDown = parseRotationFromStyle(scrapbookLayoutInfoForReturn.transform);
          const itemScrollSensitivityPutDown = currentItemDataForReturn.scrollSensitivity;
          const currentDynamicAngleForPutDown = Math.sin(scrollY * itemScrollSensitivityPutDown + returningDisplayIndex * 0.5) * 45;
          const totalCurrentRotationForPutDown = baseRotationPutDown + currentDynamicAngleForPutDown;

          console.log(\`WJ: PUT DOWN IMAGE - Display Index: \${returningDisplayIndex} ('\${returningSrc}') - Target State for flying image:\`, {
              targetTopPx: currentRect.top, targetLeftPx: currentRect.left,
              targetWidthPx: initialWidthPx, targetHeightPx: initialHeightPx,
              targetRotateDeg: totalCurrentRotationForPutDown
          });

          // Animate position, size, rotation of the "flying" image
          focusedImageApi.start({
            to: {
              top: \`\${currentRect.top}px\`,
              left: \`\${currentRect.left}px\`,
              width: \`\${initialWidthPx}px\`,
              height: \`\${initialHeightPx}px\`,
              transform: \`translate(0px, 0px) rotate(\${totalCurrentRotationForPutDown}deg) scale(1)\`,
            },
            config: springConfigs.gentle, // Slower travel animation for put-down
          });

          // Animate opacity of the "flying" image separately and faster
          focusedImageApi.start({
            to: { opacity: 0 },
            config: { tension: 300, friction: 20 }, // Faster config for opacity fade out
            // No onRest here for setting imageReturningToScrapbook to null
          });
          
          // Schedule the scrapbook item in the grid to reappear very quickly
          const REAPPEAR_DELAY_MS = 50; // ms
          console.log(\`WJ: Scheduling scrapbook item \${returningDisplayIndex} (in grid) to reappear in \${REAPPEAR_DELAY_MS}ms.\`);
          
          returnTimeoutId = setTimeout(() => {
            const currentReturningImageFromRef = imageReturningToScrapbookRef.current;
            console.log(\`WJ: Timeout fired for item \${currentReturningImageFromRef?.currentIndex}. Making it reappear in grid.\`);
            
            setImageReturningToScrapbook(null); // This triggers reappearance

            if (currentReturningImageFromRef) {
              setLastPutDownIndex(currentReturningImageFromRef.currentIndex);
            }

            const currentPendingImageFromRef = pendingImageToFocusRef.current;
            if (currentPendingImageFromRef) {
              setFocusedImage(currentPendingImageFromRef);
              setPendingImageToFocus(null);
              // Note: lastPutDownIndex remains from the item that just landed.
              // If this newly focused item is later put down, it will become the new lastPutDownIndex.
              // If another item is *picked up from scratch*, handleImageClick clears lastPutDownIndex.
            }
          }, REAPPEAR_DELAY_MS);

        } else {
          console.warn(\`WJ: PUT DOWN - Target for scrapbook item index \${returningDisplayIndex} ('\${returningSrc}') not found. Hiding focused image and clearing state immediately.\`);
          focusedImageApi.start({ opacity: 0, immediate: true });
          setImageReturningToScrapbook(null);
          if (pendingImageToFocus) {
            setFocusedImage(pendingImageToFocus);
            setPendingImageToFocus(null);
          }
        }
      } else {
        // === NO IMAGE FOCUSED OR RETURNING, HIDE CONTAINER ===
        focusedImageApi.start({ opacity: 0, immediate: true });
      }

      // Cleanup function for the timeout
      return () => {
        if (returnTimeoutId) {
          console.log("WJ: Clearing returnTimeoutId in useEffect cleanup.");
          clearTimeout(returnTimeoutId);
        }
      };
    }, [
      focusedImage, 
      imageReturningToScrapbook, 
      pendingImageToFocus, 
      focusedImageApi,
      currentWindow, // Added: affects target dimensions/positions if window resizes
      displayedImagesAndTheirData, // Added: provides target style and sensitivities
      scrollY, // Added: for dynamic angle recalculation
      scrapbookCtrl.scrollAngleSensitivityMin, // Kept for fallback if data not found (shouldn't happen)
      scrapbookCtrl.scrollAngleSensitivityMax  // Kept for fallback
    ]);

    // NEW: Handler for closing the focused image
    const handleCloseFocusedImage = () => {
        if (focusedImage) {
        setImageReturningToScrapbook(focusedImage);
        setFocusedImage(null);
        setPendingImageToFocus(null); // Ensure no pending focus on manual close
        } else if (imageReturningToScrapbook) {
        // If clicked during a return, just ensure everything clears out
        setImageReturningToScrapbook(null); 
        setFocusedImage(null);
        setPendingImageToFocus(null);
        }
    };

    // NEW: Navigation Handlers
    const updateAndFocusNewImage = (newDisplayIndex: number) => {
      if (!displayedImagesAndTheirData || displayedImagesAndTheirData.length === 0 || newDisplayIndex < 0 || newDisplayIndex >= displayedImagesAndTheirData.length) {
        console.warn("Cannot update focused image: invalid newDisplayIndex or no displayed images.", newDisplayIndex, displayedImagesAndTheirData.length);
        return null;
      }
      setLastPutDownIndex(null); // Clear last put down index on navigation pick up

      const targetImageData = displayedImagesAndTheirData[newDisplayIndex];
      const targetImageElement = scrapbookImageRefs.current[newDisplayIndex]; // Use newDisplayIndex for refs
      const newImageSrc = targetImageData.src;
      const naturalDims = imageNaturalDimensions.find(dim => dim.src === newImageSrc);
      const styleForNewImage = targetImageData.initialStyle; // Get base style from displayed data

      if (targetImageElement && newImageSrc && naturalDims && naturalDims.width > 0 && naturalDims.height > 0 && styleForNewImage) {
        const rect = targetImageElement.getBoundingClientRect();
        
        const baseRotateNav = parseRotationFromStyle(styleForNewImage.transform);
        const itemScrollSensitivityNav = targetImageData.scrollSensitivity;
        // Recalculate dynamic part for the "from" state, consistent with rendering
        const currentDynamicAngleForNavPickUp = Math.sin(scrollY * itemScrollSensitivityNav + newDisplayIndex * 0.5) * 45;
        const fullInitialRotateNav = baseRotateNav + currentDynamicAngleForNavPickUp;
        
        const newDescription = \`Image \${newDisplayIndex + 1} description.\`; // Placeholder
        const newPhotographer = \`Photographer \${newDisplayIndex + 1}.\`; // Placeholder

        // Logging for pick-up during navigation:
        console.log(\`WJ: NAV PICK UP IMAGE - Display Index: \${newDisplayIndex} ('\${newImageSrc}')\`, {
            topPx: rect.top,
            leftPx: rect.left,
            widthPx: rect.width,
            heightPx: rect.height,
            calculatedInitialRotateDeg: fullInitialRotateNav,
            baseRotateDeg: baseRotateNav,
            dynamicAngleDeg: currentDynamicAngleForNavPickUp,
            rawInitialStyleTransform: styleForNewImage.transform
        });

        return {
          src: newImageSrc,
          altText: \`Scrapbook item \${newDisplayIndex + 1}\`,
          initialTopPx: rect.top,
          initialLeftPx: rect.left,
          initialWidthPx: rect.width,
          initialHeightPx: rect.height,
          initialRotateDeg: fullInitialRotateNav, // Use the full current rotation
          naturalWidth: naturalDims.width,
          naturalHeight: naturalDims.height,
          currentIndex: newDisplayIndex, // Store displayIndex
          description: newDescription, 
          photographer: newPhotographer 
        };
      } else {
        console.warn(\`Could not get details for new focused image at index \${newDisplayIndex}. Missing element, src, dimensions, or style.\`, {targetImageElement, newImageSrc, naturalDims, styleForNewImage});
        return null;
      }
    };

    const handlePreviousImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!focusedImage) return; // Can only navigate if an image is currently fully focused

      const newIndex = (focusedImage.currentIndex - 1 + displayedImagesAndTheirData.length) % displayedImagesAndTheirData.length;
      const newImageDetails = updateAndFocusNewImage(newIndex);

      if (newImageDetails) {
        setImageReturningToScrapbook(focusedImage); 
        setPendingImageToFocus(newImageDetails);
        setFocusedImage(null); // This will trigger the return animation first
      }
    };

    const handleNextImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!focusedImage) return; // Can only navigate if an image is currently fully focused

      const newIndex = (focusedImage.currentIndex + 1) % displayedImagesAndTheirData.length;
      const newImageDetails = updateAndFocusNewImage(newIndex);

      if (newImageDetails) {
        setImageReturningToScrapbook(focusedImage);
        setPendingImageToFocus(newImageDetails);
        setFocusedImage(null); // This will trigger the return animation first
      }
    };

    return (
        <>
        <Leva collapsed theme={levaTheme} />
        <animated.div
            className="wedding-journey-wrapper"
            style={{ 
            width: '100%', 
            height: '100vh', 
            // overflow: 'hidden', // TEMPORARILY REMOVED FOR TESTING
            background: currentGradientString
            }}
        >
            {showHUD && ( // Conditional rendering for HUD
            <div 
                style={{
                position: 'fixed',
                top: '10px',
                left: '10px',
                padding: '5px 10px',
                background: 'rgba(255, 255, 255, 0.8)',
                color: 'black',
                zIndex: 200, 
                fontSize: '12px', 
                borderRadius: '4px',
                whiteSpace: 'pre-wrap' 
                }}
            >
                {/* Update HUD to reflect displayed images count and first item's sensitivity */}
                {\`ScrollY: \${scrollY.toFixed(0)}
    Displayed Images: \${displayedImagesAndTheirData.length} / \${resolvedScrapbookImages.length} (max: \${scrapbookCtrl.maxImages})
    DynamicAngle[0]: \${(displayedImagesAndTheirData.length > 0 ? Math.sin(scrollY * (displayedImagesAndTheirData[0].scrollSensitivity || 0.0005) + 0 * 0.5) * 45 : 0).toFixed(3)}
    Opacity (BG): \${hudOpacitySpring.get().toFixed(2)} 
    Scale (BG): \${hudScaleSpring.get().toFixed(2)} 
    TranslateY (Couple): \${currentTranslateY.toFixed(2)}%
${changedKeyDetailsOutput.trim()}\`}
            </div>
            )}

            {/* <ParallaxLogging currentScrollProgress={0} trackedAnimations={[]} /> // Placeholder if re-added */}
            <Parallax 
            ref={parallaxRef} 
            pages={totalPages} 
            style={{ top: '0', left: '0' }}
            >

            {/* Background Layer - Sticky with Pixel-Based Fade Out */}
            <ParallaxLayer
                sticky={{ start: backgroundStickyStart, end: backgroundStickyEnd }}
                style={{ zIndex: -1, overflow: 'hidden' }}
            >
                <ParallaxBackgroundImage 
                  introBackgroundUrl={introBackground}
                  scrollY={scrollY}
                  animControls={animControls} // Pass the correctly typed animControls object
                  currentWindow={currentWindow}
                  backgroundStickyStart={backgroundStickyStart}
                  backgroundStickyEnd={backgroundStickyEnd}
                />
            </ParallaxLayer>

            {/* Intro Couple Image Layer */}
            <ParallaxLayer
                offset={coupleImageOffset}
                speed={coupleImageSpeed}
                style={{ ...centerStyle, zIndex: 1 }}
            >
                <img src={introCouple} alt="Couple" className="introCoupleImage" />
            </ParallaxLayer>

            {/* Text Layers */}
            <ParallaxLayer
                offset={textStartOffset}
                speed={textSpeed}
                style={{ ...centerStyle, zIndex: 2 }}
            >
                <div className="textLayerContent">
                <h1>{brideName}</h1>
                <h1 className="ampersand">&</h1>
                <h1>{groomName}</h1>
                <p>{weddingDate}</p>
                </div>
            </ParallaxLayer>

            {/* RSVP Form Layer */}
            <ParallaxLayer
                offset={rsvpFormOffset}
                speed={rsvpFormSpeed}
                style={{ ...centerStyle, zIndex: 100 }}
            >
                {/* Scrapbook Images Container */}
                <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 1 // Lower zIndex for scrapbook images container
                }}>
                {/* Map over displayedImagesAndTheirData */}
                {displayedImagesAndTheirData.map((imageData, displayIndex) => {
                    const { 
                      src: imageSrc, 
                      altText, 
                      initialStyle, 
                      scrollSensitivity: itemScrollSensitivity,
                      xMovementSensitivity: itemXSensitivity,
                      yMovementSensitivity: itemYSensitivity,
                      zMovementSensitivity: itemZSensitivity
                    } = imageData;

                    if (!initialStyle) return null; 

                    console.log(\`[WeddingJourney.tsx] Rendering ScrapbookImageItem (Display Index \${displayIndex}), imageSrc: \${imageSrc}\`);
                    
                    // dynamicAngle uses displayIndex for its phase offset, consistent with old logic
                    const dynamicAngle = Math.sin(scrollY * itemScrollSensitivity + displayIndex * 0.5) * 45;
                    
                    const cappedScrollYForMovement = Math.min(scrollY, scrapbookMoveCtrl.movementScrollCap);

                    const parallaxTranslateX = cappedScrollYForMovement * itemXSensitivity;
                    const parallaxTranslateY = cappedScrollYForMovement * itemYSensitivity;

                    let parallaxScale = scrapbookMoveCtrl.baseItemScale + (cappedScrollYForMovement * itemZSensitivity);
                    parallaxScale = Math.max(0.1, parallaxScale);

                    let isEffectivelyHidden = false;
                    if (focusedImage && focusedImage.currentIndex === displayIndex) {
                    isEffectivelyHidden = true;
                    } else if (imageReturningToScrapbook && imageReturningToScrapbook.currentIndex === displayIndex) {
                    isEffectivelyHidden = true;
                    }
                    // We don't explicitly hide for pendingImageToFocus here,
                    // as the focusedImage or imageReturningToScrapbook should already cover that item.
                    // The focused image container will represent the pending image once it becomes focused.

                    return (
                    <ScrapbookImageItem
                        key={imageSrc || displayIndex} // Use imageSrc if unique and available, otherwise displayIndex
                        imageSrc={imageSrc}
                        initialStyle={initialStyle}
                        altText={altText}
                        dynamicAngleOffsetDeg={dynamicAngle}
                        index={displayIndex} // Pass displayIndex as 'index' to ScrapbookImageItem
                        isHiddenForFocus={isEffectivelyHidden}
                        lastPutDownIndex={lastPutDownIndex} // Pass new prop
                        ref={(el: HTMLImageElement | null) => { scrapbookImageRefs.current[displayIndex] = el; }} // Use displayIndex for refs
                        onClick={handleImageClick}
                        parallaxTranslateX={parallaxTranslateX} // Pass new prop
                        parallaxTranslateY={parallaxTranslateY} // Pass new prop
                        parallaxScale={parallaxScale}         // Pass new prop
                    />
                    );
                })}
                </div>
                
                {/* RSVP Form - ensure it's on top */}
                <div style={{ position: 'relative', zIndex: 10 }}> {/* Higher zIndex for RSVP form container */}
                <RSVPForm weddingData={weddingData} backendUrl={rsvpEndpoint} />
                </div>
            </ParallaxLayer>

            </Parallax>

            {/* Focused Image Modal */} 
            {/* Backdrop */} 
            <animated.div 
            style={{
                ...backdropSpring,
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0, 0, 0, 0.8)', 
                zIndex: 1000, 
            }}
            onClick={handleCloseFocusedImage} // Use new handler
            />

            {/* Animated Image Container - This moves and scales */} 
            {(focusedImage || imageReturningToScrapbook) && ( // Render if focused or returning
                <animated.div 
                style={{
                    ...focusedImageContainerSpring, // Applied here
                    position: 'fixed', 
                    willChange: 'transform, opacity, top, left, width, height', 
                    zIndex: 1001, 
                    // pointerEvents: 'none', // Temporarily allow pointer events for buttons
                }}
                >
                {/* Determine src/alt from focusedImage or lastFocusedImageDetails for smooth transition */}
                {/* This ensures image doesn't vanish instantly on close click */}
                {(focusedImage || imageReturningToScrapbook) && (
                    <div 
                        onClick={(e) => e.stopPropagation()} // Stop click from bubbling to backdrop
                        style={{ pointerEvents: 'auto', width: '100%', height: '100%', position: 'relative' }} // position relative for arrows
                    >
                    <img 
                        src={focusedImage?.src || imageReturningToScrapbook?.src || ''} // Display returning image if it exists
                        alt={focusedImage?.altText || imageReturningToScrapbook?.altText || 'Focused image'}
                        style={{
                        display: 'block',
                        width: '100%', // Fill the animated container
                        height: '100%', // Fill the animated container
                        objectFit: 'contain', // Maintain aspect ratio
                        boxShadow: '0px 10px 30px rgba(0,0,0,0.5)',
                        border: '10px solid white',
                        borderRadius: '3px',
                        }}
                    />
                    {/* Info Box - only show if image is truly focused, not during return */}
                    {focusedImage && (focusedImage.description || focusedImage.photographer) && (
                        <animated.div style={{
                        ...infoBoxSpring,
                        position: 'absolute',
                        bottom: '-60px', // Position below the image
                        left: '50%',
                        transform: infoBoxSpring.transform.to(t => \`\${t} translateX(-50%)\`),
                        width: 'calc(100% - 20px)', // Slightly narrower than image
                        maxWidth: '400px',
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        color: 'white',
                        padding: '15px',
                        borderRadius: '5px',
                        textAlign: 'left',
                        boxSizing: 'border-box',
                        zIndex: 1002, // Above image if overlaps slightly (though positioned below)
                        }}>
                        {focusedImage.description && <p style={{margin: '0 0 5px 0'}}><strong>Description:</strong> {focusedImage.description}</p>}
                        {focusedImage.photographer && <p style={{margin: 0}}><strong>Photographer:</strong> {focusedImage.photographer}</p>}
                        </animated.div>
                    )}
                    </div>
                )}
                </animated.div>
            )}

            {/* Navigation Arrows - Conditionally render only when an image is truly focused */}
            {/* Positioned relative to the viewport */}
            {focusedImage && displayedImagesAndTheirData && displayedImagesAndTheirData.length > 1 && (
            <>
                <button
                onClick={handlePreviousImage}
                aria-label="Previous image"
                style={{
                    position: 'fixed', // Fixed positioning
                    left: '11vw',      // 33% from viewport left
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 1003, 
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    fontSize: '28px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto', 
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
                }}
                >
                &lt;
                </button>
                <button
                onClick={handleNextImage}
                aria-label="Next image"
                style={{
                    position: 'fixed', // Fixed positioning
                    right: '11vw',     // 33% from viewport right
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 1003,
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    fontSize: '28px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto', 
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
                }}
                >
                &gt;
                </button>
            </>
            )}
        </animated.div>
        </>
    );
    };

    export default WeddingJourney; 