import React from 'react';
import { ParallaxLayer, IParallax } from '@react-spring/parallax';
import { useSpring, animated } from 'react-spring';
import styles from './styles.module.css'; // Assuming styles.background is used

interface AnimControlValues {
  opacityGentleEnd: number;
  opacityTargetAtGentleEnd: number;
  opacityDrasticStartPixels: number;
  opacityTargetAtDrasticStart: number;
  opacityFullTransparent: number;
  translateYThreshold?: number; // Not used directly by background image itself but part of schema
  translateYMultiplier?: number; // Not used directly by background image itself
  scaleInitialRate: number;
  scaleDrasticStartPx: number;
  scaleDrasticRate: number;
  borderRadiusStartScrollY: number;
  clipPathVanishScrollY: number;
}

interface ParallaxBackgroundImageProps {
  introBackgroundUrl: string;
  scrollY: number;
  animControls: AnimControlValues;
  currentWindow: Window | undefined;
  backgroundStickyStart: number;
  backgroundStickyEnd: number;
}

const ParallaxBackgroundImage: React.FC<ParallaxBackgroundImageProps> = ({
  introBackgroundUrl,
  scrollY,
  animControls,
  currentWindow,
  backgroundStickyStart,
  backgroundStickyEnd,
}) => {
  const {
    opacityGentleEnd,
    opacityTargetAtGentleEnd,
    opacityDrasticStartPixels,
    opacityTargetAtDrasticStart,
    opacityFullTransparent,
    scaleInitialRate,
    scaleDrasticStartPx,
    scaleDrasticRate,
    borderRadiusStartScrollY,
    clipPathVanishScrollY,
  } = animControls;

  // Opacity Calculation (three-stage) - Copied from WeddingJourney
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

  // Scale Calculation (two-stage rate) - Copied from WeddingJourney
  const FADE_OUT_SCROLL_RANGE_PIXELS = opacityFullTransparent; 
  const overallScrollProgress = FADE_OUT_SCROLL_RANGE_PIXELS > 0 ? Math.min(1, Math.max(0, scrollY / FADE_OUT_SCROLL_RANGE_PIXELS)) : 0;
  let scaleIncrease = 0;
  const scaleThresholdProgress = FADE_OUT_SCROLL_RANGE_PIXELS > 0 ? Math.min(1, Math.max(0, scaleDrasticStartPx / FADE_OUT_SCROLL_RANGE_PIXELS)) : 0;

  if (scaleDrasticStartPx <= 0 || overallScrollProgress <= scaleThresholdProgress || scaleDrasticStartPx >= FADE_OUT_SCROLL_RANGE_PIXELS) {
    scaleIncrease = scaleInitialRate * overallScrollProgress;
  } else { 
    const scaleAtThresholdPoint = scaleInitialRate * scaleThresholdProgress;
    const progressAfterThreshold = overallScrollProgress - scaleThresholdProgress;
    const remainingProgressRangeForDrasticScale = 1 - scaleThresholdProgress;
    if (remainingProgressRangeForDrasticScale > 0) {
         scaleIncrease = scaleAtThresholdPoint + scaleDrasticRate * progressAfterThreshold;
    } else {
        scaleIncrease = scaleAtThresholdPoint; 
    }
  }
  const currentScale = 1 + scaleIncrease; 

  // Clip-Path Calculation for circular effect - Copied from WeddingJourney
  let calculatedClipPathValue = 'circle(70.7107% at 50% 50%)'; 
  const localRoundingStart = borderRadiusStartScrollY;
  const localRoundingEnd = clipPathVanishScrollY; 

  if (currentWindow && localRoundingEnd > localRoundingStart && scrollY > localRoundingStart) {
    const linearProgress = Math.min(1, Math.max(0, (scrollY - localRoundingStart) / (localRoundingEnd - localRoundingStart)));
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
    calculatedClipPathValue = `circle(${current_R_percentage.toFixed(2)}% at 50% 50%)`;
  } else if (currentWindow && scrollY >= localRoundingEnd && localRoundingEnd > localRoundingStart) {
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

  return (
    <ParallaxLayer
      sticky={{ start: backgroundStickyStart, end: backgroundStickyEnd }}
      style={{ zIndex: -1, overflow: 'hidden' }}
    >
      <animated.div
        style={{
          ...backgroundSpring,
          width: '100%',
          height: '100vh',
          backgroundImage: `url(${introBackgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          transformOrigin: 'center center',
        }}
        className={styles.background} // Assuming this class primarily sets background-specifics not covered by spring
      />
    </ParallaxLayer>
  );
};

export default ParallaxBackgroundImage; 