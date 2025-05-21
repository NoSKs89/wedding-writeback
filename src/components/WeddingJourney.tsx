import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Parallax, ParallaxLayer, IParallax } from '@react-spring/parallax';
import { useSpring, animated, config as springConfigs } from 'react-spring';
import { Leva } from 'leva';
import { useLocation } from 'react-router-dom';
import RSVPForm from './RSVPForm';
import styles from './styles.module.css';
import '../App.css';
import ScrapbookImageItem, { ScrapbookClickDetails } from './ScrapbookImageItem';
import ParallaxBackgroundImage from './ParallaxBackgroundImage';
import { useTrackedControls } from '../hooks/useTrackedControls';
import { useLevaStore, LevaFolderSchema } from '../stores/levaStore';
import { useSetupMode } from '../contexts/SetupModeContext';

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

// Define the schema for Leva controls
const backgroundAnimationSchema: LevaFolderSchema = {
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
const backgroundColorControlsSchema: LevaFolderSchema = {
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
const scrapbookControlsSchema: LevaFolderSchema = {
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
const scrapbookMovementControlsSchema: LevaFolderSchema = {
  minXMovementSensitivity: { value: -0.08, min: -0.4, max: 0.4, step: 0.01, label: 'Min X Parallax Sens.' },
  maxXMovementSensitivity: { value: 0.17, min: -0.4, max: 0.4, step: 0.01, label: 'Max X Parallax Sens.' },
  minYMovementSensitivity: { value: -0.2, min: -0.4, max: 0.4, step: 0.01, label: 'Min Y Parallax Sens.' },
  maxYMovementSensitivity: { value: 0.23, min: -0.4, max: 0.4, step: 0.01, label: 'Max Y Parallax Sens.' },
  minZMovementSensitivity: { value: -0.0001, min: -0.001, max: 0.001, step: 0.000001, label: 'Min Z Parallax Sens.' },
  maxZMovementSensitivity: { value: 0.0001, min: -0.001, max: 0.001, step: 0.000001, label: 'Max Z Parallax Sens.' },
  baseItemScale: { value: 1, min: 0.1, max: 2, step: 0.05, label: 'Base Item Scale' },
  movementScrollCap: { value: 7150, min: 200, max: 10000, step: 50, label: 'Scroll Cap for Movement (px)'}
};

// Modify overallControlsSchema slightly for clarity with isSetupMode
const overallControlsSchemaDefinition = (isSetupModeFromContext: boolean): LevaFolderSchema => ({
  showHUD: { value: isSetupModeFromContext, label: 'Show Debug HUD' }, // Default based on setup mode
  toggleGuideLines: { value: isSetupModeFromContext, label: 'Toggle Guide Lines' } // Default based on setup mode
});

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

// Helper function to parse rotation from transform string
const parseRotationFromStyle = (transformString?: string | number): number => {
  if (typeof transformString === 'number') return transformString;
  if (!transformString) return 0;
  const rotateMatch = transformString.match(/rotate\(([-\d.]+)deg\)/);
  return rotateMatch && rotateMatch[1] ? parseFloat(rotateMatch[1]) : 0;
};

const WeddingJourney: React.FC<WeddingJourneyProps> = ({ weddingData, resolvedScrapbookImages }) => {
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

  // Initialize overallControlsSchema with the current setup mode
  const overallControlsSchema = useMemo(() => overallControlsSchemaDefinition(isSetupMode), [isSetupMode]);

  // --- Leva Controls ---
  // IMPORTANT: Overall Controls should be registered first for ordering
  const overallControls = useTrackedControls(
    'Overall Controls', // Store key & Leva folder title
    overallControlsSchema,
    { collapsed: isSetupMode, hidden: !isSetupMode }
  );

  const { showHUD: showGlobalHUDEnabled, toggleGuideLines: guideLinesEnabled } = overallControls?.values || {};

  // --- Scrapbook Controls ---
  const scrapbookControls = useTrackedControls(
    'Scrapbook Layout', // Store key for Leva folder title
    scrapbookControlsSchema, // The schema definition
    { collapsed: isSetupMode, hidden: !isSetupMode } // Options: collapsed by default in setup, hidden otherwise
  );

  const scrapbookMovementControls = useTrackedControls(
    'Scrapbook Movement',
    scrapbookMovementControlsSchema,
    { collapsed: isSetupMode, hidden: !isSetupMode }
  );

  // --- Background Animation Controls ---
  const backgroundAnimControls = useTrackedControls(
    'Background Animation',
    backgroundAnimationSchema,
    { collapsed: isSetupMode, hidden: !isSetupMode }
  );

  // --- Background Color Controls ---
  const backgroundColorControls = useTrackedControls(
    'Background Colors',
    backgroundColorControlsSchema,
    { collapsed: isSetupMode, hidden: !isSetupMode }
  );

  // --- Access data from Zustand store for HUD ---
  // New Approach: Select individual pieces and memoize/construct manually
  const controlValuesFromStore = useLevaStore(state => state.controlValues);
  const changedKeysFromStore = useLevaStore(state => state.changedKeys);
  const schemasFromStore = useLevaStore(state => state.schemas);

  // Local state to hold our combined object for HUD dependencies
  // This local state itself isn't strictly needed if hudData's useMemo directly uses the store pieces.
  // However, if storeDataForHUD was used elsewhere, this pattern would be useful.
  // For now, we'll simplify and have hudData's useMemo depend directly on the store pieces.

  // Memoize the result of getDisplayDataForHUD
  const hudData = React.useMemo(() => {
    console.log("[WeddingJourney] Recalculating hudData memo");
    // getState() is fine here as useMemo dependencies handle re-computation.
    return useLevaStore.getState().getDisplayDataForHUD();
    // Depend directly on the pieces from the store that getDisplayDataForHUD implicitly depends on.
  }, [controlValuesFromStore, changedKeysFromStore, schemasFromStore]);

  // Calculations for HUD display (derived from animControls and scrollY)
  const opacityFullTransparent_HUD = backgroundAnimControls?.values?.opacityFullTransparent;
  const opacityGentleEnd_HUD = backgroundAnimControls?.values?.opacityGentleEnd;
  const opacityTargetAtGentleEnd_HUD = backgroundAnimControls?.values?.opacityTargetAtGentleEnd;
  const opacityDrasticStartPixels_HUD = backgroundAnimControls?.values?.opacityDrasticStartPixels;
  const opacityTargetAtDrasticStart_HUD = backgroundAnimControls?.values?.opacityTargetAtDrasticStart;
  const scaleDrasticStartPx_HUD = backgroundAnimControls?.values?.scaleDrasticStartPx;
  const scaleInitialRate_HUD = backgroundAnimControls?.values?.scaleInitialRate;
  const scaleDrasticRate_HUD = backgroundAnimControls?.values?.scaleDrasticRate;
  const translateYThreshold_HUD = backgroundAnimControls?.values?.translateYThreshold;
  const translateYMultiplier_HUD = backgroundAnimControls?.values?.translateYMultiplier;
  const borderRadiusStartScrollY_HUD = backgroundAnimControls?.values?.borderRadiusStartScrollY;
  const clipPathVanishScrollY_HUD = backgroundAnimControls?.values?.clipPathVanishScrollY;

  let calculatedBackgroundOpacity_HUD = 1.0;
  if (scrollY <= 0) {
    calculatedBackgroundOpacity_HUD = 1.0;
  } else if (opacityGentleEnd_HUD > 0 && scrollY <= opacityGentleEnd_HUD) {
    const progress = scrollY / opacityGentleEnd_HUD;
    calculatedBackgroundOpacity_HUD = 1.0 - progress * (1.0 - opacityTargetAtGentleEnd_HUD);
  } else if (scrollY > opacityGentleEnd_HUD && scrollY <= opacityDrasticStartPixels_HUD) {
    const durationOfMediumFade = opacityDrasticStartPixels_HUD - opacityGentleEnd_HUD;
    if (durationOfMediumFade > 0) {
      const progressInMediumFade = (scrollY - opacityGentleEnd_HUD) / durationOfMediumFade;
      calculatedBackgroundOpacity_HUD = opacityTargetAtGentleEnd_HUD - progressInMediumFade * (opacityTargetAtGentleEnd_HUD - opacityTargetAtDrasticStart_HUD);
    } else {
      calculatedBackgroundOpacity_HUD = (scrollY > opacityGentleEnd_HUD) ? opacityTargetAtDrasticStart_HUD : opacityTargetAtGentleEnd_HUD;
    }
  } else if (scrollY > opacityDrasticStartPixels_HUD && scrollY <= opacityFullTransparent_HUD) {
    const durationOfDrasticFade = opacityFullTransparent_HUD - opacityDrasticStartPixels_HUD;
    if (durationOfDrasticFade > 0) {
      const progressInDrasticFade = (scrollY - opacityDrasticStartPixels_HUD) / durationOfDrasticFade;
      calculatedBackgroundOpacity_HUD = opacityTargetAtDrasticStart_HUD - progressInDrasticFade * opacityTargetAtDrasticStart_HUD;
    } else {
      calculatedBackgroundOpacity_HUD = (scrollY > opacityDrasticStartPixels_HUD) ? 0.0 : opacityTargetAtDrasticStart_HUD;
    }
  } else if (scrollY > opacityFullTransparent_HUD) {
    calculatedBackgroundOpacity_HUD = 0.0;
  }
  const backgroundOpacity_HUD = Math.min(1, Math.max(0, calculatedBackgroundOpacity_HUD));

  let scaleIncrease_HUD = 0;
  const FADE_OUT_SCROLL_RANGE_PIXELS_HUD = opacityFullTransparent_HUD;
  const overallScrollProgress_HUD = FADE_OUT_SCROLL_RANGE_PIXELS_HUD > 0 ? Math.min(1, Math.max(0, scrollY / FADE_OUT_SCROLL_RANGE_PIXELS_HUD)) : 0;
  const scaleThresholdProgress_HUD = FADE_OUT_SCROLL_RANGE_PIXELS_HUD > 0 ? Math.min(1, Math.max(0, scaleDrasticStartPx_HUD / FADE_OUT_SCROLL_RANGE_PIXELS_HUD)) : 0;

  if (scaleDrasticStartPx_HUD <= 0 || overallScrollProgress_HUD <= scaleThresholdProgress_HUD || scaleDrasticStartPx_HUD >= FADE_OUT_SCROLL_RANGE_PIXELS_HUD) {
    scaleIncrease_HUD = scaleInitialRate_HUD * overallScrollProgress_HUD;
  } else {
    const scaleAtThresholdPoint = scaleInitialRate_HUD * scaleThresholdProgress_HUD;
    const progressAfterThreshold = overallScrollProgress_HUD - scaleThresholdProgress_HUD;
    const remainingProgressRangeForDrasticScale = 1 - scaleThresholdProgress_HUD;
    if (remainingProgressRangeForDrasticScale > 0) {
         scaleIncrease_HUD = scaleAtThresholdPoint + scaleDrasticRate_HUD * progressAfterThreshold;
    } else {
        scaleIncrease_HUD = scaleAtThresholdPoint;
    }
  }
  const currentScale_HUD = 1 + scaleIncrease_HUD;

  let currentTranslateY_HUD = 0;
  if (scrollY > translateYThreshold_HUD) {
    const effectiveScrollRangeForTranslate = FADE_OUT_SCROLL_RANGE_PIXELS_HUD - translateYThreshold_HUD;
    if (effectiveScrollRangeForTranslate > 0) {
      const scrollYAfterThreshold = scrollY - translateYThreshold_HUD;
      const translateYProgress = Math.min(1, Math.max(0, scrollYAfterThreshold / effectiveScrollRangeForTranslate));
      currentTranslateY_HUD = translateYMultiplier_HUD * translateYProgress;
    } else {
      currentTranslateY_HUD = (scrollY > translateYThreshold_HUD) ? translateYMultiplier_HUD : 0;
    }
  } else {
    currentTranslateY_HUD = 0;
  }

  let calculatedClipPathValue_HUD = 'circle(70.7107% at 50% 50%)';
  const localRoundingStart_HUD = borderRadiusStartScrollY_HUD;
  const localRoundingEnd_HUD = clipPathVanishScrollY_HUD;

  if (currentWindow && localRoundingEnd_HUD > localRoundingStart_HUD && scrollY > localRoundingStart_HUD) {
    const linearProgress = Math.min(1, Math.max(0, (scrollY - localRoundingStart_HUD) / (localRoundingEnd_HUD - localRoundingStart_HUD)));
    const easedProgress = Math.pow(linearProgress, 0.5);
    const w = currentWindow.innerWidth;
    const h = currentWindow.innerHeight;
    const R_start_px = Math.sqrt(Math.pow(w / 2, 2) + Math.pow(h / 2, 2));
    const current_R_px = R_start_px * (1 - easedProgress);
    const referenceLengthForCirclePercentage = Math.sqrt(Math.pow(w, 2) + Math.pow(h, 2)) / Math.sqrt(2);
    let current_R_percentage = 70.7107;
    if (referenceLengthForCirclePercentage > 0) {
        current_R_percentage = (current_R_px / referenceLengthForCirclePercentage) * 100;
    }
    calculatedClipPathValue_HUD = `circle(${current_R_percentage.toFixed(2)}% at 50% 50%)`;
  } else if (currentWindow && scrollY >= localRoundingEnd_HUD && localRoundingEnd_HUD > localRoundingStart_HUD) {
    calculatedClipPathValue_HUD = 'circle(0% at 50% 50%)';
  } else if (scrollY <= localRoundingStart_HUD) {
    calculatedClipPathValue_HUD = 'circle(70.7107% at 50% 50%)';
  }

  const changedKeyDetailsOutput = useMemo(() => {
    let details = "Change Defaults To:\n";
    let hasChanges = false;
    hudData.forEach(item => {
      if (item.isChanged) {
        hasChanges = true;
        let formattedValue = String(item.value);
        if (typeof item.value === 'number') {
          formattedValue = Number(item.value.toFixed(3)).toString();
        } else if (typeof item.value === 'string' && item.value.startsWith('#')) {
          formattedValue = item.value;
        }
        details += `${item.label} (${item.folderName}/${item.key}): ${formattedValue}\n`;
      }
    });
    return hasChanges ? details : "";
  }, [hudData]);

  // Memoize the scrapbook image styles
  const memoizedScrapbookImageStyles = useMemo(() => {
      if (!resolvedScrapbookImages || resolvedScrapbookImages.length === 0) return [];
      const layoutControls = {
      angleMin: scrapbookControls?.values?.angleMin,
      angleMax: scrapbookControls?.values?.angleMax,
      radiusFactor: scrapbookControls?.values?.radiusFactor,
      sizeMinPx: scrapbookControls?.values?.sizeMinPx,
      sizeRangePx: scrapbookControls?.values?.sizeRangePx,
      };
      // Ensure refs array is ready
      // This will be handled by displayedImagesAndTheirData logic now
      // if (scrapbookImageRefs.current.length !== resolvedScrapbookImages.length) {
      //     scrapbookImageRefs.current = Array(resolvedScrapbookImages.length).fill(null);
      // }
      return resolvedScrapbookImages.map((_, index) => 
      generateScrapbookImageStyle(index, resolvedScrapbookImages.length, currentWindow, layoutControls)
      );
  }, [resolvedScrapbookImages, currentWindow, scrapbookControls?.values?.angleMin, scrapbookControls?.values?.angleMax, scrapbookControls?.values?.radiusFactor, scrapbookControls?.values?.sizeMinPx, scrapbookControls?.values?.sizeRangePx]);

  // NEW: Memoize scroll sensitivities for each image
  const memoizedScrollSensitivities = useMemo(() => {
      if (!resolvedScrapbookImages || resolvedScrapbookImages.length === 0) return [];
      // Ensure scrapbookCtrl is initialized before accessing its properties
      const minSens = scrapbookControls?.values?.scrollAngleSensitivityMin || 0.0001;
      const maxSens = scrapbookControls?.values?.scrollAngleSensitivityMax || 0.002;
      return resolvedScrapbookImages.map(() => 
      Math.random() * (maxSens - minSens) + minSens
      );
  }, [resolvedScrapbookImages, scrapbookControls?.values?.scrollAngleSensitivityMin, scrapbookControls?.values?.scrollAngleSensitivityMax]);

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
  
    const numImagesToDisplay = Math.min(scrapbookControls?.values?.maxImages, resolvedScrapbookImages.length);
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
      angleMin: scrapbookControls?.values?.angleMin,
      angleMax: scrapbookControls?.values?.angleMax,
      radiusFactor: scrapbookControls?.values?.radiusFactor,
      sizeMinPx: scrapbookControls?.values?.sizeMinPx,
      sizeRangePx: scrapbookControls?.values?.sizeRangePx,
    };
  
    return imagesToProcess.map((imageInfo, displayIndex) => {
      const { src, originalIndex } = imageInfo;
      
      // Generate style using displayIndex and the current number of images being processed for layout
      const style = generateScrapbookImageStyle(displayIndex, imagesToProcess.length, currentWindow, layoutStyleControls);
      
      // Sensitivities are randomized per item instance in the displayed set
      const scrollSensitivity = (Math.random() * (scrapbookControls?.values?.scrollAngleSensitivityMax - scrapbookControls?.values?.scrollAngleSensitivityMin) + scrapbookControls?.values?.scrollAngleSensitivityMin);
      const xMovementSensitivity = (Math.random() * (scrapbookMovementControls?.values?.maxXMovementSensitivity - scrapbookMovementControls?.values?.minXMovementSensitivity) + scrapbookMovementControls?.values?.minXMovementSensitivity);
      const yMovementSensitivity = (Math.random() * (scrapbookMovementControls?.values?.maxYMovementSensitivity - scrapbookMovementControls?.values?.minYMovementSensitivity) + scrapbookMovementControls?.values?.minYMovementSensitivity);
      const zMovementSensitivity = (Math.random() * (scrapbookMovementControls?.values?.maxZMovementSensitivity - scrapbookMovementControls?.values?.minZMovementSensitivity) + scrapbookMovementControls?.values?.minZMovementSensitivity);
  
      return {
        src,
        originalIndex, 
        displayIndex,  
        altText: `Scrapbook item ${displayIndex + 1}`,
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
    scrapbookControls?.values?.maxImages, 
    scrapbookControls?.values?.angleMin, scrapbookControls?.values?.angleMax, scrapbookControls?.values?.radiusFactor, scrapbookControls?.values?.sizeMinPx, scrapbookControls?.values?.sizeRangePx,
    scrapbookControls?.values?.scrollAngleSensitivityMin, scrapbookControls?.values?.scrollAngleSensitivityMax,
    scrapbookMovementControls?.values?.minXMovementSensitivity, scrapbookMovementControls?.values?.maxXMovementSensitivity, 
    scrapbookMovementControls?.values?.minYMovementSensitivity, scrapbookMovementControls?.values?.maxYMovementSensitivity,
    scrapbookMovementControls?.values?.minZMovementSensitivity, scrapbookMovementControls?.values?.maxZMovementSensitivity,
    // scrapbookMovementCtrl.baseItemScale, // This is global in ScrapbookImageItem
    // scrapbookMovementCtrl.movementScrollCap // This is global in ScrapbookImageItem
  ]);

  // Update scrapbookImageRefs based on the length of displayed images
  useEffect(() => {
    scrapbookImageRefs.current = Array(displayedImagesAndTheirData.length).fill(null);
  }, [displayedImagesAndTheirData.length]);

  // Animation spring for the focused image backdrop
  const backdropSpring = useSpring({
      opacity: focusedImage ? 1 : 0,
      pointerEvents: focusedImage ? 'auto' : 'none' as 'auto' | 'none',
      position: 'fixed' as any,
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.7)',
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
      position: 'fixed' as any,
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
    const itemScrollSensitivityOnClick = clickedImageData ? clickedImageData.scrollSensitivity : ((scrapbookControls?.values?.scrollAngleSensitivityMin + scrapbookControls?.values?.scrollAngleSensitivityMax) / 2);
    
    // This is the DYNAMIC part of the angle, matching what's visually rendered
    // The 'clickedDisplayIndex * 0.5' part is an arbitrary phase offset, ensure it matches rendering if it matters
    const currentDynamicAngleForPickUp = Math.sin(scrollY * itemScrollSensitivityOnClick + clickedDisplayIndex * 0.5) * 45;
    const fullInitialRotateOnClick = baseRotateOnClick + currentDynamicAngleForPickUp;

    // Logging for pick-up:
    console.log(`WJ: PICK UP IMAGE - Display Index: ${clickedDisplayIndex} ('${clickedSrc}')`, {
        topPx: rect.top,
        leftPx: rect.left,
        widthPx: rect.width,
        heightPx: rect.height,
        calculatedInitialRotateDeg: fullInitialRotateOnClick,
        baseRotateDeg: baseRotateOnClick,
        dynamicAngleDeg: currentDynamicAngleForPickUp,
        rawInitialStyleTransform: clickedInitialStyle.transform
    });
    
    const description = `Image ${clickedDisplayIndex + 1} description.`; // Placeholder
    const photographer = `Photographer ${clickedDisplayIndex + 1}.`; // Placeholder

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
          top: `${focusedImage.initialTopPx}px`,
          left: `${focusedImage.initialLeftPx}px`,
          width: `${focusedImage.initialWidthPx}px`,
          height: `${focusedImage.initialHeightPx}px`,
          transform: `translate(0px, 0px) rotate(${focusedImage.initialRotateDeg}deg) scale(1)`,
        },
        to: { 
          opacity: 1,
          top: `${calculatedTargetTopPx}px`,
          left: `${calculatedTargetLeftPx}px`,
          width: `${targetWidth}px`,
          height: `${targetHeight}px`,
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

        console.log(`WJ: PUT DOWN IMAGE - Display Index: ${returningDisplayIndex} ('${returningSrc}') - Target State for flying image:`, {
            targetTopPx: currentRect.top, targetLeftPx: currentRect.left,
            targetWidthPx: initialWidthPx, targetHeightPx: initialHeightPx,
            targetRotateDeg: totalCurrentRotationForPutDown
        });

        // Animate position, size, rotation of the "flying" image
        focusedImageApi.start({
          to: {
            top: `${currentRect.top}px`,
            left: `${currentRect.left}px`,
            width: `${initialWidthPx}px`,
            height: `${initialHeightPx}px`,
            transform: `translate(0px, 0px) rotate(${totalCurrentRotationForPutDown}deg) scale(1)`,
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
        console.log(`WJ: Scheduling scrapbook item ${returningDisplayIndex} (in grid) to reappear in ${REAPPEAR_DELAY_MS}ms.`);
        
        returnTimeoutId = setTimeout(() => {
          const currentReturningImageFromRef = imageReturningToScrapbookRef.current;
          console.log(`WJ: Timeout fired for item ${currentReturningImageFromRef?.currentIndex}. Making it reappear in grid.`);
          
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
        console.warn(`WJ: PUT DOWN - Target for scrapbook item index ${returningDisplayIndex} ('${returningSrc}') not found. Hiding focused image and clearing state immediately.`);
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
    scrapbookControls?.values?.scrollAngleSensitivityMin, // Kept for fallback if data not found (shouldn't happen)
    scrapbookControls?.values?.scrollAngleSensitivityMax  // Kept for fallback
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
      
      const newDescription = `Image ${newDisplayIndex + 1} description.`; // Placeholder
      const newPhotographer = `Photographer ${newDisplayIndex + 1}.`; // Placeholder

      // Logging for pick-up during navigation:
      console.log(`WJ: NAV PICK UP IMAGE - Display Index: ${newDisplayIndex} ('${newImageSrc}')`, {
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
        altText: `Scrapbook item ${newDisplayIndex + 1}`,
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
      console.warn(`Could not get details for new focused image at index ${newDisplayIndex}. Missing element, src, dimensions, or style.`, {targetImageElement, newImageSrc, naturalDims, styleForNewImage});
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

  // Define centerStyle here
  const centerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  };

  const handleSaveLayout = async () => {
    if (!currentWeddingId) {
      console.error("[WeddingJourney] Cannot save layout: weddingId is missing.");
      alert("Error: Cannot save layout, wedding ID is missing.");
      return;
    }
    // Get settings from Zustand store - This line was correctly commented out by the user previously as it's implicitly handled by saveSettingsToServer.
    // const layoutSettingsToSave = useLevaStore.getState().getSettingsForSave();

    // REMOVE these console logs and alert
    // console.log("[WeddingJourney] Layout Settings to Save for weddingId:", currentWeddingId);
    // console.log(JSON.stringify(layoutSettingsToSave, null, 2)); // Pretty print JSON
    // alert('Layout settings logged to console! Check the developer tools.');

    // UNCOMMENT this try/catch block
    try {
      console.log(`[WeddingJourney] Attempting to save layout for weddingId: ${currentWeddingId}`);
      await useLevaStore.getState().saveSettingsToServer(String(currentWeddingId));
      alert('Layout settings saved successfully!');
      console.log('[WeddingJourney] Layout settings save call completed.');
    } catch (error) {
      console.error('[WeddingJourney] Failed to save layout settings:', error);
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      alert(`Error saving layout settings: ${errorMessage}`);
    }
  };

  // Define a ref for the Save Layout button to get its height
  const saveLayoutButtonRef = useRef<HTMLButtonElement>(null);
  const [saveLayoutButtonHeight, setSaveLayoutButtonHeight] = useState(0);

  useEffect(() => {
    if (saveLayoutButtonRef.current) {
      setSaveLayoutButtonHeight(saveLayoutButtonRef.current.offsetHeight);
    }
  }, [isSetupMode]); // Recalculate if button appears/disappears

  // ADDED: Log current path and isSetupMode
  useEffect(() => {
    console.log(`[WeddingJourney] Path: ${location.pathname}, isSetupMode: ${isSetupMode}`);
  }, [location.pathname, isSetupMode]);

  return (
    <>
      {/* Conditionally configure Leva panel to be hidden or shown based on isSetupMode */}
      <Leva theme={levaTheme} hidden={!isSetupMode} />

      <animated.div
        className="wedding-journey-wrapper" // Ensure this class name is correct if it provides critical styles
        style={{ 
          width: '100%', 
          height: '100vh', 
          // Dynamically construct background from Leva controls or defaults
          background: `linear-gradient(to top, 
                        ${backgroundColorControls?.values?.colorStop1_Bottom || '#ff3c00'}, 
                        ${backgroundColorControls?.values?.colorStop1_Top || '#ff7e33'}
                      ), 
                      linear-gradient(to bottom, 
                        ${backgroundColorControls?.values?.colorStop2_Bottom || '#ff5a00'}, 
                        ${backgroundColorControls?.values?.colorStop2_Top || '#ff9966'}
                      ), 
                      linear-gradient(to top, 
                        ${backgroundColorControls?.values?.colorStop3_Bottom || '#ff7043'}, 
                        ${backgroundColorControls?.values?.colorStop3_Top || '#ffc107'}
                      ), 
                      linear-gradient(to bottom, 
                        ${backgroundColorControls?.values?.colorStop4_Bottom || '#ff5722'}, 
                        ${backgroundColorControls?.values?.colorStop4_Top || '#ffab91'}
                      ), 
                      linear-gradient(to top, 
                        ${backgroundColorControls?.values?.colorStop5_Bottom || '#ff3c00'}, 
                        ${backgroundColorControls?.values?.colorStop5_Top || '#ff7e33'}
                      )`,
        }}
      >
        {isSetupMode && (
          <div style={{ position: 'fixed', top: '10px', left: '10px', zIndex: 10001 }}>
            <button 
              ref={saveLayoutButtonRef} // Add ref here
              onClick={handleSaveLayout} 
              style={{ 
                padding: '8px 15px', 
                background: '#4CAF50', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                marginBottom: '5px' // Add some margin below the button
              }}
            >
              Save Layout
            </button>
          </div>
        )}

        {/* HUD Rendering - ensure it only shows if showGlobalHUDEnabled AND isSetupMode */}
        {isSetupMode && showGlobalHUDEnabled && (
          <div
            style={{
              position: 'fixed',
              top: `${10 + saveLayoutButtonHeight + 5}px`,
              left: '10px',
              zIndex: 10000,
              fontSize: '12px',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px', // Space between segments
              pointerEvents: 'auto',
            }}
          >
            {/* Segment 1: ScrollY and image count */}
            <div style={{
              padding: '5px 10px',
              background: 'rgba(255, 255, 255, 0.8)',
              color: 'black',
              borderRadius: '4px',
              whiteSpace: 'pre-wrap',
            }}>
              {`ScrollY: ${scrollY.toFixed(0)}\nDisplayed Images: ${displayedImagesAndTheirData.length} / ${resolvedScrapbookImages.length} (max: ${(scrapbookControls?.values as any)?.maxImages})`}
            </div>
            {/* Segment 2: Background values */}
            <div style={{
              padding: '5px 10px',
              background: 'rgba(255, 255, 255, 0.8)',
              color: 'black',
              borderRadius: '4px',
              whiteSpace: 'pre-wrap',
            }}>
              {`Opacity (BG): ${backgroundOpacity_HUD.toFixed(2)}\nScale (BG): ${currentScale_HUD.toFixed(2)}\nTranslateY (BG): ${currentTranslateY_HUD.toFixed(2)}%\nClipPath (BG): ${calculatedClipPathValue_HUD}`}
            </div>
            {/* Segment 3: Changed tracked controls */}
            {changedKeyDetailsOutput.trim() && (
              <div style={{
                padding: '5px 10px',
                background: 'rgba(255, 255, 255, 0.8)',
                color: 'black',
                borderRadius: '4px',
                whiteSpace: 'pre-wrap',
              }}>
                {changedKeyDetailsOutput.trim()}
              </div>
            )}
          </div>
        )}

        <Parallax
          ref={parallaxRef}
          pages={3}
          style={{ top: '0', left: '0' }}
        >

          {/* Background Layer - Sticky with Pixel-Based Fade Out */}
          <ParallaxLayer
            sticky={{ start: 0, end: 1 }}
            style={{ zIndex: -1, overflow: 'hidden' }}
          >
            <ParallaxBackgroundImage
              introBackgroundUrl={introBackground}
              scrollY={scrollY}
              animControls={backgroundAnimControls?.values as BackgroundAnimControlValues} // Pass the correctly typed animControls object
              currentWindow={currentWindow}
              backgroundStickyStart={0}
              backgroundStickyEnd={1}
              // parallaxBgStateForHUD and setParallaxBgStateForHUD removed
            />
          </ParallaxLayer>

          {/* Intro Couple Image Layer */}
          <ParallaxLayer
            offset={0.3}
            speed={0.4}
            style={{ ...centerStyle, zIndex: 1 }}
          >
            <img src={introCouple} alt="Couple" className="introCoupleImage" />
          </ParallaxLayer>

          {/* Text Layers */}
          <ParallaxLayer
            offset={0.6}
            speed={0.5}
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
            offset={2}
            speed={0.1}
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

                // console.log(`[WeddingJourney.tsx] Rendering ScrapbookImageItem (Display Index ${displayIndex}), imageSrc: ${imageSrc}`);

                const dynamicAngle = Math.sin(scrollY * itemScrollSensitivity + displayIndex * 0.5) * 45;

                const cappedScrollYForMovement = Math.min(scrollY, scrapbookMovementControls?.values?.movementScrollCap);

                const parallaxTranslateX = cappedScrollYForMovement * itemXSensitivity;
                const parallaxTranslateY = cappedScrollYForMovement * itemYSensitivity;

                let parallaxScale = scrapbookMovementControls?.values?.baseItemScale + (cappedScrollYForMovement * itemZSensitivity);
                parallaxScale = Math.max(0.1, parallaxScale);

                let isEffectivelyHidden = false;
                if (focusedImage && focusedImage.currentIndex === displayIndex) {
                  isEffectivelyHidden = true;
                } else if (imageReturningToScrapbook && imageReturningToScrapbook.currentIndex === displayIndex) {
                  isEffectivelyHidden = true;
                }

                return (
                  <ScrapbookImageItem
                    key={imageSrc || displayIndex}
                    imageSrc={imageSrc}
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

            {/* RSVP Form - ensure it's on top */}
            <div style={{ position: 'relative', zIndex: 10 }}>
              <RSVPForm weddingData={weddingData} backendUrl={rsvpEndpoint} />
            </div>
          </ParallaxLayer>

        </Parallax>

        {/* Focused Image Modal - should work in both modes */}
        <> {/* Fragment to group focused image related elements */}
        <animated.div 
            style={{
                ...backdropSpring, 
                zIndex: 1000, 
            }}
            onClick={handleCloseFocusedImage}
        />
        {(focusedImage || imageReturningToScrapbook) && (
            <animated.div 
                style={{
                    ...focusedImageContainerSpring, 
                    zIndex: 1001, 
                }}
            >
              {(focusedImage || imageReturningToScrapbook) && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ pointerEvents: 'auto', width: '100%', height: '100%', position: 'relative' }}
                >
                  <img
                    src={focusedImage?.src || imageReturningToScrapbook?.src || ''}
                    alt={focusedImage?.altText || imageReturningToScrapbook?.altText || 'Focused image'}
                    style={{
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      boxShadow: '0px 10px 30px rgba(0,0,0,0.5)',
                      border: '10px solid white',
                      borderRadius: '3px',
                    }}
                  />
                  {focusedImage && (focusedImage.description || focusedImage.photographer) && (
                    <animated.div style={{
                      ...infoBoxSpring, // Contains opacity and transform
                      position: 'absolute', // Keep this for layout relative to parent
                      bottom: '-60px',
                      left: '50%',
                      transform: infoBoxSpring.transform.to(t => `${t} translateX(-50%)`), // Ensure translateX(-50%) is part of the transform
                      width: 'calc(100% - 20px)',
                      maxWidth: '400px',
                      backgroundColor: 'rgba(0,0,0,0.75)',
                      color: 'white',
                      padding: '15px',
                      borderRadius: '5px',
                      textAlign: 'left',
                      boxSizing: 'border-box',
                      zIndex: 1002,
                    }}>
                      {focusedImage.description && <p style={{ margin: '0 0 5px 0' }}><strong>Description:</strong> {focusedImage.description}</p>}
                      {focusedImage.photographer && <p style={{ margin: 0 }}><strong>Photographer:</strong> {focusedImage.photographer}</p>}
                    </animated.div>
                  )}
                </div>
              )}
            </animated.div>
        )}
        {/* Navigation Arrows for focused image */}
        {focusedImage && displayedImagesAndTheirData && displayedImagesAndTheirData.length > 1 && (
            <>
                <button
                  onClick={handlePreviousImage}
                  aria-label="Previous image"
                  style={{
                    position: 'fixed',
                    left: '11vw',
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
                    position: 'fixed',
                    right: '11vw',
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
        </>
      </animated.div>
    </>
  );
};

export default WeddingJourney;
