import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Parallax, ParallaxLayer, IParallax } from '@react-spring/parallax';
import { useSpring, animated } from 'react-spring';
import { Leva, useControls as useLevaControls } from 'leva';
import RSVPForm from './RSVPForm';
import styles from './styles.module.css';
import '../App.css';
import ScrapbookImageItem, { ScrapbookClickDetails } from './ScrapbookImageItem';

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

// Interface for ResolvedScrapbookImage (if re-enabled)
// interface ResolvedScrapbookImage {
//   src: string;
// }

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
  clipPathVanishScrollY: { value: 750, min: 0, max: 5000, step: 10, label: 'ClipPath Vanish End (px)' },
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
  angleMin: { value: -15, min: -90, max: 90, step: 1, label: 'Min Angle (deg)' },
  angleMax: { value: 15, min: -90, max: 90, step: 1, label: 'Max Angle (deg)' },
  radiusFactor: { value: 80, min: 20, max: 300, step: 1, label: 'Spread Radius (%)' },
  sizeMinPx: { value: 150, min: 50, max: 500, step: 10, label: 'Min Size (px)' },
  sizeRangePx: { value: 100, min: 0, max: 400, step: 10, label: 'Size Range (px)' },
  scrollAngleSensitivityMin: { value: 0.0001, min: 0.00001, max: 0.01, step: 0.00001, label: 'Min Scroll Tilt Speed' },
  scrollAngleSensitivityMax: { value: 0.001, min: 0.00001, max: 0.01, step: 0.00001, label: 'Max Scroll Tilt Speed' },
};

// Updated generateScrapbookImageStyle to use Leva controls
const generateScrapbookImageStyle = (
  index: number, 
  totalImages: number, 
  currentWindow: Window | undefined,
  controls: {
    angleMin: number;
    angleMax: number;
    radiusFactor: number;
    sizeMinPx: number;
    sizeRangePx: number;
  }
): React.CSSProperties => {
  const { angleMin, angleMax, radiusFactor, sizeMinPx, sizeRangePx } = controls;

  const size = Math.random() * sizeRangePx + sizeMinPx;
  let calculatedAngle = 0;
  // Ensure angleMax is greater than angleMin before calculating angle
  const minAngle = Math.min(angleMin, angleMax);
  const maxAngle = Math.max(angleMin, angleMax);

  if (Math.random() < 0.8) { // 80% chance of being tilted
    calculatedAngle = Math.random() * (maxAngle - minAngle) + minAngle;
  }

  const cols = Math.ceil(Math.sqrt(totalImages));
  const rows = Math.ceil(totalImages / cols);
  const colIndex = index % cols;
  const rowIndex = Math.floor(index / cols);

  const xJitter = (Math.random() - 0.5) * 10; // % jitter
  const yJitter = (Math.random() - 0.5) * 10; // % jitter

  const margin = (100 - radiusFactor) / 2;
  let topPercent = (rowIndex / rows) * radiusFactor + margin + yJitter;
  let leftPercent = (colIndex / cols) * radiusFactor + margin + xJitter;

  const effectiveWindowHeight = typeof currentWindow !== 'undefined' ? currentWindow.innerHeight : 1000;
  const effectiveWindowWidth = typeof currentWindow !== 'undefined' ? currentWindow.innerWidth : 1000;

  // Calculate image size as a percentage of viewport dimensions
  const imageSizeAsPercentOfHeight = (size / effectiveWindowHeight) * 100;
  const imageSizeAsPercentOfWidth = (size / effectiveWindowWidth) * 100;

  // Relaxed clamping: allow the top-left of the image to be positioned such that
  // the image can be mostly off-screen. For example, if topPercent is -40 and image is 50% high,
  // only 10% of it will be visible at the top.
  // Max value for topPercent ensures the image doesn't start so low it's entirely below 150% vp height.
  topPercent = Math.max(-imageSizeAsPercentOfHeight + 10, Math.min(topPercent, 100 - 10)); // Allows most of it to be above or below viewport
  leftPercent = Math.max(-imageSizeAsPercentOfWidth + 10, Math.min(leftPercent, 100 - 10)); // Allows most of it to be left or right of viewport
  
  // A simpler, very wide clamp for the top-left corner itself:
  // topPercent = Math.max(-75, Math.min(topPercent, 175));
  // leftPercent = Math.max(-75, Math.min(leftPercent, 175));

  return {
    position: 'absolute',
    width: `${size}px`,
    height: 'auto',
    boxShadow: '3px 3px 10px rgba(0,0,0,0.2)',
    border: '5px solid white',
    transform: `rotate(${calculatedAngle}deg)`,
    top: `${topPercent}%`,
    left: `${leftPercent}%`,
    opacity: 0.8,
    transition: 'transform 0.3s ease-out',
  };
};

const WeddingJourney: React.FC<WeddingJourneyProps> = ({ weddingData, resolvedScrapbookImages, setShowGuideLines }) => {
  const {
    brideName, groomName, weddingDate,
    introBackground, introCouple, rsvpEndpoint
  } = weddingData;

  const parallaxRef = React.useRef<IParallax>(null);
  const [scrollY, setScrollY] = useState(0);
  const [currentWindow, setCurrentWindow] = useState<Window | undefined>(undefined);
  const [focusedImage, setFocusedImage] = useState<FocusedImageState | null>(null);
  const [lastFocusedImageDetails, setLastFocusedImageDetails] = useState<FocusedImageState | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentWindow(window);
    }
  }, []);

  useEffect(() => {
    console.log('WeddingJourney resolvedScrapbookImages:', resolvedScrapbookImages);
    if (!resolvedScrapbookImages || resolvedScrapbookImages.length === 0) {
      alert('No scrapbook images found or loaded. Please check the image paths and loading logic.');
    }
  }, [resolvedScrapbookImages]);

  useEffect(() => {
    if (resolvedScrapbookImages && resolvedScrapbookImages.length > 0) {
      resolvedScrapbookImages.forEach(src => {
        if (src) {
          const img = new Image();
          img.src = src;
        }
      });
    }
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

  const { values: animControls, changedKeys: animChangedKeys } = useTrackedControls('Background Animation', backgroundAnimationSchema, { collapsed: true });
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
    scrollAngleSensitivityMax
  } = scrapbookCtrl;

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
  if (scrollY > translateYThreshold) {
    const effectiveScrollRangeForTranslate = FADE_OUT_SCROLL_RANGE_PIXELS - translateYThreshold;
    if (effectiveScrollRangeForTranslate > 0) {
      const scrollYAfterThreshold = scrollY - translateYThreshold;
      const translateYProgress = Math.min(1, Math.max(0, scrollYAfterThreshold / effectiveScrollRangeForTranslate));
      currentTranslateY = translateYMultiplier * translateYProgress;
    } else {
      currentTranslateY = (scrollY > translateYThreshold) ? translateYMultiplier : 0;
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
    new Set([...Array.from(animChangedKeys), ...Array.from(bgChangedKeys), ...Array.from(scrapbookChangedKeys)])
  , [animChangedKeys, bgChangedKeys, scrapbookChangedKeys]);

  // NEW: Generate the detailed string for changed values for the HUD
  const changedKeyDetailsOutput = useMemo(() => {
    if (allChangedKeys.size === 0) {
      return ""; // Return empty if no keys changed
    }
    let details = "Change To:\n";
    for (const key of Array.from(allChangedKeys)) {
      let value: any = undefined;
      // Check each controls object for the key
      if (animControls.hasOwnProperty(key)) {
        value = animControls[key as keyof typeof animControls];
      } else if (bgControls.hasOwnProperty(key)) {
        value = bgControls[key as keyof typeof bgControls];
      } else if (scrapbookCtrl.hasOwnProperty(key)) {
        value = scrapbookCtrl[key as keyof typeof scrapbookCtrl];
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
  }, [allChangedKeys, animControls, bgControls, scrapbookCtrl]);

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
    return resolvedScrapbookImages.map((_, index) => 
      generateScrapbookImageStyle(index, resolvedScrapbookImages.length, currentWindow, layoutControls)
    );
  }, [resolvedScrapbookImages, currentWindow, scrapbookCtrl]);

  // NEW: Memoize scroll sensitivities for each image
  const memoizedScrollSensitivities = useMemo(() => {
    if (!resolvedScrapbookImages || resolvedScrapbookImages.length === 0) return [];
    // Ensure scrapbookCtrl is initialized before accessing its properties
    const minSens = scrapbookCtrl.scrollAngleSensitivityMin || 0.0001;
    const maxSens = scrapbookCtrl.scrollAngleSensitivityMax || 0.001;
    return resolvedScrapbookImages.map(() => 
      Math.random() * (maxSens - minSens) + minSens
    );
  }, [resolvedScrapbookImages, scrapbookCtrl.scrollAngleSensitivityMin, scrapbookCtrl.scrollAngleSensitivityMax]);

  // Animation spring for the focused image backdrop
  const backdropSpring = useSpring({
    opacity: focusedImage ? 1 : 0,
    pointerEvents: focusedImage ? 'auto' : 'none' as 'auto' | 'none',
    config: { tension: 250, friction: 30 },
  });

  // Animation spring for the focused image container
  const [focusedImageContainerSpring, focusedImageApi] = useSpring(() => ({
    opacity: 0,
    top: '50%', // Initial dummy values, will be overridden
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
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    const leftPx = (vw - targetWidth) / 2;
    const topPx = (vh - targetHeight) / 2 - (vh * offsetYvh / 100);
  
    return { top: topPx, left: leftPx };
  }

  useEffect(() => {
    if (focusedImage) {
      const { targetWidth, targetHeight } = calculateFocusTargetDimensions(
        focusedImage.naturalWidth,
        focusedImage.naturalHeight,
        window.innerWidth,
        window.innerHeight
      );

      // Ensure targetTopPx and targetLeftPx are declared only once in this scope
      const { top: calculatedTargetTopPx, left: calculatedTargetLeftPx } = getCenteredPosition(targetWidth, targetHeight, 0); // Changed 15 to 0

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
          top: `${calculatedTargetTopPx}px`, // Use new variable names
          left: `${calculatedTargetLeftPx}px`, // Use new variable names
          width: `${targetWidth}px`,
          height: `${targetHeight}px`,
          transform: 'translate(0px, 0px) rotate(0deg) scale(1)',
        },
        onRest: () => {
          if (lastFocusedImageDetails) setLastFocusedImageDetails(null);
        }
      });
    } else if (lastFocusedImageDetails) { 
      focusedImageApi.start({
        to: {
          opacity: 0,
          top: `${lastFocusedImageDetails.initialTopPx}px`,
          left: `${lastFocusedImageDetails.initialLeftPx}px`,
          width: `${lastFocusedImageDetails.initialWidthPx}px`,
          height: `${lastFocusedImageDetails.initialHeightPx}px`,
          transform: `translate(0px, 0px) rotate(${lastFocusedImageDetails.initialRotateDeg}deg) scale(1)`,
        },
        onRest: () => {
          setLastFocusedImageDetails(null); 
        }
      });
    } else { 
        focusedImageApi.start({
            opacity: 0,
        });
    }
  }, [focusedImage, focusedImageApi, lastFocusedImageDetails]);

  // NEW: Handler for closing the focused image
  const handleCloseFocusedImage = () => {
    if (focusedImage) {
      setLastFocusedImageDetails(focusedImage); // Store current details for return animation
    }
    setFocusedImage(null); // Trigger the unfocus animation
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
            {`ScrollY: ${scrollY.toFixed(0)}
DynamicAngle[0]: ${(Math.sin(scrollY * (memoizedScrollSensitivities[0] || 0.0005) + 0 * 0.5) * 45).toFixed(3)}
Opacity: ${backgroundOpacity.toFixed(2)}, Scale: ${currentScale.toFixed(2)}, TranslateY: ${currentTranslateY.toFixed(2)}%
ClipPath: ${calculatedClipPathValue}
${changedKeyDetailsOutput.trim()}`}
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
            <animated.div
              style={{
                ...backgroundSpring, // Apply fade animation
                width: '100%',
                height: '100vh',
                backgroundImage: `url(${introBackground})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                transformOrigin: 'center center'
              }}
              className={styles.background}
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
              {resolvedScrapbookImages.map((imageSrc, index) => {
                const initialStyle = memoizedScrapbookImageStyles[index];
                if (!initialStyle) return null; 

                const altText = `Scrapbook item ${index + 1}`;
                
                // Use item-specific scroll sensitivity
                const itemScrollSensitivity = memoizedScrollSensitivities[index] || ((scrapbookCtrl.scrollAngleSensitivityMin + scrapbookCtrl.scrollAngleSensitivityMax) / 2); // Fallback
                const dynamicAngle = Math.sin(scrollY * itemScrollSensitivity + index * 0.5) * 45;

                return (
                  <ScrapbookImageItem
                    key={index}
                    imageSrc={imageSrc}
                    initialStyle={initialStyle}
                    altText={altText}
                    dynamicAngleOffsetDeg={dynamicAngle}
                    onClick={(details: ScrapbookClickDetails) => { 
                      const {
                        imageSrc: clickedSrc,
                        altText: clickedAlt,
                        initialStyle: clickedInitialStyle,
                        currentBoundingClientRect: rect,
                        imageElement
                      } = details;
                      const rotateMatch = clickedInitialStyle.transform?.match(/rotate\(([-\d.]+)deg\)/);
                      const currentInitialRotate = rotateMatch && rotateMatch[1] ? parseFloat(rotateMatch[1]) : 0;
                      setFocusedImage({
                        src: clickedSrc,
                        altText: clickedAlt,
                        initialTopPx: rect.top,
                        initialLeftPx: rect.left,
                        initialWidthPx: rect.width,
                        initialHeightPx: rect.height,
                        initialRotateDeg: currentInitialRotate,
                        naturalWidth: imageElement.naturalWidth,
                        naturalHeight: imageElement.naturalHeight,
                        description: "We're still this much in love!",
                        photographer: "Probably Kim Christenson"
                      });
                    }}
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
        {(focusedImage || lastFocusedImageDetails) && ( // Render if focused or returning
            <animated.div 
              style={{
                ...focusedImageContainerSpring, // Applied here
                position: 'fixed', 
                willChange: 'transform, opacity, top, left, width, height', // Added height
                zIndex: 1001, 
                pointerEvents: 'none', 
              }}
            >
              {/* Determine src/alt from focusedImage or lastFocusedImageDetails for smooth transition */}
              {/* This ensures image doesn't vanish instantly on close click */}
              {(focusedImage || lastFocusedImageDetails) && (
                <div onClick={(e) => e.stopPropagation()} style={{ pointerEvents: 'auto', width: '100%', height: '100%'}}>
                  <img 
                    src={focusedImage?.src || lastFocusedImageDetails?.src || ''}
                    alt={focusedImage?.altText || lastFocusedImageDetails?.altText || 'Focused image'}
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
                      transform: infoBoxSpring.transform.to(t => `${t} translateX(-50%)`),
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
      </animated.div>
    </>
  );
};

export default WeddingJourney; 