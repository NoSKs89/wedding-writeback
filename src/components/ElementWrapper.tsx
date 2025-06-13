import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTrackedControls } from '../hooks/useTrackedControls.tsx';
import { ElementConfig, ExperienceSettings, TimelineMarker } from '../types';
import { useSetupMode } from '../contexts/SetupModeContext';

// Easing functions (can be moved to a utils file)
const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
const linear = (t: number) => t;
const easeInCubic = (t: number) => t * t * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInQuint = (t: number) => t * t * t * t * t;

const animationCurves: { [key: string]: (t: number) => number } = {
  linear: linear,
  easeInOutQuad: easeInOutQuad,
  easeInCubic: easeInCubic,
  easeOutCubic: easeOutCubic,
  easeInQuint: easeInQuint,
};

export type LockToViewportEdgeType = 'disabled' | 'imageBottom-viewportBottom' | 'imageTop-viewportTop';

interface ControlValues {
  opacity: number;
  landingYPosition: number;
  landingXPosition: number;
  startingScale: number;
  endingScale: number;
  scaleEndYPosition: number;
  scaleAnimationCurve: keyof typeof animationCurves | 'disabled';
  fadeOutEndYPosition: number;
  fadeOutAnimationCurve: keyof typeof animationCurves | 'disabled';
  lockToViewportEdge: LockToViewportEdgeType;
}

export interface ElementWrapperProps {
  children: React.ReactNode;
  element: ElementConfig;
  experienceSettings: ExperienceSettings;
  scrollY: number;
  windowHeight: number;
  TOTAL_PAGES: number;
  onControlChange: () => void;
}

const ElementWrapper: React.FC<ElementWrapperProps> = ({ 
  children, 
  element, 
  experienceSettings, 
  scrollY, 
  windowHeight, 
  TOTAL_PAGES,
  onControlChange,
}) => {
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const { isSetupMode } = useSetupMode();

  const controlsSchema = useMemo(() => {
    // Return a default empty schema if element.id doesn't exist to prevent leva errors
    if (!element || !element.id) {
        return {};
    }
    let schema: any = { 
      opacity: { value: 1, min: 0, max: 1, step: 0.01 },
    };

    if (element.type === 'text') {
      schema = {
        ...schema,
        landingYPosition: { value: 0, step: 1, label: 'Y Offset (px)' },
        fadeOutEndYPosition: { value: 1, min: 0, max: 1, step: 0.01, label: 'Fade Out End Y (% duration)' },
        fadeOutAnimationCurve: { value: 'disabled', options: ['disabled', ...Object.keys(animationCurves)], label: 'Fade Out Animation Curve' },
      };
    } else if (element.type === 'photo' && element.name !== 'background-image') {
      schema = {
        ...schema,
        landingXPosition: { value: 0, step: 1, label: 'X Offset (px)' },
        landingYPosition: { value: 0, step: 1, label: 'Y Offset (px)' },
        startingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Starting Scale' },
        endingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Ending Scale' },
        scaleEndYPosition: { value: 0.5, min: 0, max: 1, step: 0.01, label: 'Scale End Y (% duration)' },
        scaleAnimationCurve: { value: 'linear', options: Object.keys(animationCurves), label: 'Scale Animation Curve' },
        fadeOutEndYPosition: { value: 1, min: 0, max: 1, step: 0.01, label: 'Fade Out End Y (% duration)' },
        fadeOutAnimationCurve: { value: 'disabled', options: ['disabled', ...Object.keys(animationCurves)], label: 'Fade Out Animation Curve' },
        lockToViewportEdge: { 
          value: 'disabled',
          options: ['disabled', 'imageBottom-viewportBottom', 'imageTop-viewportTop'], 
          label: 'Lock to Viewport Edge'
        },
      };
    }
    // No special controls for RSVP Form component in this wrapper
    return schema;
  }, [element]);
  
  const folderName = `element_${element.id}_${element.name ? element.name.replace(/\s+/g, '_') : element.type.replace(/\s+/g, '_')}`;

  const { values } = useTrackedControls(folderName, controlsSchema, {
    hidden: !isSetupMode,
  });

  useEffect(() => {
    if (onControlChange) {
      onControlChange();
    }
  }, [values, onControlChange]);

  const {
    opacity = 1,
    landingYPosition = 0,
    landingXPosition = 0,
    startingScale = 1,
    endingScale = 1,
    scaleEndYPosition = 0.5,
    scaleAnimationCurve = 'linear',
    fadeOutEndYPosition = 1,
    fadeOutAnimationCurve = 'disabled',
    lockToViewportEdge = 'disabled' 
  } = (values || {}) as ControlValues;

  useEffect(() => {
    if (measuredHeight === 0) {
      setMeasuredHeight(window.innerHeight);
    }
  }, []);

  const pageMultiplier = TOTAL_PAGES > 1 ? TOTAL_PAGES - 1 : 0;
  const startMarker = experienceSettings.markers.find((m: TimelineMarker) => m.elementId === element.id && m.type === 'start');
  const endMarker = experienceSettings.markers.find((m: TimelineMarker) => m.elementId === element.id && m.type === 'end');
  
  const elementStartScroll = startMarker ? startMarker.position * pageMultiplier * windowHeight : 0;
  const elementEndScroll = endMarker ? endMarker.position * pageMultiplier * windowHeight : windowHeight * TOTAL_PAGES;
  const elementScrollDuration = Math.max(elementEndScroll - elementStartScroll, 1);

  let currentScale = 1;
  if (element.type === 'photo' && element.name !== 'background-image' && startingScale !== endingScale) {
    const scaleAnimationEndScrollPoint = elementStartScroll + (elementScrollDuration * scaleEndYPosition);
    const scaleProgress = Math.min(1, Math.max(0, (scrollY - elementStartScroll) / (scaleAnimationEndScrollPoint - elementStartScroll || 1)));
    const selectedScaleCurve = animationCurves[scaleAnimationCurve] || linear;
    currentScale = startingScale + (endingScale - startingScale) * selectedScaleCurve(scaleProgress);
  }

  let finalOpacity = opacity;
  if (fadeOutAnimationCurve !== 'disabled') {
    const fadeOutStartScrollPoint = elementStartScroll; // Or adjust if fade out starts later
    const fadeOutDurationScroll = elementScrollDuration * fadeOutEndYPosition;
    const safeFadeOutDurationScroll = fadeOutDurationScroll <= 0 ? 1 : fadeOutDurationScroll;
    const fadeOutProgress = Math.min(1, Math.max(0, (scrollY - fadeOutStartScrollPoint) / safeFadeOutDurationScroll));
    const selectedFadeOutCurve = animationCurves[fadeOutAnimationCurve] || linear;
    finalOpacity = opacity * (1 - selectedFadeOutCurve(fadeOutProgress));
  }

  // Revised transform logic inspired by the working GuestExperience.jsx
  let yTransformBase: number;
  const actualDisplayedHeight = measuredHeight * currentScale;
  const effectiveLockTo = lockToViewportEdge || 'disabled';
  const lockIsActive = effectiveLockTo !== 'disabled' && scrollY >= elementStartScroll && scrollY < elementEndScroll;

  if (lockIsActive && effectiveLockTo === 'imageBottom-viewportBottom') {
    yTransformBase = (windowHeight - actualDisplayedHeight) / 2;
  } else if (lockIsActive && effectiveLockTo === 'imageTop-viewportTop') {
    yTransformBase = -(windowHeight - actualDisplayedHeight) / 2;
  } else {
    // If ParallaxLayer perfectly centers, yTransformBase for centered content should be 0.
    yTransformBase = 0; 
  }
  
  const finalCalculatedYTransform = yTransformBase + landingYPosition;
  
  const elementStyle: React.CSSProperties = {
    opacity: finalOpacity,
    transform: `translateX(${landingXPosition}px) translateY(${finalCalculatedYTransform}px) scale(${currentScale})`,
    width: element.type === 'background-image' ? '100%' : 'auto',
    height: element.type === 'background-image' ? '100%' : 'auto',
    position: 'relative',
  };

  return <div style={elementStyle}>{children}</div>;
};

export default ElementWrapper;