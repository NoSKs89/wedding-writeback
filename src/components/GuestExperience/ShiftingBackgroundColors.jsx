import React, { useMemo } from 'react';
import { animated } from '@react-spring/web'; // Removed useSpring as it's not directly used for this simpler version
import { useTrackedControls } from '../../hooks/useTrackedControls';
import { useSetupMode } from '../../contexts/SetupModeContext';

const dynamicGradientControlsSchema = {
  gradientMode: {
    value: 'Scheme: Primary & Secondary',
    options: [
      'Scheme: Primary & Secondary',
      'Scheme: Primary & Accent',
      'Scheme: Secondary & Accent',
      'Scheme: Text & Background',
      'Override'
    ],
    label: 'Gradient Colors Source'
  },
  gradientColorStart: { value: '#ee0038', label: 'Grad. Start Color (Override)' },
  gradientColorStop: { value: '#00e1fe', label: 'Grad. Stop Color (Override)' },
  gradientAngleOffset: { value: -160, min: -360, max: 360, step: 1, label: 'Grad. Angle Offset (deg)' },
  gradientScrollFactor: { value: 0.34, min: -0.5, max: 0.5, step: 0.001, label: 'Grad. Scroll Angle Factor' },
  maxGradientOpacity: { value: 1.0, min: 0, max: 1, step: 0.01, label: 'Max Opacity' },
  startOpacity: { value: 0.0, min: 0, max: 1, step: 0.01, label: 'Start Opacity' },
  startFadeYPercent: { value: 0.0, min: 0, max: 1, step: 0.01, label: 'Opacity Start Y %' },
  endFadeYPercent: { value: 0.2, min: 0, max: 1, step: 0.01, label: 'Opacity End Y %' },
  opacityFadeCurve: {
    value: 'linear',
    options: ['linear', 'easeIn', 'easeOut', 'easeInOut'], // Placeholder for now, only linear implemented first
    label: 'Opacity Curve'
  }
};

const ShiftingBackgroundColors = ({ scrollY, TOTAL_PAGES, windowHeight, selectedColorScheme }) => {
  const { isSetupMode } = useSetupMode();

  const controls = useTrackedControls(
    'Dynamic Background Gradient',
    dynamicGradientControlsSchema,
    { collapsed: true, hidden: !isSetupMode } // Keep expanded in setup, hidden otherwise, AND COLLAPSED
  );

  const {
    gradientMode = dynamicGradientControlsSchema.gradientMode.value,
    gradientColorStart = dynamicGradientControlsSchema.gradientColorStart.value,
    gradientColorStop = dynamicGradientControlsSchema.gradientColorStop.value,
    gradientAngleOffset = dynamicGradientControlsSchema.gradientAngleOffset.value,
    gradientScrollFactor = dynamicGradientControlsSchema.gradientScrollFactor.value,
    maxGradientOpacity = dynamicGradientControlsSchema.maxGradientOpacity.value,
    startOpacity = dynamicGradientControlsSchema.startOpacity.value,
    startFadeYPercent = dynamicGradientControlsSchema.startFadeYPercent.value,
    endFadeYPercent = dynamicGradientControlsSchema.endFadeYPercent.value,
    opacityFadeCurve = dynamicGradientControlsSchema.opacityFadeCurve.value,
  } = controls?.values || {};

  // Determine actual gradient colors based on mode and scheme
  let actualStartColor = gradientColorStart;
  let actualEndColor = gradientColorStop;

  if (selectedColorScheme && gradientMode !== 'Override') {
    switch (gradientMode) {
      case 'Scheme: Primary & Secondary':
        actualStartColor = selectedColorScheme.primary || gradientColorStart;
        actualEndColor = selectedColorScheme.secondary || gradientColorStop;
        break;
      case 'Scheme: Primary & Accent':
        actualStartColor = selectedColorScheme.primary || gradientColorStart;
        actualEndColor = selectedColorScheme.accent || gradientColorStop;
        break;
      case 'Scheme: Secondary & Accent':
        actualStartColor = selectedColorScheme.secondary || gradientColorStart;
        actualEndColor = selectedColorScheme.accent || gradientColorStop;
        break;
      case 'Scheme: Text & Background':
        actualStartColor = selectedColorScheme.text || gradientColorStart;
        actualEndColor = selectedColorScheme.background || gradientColorStop;
        break;
      default:
        // Fallback to override if mode is unknown, though options should prevent this
        actualStartColor = gradientColorStart;
        actualEndColor = gradientColorStop;
    }
  }

  const currentAngle = gradientAngleOffset + scrollY * gradientScrollFactor;

  let currentOpacity = startOpacity;
  const parallaxScrollHeight = TOTAL_PAGES > 1 ? (TOTAL_PAGES -1) * windowHeight : 0; // Max scroll is (TOTAL_PAGES-1) screens

  const currentScrollYPercent = parallaxScrollHeight > 0 ? Math.min(scrollY / parallaxScrollHeight, 1) : 0;

  console.log('[ShiftingBackgroundColors] Recalculating Opacity:',
    {
      scrollY,
      TOTAL_PAGES,
      windowHeight,
      parallaxScrollHeight,
      currentScrollYPercent,
      controlsValues: controls?.values,
      destructuredMaxOpacity: maxGradientOpacity,
      destructuredStartOpacity: startOpacity,
      destructuredStartFadeY: startFadeYPercent,
      destructuredEndFadeY: endFadeYPercent,
    }
  );

  if (currentScrollYPercent <= startFadeYPercent) {
    currentOpacity = startOpacity;
  } else if (currentScrollYPercent >= endFadeYPercent) {
    currentOpacity = maxGradientOpacity;
  } else {
    const fadeDurationPercent = endFadeYPercent - startFadeYPercent;
    if (fadeDurationPercent <= 0) {
      currentOpacity = maxGradientOpacity;
    } else {
      const progressInFade = (currentScrollYPercent - startFadeYPercent) / fadeDurationPercent;
      currentOpacity = startOpacity + (maxGradientOpacity - startOpacity) * progressInFade;
    }
  }
  currentOpacity = Math.max(0, Math.min(1, currentOpacity));
  console.log('[ShiftingBackgroundColors] Final Calculated Opacity:', currentOpacity);

  const scrollPercentage = useMemo(() => {
    if (TOTAL_PAGES <= 1 || windowHeight <= 0) return 0;
    const totalScrollableHeight = (TOTAL_PAGES - 1) * windowHeight;
    return Math.min(1, Math.max(0, scrollY / totalScrollableHeight));
  }, [scrollY, TOTAL_PAGES, windowHeight]);

  return (
    <animated.div // Can be a simple div if no other animations are directly on it
      style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(${currentAngle.toFixed(2)}deg, ${actualStartColor}, ${actualEndColor})`,
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: -1, // Relative zIndex within its ParallaxLayer
        opacity: currentOpacity,
      }}
    />
  );
};

export default ShiftingBackgroundColors; 