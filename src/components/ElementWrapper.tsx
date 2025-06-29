import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useControls } from 'leva';
import { useLevaStore } from '../stores/levaStore';
import { ElementConfig, ExperienceSettings, TimelineMarker } from '../types';
import { useSetupMode } from '../contexts/SetupModeContext';
import { getElementSchema, animationCurves, generateElementFolderName } from './GuestExperience/levaSchemas';
import { fontFamilyOptions } from '../config/fontConfig';

const linear = (t: number) => t;

export type LockToViewportEdgeType = 'disabled' | 'imageBottom-viewportBottom' | 'imageTop-viewportTop';

interface ControlValues {
  opacityAtStart: number;
  opacityAtMiddle: number;
  opacityAtEnd: number;
  opacityAnimationCurve: keyof typeof animationCurves | 'disabled';
  landingXPosition: number;
  landingYPosition: number;
  startingScale: number;
  endingScale: number;
  scaleEndYPosition: number;
  scaleAnimationCurve: keyof typeof animationCurves | 'disabled';
  lockToViewportEdge: LockToViewportEdgeType;
  textColor: string;
  fontFamily: string;
  fontSize: number;
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
  paddingLeft: number;
  paddingRight: number;
  enableParentContainer: boolean;
  containerSize: number;
}

export interface ElementWrapperProps {
  children: React.ReactNode;
  element: ElementConfig;
  experienceSettings: ExperienceSettings;
  scrollY: number;
  windowHeight: number;
  TOTAL_PAGES: number;
  layoutSettingsFromPreview?: any;
  overallFontFamily?: any;
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
  const currentChildRef = useRef<HTMLElement>(null);
  
  const folderName = useMemo(() => {
    return generateElementFolderName(element);
  }, [element]);
  
  const getInitialValues = useLevaStore(state => state.controlValues[folderName]);
  const updateControlValuesInStore = useLevaStore(state => state.updateControlValues);

  const fontToUse = typeof overallFontFamily === 'string' ? overallFontFamily : overallFontFamily.value;

  const controlsSchema = useMemo(() => {
    const schema = getElementSchema(element, fontToUse);
    const initialValues = getInitialValues || {};
    const schemaWithValues = Object.keys(schema).reduce((acc, key) => {
        const a = schema as any;
        const b = initialValues as any;
        acc[key] = { ...a[key], value: b[key] ?? a[key].value };
        return acc;
    }, {} as { [key: string]: any });
    return schemaWithValues;
  }, [element, fontToUse, getInitialValues]);

  // --- Dynamic Label for Leva Folder ---
  const dynamicFolderTitle = useMemo(() => {
    return folderName;
  }, [folderName]);

  const levaValues = useControls(
    dynamicFolderTitle,
    controlsSchema,
    { collapsed: true, render: () => isSetupMode && !layoutSettingsFromPreview },
    [controlsSchema]
  );
  
  const values = layoutSettingsFromPreview 
    ? (layoutSettingsFromPreview[folderName] || {}) 
    : isSetupMode 
      ? levaValues 
      : (getInitialValues || {});

  useEffect(() => {
    if (!layoutSettingsFromPreview) {
      updateControlValuesInStore(folderName, values);
    }
  }, [values, folderName, updateControlValuesInStore, layoutSettingsFromPreview]);

  // Debug logging to track what values are being used
  useEffect(() => {
    if (element.id === 1) { // Only log for first element to avoid spam
      console.log(`%c[ElementWrapper] ${folderName} values:`, 'color: purple', {
        isSetupMode,
        hasLayoutSettingsFromPreview: !!layoutSettingsFromPreview,
        hasGetInitialValues: !!getInitialValues,
        hasLevaValues: !!levaValues && Object.keys(levaValues).length > 0,
        valuesKeys: Object.keys(values),
        sampleValue: values.textColor || values.landingXPosition || 'none'
      });
    }
  }, [values, isSetupMode, folderName, element.id]);

  const {
    opacityAtStart = 1,
    opacityAtMiddle = 1,
    opacityAtEnd = 1,
    opacityAnimationCurve = 'linear',
    landingXPosition = 0,
    landingYPosition = 0,
    startingScale = 1, 
    endingScale = 1, 
    scaleEndYPosition = 0.5, 
    scaleAnimationCurve = 'linear',
    lockToViewportEdge = 'disabled',
    textColor = '#333333',
    fontFamily = fontToUse,
    fontSize = 16,
    fontSizeAtStart = 16,
    fontSizeAtEnd = 16,
    fontSizeAnimationCurve = 'linear',
    lineHeight = 1.5,
    spreadAnimationCurve = 'linear',
    yOffsetAtAnimStart = 0,
    yOffsetAtAnimEnd = 0,
    letterSpacingAtAnimStart = 0,
    letterSpacingAtAnimEnd = 0,
    cropToCircleEffect = false,
    circleEffectCurve = 'linear',
    circleInitialRadius = 150,
    circleFinalRadius = 0,
    bgImageInitialScale = 1,
    bgImageFinalScale = 0.1,
    textShadowEffect = false,
    textShadowCurve = 'linear',
    textShadowXStart = 0,
    textShadowYStart = 0,
    textShadowBlurStart = 0,
    textShadowXEnd = 2,
    textShadowYEnd = 2,
    textShadowBlurEnd = 3,
    textShadowColor = 'rgba(0,0,0,0.5)',
    paddingLeft = 0,
    paddingRight = 0,
    enableParentContainer = false,
    containerSize = 400
  } = values as ControlValues;

  const [measuredHeight, setMeasuredHeight] = useState(0);
  useEffect(() => {
    if (currentChildRef.current) {
        setMeasuredHeight(currentChildRef.current.offsetHeight);
    }
  }, [children, currentChildRef.current]);

  const pageMultiplier = TOTAL_PAGES > 1 ? TOTAL_PAGES - 1 : 0;
  const startMarker = experienceSettings.markers.find((m: TimelineMarker) => m.elementId === element.id && m.type === 'start');
  const endMarker = experienceSettings.markers.find((m: TimelineMarker) => m.elementId === element.id && m.type === 'end');
  
  const elementStartScroll = startMarker ? startMarker.position * pageMultiplier * windowHeight : 0;
  const elementEndScroll = endMarker ? endMarker.position * pageMultiplier * windowHeight : windowHeight * TOTAL_PAGES;
  const elementScrollDuration = Math.max(elementEndScroll - elementStartScroll, 1);

  const rawElementScrollProgress = useMemo(() => {
    if (elementScrollDuration <= 0) return scrollY >= elementStartScroll ? 1 : 0;
    const progress = (scrollY - elementStartScroll) / elementScrollDuration;
    return Math.min(1, Math.max(0, progress));
  }, [scrollY, elementStartScroll, elementScrollDuration]);


  let finalOpacity = opacityAtEnd;
  if (opacityAnimationCurve !== 'disabled') {
    const selectedCurve = animationCurves[opacityAnimationCurve] || linear;
    const easedProgress = selectedCurve(rawElementScrollProgress);
    if (easedProgress <= 0.5) {
      const progressFirstHalf = easedProgress * 2;
      finalOpacity = opacityAtStart + (opacityAtMiddle - opacityAtStart) * progressFirstHalf;
    } else {
      const progressSecondHalf = (easedProgress - 0.5) * 2;
      finalOpacity = opacityAtMiddle + (opacityAtEnd - opacityAtMiddle) * progressSecondHalf;
    }
  }

  let currentScale = 1;
  if (element.type === 'photo' && element.name !== 'background-image' && startingScale !== endingScale) {
    const scaleAnimationEndScrollPoint = elementStartScroll + (elementScrollDuration * scaleEndYPosition);
    const scaleProgress = Math.min(1, Math.max(0, (scrollY - elementStartScroll) / (scaleAnimationEndScrollPoint - elementStartScroll || 1)));
    const selectedScaleCurve = animationCurves[scaleAnimationCurve as keyof typeof animationCurves] || linear;
    currentScale = startingScale + (endingScale - startingScale) * selectedScaleCurve(scaleProgress);
  }

  let currentAnimatedYOffset = 0;
  let letterSpacingToApply = letterSpacingAtAnimEnd;
  let currentFontSize = fontSizeAtEnd;
  let textShadowToApply = 'none';

  if (element.type === 'text') {
    if (spreadAnimationCurve !== 'disabled') {
      const selectedCurve = animationCurves[spreadAnimationCurve as keyof typeof animationCurves] || linear;
      const easedProgress = selectedCurve(rawElementScrollProgress);
      currentAnimatedYOffset = yOffsetAtAnimStart + (yOffsetAtAnimEnd - yOffsetAtAnimStart) * easedProgress;
      letterSpacingToApply = letterSpacingAtAnimStart + (letterSpacingAtAnimEnd - letterSpacingAtAnimStart) * easedProgress;
    }

    if (fontSizeAnimationCurve !== 'disabled') {
        const selectedCurve = animationCurves[fontSizeAnimationCurve as keyof typeof animationCurves] || linear;
        const easedProgress = selectedCurve(rawElementScrollProgress);
        currentFontSize = fontSizeAtStart + (fontSizeAtEnd - fontSizeAtStart) * easedProgress;
    }
      
    if (textShadowEffect) {
        if (textShadowCurve !== 'disabled') {
            const selectedCurve = animationCurves[textShadowCurve as keyof typeof animationCurves] || linear;
            const easedProgress = selectedCurve(rawElementScrollProgress);
            const currentX = textShadowXStart + (textShadowXEnd - textShadowXStart) * easedProgress;
            const currentY = textShadowYStart + (textShadowYEnd - textShadowYStart) * easedProgress;
            const currentBlur = textShadowBlurStart + (textShadowBlurEnd - textShadowBlurStart) * easedProgress;
            textShadowToApply = `${currentX}px ${currentY}px ${currentBlur}px ${textShadowColor}`;
        } else {
            textShadowToApply = `${textShadowXEnd}px ${textShadowYEnd}px ${textShadowBlurEnd}px ${textShadowColor}`;
        }
    }
  }

  let clipPathToApply = 'none';
  let scaleForBgImage = bgImageInitialScale;
  if (element.type === 'background-image' && cropToCircleEffect) {
      if (circleEffectCurve !== 'disabled') {
          const selectedCurve = animationCurves[circleEffectCurve as keyof typeof animationCurves] || linear;
          const easedProgress = selectedCurve(rawElementScrollProgress);
          const currentRadius = circleInitialRadius + (circleFinalRadius - circleInitialRadius) * easedProgress;
          clipPathToApply = `circle(${currentRadius}% at 50% 50%)`;
          scaleForBgImage = bgImageInitialScale + (bgImageFinalScale - bgImageInitialScale) * easedProgress;
      } else {
          clipPathToApply = `circle(${circleInitialRadius}% at 50% 50%)`;
      }
  }

  let yTransformBase: number = 0;
  const actualDisplayedHeight = measuredHeight * currentScale;
  const lockIsActive = lockToViewportEdge !== 'disabled' && scrollY >= elementStartScroll && scrollY < elementEndScroll;

  if (lockIsActive) {
      if (lockToViewportEdge === 'imageBottom-viewportBottom') {
          yTransformBase = (windowHeight - actualDisplayedHeight) / 2;
      } else if (lockToViewportEdge === 'imageTop-viewportTop') {
          yTransformBase = -(windowHeight - actualDisplayedHeight) / 2;
      }
  }
  
  const finalCalculatedYTransform = yTransformBase + landingYPosition + currentAnimatedYOffset;
  
  const elementStyle: React.CSSProperties = {
    opacity: finalOpacity,
    transform: `translate(${landingXPosition}px, ${finalCalculatedYTransform}px) scale(${element.type === 'background-image' ? scaleForBgImage : currentScale})`,
    width: element.type === 'background-image' ? '100%' : 'fit-content',
    height: element.type === 'background-image' ? '100%' : 'auto',
    color: textColor,
    fontFamily: fontFamily,
    fontSize: `${currentFontSize}px`,
    lineHeight: lineHeight,
    letterSpacing: `${letterSpacingToApply}px`,
    textShadow: textShadowToApply,
    paddingLeft: `${paddingLeft}px`,
    paddingRight: `${paddingRight}px`,
    position: 'relative',
    clipPath: clipPathToApply,
    willChange: 'transform, opacity',
    boxSizing: 'border-box'
  };

  const childWithRef = React.isValidElement(children) ? React.cloneElement(children as React.ReactElement, { ref: currentChildRef }) : children;

  if (element.type === 'text' && React.isValidElement(childWithRef)) {
      const existingStyle = (childWithRef.props as any).style || {};
      const newStyle = {
          ...existingStyle,
          color: textColor,
          fontFamily: fontFamily,
          fontSize: `${currentFontSize}px`,
          letterSpacing: `${letterSpacingToApply}px`,
          lineHeight: lineHeight,
          textShadow: textShadowToApply,
      };
      
      // Apply container constraints if enabled
      const containerStyle: React.CSSProperties = enableParentContainer ? {
          ...elementStyle,
          width: `${containerSize}px`,
          maxWidth: `${containerSize}px`,
          wordWrap: 'break-word' as const,
          whiteSpace: 'normal' as const
      } : elementStyle;
      
      return <div style={containerStyle}>{React.cloneElement(childWithRef as React.ReactElement, {style: newStyle})}</div>;
  }
  
  return <div style={elementStyle}>{childWithRef}</div>;
};

export default ElementWrapper;