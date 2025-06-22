import React, { useMemo, useState, useEffect } from 'react';
import { animated } from '@react-spring/web'; // Removed useSpring as it's not directly used for this simpler version
// import { useTrackedControls } from '../../hooks/useTrackedControls';
import { useSetupMode } from '../../contexts/SetupModeContext';
import { useControls } from 'leva';
import { useLevaStore } from '../../stores/levaStore';

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

const ShiftingBackgroundColors = ({ scrollY, TOTAL_PAGES, windowHeight, selectedColorScheme, gradientControls: gradientControlsFromProp = null }) => {
  const { isSetupMode } = useSetupMode();
  const updateControlValuesInStore = useLevaStore(state => state.updateControlValues);
  const getInitialValues = useLevaStore(state => state.controlValues['Dynamic Background Gradient']);

  const controlsSchemaWithValues = useMemo(() => {
    const schema = dynamicGradientControlsSchema;
    const initialValues = getInitialValues || {};
    return Object.keys(schema).reduce((acc, key) => {
      const a = schema;
      const b = initialValues;
      acc[key] = { ...a[key], value: b[key] ?? a[key].value };
      return acc;
    }, {});
  }, [getInitialValues]);

  const levaValues = useControls(
    'Dynamic Background Gradient',
    controlsSchemaWithValues,
    { collapsed: true, render: () => isSetupMode },
    [controlsSchemaWithValues]
  );

  // Use controls from props if available (for preview), otherwise use live Leva values (for editor)
  const controlValues = gradientControlsFromProp || levaValues;

  useEffect(() => {
    // Only update the store if we are in setup mode and not using props
    // This prevents the preview page from trying to write back to the store
    if (isSetupMode && !gradientControlsFromProp) {
      updateControlValuesInStore('Dynamic Background Gradient', controlValues);
    }
  }, [controlValues, isSetupMode, updateControlValuesInStore, gradientControlsFromProp]);

  const {
    gradientMode,
    gradientColorStart,
    gradientColorStop,
    gradientAngleOffset,
    gradientScrollFactor,
    maxGradientOpacity,
    startOpacity,
    startFadeYPercent,
    endFadeYPercent,
    opacityFadeCurve,
  } = controlValues;

  // Determine actual gradient colors based on mode and scheme
  let actualStartColor = gradientColorStart;
  let actualEndColor = gradientColorStop;

  if (selectedColorScheme && gradientMode !== 'Override') {
    switch (gradientMode) {
      case 'Scheme: Primary & Secondary':
        actualStartColor = selectedColorScheme.colors.primary || gradientColorStart;
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

  const currentAngle = (gradientAngleOffset || 0) + scrollY * (gradientScrollFactor || 0);

  let currentOpacity = startOpacity;
  const parallaxScrollHeight = TOTAL_PAGES > 1 ? (TOTAL_PAGES - 1) * windowHeight : 0;

  const currentScrollYPercent = parallaxScrollHeight > 0 ? Math.min(scrollY / parallaxScrollHeight, 1) : 0;

  if (currentScrollYPercent <= (startFadeYPercent || 0)) {
    currentOpacity = startOpacity;
  } else if (currentScrollYPercent >= (endFadeYPercent || 1)) {
    currentOpacity = maxGradientOpacity;
  } else {
    const fadeDurationPercent = (endFadeYPercent || 1) - (startFadeYPercent || 0);
    if (fadeDurationPercent <= 0) {
      currentOpacity = maxGradientOpacity;
    } else {
      const progressInFade = (currentScrollYPercent - (startFadeYPercent || 0)) / fadeDurationPercent;
      currentOpacity = (startOpacity || 0) + ((maxGradientOpacity || 1) - (startOpacity || 0)) * progressInFade;
    }
  }
  currentOpacity = Math.max(0, Math.min(1, currentOpacity || 0));

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