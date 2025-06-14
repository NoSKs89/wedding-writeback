import React, { useState, useEffect, useMemo } from 'react';
import { useControls, folder } from 'leva';
import { useLevaStore } from '../stores/levaStore';
import { ElementConfig, ExperienceSettings, TimelineMarker } from '../types';
import { useSetupMode } from '../contexts/SetupModeContext';
import { getElementSchema, animationCurves } from './GuestExperience/levaSchemas';
import { fontFamilyOptions } from '../config/fontConfig';

const linear = (t: number) => t;

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
  opacityAtStart: number;
  opacityAtMiddle: number;
  opacityAtEnd: number;
  opacityAnimationCurve: keyof typeof animationCurves | 'disabled';
  textColor: string;
  fontFamily: string;
  fontSizeAtStart: number;
  fontSizeAtEnd: number;
  fontSizeAnimationCurve: keyof typeof animationCurves | 'disabled';
  lineHeight: number;
  spreadAnimationCurve: keyof typeof animationCurves | 'disabled';
  yOffsetAtAnimStart: number;
  yOffsetAtAnimEnd: number;
  letterSpacingAtAnimStart: number;
  letterSpacingAtAnimEnd: number;
  textShadowEffect: boolean;
  textShadowCurve: keyof typeof animationCurves | 'disabled';
  textShadowXStart: number;
  textShadowYStart: number;
  textShadowBlurStart: number;
  textShadowXEnd: number;
  textShadowYEnd: number;
  textShadowBlurEnd: number;
  textShadowColor: string;
  cropToCircleEffect: boolean;
  circleEffectCurve: keyof typeof animationCurves | 'disabled';
  circleInitialRadius: number;
  circleFinalRadius: number;
  bgImageInitialScale: number;
  bgImageFinalScale: number;
  fontSize: number;
}

export interface ElementWrapperProps {
  children: React.ReactNode;
  element: ElementConfig;
  experienceSettings: ExperienceSettings;
  scrollY: number;
  windowHeight: number;
  TOTAL_PAGES: number;
  layoutSettingsFromPreview?: any;
  overallFontFamily?: string;
}

const ElementWrapper: React.FC<ElementWrapperProps> = ({ 
  children, 
  element, 
  experienceSettings, 
  scrollY, 
  windowHeight, 
  TOTAL_PAGES,
  layoutSettingsFromPreview,
  overallFontFamily = fontFamilyOptions[0]
}) => {
  const { isSetupMode } = useSetupMode();
  
  const folderName = useMemo(() => `element_${element.id}_${element.name ? element.name.replace(/\s+/g, '_') : element.type.replace(/\s+/g, '_')}`, [element.id, element.name, element.type]);
  
  const getInitialValues = useLevaStore(state => state.controlValues[folderName]);
  const updateControlValuesInStore = useLevaStore(state => state.updateControlValues);

  const controlsSchema = useMemo(() => {
    const schema: any = getElementSchema(element, overallFontFamily);
    const initialValues = getInitialValues || {};
    const schemaWithValues = Object.keys(schema).reduce((acc, key) => {
        acc[key] = { ...schema[key], value: initialValues[key] ?? schema[key].value };
        return acc;
    }, {} as { [key: string]: any });
    return schemaWithValues;
  }, [element, overallFontFamily, getInitialValues]);

  const levaValues = useControls(folderName, controlsSchema, { render: () => isSetupMode && !layoutSettingsFromPreview }, [controlsSchema]);
  
  const values = layoutSettingsFromPreview ? layoutSettingsFromPreview[folderName] || {} : levaValues;

  useEffect(() => {
    if (!layoutSettingsFromPreview) {
      updateControlValuesInStore(folderName, values);
    }
  }, [values, folderName, updateControlValuesInStore, layoutSettingsFromPreview]);

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
    lockToViewportEdge = 'disabled',
    opacityAtStart = 1,
    opacityAtMiddle = 1,
    opacityAtEnd = 1,
    opacityAnimationCurve = 'linear',
    textColor = '#333333',
    fontFamily = overallFontFamily,
    fontSizeAtStart = 16,
    fontSizeAtEnd = 16,
    fontSizeAnimationCurve = 'linear',
    lineHeight = 1.5,
    spreadAnimationCurve = 'linear',
    yOffsetAtAnimStart = 0,
    yOffsetAtAnimEnd = 0,
    letterSpacingAtAnimStart = 0,
    letterSpacingAtAnimEnd = 0,
    textShadowEffect = false,
    textShadowCurve = 'linear',
    textShadowXStart = 0,
    textShadowYStart = 0,
    textShadowBlurStart = 0,
    textShadowXEnd = 2,
    textShadowYEnd = 2,
    textShadowBlurEnd = 3,
    textShadowColor = 'rgba(0,0,0,0.5)',
    cropToCircleEffect = false,
    circleEffectCurve = 'linear',
    circleInitialRadius = 150,
    circleFinalRadius = 0,
    bgImageInitialScale = 1,
    bgImageFinalScale = 0.1,
    fontSize = 16,
  } = values as ControlValues;

  const [measuredHeight, setMeasuredHeight] = useState(0);
  useEffect(() => {
    setMeasuredHeight(windowHeight);
  }, [windowHeight]);

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
    const selectedScaleCurve = animationCurves[scaleAnimationCurve as keyof typeof animationCurves] || linear;
    currentScale = startingScale + (endingScale - startingScale) * selectedScaleCurve(scaleProgress);
  }

  let finalOpacity = opacity;
  if (fadeOutAnimationCurve !== 'disabled') {
    const fadeOutStartScrollPoint = elementStartScroll;
    const fadeOutDurationScroll = elementScrollDuration * fadeOutEndYPosition;
    const safeFadeOutDurationScroll = fadeOutDurationScroll <= 0 ? 1 : fadeOutDurationScroll;
    const fadeOutProgress = Math.min(1, Math.max(0, (scrollY - fadeOutStartScrollPoint) / safeFadeOutDurationScroll));
    const selectedFadeOutCurve = animationCurves[fadeOutAnimationCurve as keyof typeof animationCurves] || linear;
    finalOpacity = opacity * (1 - selectedFadeOutCurve(fadeOutProgress));
  }

  const elementProgress = Math.max(0, Math.min(1, (scrollY - elementStartScroll) / elementScrollDuration));

  if (opacityAnimationCurve !== 'disabled') {
    if (elementProgress < 0.5) {
        const progress = elementProgress * 2;
        finalOpacity = opacityAtStart + (opacityAtMiddle - opacityAtStart) * progress;
    } else {
        const progress = (elementProgress - 0.5) * 2;
        finalOpacity = opacityAtMiddle + (opacityAtEnd - opacityAtMiddle) * progress;
    }
  }

  let yTransformBase: number;
  const actualDisplayedHeight = measuredHeight * currentScale;
  const effectiveLockTo = lockToViewportEdge || 'disabled';
  const lockIsActive = effectiveLockTo !== 'disabled' && scrollY >= elementStartScroll && scrollY < elementEndScroll;

  if (lockIsActive && effectiveLockTo === 'imageBottom-viewportBottom') {
    yTransformBase = (windowHeight - actualDisplayedHeight) / 2;
  } else if (lockIsActive && effectiveLockTo === 'imageTop-viewportTop') {
    yTransformBase = -(windowHeight - actualDisplayedHeight) / 2;
  } else {
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