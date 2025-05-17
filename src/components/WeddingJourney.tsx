import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Parallax, ParallaxLayer, IParallax } from '@react-spring/parallax';
import { useSpring, animated } from 'react-spring';
import { Leva, useControls as useLevaControls } from 'leva';
import RSVPForm from './RSVPForm';
import styles from './styles.module.css';
import '../App.css';
import ScrapbookImageItem from './ScrapbookImageItem';

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
}

// Define a type for the focused image state
interface FocusedImageState {
  src: string;
  altText: string;
  initialTop: string;
  initialLeft: string;
  initialWidth: string;
  initialRotate: number;
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
function useTrackedControls(folderName: string, schema: any) {
  // Using Leva's useControls, aliased to useLevaControls
  const [values, set] = useLevaControls(folderName, () => schema, [schema])
  const initialValues = useRef(values);
  const [changedKeys, setChangedKeys] = useState(new Set<string>());

  useEffect(() => {
    const newChanged = new Set<string>();
    // Check if initialValues.current has been populated
    if (Object.keys(initialValues.current).length === 0 && Object.keys(values).length > 0) {
        // This case can happen on the very first render if Leva initializes values slightly after initial ref capture.
        // We re-capture initialValues if it was empty and values now has keys.
        initialValues.current = values;
    }

    for (const key in values) {
      // Ensure the key exists in initialValues to avoid errors if schema changes (though less likely here)
      if (initialValues.current.hasOwnProperty(key)) {
        if (values[key] !== initialValues.current[key]) {
          newChanged.add(key);
        }
      }
    }
    setChangedKeys(newChanged);
  }, [values]); // Rerun when Leva values change

  // Effect to initialize initialValues.current properly after Leva has initialized.
  // This is crucial because Leva might not provide the actual values on the very first call.
  useEffect(() => {
    initialValues.current = values;
  }, [Object.keys(values).join(',')]); // Re-capture if the set of keys in values changes (e.g. Leva loaded)

  return { values, changedKeys, set }; // Exposing set might be useful for programmatic changes
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
  scaleDrasticRate: { value: 10.6, min: 0, max: 100, step: 0.1, label: 'Drastic Scale Rate' }
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

// NEW: Adapted from ScrapbookBackground.js for more detailed image styling
const generateScrapbookImageStyle = (index: number, totalImages: number, currentWindow?: Window): React.CSSProperties => {
  const size = Math.random() * 100 + 150; // Random size between 150px and 250px
  let angle = 0;
  if (Math.random() < 0.8) { // 80% chance of being tilted
    angle = Math.random() * 30 - 15; // Random rotation between -15deg and 15deg
  }

  const cols = Math.ceil(Math.sqrt(totalImages));
  const rows = Math.ceil(totalImages / cols);
  const colIndex = index % cols;
  const rowIndex = Math.floor(index / cols);

  const xJitter = (Math.random() - 0.5) * 10; // % jitter
  const yJitter = (Math.random() - 0.5) * 10; // % jitter

  let topPercent = (rowIndex / rows) * 80 + 10 + yJitter;
  let leftPercent = (colIndex / cols) * 80 + 10 + xJitter;

  // Ensure positions are within bounds after considering image size (approx)
  // Access window properties only if window is available (client-side)
  const effectiveWindowHeight = typeof currentWindow !== 'undefined' ? currentWindow.innerHeight : 1000; // Default if window undefined
  const effectiveWindowWidth = typeof currentWindow !== 'undefined' ? currentWindow.innerWidth : 1000; // Default if window undefined

  topPercent = Math.max(5, Math.min(topPercent, 95 - (size / effectiveWindowHeight * 100)));
  leftPercent = Math.max(5, Math.min(leftPercent, 95 - (size / effectiveWindowWidth * 100)));

  return {
    position: 'absolute',
    width: `${size}px`,
    height: 'auto', // Maintain aspect ratio
    boxShadow: '3px 3px 10px rgba(0,0,0,0.2)',
    border: '5px solid white', // Polaroid effect
    transform: `rotate(${angle}deg)`,
    top: `${topPercent}%`,
    left: `${leftPercent}%`,
    opacity: 0.8, // Slight fade for background effect
    transition: 'transform 0.3s ease-out',
  };
};

const WeddingJourney: React.FC<WeddingJourneyProps> = ({ weddingData, resolvedScrapbookImages }) => {
  const {
    brideName, groomName, weddingDate,
    introBackground, introCouple, rsvpEndpoint
  } = weddingData;

  const parallaxRef = React.useRef<IParallax>(null);
  const [scrollY, setScrollY] = useState(0);
  const [currentWindow, setCurrentWindow] = useState<Window | undefined>(undefined);
  const [focusedImage, setFocusedImage] = useState<FocusedImageState | null>(null);

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

  // Use the custom tracked controls hook
  const { values: animControls, changedKeys: animChangedKeys } = useTrackedControls('Background Animation', backgroundAnimationSchema);
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
    scaleDrasticRate
  } = animControls; // Destructure values from the 'values' object returned by the hook

  // NEW: Leva Controls for Background Color
  const { values: bgControls, changedKeys: bgChangedKeys } = useTrackedControls('BackgroundColor Controls', backgroundColorControlsSchema);
  // Destructure all color controls
  const {
    colorStop1_Bottom, colorStop1_Top,
    colorStop2_Bottom, colorStop2_Top,
    colorStop3_Bottom, colorStop3_Top,
    colorStop4_Bottom, colorStop4_Top,
    colorStop5_Bottom, colorStop5_Top
  } = bgControls;

  // Untracked control for HUD visibility
  const { showHUD } = useLevaControls('Overall Controls', {
    showHUD: { value: true, label: 'Show Debug HUD' }
  });

  // Dynamically create and memoize gradientColorRGBs based on Leva controls
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
  
  const backgroundSpring = useSpring({
    opacity: backgroundOpacity,
    transform: `translateY(${currentTranslateY}%) scale(${currentScale})`,
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
  const rsvpFormSpeed = 0.3;

  const centerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  };

  // Merge all changedKeys for the HUD
  const allChangedKeys = useMemo(() => 
    new Set([...Array.from(animChangedKeys), ...Array.from(bgChangedKeys)])
  , [animChangedKeys, bgChangedKeys]);

  // Animation spring for the focused image backdrop
  const backdropSpring = useSpring({
    opacity: focusedImage ? 1 : 0,
    pointerEvents: focusedImage ? 'auto' : 'none' as 'auto' | 'none',
    config: { tension: 250, friction: 30 },
  });

  // Animation spring for the focused image container (handles position, scale, rotation)
  const [focusedImageContainerSpring, focusedImageApi] = useSpring(() => ({
    opacity: 0,
    top: '50%',
    left: '50%',
    width: '0px',
    transform: 'translate(-50%, -50%) rotate(0deg) scale(0.5)',
    config: { tension: 220, friction: 22 }, // Slightly softer
  }));

  // Animation spring for the info box content
  const infoBoxSpring = useSpring({
    opacity: focusedImage ? 1 : 0,
    transform: focusedImage ? 'translateY(0px)' : 'translateY(20px)',
    config: { tension: 250, friction: 26, delay: focusedImage ? 300 : 0 }, // Delay appearance
  });

  useEffect(() => {
    if (focusedImage) {
      focusedImageApi.start({
        opacity: 1,
        top: '50%',
        left: '50%',
        width: focusedImage.initialWidth,
        transform: `translate(-50%, -50%) rotate(0deg) scale(1.5)`,
        from: {
          opacity: 0,
          top: focusedImage.initialTop,
          left: focusedImage.initialLeft,
          width: focusedImage.initialWidth,
          transform: `rotate(${focusedImage.initialRotate}deg) scale(1)`,
        },
      });
    } else {
      focusedImageApi.start({
        opacity: 0,
        // Optional: Animate back to a neutral small spot or just rely on opacity
        // top: '50%', left: '50%', width: '0px', 
        // transform: 'translate(-50%, -50%) rotate(0deg) scale(0.5)',
      });
    }
  }, [focusedImage, focusedImageApi]);

  return (
    <>
      <Leva collapsed theme={levaTheme} />
      <animated.div
        className="wedding-journey-wrapper"
        style={{ 
          width: '100%', 
          height: '100vh', 
          overflow: 'hidden',
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
              fontSize: '16px',
              borderRadius: '4px',
              whiteSpace: 'pre-wrap' 
            }}
          >
            {`ScrollY: ${scrollY.toFixed(0)}
Opacity: ${backgroundOpacity.toFixed(3)}
Transform: ${backgroundSpring.transform.get()}
Changed: ${Array.from(allChangedKeys).join(', ')}
Gradient: ${currentGradientString}`}
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
                backgroundPosition: 'center bottom',
                transformOrigin: 'center bottom'
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
                const initialStyle = generateScrapbookImageStyle(index, resolvedScrapbookImages.length, currentWindow);
                const altText = `Scrapbook item ${index + 1}`;
                return (
                  <ScrapbookImageItem
                    key={index}
                    imageSrc={imageSrc}
                    initialStyle={initialStyle}
                    altText={altText}
                    onClick={() => {
                      // Extract rotation from initialStyle.transform
                      const rotateMatch = initialStyle.transform?.match(/rotate\(([-\d.]+)deg\)/);
                      const currentInitialRotate = rotateMatch && rotateMatch[1] ? parseFloat(rotateMatch[1]) : 0;

                      setFocusedImage({
                        src: imageSrc,
                        altText,
                        initialTop: initialStyle.top as string,
                        initialLeft: initialStyle.left as string,
                        initialWidth: initialStyle.width as string,
                        initialRotate: currentInitialRotate,
                        // Add placeholder data for description and photographer to see the box
                        description: "We're still this in love!",
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
          onClick={() => setFocusedImage(null)} 
        />

        {/* Animated Image Container - This moves and scales */} 
        {focusedImage && (
            <animated.div 
              style={{
                ...focusedImageContainerSpring, // Applied here
                position: 'fixed', // Fixed to viewport for centering
                // display: 'flex', // Removed to let children stack or be positioned absolutely
                // alignItems: 'center',
                // justifyContent: 'center',
                willChange: 'transform, opacity, top, left, width', // Perf hint
                zIndex: 1001, // Above backdrop
                pointerEvents: 'none', // Container itself shouldn't catch clicks meant for content/backdrop
              }}
            >
              <div onClick={(e) => e.stopPropagation()} style={{ pointerEvents: 'auto'}}> {/* Inner div to catch clicks and prevent closing modal*/}
                <img 
                  src={focusedImage.src}
                  alt={focusedImage.altText}
                  style={{
                    display: 'block',
                    maxWidth: '80vw',
                    maxHeight: '80vh', // Changed from 70vh to 80vh
                    width: 'auto', // Added to ensure image scales correctly with maxHeight
                    height: 'auto', // Added for consistency
                    objectFit: 'contain',
                    boxShadow: '0px 10px 30px rgba(0,0,0,0.5)',
                    border: '10px solid white',
                    borderRadius: '3px',
                  }}
                />
                {/* Info Box */} 
                {(focusedImage.description || focusedImage.photographer) && (
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
            </animated.div>
        )}
      </animated.div>
    </>
  );
};

export default WeddingJourney; 