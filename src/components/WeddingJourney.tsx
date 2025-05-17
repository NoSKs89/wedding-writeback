import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Parallax, ParallaxLayer, IParallax } from '@react-spring/parallax';
import { useSpring, animated } from 'react-spring';
import { Leva, useControls as useLevaControls } from 'leva';
import RSVPForm from './RSVPForm';
import styles from './styles.module.css';
import '../App.css';

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

const levaTheme = {
  sizes: {
    rootWidth: '400px', // Increase panel width
  },
  // You can add other theme customizations here if needed
};

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

// Helper to generate scrapbook image styles (remains largely the same, but ensure CSS works)
const generateScrapbookImageStyle = (index: number, totalImages: number): React.CSSProperties => {
  const size = Math.random() * 80 + 120;
  const angle = Math.random() * 20 - 10;
  // Adjust positioning logic if needed for ParallaxLayer context
  const xBase = (index % Math.max(1, Math.floor(totalImages / 2))) * (100 / Math.max(1, Math.floor(totalImages / 2)));
  const yBase = Math.floor(index / Math.max(1, Math.floor(totalImages / 2))) * 30;
  const topPercent = yBase + (Math.random() * 20);
  const leftPercent = xBase + (Math.random() * 20 - 10);

  return {
    position: 'absolute',
    width: `${size}px`,
    height: 'auto',
    transform: `rotate(${angle}deg)`,
    top: `${Math.min(80, Math.max(5, topPercent))}%`,
    left: `${Math.min(80, Math.max(5, leftPercent))}%`,
    // Using className for base styles, specific styles applied inline
  };
};

const WeddingJourney: React.FC<WeddingJourneyProps> = ({ weddingData, resolvedScrapbookImages }) => {
  const {
    brideName, groomName, weddingDate,
    introBackground, introCouple, rsvpEndpoint
  } = weddingData;

  const parallaxRef = React.useRef<IParallax>(null);
  const [scrollY, setScrollY] = useState(0);

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
  const { values: controls, changedKeys } = useTrackedControls('Background Animation', backgroundAnimationSchema);
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
  } = controls; // Destructure values from the 'values' object returned by the hook

  // Untracked control for HUD visibility
  const { showHUD } = useLevaControls('Overall Controls', {
    showHUD: { value: true, label: 'Show Debug HUD' }
  });

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

  return (
    <>
      <Leva collapsed theme={levaTheme} />
      <div className="wedding-journey-wrapper" style={{ width: '100%', height: '100vh', background: '#000', overflow: 'hidden' }}>
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
Changed: ${Array.from(changedKeys).join(', ')}`}
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

          {/* Scrapbook Layer */}
          {/* {resolvedScrapbookImages && resolvedScrapbookImages.length > 0 && (
            <ParallaxLayer
              offset={scrapbookOffset}
              speed={scrapbookSpeed}
              style={{ ...centerStyle, zIndex: 3 }} // Higher zIndex
            >
              <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
                {resolvedScrapbookImages.map((src, index) => (
                  <div
                    key={`scrap-${index}`}
                    // Apply base class and dynamic styles
                    className="scrapbookImage" 
                    style={{ 
                      ...generateScrapbookImageStyle(index, resolvedScrapbookImages.length),
                      zIndex: index + 1 
                    }}
                  >
                    <img 
                      src={src} 
                      alt={`Scrapbook ${index + 1}`} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                ))}
              </div>
            </ParallaxLayer>
          )} */}

          {/* RSVP Form Layer */}
          <ParallaxLayer
            offset={rsvpFormOffset}
            speed={rsvpFormSpeed}
            style={{ ...centerStyle, zIndex: 100 }}
          >
            <div>
              <RSVPForm weddingData={weddingData} backendUrl={rsvpEndpoint} />
            </div>
          </ParallaxLayer>

        </Parallax>
      </div>
    </>
  );
};

export default WeddingJourney; 