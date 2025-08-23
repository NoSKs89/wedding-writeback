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
  // Rotate In Animation Properties
  rotateInEffect: boolean;
  rotateInType: string;
  rotateInCurve: keyof typeof animationCurves | 'disabled';
  rotateInDuration: number;
  // Translate In Animation Properties
  translateInEffect: boolean;
  translateInDirection: string;
  translateInCurve: keyof typeof animationCurves | 'disabled';
  translateInDuration: number;
  translateInDistance: number;
  // Video-specific properties
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  showControls: boolean;
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
    containerSize = 400,
    // Rotate In Animation defaults
    rotateInEffect = false,
    rotateInType = 'vertical-90',
    rotateInCurve = 'linear',
    rotateInDuration = 0.5,
    // Translate In Animation defaults
    translateInEffect = false,
    translateInDirection = 'from-left',
    translateInCurve = 'linear',
    translateInDuration = 0.5,
    translateInDistance = 200,
    // Video-specific properties
    autoplay = false,
    loop = false,
    muted = false,
    showControls = true
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
  if ((element.type === 'photo' && element.name !== 'background-image') || element.type === 'video' || element.type === 'background-video') {
    if (startingScale !== endingScale) {
      const scaleAnimationEndScrollPoint = elementStartScroll + (elementScrollDuration * scaleEndYPosition);
      const scaleProgress = Math.min(1, Math.max(0, (scrollY - elementStartScroll) / (scaleAnimationEndScrollPoint - elementStartScroll || 1)));
      const selectedScaleCurve = animationCurves[scaleAnimationCurve as keyof typeof animationCurves] || linear;
      currentScale = startingScale + (endingScale - startingScale) * selectedScaleCurve(scaleProgress);
    }
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

  // Helper function to get rotation values for different rotate in types
  const getRotationFromType = (type: string): { rotateX: number; rotateY: number; rotateZ: number } => {
    switch (type) {
      // Vertical rotations (X-axis)
      case 'vertical-15': return { rotateX: 15, rotateY: 0, rotateZ: 0 };
      case 'vertical-30': return { rotateX: 30, rotateY: 0, rotateZ: 0 };
      case 'vertical-45': return { rotateX: 45, rotateY: 0, rotateZ: 0 };
      case 'vertical-90': return { rotateX: 90, rotateY: 0, rotateZ: 0 };
      case 'vertical-180': return { rotateX: 180, rotateY: 0, rotateZ: 0 };
      case 'vertical-270': return { rotateX: 270, rotateY: 0, rotateZ: 0 };
      // Horizontal rotations (Y-axis)
      case 'horizontal-15': return { rotateX: 0, rotateY: 15, rotateZ: 0 };
      case 'horizontal-30': return { rotateX: 0, rotateY: 30, rotateZ: 0 };
      case 'horizontal-45': return { rotateX: 0, rotateY: 45, rotateZ: 0 };
      case 'horizontal-90': return { rotateX: 0, rotateY: 90, rotateZ: 0 };
      case 'horizontal-180': return { rotateX: 0, rotateY: 180, rotateZ: 0 };
      case 'horizontal-270': return { rotateX: 0, rotateY: 270, rotateZ: 0 };
      // Clockwise rotations (Z-axis)
      case 'clockwise-15': return { rotateX: 0, rotateY: 0, rotateZ: 15 };
      case 'clockwise-30': return { rotateX: 0, rotateY: 0, rotateZ: 30 };
      case 'clockwise-45': return { rotateX: 0, rotateY: 0, rotateZ: 45 };
      case 'clockwise-90': return { rotateX: 0, rotateY: 0, rotateZ: 90 };
      case 'clockwise-180': return { rotateX: 0, rotateY: 0, rotateZ: 180 };
      case 'clockwise-270': return { rotateX: 0, rotateY: 0, rotateZ: 270 };
      // Counter-clockwise rotations (negative Z-axis)
      case 'counter-clockwise-15': return { rotateX: 0, rotateY: 0, rotateZ: -15 };
      case 'counter-clockwise-30': return { rotateX: 0, rotateY: 0, rotateZ: -30 };
      case 'counter-clockwise-45': return { rotateX: 0, rotateY: 0, rotateZ: -45 };
      case 'counter-clockwise-90': return { rotateX: 0, rotateY: 0, rotateZ: -90 };
      case 'counter-clockwise-180': return { rotateX: 0, rotateY: 0, rotateZ: -180 };
      case 'counter-clockwise-270': return { rotateX: 0, rotateY: 0, rotateZ: -270 };
      default: return { rotateX: 0, rotateY: 0, rotateZ: 0 };
    }
  };

  // Helper function to get translate offset values for different translate in directions
  const getTranslateFromDirection = (direction: string, distance: number): { translateX: number; translateY: number } => {
    switch (direction) {
      case 'from-left': return { translateX: -distance, translateY: 0 };
      case 'from-right': return { translateX: distance, translateY: 0 };
      case 'from-top': return { translateX: 0, translateY: -distance };
      case 'from-bottom': return { translateX: 0, translateY: distance };
      default: return { translateX: 0, translateY: 0 };
    }
  };

  // Calculate rotate in animation for image and text elements
  let currentRotateX = 0;
  let currentRotateY = 0;
  let currentRotateZ = 0;
  
  if ((element.type === 'photo' || element.type === 'background-image' || element.type === 'text' || element.type === 'video' || element.type === 'background-video') && rotateInEffect) {
    // Calculate rotation progress based on duration
    const rotateAnimationEndScrollPoint = elementStartScroll + (elementScrollDuration * rotateInDuration);
    const rotateProgress = Math.min(1, Math.max(0, (scrollY - elementStartScroll) / (rotateAnimationEndScrollPoint - elementStartScroll || 1)));
    
    if (rotateInCurve !== 'disabled') {
      const selectedRotateCurve = animationCurves[rotateInCurve as keyof typeof animationCurves] || linear;
      const easedRotateProgress = selectedRotateCurve(rotateProgress);
      
      // Get target rotation values
      const targetRotation = getRotationFromType(rotateInType);
      
      // Apply inverse progress - start with target rotation, animate to 0
      // This creates the "rotate in" effect
      currentRotateX = targetRotation.rotateX * (1 - easedRotateProgress);
      currentRotateY = targetRotation.rotateY * (1 - easedRotateProgress);
      currentRotateZ = targetRotation.rotateZ * (1 - easedRotateProgress);
      
      // Debug logging for rotate in animation (only log if element id is 1 to avoid spam)
      if (element.id === 1 && rotateProgress > 0 && rotateProgress < 1) {
        const getRotationTypeDescription = (type: string): string => {
          if (type.includes('vertical-15')) return 'Vertical 15° (Subtle tilt down)';
          if (type.includes('vertical-30')) return 'Vertical 30° (Light tilt down)';
          if (type.includes('vertical-45')) return 'Vertical 45° (Diagonal tilt down)';
          if (type.includes('horizontal-15')) return 'Horizontal 15° (Subtle left/right tilt)';
          if (type.includes('horizontal-30')) return 'Horizontal 30° (Light left/right tilt)';
          if (type.includes('horizontal-45')) return 'Horizontal 45° (Diagonal left/right tilt)';
          if (type.includes('clockwise-15')) return 'Clockwise 15° (Subtle spin)';
          if (type.includes('clockwise-30')) return 'Clockwise 30° (Light spin)';
          if (type.includes('clockwise-45')) return 'Clockwise 45° (Diagonal spin)';
          if (type.includes('counter-clockwise-15')) return 'Counter-clockwise 15° (Subtle reverse spin)';
          if (type.includes('counter-clockwise-30')) return 'Counter-clockwise 30° (Light reverse spin)';
          if (type.includes('counter-clockwise-45')) return 'Counter-clockwise 45° (Diagonal reverse spin)';
          return type; // Fallback for other types
        };
        
        // console.log(`🔄 RotateIn Animation [${folderName}]:`, {
        //   rotateInType,
        //   description: getRotationTypeDescription(rotateInType),
        //   rotateProgress: rotateProgress.toFixed(3),
        //   easedProgress: easedRotateProgress.toFixed(3),
        //   targetRotation,
        //   currentRotation: {
        //     x: currentRotateX.toFixed(1),
        //     y: currentRotateY.toFixed(1),
        //     z: currentRotateZ.toFixed(1)
        //   },
        //   scrollY: scrollY.toFixed(0),
        //   elementStartScroll: elementStartScroll.toFixed(0),
        //   rotateAnimationEndScrollPoint: rotateAnimationEndScrollPoint.toFixed(0)
        // });
      }
    } else {
      // No curve - just use linear progress
      const targetRotation = getRotationFromType(rotateInType);
      currentRotateX = targetRotation.rotateX * (1 - rotateProgress);
      currentRotateY = targetRotation.rotateY * (1 - rotateProgress);
      currentRotateZ = targetRotation.rotateZ * (1 - rotateProgress);
    }
  }

  // Calculate translate in animation for image and text elements
  let currentTranslateX = 0;
  let currentTranslateY = 0;
  
  if ((element.type === 'photo' || element.type === 'background-image' || element.type === 'text' || element.type === 'video' || element.type === 'background-video') && translateInEffect) {
    // Calculate translation progress based on duration
    const translateAnimationEndScrollPoint = elementStartScroll + (elementScrollDuration * translateInDuration);
    const translateProgress = Math.min(1, Math.max(0, (scrollY - elementStartScroll) / (translateAnimationEndScrollPoint - elementStartScroll || 1)));
    
    if (translateInCurve !== 'disabled') {
      const selectedTranslateCurve = animationCurves[translateInCurve as keyof typeof animationCurves] || linear;
      const easedTranslateProgress = selectedTranslateCurve(translateProgress);
      
      // Get target translate offset values
      const targetTranslate = getTranslateFromDirection(translateInDirection, translateInDistance);
      
      // Apply inverse progress - start with target offset, animate to 0
      // This creates the "translate in" effect
      currentTranslateX = targetTranslate.translateX * (1 - easedTranslateProgress);
      currentTranslateY = targetTranslate.translateY * (1 - easedTranslateProgress);
      
      // Debug logging for translate in animation (only log if element id is 1 to avoid spam)
      if (element.id === 1 && translateProgress > 0 && translateProgress < 1) {
        const getTranslateDirectionDescription = (direction: string): string => {
          switch (direction) {
            case 'from-left': return 'From Left (slides in from left side)';
            case 'from-right': return 'From Right (slides in from right side)';
            case 'from-top': return 'From Top (slides in from above)';
            case 'from-bottom': return 'From Bottom (slides in from below)';
            default: return direction;
          }
        };
        
        console.log(`↗️ TranslateIn Animation [${folderName}]:`, {
          translateInDirection,
          description: getTranslateDirectionDescription(translateInDirection),
          translateProgress: translateProgress.toFixed(3),
          easedProgress: easedTranslateProgress.toFixed(3),
          targetTranslate,
          currentTranslate: {
            x: currentTranslateX.toFixed(1),
            y: currentTranslateY.toFixed(1)
          },
          scrollY: scrollY.toFixed(0),
          elementStartScroll: elementStartScroll.toFixed(0),
          translateAnimationEndScrollPoint: translateAnimationEndScrollPoint.toFixed(0)
        });
      }
    } else {
      // No curve - just use linear progress
      const targetTranslate = getTranslateFromDirection(translateInDirection, translateInDistance);
      currentTranslateX = targetTranslate.translateX * (1 - translateProgress);
      currentTranslateY = targetTranslate.translateY * (1 - translateProgress);
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
  
  // Debug log for combined effects (only log if element id is 1 to avoid spam)
  if (element.id === 1 && (rotateInEffect || translateInEffect)) {
    // console.log(`🎬 Combined Animation Effects [${folderName}]:`, {
    //   rotateInActive: rotateInEffect,
    //   translateInActive: translateInEffect,
    //   currentRotation: { x: currentRotateX, y: currentRotateY, z: currentRotateZ },
    //   currentTranslation: { x: currentTranslateX, y: currentTranslateY },
    //   finalPosition: { x: landingXPosition + currentTranslateX, y: finalCalculatedYTransform + currentTranslateY }
    // });
  }
  
  // Build transform string with rotation and translation support
  const scaleValue = element.type === 'background-image' ? scaleForBgImage : currentScale;
  
  // Combine base positioning with translate in animation
  // Round values to prevent floating point precision issues that cause stutter
  const finalXPosition = Math.round((landingXPosition + currentTranslateX) * 100) / 100;
  const finalYPosition = Math.round((finalCalculatedYTransform + currentTranslateY) * 100) / 100;
  const roundedScale = Math.round(scaleValue * 1000) / 1000;
  
  // Use translate3d for better GPU acceleration and round rotation values
  let transformString = `translate3d(${finalXPosition}px, ${finalYPosition}px, 0) scale(${roundedScale})`;
  
  // Add rotation if rotate in effect is enabled for image and text elements
  if ((element.type === 'photo' || element.type === 'background-image' || element.type === 'text' || element.type === 'video' || element.type === 'background-video') && rotateInEffect) {
    const roundedRotateX = Math.round(currentRotateX * 10) / 10;
    const roundedRotateY = Math.round(currentRotateY * 10) / 10;
    const roundedRotateZ = Math.round(currentRotateZ * 10) / 10;
    transformString += ` rotateX(${roundedRotateX}deg) rotateY(${roundedRotateY}deg) rotateZ(${roundedRotateZ}deg)`;
  }

  const elementStyle: React.CSSProperties = {
    opacity: Math.round(finalOpacity * 1000) / 1000, // Round opacity to prevent micro-stutters
    transform: transformString,
    width: (element.type === 'background-image' || element.type === 'background-video') ? '100%' : 'fit-content',
    height: (element.type === 'background-image' || element.type === 'background-video') ? '100%' : 'auto',
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
    // Optimized willChange - only specify properties that actually change
    willChange: (rotateInEffect || translateInEffect || finalOpacity !== 1 || scaleValue !== 1) 
      ? 'transform, opacity' 
      : 'auto',
    boxSizing: 'border-box',
    // Enhanced hardware acceleration
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    // Add transform-style to enable 3D transformations for both rotate and translate effects
    transformStyle: (element.type === 'photo' || element.type === 'background-image' || element.type === 'text' || element.type === 'video' || element.type === 'background-video') && (rotateInEffect || translateInEffect) ? 'preserve-3d' : undefined
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