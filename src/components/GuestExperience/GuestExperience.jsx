import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
// import { useParams } from 'react-router-dom'; // No longer needed if weddingId comes via props
// import axios from 'axios'; // No longer needed
import { Parallax, ParallaxLayer } from '@react-spring/parallax';
import { Leva, folder } from 'leva';
import { useSpring, animated } from 'react-spring'; // ADDED for focused image
import { useDrag } from '@use-gesture/react'; // ADDED for focused image drag
// import { getApiBaseUrl } from '../../config/apiConfig'; // No longer needed
import RSVPForm from '../RSVPForm';
// import ScrapbookDisplay from './ScrapbookDisplay'; // IMPORT ScrapbookDisplay
import InteractiveScrapbook from './InteractiveScrapbook'; // IMPORT InteractiveScrapbook
// We might need a Scrapbook component later
// import ScrapbookDisplay from './ScrapbookDisplay'; // Placeholder
import { useLevaStore } from '../../stores/levaStore'; // Import useLevaStore
import { useIsMobile } from '../../utils/deviceDetect'; // Import useIsMobile
import { useTrackedControls } from '../../hooks/useTrackedControls'; // ADDED: Import useTrackedControls
import { useSetupMode } from '../../contexts/SetupModeContext'; // Import useSetupMode
import ShiftingBackgroundColors from './ShiftingBackgroundColors'; // Added import
import { ElementConfig, TimelineMarker, ExperienceSettings as ExperienceSettingsType } from '../ExperienceSetupPage/ExperienceSetupPage';
import '../../App.css'; // Assuming App.css contains general styles like .center
import { fontFamilyOptions, googleFontNames, isGoogleFont } from '../../config/fontConfig'; // ADDED
import FontGrabber from '../FontGrabber'; // ADDED

// Easing functions (can be moved to a utils file)
const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
const linear = t => t;
const easeInCubic = t => t * t * t;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInQuint = t => t * t * t * t * t;
// Add more easing functions as needed: easeInQuad, easeOutQuad, easeInCubic, etc.

const animationCurves = {
  linear: linear,
  easeInOutQuad: easeInOutQuad,
  easeInCubic: easeInCubic,
  easeOutCubic: easeOutCubic,
  easeInQuint: easeInQuint,
  // Add other curves here
  strong: { tension: 300, friction: 30, name: 'Strong (Custom)' },
};

// Default spring configuration (can be adjusted)
const defaultSpringConfig = { tension: 170, friction: 26 };

// Define the spring configuration presets (copied from WeddingJourney.tsx)
const springConfigPresets = {
  default: { tension: 170, friction: 26, name: 'Default (react-spring)' },
  gentle: { tension: 120, friction: 14, name: 'Gentle (react-spring)' },
  wobbly: { tension: 180, friction: 12, name: 'Wobbly (react-spring)' },
  stiff: { tension: 210, friction: 20, name: 'Stiff (react-spring)' },
  slow: { tension: 280, friction: 60, name: 'Slow (react-spring)' },
  molasses: { tension: 280, friction: 120, name: 'Molasses (react-spring)' },
  responsive: { tension: 200, friction: 22, name: 'Responsive (Custom)' },
  snappy: { tension: 250, friction: 18, name: 'Snappy (Custom)' },
  delicate: { tension: 100, friction: 10, name: 'Delicate (Custom)' },
  strong: { tension: 300, friction: 30, name: 'Strong (Custom)' },
};

// --- BEGIN ADDED Color Schemes ---
const weddingColorSchemes = [
  {
    name: "Classic Elegance",
    primary: '#FDFDFD', // Ivory White
    secondary: '#B08D57', // Antique Gold
    accent: '#D8BFD8', // Thistle
    text: '#36454F', // Charcoal
    background: '#F5F5F5' // White Smoke
  },
  {
    name: "Romantic Blush",
    primary: '#FADADD', // Pale Pink
    secondary: '#F4C2C2', // Baby Pink/Blush
    accent: '#C0C0C0', // Silver
    text: '#5A5A5A', // Dark Gray
    background: '#FFF0F5' // Lavender Blush
  },
  {
    name: "Rustic Charm",
    primary: '#DEB887', // Burly Wood
    secondary: '#8FBC8F', // Dark Sea Green
    accent: '#A0522D', // Sienna
    text: '#4A4A4A', // Dark Slate Gray
    background: '#FAF0E6' // Linen
  },
  {
    name: "Ocean Breeze",
    primary: '#ADD8E6', // Light Blue
    secondary: '#B0E0E6', // Powder Blue
    accent: '#F0E68C', // Khaki/Sandy
    text: '#2F4F4F', // Dark Slate Gray
    background: '#F0FFFF' // Azure
  },
  {
    name: "Enchanted Forest",
    primary: '#228B22', // Forest Green
    secondary: '#556B2F', // Dark Olive Green
    accent: '#DAA520', // Goldenrod
    text: '#F8F8FF', // Ghost White
    background: '#F5F5DC' // Beige
  },
  {
    name: "Modern Minimalist",
    primary: '#FFFFFF', // White
    secondary: '#E0E0E0', // Light Gray
    accent: '#333333', // Near Black
    text: '#212121', // Charcoal Black
    background: '#F9F9F9' // Off White
  },
  {
    name: "Vintage Glamour",
    primary: '#E6E6FA', // Lavender
    secondary: '#778899', // Light Slate Gray
    accent: '#FFD700', // Gold
    text: '#483D8B', // Dark Slate Blue
    background: '#FFF5EE' // SeaShell
  },
  {
    name: "Sunset Glow",
    primary: '#FF7F50', // Coral
    secondary: '#FFDAB9', // Peach Puff
    accent: '#FFA07A', // Light Salmon
    text: '#8B4513', // Saddle Brown
    background: '#FFF8DC' // Cornsilk
  }
];
// --- END ADDED Color Schemes ---

// Define overall controls schema for HUD toggle (similar to WeddingJourney)
const overallControlsSchemaDefinitionGuest = (isSetupModeFromContext) => ({
  showHUD: { value: false, label: 'Show Debug HUD (Guest)' }, // Default to false for guest
  springPreset: {
    value: 'default',
    options: Object.keys(springConfigPresets),
    label: 'Animation Physics Preset (Guest)',
  },
  colorScheme: { // ADDED colorScheme control
    value: weddingColorSchemes[0].name, // Default to the first theme's name
    options: weddingColorSchemes.map(scheme => scheme.name),
    label: 'Color Scheme',
  },
  overallFontFamily: { // ADDED overallFontFamily control
    value: fontFamilyOptions[0],
    options: fontFamilyOptions,
    label: 'Global Font Family',
  },
});

// --- Helper functions from WeddingJourney (for focused image) ---
const parseRotationFromStyle = (transformString) => {
  if (typeof transformString === 'number') return transformString;
  if (!transformString) return 0;
  const rotateMatch = transformString.match(/rotate\(([-\d.]+)deg\)/);
  return rotateMatch && rotateMatch[1] ? parseFloat(rotateMatch[1]) : 0;
};

const calculateFocusTargetDimensions = (naturalW, naturalH, viewportW, viewportH) => {
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

const getCenteredPosition = (targetWidth, targetHeight, offsetXvw = 0) => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
  let leftPx = (vw - targetWidth) / 2;
  const topPx = (vh - targetHeight) / 2;
  leftPx -= (vw * offsetXvw / 100);
  return { top: topPx, left: leftPx };
};
// --- End Helper functions ---

// STANDALONE ELEMENTWRAPPER COMPONENT
const ElementWrapper = ({ 
  children, 
  element, 
  experienceSettings, 
  scrollY, 
  windowHeight, 
  TOTAL_PAGES,
  // animationCurves, // Already defined in this scope, no need to pass if ElementWrapper is in the same file
  // centerStyle // Not directly used by ElementWrapper's logic, but by ParallaxLayer
}) => {
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const currentChildRef = useRef(null);

  let controlsSchema = {
    opacity: { value: 1, min: 0, max: 1, step: 0.01 },
  };

  // Retrieve global font family for default in text elements
  const store = useLevaStore.getState();
  const overallControlsGuestState = store.controlValues['Overall Controls (Guest)'];
  const globalFontFamilyFromStore = overallControlsGuestState?.overallFontFamily || fontFamilyOptions[0];

  if (element.type === 'text') {
    controlsSchema = {
      ...controlsSchema,
      landingYPosition: { value: 0, step: 1, label: 'Landing Y Position (px)' },
      fadeOutEndYPosition: { value: 1, min: 0, max: 2, step: 0.01, label: 'Fade Out End Y (% duration)' },
      fadeOutAnimationCurve: { value: 'disabled', options: ['disabled', ...Object.keys(animationCurves)], label: 'Fade Out Animation Curve' },
      textColor: { value: '#333333', label: 'Text Color' },
      fontFamily: { value: globalFontFamilyFromStore, options: fontFamilyOptions, label: 'Font Family' },
      fontSizeAtStart: { value: 16, min: 8, max: 120, step: 1, label: 'Font Size @ Start (px)' },
      fontSizeAtEnd: { value: 16, min: 8, max: 120, step: 1, label: 'Font Size @ End (px)' },
      lineHeight: { value: 1.5, min: 0.8, max: 3, step: 0.01, label: 'Line Height' },
      spreadAnimationCurve: { value: 'linear', options: ['disabled', ...Object.keys(animationCurves)], label: 'Spread Curve' },
      yOffsetAtAnimStart: { value: 20, step: 1, label: 'Y Offset @ Anim Start (px)' },
      yOffsetAtAnimEnd: { value: 0, step: 1, label: 'Y Offset @ Anim End (px)' },
      letterSpacingAtAnimStart: { value: -50, min: -100, max: 100, step: 0.1, label: 'L-Spacing @ Anim Start (px)' },
      letterSpacingAtAnimEnd: { value: 50, min: -100, max: 100, step: 0.1, label: 'L-Spacing @ Anim End (px)' }
    };
  } else if (element.type === 'photo' && element.name !== 'background-image') {
    controlsSchema = {
      ...controlsSchema,
      landingXPosition: { value: 0, step: 1, label: 'Landing X Position (px)' },
      landingYPosition: { value: 0, step: 1, label: 'Landing Y Position (px)' },
      startingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Starting Scale' },
      endingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Ending Scale' },
      scaleEndYPosition: { value: 0.5, min: 0, max: 1, step: 0.01, label: 'Scale End Y (% duration)' },
      scaleAnimationCurve: { value: 'linear', options: Object.keys(animationCurves), label: 'Scale Animation Curve' },
      fadeOutEndYPosition: { value: 1, min: 0, max: 2, step: 0.01, label: 'Fade Out End Y (% duration)' },
      fadeOutAnimationCurve: { value: 'disabled', options: ['disabled', ...Object.keys(animationCurves)], label: 'Fade Out Animation Curve' },
      lockToViewportEdge: { value: 'disabled', options: ['disabled', 'imageBottom-viewportBottom', 'imageTop-viewportTop'], label: 'Lock to Viewport Edge'},
      fontFamily: { value: globalFontFamilyFromStore, options: fontFamilyOptions, label: 'Font Family' },
      fontSize: { value: 16, min: 8, max: 120, step: 1, label: 'Font Size (px)' },
      lineHeight: { value: 1.5, min: 0.8, max: 3, step: 0.01, label: 'Line Height' },
    };
  } else if (element.type === 'component' && element.name === 'RSVP Form') {
    // RSVP Form specific controls can be added here if needed, or managed within RSVPForm itself.
    // For now, ElementWrapper only handles opacity for RSVP Form.
  }
  
  // Simplify folderName to avoid issues with special characters in Leva paths
  const simplifiedType = element.type.replace(/\s+/g, '_'); // e.g., background_image
  const folderName = `element_${element.id}_${element.name ? element.name.replace(/\s+/g, '_') : simplifiedType}`;

  const controls = useTrackedControls(
    folderName, 
    controlsSchema, 
    { collapsed: true }
  );

  const { 
    opacity = 1, 
    landingXPosition = 0,
    landingYPosition = 0,
    startingScale = 1, 
    endingScale = 1, 
    scaleEndYPosition = 0.5, 
    scaleAnimationCurve = 'linear',
    fadeOutEndYPosition = 1,
    fadeOutAnimationCurve = 'disabled',
    lockToViewportEdge = 'disabled',
    textColor = '#333333',
    fontFamily = globalFontFamilyFromStore,
    fontSize = 16,
    fontSizeAtStart = 16,
    fontSizeAtEnd = 16,
    lineHeight = 1.5,
    spreadAnimationCurve = 'linear',
    yOffsetAtAnimStart,
    yOffsetAtAnimEnd,
    letterSpacingAtAnimStart,
    letterSpacingAtAnimEnd
  } = controls.values;

  if (element.type === 'text') {
    console.log(`[ElementWrapper DEBUG - ${element.name || `ID ${element.id}`}] Spread values:`, {
      spreadAnimationCurve,
      yOffsetAtAnimStart,
      yOffsetAtAnimEnd,
      letterSpacingAtAnimStart,
      letterSpacingAtAnimEnd
    });
  }

  useEffect(() => {
    if (currentChildRef.current) {
      setMeasuredHeight(currentChildRef.current.offsetHeight);
    }
  }, [children, currentChildRef.current]);

  const pageMultiplier = TOTAL_PAGES > 1 ? TOTAL_PAGES - 1 : 0;
  const startMarker = experienceSettings.markers.find(m => m.elementId === element.id && m.type === 'start');
  const endMarker = experienceSettings.markers.find(m => m.elementId === element.id && m.type === 'end');
  
  const elementStartScroll = startMarker ? startMarker.position * pageMultiplier * windowHeight : 0;
  const elementEndScroll = endMarker ? endMarker.position * pageMultiplier * windowHeight : windowHeight * TOTAL_PAGES;
  const elementScrollDuration = Math.max(elementEndScroll - elementStartScroll, 1);

  let currentAnimatedYOffset = 0;
  let letterSpacingToApply = letterSpacingAtAnimEnd;
  let currentFontSize = element.type === 'text' ? fontSizeAtEnd : fontSize;

  if (element.type === 'text') {
    if (spreadAnimationCurve !== 'disabled') {
      let animationProgress = 0;
      if (elementScrollDuration > 0) {
        if (scrollY < elementStartScroll) {
          animationProgress = 0;
        } else if (scrollY > elementEndScroll) {
          animationProgress = 1;
        } else {
          animationProgress = (scrollY - elementStartScroll) / elementScrollDuration;
        }
      } else {
        animationProgress = scrollY >= elementStartScroll ? 1 : 0;
      }
      animationProgress = Math.min(1, Math.max(0, animationProgress));

      const selectedSpreadCurve = animationCurves[spreadAnimationCurve] || linear;
      const easedAnimationProgress = selectedSpreadCurve(animationProgress);

      currentAnimatedYOffset = yOffsetAtAnimStart + (yOffsetAtAnimEnd - yOffsetAtAnimStart) * easedAnimationProgress;
      letterSpacingToApply = letterSpacingAtAnimStart + (letterSpacingAtAnimEnd - letterSpacingAtAnimStart) * easedAnimationProgress;
      currentFontSize = fontSizeAtStart + (fontSizeAtEnd - fontSizeAtStart) * easedAnimationProgress;
    } else {
      currentAnimatedYOffset = yOffsetAtAnimEnd;
      letterSpacingToApply = letterSpacingAtAnimEnd;
      currentFontSize = fontSizeAtEnd;
    }
  }

  let currentScale = 1;
  if (element.type === 'photo' && element.name !== 'background-image' && startingScale !== endingScale) {
    const scaleAnimationEndScrollPoint = elementStartScroll + (elementScrollDuration * scaleEndYPosition);
    const scaleProgress = Math.min(1, Math.max(0, (scrollY - elementStartScroll) / (scaleAnimationEndScrollPoint - elementStartScroll || 1)));
    const selectedScaleCurve = animationCurves[scaleAnimationCurve] || linear;
    currentScale = startingScale + (endingScale - startingScale) * selectedScaleCurve(scaleProgress);
  }

  let finalOpacity = opacity;
  if (fadeOutAnimationCurve !== 'disabled') {
    const fadeOutStartScrollPoint = elementStartScroll;
    const fadeOutDurationScroll = elementScrollDuration * fadeOutEndYPosition;
    const safeFadeOutDurationScroll = fadeOutDurationScroll <= 0 ? 1 : fadeOutDurationScroll;
    const fadeOutProgress = Math.min(1, Math.max(0, (scrollY - fadeOutStartScrollPoint) / safeFadeOutDurationScroll));
    const selectedFadeOutCurve = animationCurves[fadeOutAnimationCurve] || linear;
    finalOpacity = opacity * (1 - selectedFadeOutCurve(fadeOutProgress));
  }

  const isCentered = true; 
  const yOffsetToCenter = isCentered && measuredHeight > 0 ? (windowHeight / 2) - (measuredHeight / 2) : 0;
  let initialYFromLanding = landingYPosition; 
  let xTransform = landingXPosition;
  let yTransform = initialYFromLanding + (isCentered ? yOffsetToCenter : 0) + currentAnimatedYOffset;

  const lockIsActive = lockToViewportEdge !== 'disabled' && scrollY < elementEndScroll;
  const actualDisplayedHeight = measuredHeight * currentScale;

  if (lockIsActive) {
    if (lockToViewportEdge === 'imageBottom-viewportBottom') {
      yTransform = (windowHeight - actualDisplayedHeight) / 2 + landingYPosition; 
    } else if (lockToViewportEdge === 'imageTop-viewportTop') {
      yTransform = -(windowHeight - actualDisplayedHeight) / 2 + landingYPosition;
    }
  }
  const finalCalculatedYTransform = yTransform;
  
  let elementOuterStyle = {
    opacity: finalOpacity,
    transform: `translateX(${xTransform}px) translateY(${finalCalculatedYTransform}px) scale(${currentScale})`,
    width: element.type === 'background-image' ? '100%' : 'auto',
    height: element.type === 'background-image' ? '100%' : 'auto',
    // Default pointer-events, can be overridden for RSVP form
  };

  let childToRender = children;
  if (React.isValidElement(children) && (element.type === 'photo' || element.type === 'text')) {
     const newProps = { ref: currentChildRef };
     if (element.type === 'text') {
       // @ts-ignore
       newProps.style = { 
        ...children.props.style, 
        color: textColor, 
        fontFamily: fontFamily,
        fontSize: `${currentFontSize}px`,
        letterSpacing: `${letterSpacingToApply}px`,
        lineHeight: lineHeight
      };
     }
     childToRender = React.cloneElement(children, newProps);
  } else if (element.type === 'component' && element.name === 'RSVP Form' && React.isValidElement(children)) {
    // RSVPForm is now created with its ref directly in GuestExperience, so children here is the already-ref'd component
    childToRender = <div style={{ pointerEvents: 'auto' }}>{children}</div>; 
    // Add pointerEvents: 'none' to the outer style for RSVP form's ElementWrapper
    elementOuterStyle = { ...elementOuterStyle, pointerEvents: 'none' };
  } else if (React.isValidElement(children)) {
    childToRender = children;
  }

  return <div style={elementOuterStyle}>{childToRender}</div>;
};


// const GuestExperience = () => { // Old signature
const GuestExperience = ({ weddingDataFromApp, experienceSettingsFromApp, weddingIdFromApp }) => {
  // const { isSetupMode } = useSetupMode(); // From context - TEMPORARILY OVERRIDDEN
  const isSetupMode = true; // TEMPORARILY HARDCODED FOR DEBUGGING
  const isMobile = useIsMobile(); // Custom hook for mobile detection

  // --- Core State ---
  const [weddingData, setWeddingData] = useState(weddingDataFromApp);
  const [experienceSettings, setExperienceSettings] = useState(experienceSettingsFromApp);
  const [currentWeddingId, setCurrentWeddingId] = useState(weddingIdFromApp);
  const [scrollY, setScrollY] = useState(0);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 700);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const parallaxRef = useRef(null);
  const rsvpFormRef = useRef(null);

  // --- ADDED: useEffect to load initial Leva settings from weddingDataFromApp ---
  useEffect(() => {
    if (weddingDataFromApp && weddingDataFromApp.initialElementLayouts) {
      // console.log('[GuestExperience] useEffect: weddingDataFromApp.initialElementLayouts found, calling loadSettingsFromDB.', weddingDataFromApp.initialElementLayouts);
      useLevaStore.getState().loadSettingsFromDB(weddingDataFromApp.initialElementLayouts);
    } else {
      // console.log('[GuestExperience] useEffect: weddingDataFromApp.initialElementLayouts NOT found. Leva will use defaults.');
    }
  }, [weddingDataFromApp]); // Dependency on weddingDataFromApp
  // --- END ADDED ---

  // --- Calculate TOTAL_PAGES for Parallax ---
  const TOTAL_PAGES = useMemo(() => {
    const calculated = (experienceSettings?.timelineLength > 0 && windowHeight > 0 
      ? Math.max(1.1, experienceSettings.timelineLength / windowHeight) 
      : 3);
    // console.log(`[GuestExperience] Calculated TOTAL_PAGES: ${calculated} (timelineLength: ${experienceSettings?.timelineLength}, windowHeight: ${windowHeight})`);
    return calculated;
  }, [experienceSettings?.timelineLength, windowHeight]);
  // console.log(`[GuestExperience] DEBUG: TOTAL_PAGES is hardcoded to: ${TOTAL_PAGES}`); // Remove hardcoded log

  // useEffect to specifically log parallaxRef.current.space changes
  useEffect(() => {
    const currentTimelineLength = experienceSettings?.timelineLength;
    // console.log(`[GuestExperience] DEBUG: parallaxRef.current.space is currently: ${parallaxRef.current?.space}. TOTAL_PAGES: ${TOTAL_PAGES}, timelineLength: ${currentTimelineLength}`);
    if (parallaxRef.current?.space) {
      // This log is now part of the one above
      // console.log(`[GuestExperience] DEBUG: parallaxRef.current.space updated to: ${parallaxRef.current.space}`);
    } else {
      // console.log(`[GuestExperience] DEBUG: parallaxRef.current.space is currently: ${parallaxRef.current?.space}`);
    }
  }, [parallaxRef.current?.space, TOTAL_PAGES, experienceSettings?.timelineLength]); // Added TOTAL_PAGES and timelineLength to dependencies

  // --- Calculate Scroll Percentage for HUD ---
  const scrollPercentage = useMemo(() => {
    // console.log(`[GuestExperience] Calculating scrollPercentage: {scrollY: ${scrollY}, windowHeight: ${windowHeight}, TOTAL_PAGES: ${TOTAL_PAGES}}`);
    if (TOTAL_PAGES > 1 && windowHeight > 0) {
      // Calculate total scrollable height based on TOTAL_PAGES and windowHeight
      const totalScrollableHeight = (TOTAL_PAGES - 1) * windowHeight;

      // console.log(`[GuestExperience] DEBUG scrollPercentage: scrollY=${scrollY}, totalScrollableHeight=${totalScrollableHeight}, windowHeight=${windowHeight}, TOTAL_PAGES=${TOTAL_PAGES}`);

      if (totalScrollableHeight <= 0) {
        // console.log(`[GuestExperience] DEBUG scrollPercentage: totalScrollableHeight is ${totalScrollableHeight}, returning 0.`);
        return 0;
      }
      // Ensure scrollPercentage is between 0 and 1
      return Math.min(1, Math.max(0, scrollY / totalScrollableHeight));
    }
    // console.log(`[GuestExperience] DEBUG scrollPercentage: Conditions not met, returning 0. TOTAL_PAGES: ${TOTAL_PAGES}, windowHeight: ${windowHeight}`);
    return 0;
  }, [scrollY, windowHeight, TOTAL_PAGES]);

  // --- Leva Controls & HUD ---
  // Overall controls for HUD visibility
  const overallControlsSchemaGuest = useMemo(() => overallControlsSchemaDefinitionGuest(isSetupMode), [isSetupMode]);
  const overallControlsGuest = useTrackedControls(
    'Overall Controls (Guest)',
    overallControlsSchemaGuest,
    { collapsed: true, hidden: !isSetupMode } // Ensure collapsed is true
  );
  const overallControlsGuestValues = overallControlsGuest?.values || {};
  const {
    showHUD: showGlobalHUDEnabledGuest = overallControlsSchemaGuest.showHUD.value,
    springPreset: selectedSpringPresetKeyGuest = overallControlsSchemaGuest.springPreset.value,
    colorScheme: selectedColorSchemeName = weddingColorSchemes[0].name, // ADDED selectedColorSchemeName
    overallFontFamily = fontFamilyOptions[0] // ADDED overallFontFamily
  } = overallControlsGuestValues;

  const activeSpringConfigGuest = springConfigPresets[selectedSpringPresetKeyGuest] || springConfigPresets.default;
  const activeSpringConfigNameGuest = activeSpringConfigGuest.name;

  // ADDED: Find the selected color scheme object
  const selectedColorScheme = weddingColorSchemes.find(scheme => scheme.name === selectedColorSchemeName) || weddingColorSchemes[0];

  // --- State for Save/Load Status Messages (for save button)
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState(null);
  // --- End State for Save/Load Status Messages

  // --- Ref for Save Button Height (if HUD positioning depends on it) ---
  const saveLayoutButtonRef = useRef(null);
  const [saveLayoutButtonHeight, setSaveLayoutButtonHeight] = useState(0);
  useEffect(() => { 
    if (saveLayoutButtonRef.current) setSaveLayoutButtonHeight(saveLayoutButtonRef.current.offsetHeight + 10); // +10 for margin
  }, [isSetupMode, saveLayoutButtonRef.current, showGlobalHUDEnabledGuest]); // Re-check if button appears/disappears or resizes

  // --- ADDED: centerStyle object ---
  const centerStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    width: '100%', // Ensure it takes full width for centering child content
  }), []);
  // --- END ADDED ---

  // --- Focused Image Logic State (Moved to top level) ---
  const [focusedImage, setFocusedImage] = useState(null);
  const [imageReturningToScrapbook, setImageReturningToScrapbook] = useState(null);
  const [pendingImageToFocus, setPendingImageToFocus] = useState(null);
  const [lastPutDownIndex, setLastPutDownIndex] = useState(null);
  const [imageNaturalDimensions, setImageNaturalDimensions] = useState([]);
  const imageReturningToScrapbookRef = useRef(null);
  const pendingImageToFocusRef = useRef(null);
  const scrapbookImageRefs = useRef([]); // MOVED TO TOP - For InteractiveScrapbook items

  // Determine active spring config from Leva or default
  // Add springPresets to overallControlsSchemaDefinitionGuest if not already there
  // For now, assuming it might be added, or fallback to defaultSpringConfig
  const springPresets = { 
    default: { tension: 170, friction: 26, name: 'Default' },
    gentle: { tension: 120, friction: 14, name: 'Gentle' },
    wobbly: { tension: 180, friction: 12, name: 'Wobbly' },
    stiff: { tension: 210, friction: 20, name: 'Stiff' },
    slow: { tension: 280, friction: 60, name: 'Slow' },
  };

  // --- Hooks for Focused Image Animation (Moved to top level) ---
  const backdropSpring = useSpring({ 
    opacity: focusedImage ? 1 : 0, 
    pointerEvents: focusedImage ? 'auto' : 'none',
    position: 'fixed',
    top: 0, left: 0, width: '100vw', height: '100vh', 
    background: 'rgba(0, 0, 0, 0.7)', 
    config: activeSpringConfigGuest
  });

  const [focusedImageContainerSpring, focusedImageApi] = useSpring(() => ({ 
    opacity: 0, 
    top: '50%', left: '50%', 
    width: '0px', height: '0px', 
    transform: 'translate(-50%, -50%) rotate(0deg) scale(0.5)', 
    position: 'fixed',
    config: activeSpringConfigGuest
  }));

  const infoBoxSpring = useSpring({ 
    opacity: focusedImage ? 1 : 0, 
    transform: focusedImage ? 'translateY(0px)' : 'translateY(20px)', 
    config: activeSpringConfigGuest,
    delay: focusedImage ? 300 : 0 
  });

  const bindFocusedImageDrag = useDrag(
    ({ down, movement: [mx], velocity: [vx], direction: [dx], event, last }) => {
      event?.stopPropagation();
      if (!focusedImage || !last) return; // Still conditional logic INSIDE the handler
      const viewportWidth = windowWidth;
      const distanceThreshold = viewportWidth / 4;
      const velocityThreshold = 0.3;
      if (Math.abs(mx) > distanceThreshold || Math.abs(vx) > velocityThreshold) {
        const syntheticEvent = { stopPropagation: () => {} };
        if (dx > 0) { handlePreviousImage(syntheticEvent); } 
        else if (dx < 0) { handleNextImage(syntheticEvent); }
      }
    },
    { axis: 'x', filterTaps: true, enabled: !!focusedImage } // Hook call is unconditional, but gesture is enabled conditionally
  );
  // --- End Hooks for Focused Image Animation ---

  // --- Effect for Refs (Moved to top level) ---
  useEffect(() => {
    imageReturningToScrapbookRef.current = imageReturningToScrapbook;
  }, [imageReturningToScrapbook]);

  useEffect(() => {
    pendingImageToFocusRef.current = pendingImageToFocus;
  }, [pendingImageToFocus]);
  // --- End Effect for Refs ---
  
  // --- Dynamic Content Calculation (Elements, Pages, etc.) ---
  const { elements: elementsFromProps = [], markers: markersFromProps = [], timelineLength: timelineLengthFromProps = 1000 } = experienceSettings || {};

  const renderableElements = useMemo(() => {
    if (!experienceSettings || !experienceSettings.elements || !experienceSettings.markers) {
      return [];
    }
    // Ensure calculations use (TOTAL_PAGES - 1) only if TOTAL_PAGES > 1, otherwise use 0 for multiplier to keep offset at 0.
    const pageMultiplier = TOTAL_PAGES > 1 ? TOTAL_PAGES - 1 : 0;

    return experienceSettings.elements.map(element => {
      const startMarker = experienceSettings.markers.find(m => m.elementId === element.id && m.type === 'start');
      const endMarker = experienceSettings.markers.find(m => m.elementId === element.id && m.type === 'end');

      if (!startMarker || !endMarker || element.type === 'empty') {
        return null;
      }
      
      const pageOffset = startMarker.position * pageMultiplier;
      const endPageOffset = endMarker.position * pageMultiplier;
      // Ensure actualEndPage is at least a bit after pageOffset if they are too close or equal, but not if pageOffset itself is already at the very end.
      const minDurationOffset = pageOffset < pageMultiplier ? 0.1 : 0; // Only add min duration if not already at the end
      const actualEndPage = Math.max(pageOffset + minDurationOffset, endPageOffset);

      return {
        ...element,
        key: `ge-el-${element.id}`,
        sticky: { start: pageOffset, end: actualEndPage },
        pageOffset: pageOffset, 
        speed: element.speed || 0.5, // Default speed, adjust as needed
      };
    }).filter(el => el !== null);
  }, [experienceSettings, TOTAL_PAGES]);

  const isScrapbookEnabled = useMemo(() => renderableElements.some(el => el.type === 'component' && el.name === 'Scrapbook'), [renderableElements]);
  const scrapbookElement = useMemo(() => renderableElements.find(el => el.type === 'component' && el.name === 'Scrapbook'), [renderableElements]);
  const rsvpElement = useMemo(() => renderableElements.find(el => el.type === 'component' && el.name === 'RSVP Form'), [renderableElements]);
  
  const [displayedImagesAndTheirData, setDisplayedImagesAndTheirData] = useState([]);

  // --- Function to Save Configuration (Modified) ---
  const handleSaveConfiguration = async () => {
    if (!currentWeddingId) {
      setSaveErrorMessage('Cannot save: Wedding ID is missing.');
      setTimeout(() => setSaveErrorMessage(null), 5000);
      return;
    }
    setIsSaving(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    try {
      const viewType = isMobile ? 'mobile' : 'desktop';
      // console.log(`[GuestExperience] Attempting to save ${viewType} layout settings for ${currentWeddingId}`);
      await useLevaStore.getState().saveSettingsToServer(currentWeddingId, viewType);
      setSaveSuccessMessage(`Layout for ${viewType} view saved successfully!`);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (error) {
      // console.error(`[GuestExperience] Error saving ${isMobile ? 'mobile' : 'desktop'} layout settings:`, error);
      const errorMsg = error.message || (error.response?.data?.message) || 'Unknown error';
      setSaveErrorMessage(`Failed to save layout. Error: ${errorMsg}`);
      setTimeout(() => setSaveErrorMessage(null), 7000);
    }
    setIsSaving(false);
  };
  // --- END ADDED ---

  // --- Callback for InteractiveScrapbook to update GuestExperience ---
  const handleDisplayedImagesUpdate = useCallback((newImageData) => {
    // Prevent unnecessary re-renders if the data is identical.
    // Shallow compare might be too naive if newImageData contains complex objects/arrays that are structurally same but new refs.
    // For now, a simple length check and then full update might be okay, or consider a deep equality check if performance issues persist here.
    setDisplayedImagesAndTheirData(prevData => {
      if (JSON.stringify(prevData) !== JSON.stringify(newImageData)) {
        return newImageData;
      }
      return prevData;
    });
  }, []); // Empty dependency array if setDisplayedImagesAndTheirData is stable and no other external deps are used
  // --- End Callback ---

  useEffect(() => {
    let isMounted = true;
    if (!isScrapbookEnabled || !weddingData?.scrapbookImageFileNames?.length) {
      if (isMounted) setImageNaturalDimensions([]);
      return;
    }

    const imagePaths = weddingData.scrapbookImages.map(img => {
      if (img.fileName && (img.fileName.startsWith('http://') || img.fileName.startsWith('https://'))) {
        return img.fileName;
      }
      const folder = weddingData.scrapbookImageFolder.endsWith('/') ? weddingData.scrapbookImageFolder : weddingData.scrapbookImageFolder + '/';
      const name = img.fileName.startsWith('/') ? img.fileName.substring(1) : img.fileName;
      return folder + name;
    });

    const dimensionsPromises = imagePaths.map(src =>
      new Promise((resolve) => {
        if (!src) {
          resolve({ width: 0, height: 0, src: src || '' }); return;
        }
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, src });
        img.onerror = () => {
          // console.error('Failed to load image for dimensions: ' + src);
          resolve({ width: 0, height: 0, src });
        };
        img.src = src;
      })
    );
    Promise.all(dimensionsPromises).then(dims => {
      if (isMounted) setImageNaturalDimensions(dims);
    }).catch(error => {
      if (isMounted) {
        // console.error("Error loading image dimensions:", error);
        setImageNaturalDimensions(imagePaths.map(s => ({ width: 0, height: 0, src: s || '' })));
      }
    });
    return () => { isMounted = false; };
  }, [isScrapbookEnabled, weddingData?.scrapbookImageFileNames, weddingData?.scrapbookImages, weddingData?.scrapbookImageFolder]);


  // --- Main Focused Image Animation Orchestration useEffect (Moved to top level, conditional logic inside) ---
  useEffect(() => {
    if (!isScrapbookEnabled) {
      if (focusedImage || imageReturningToScrapbook || pendingImageToFocus) {
        setFocusedImage(null);
        setImageReturningToScrapbook(null);
        setPendingImageToFocus(null);
        focusedImageApi.start({ opacity: 0, immediate: true });
      }
      return; 
    }

    let returnTimeoutId = null;
    if (focusedImage) {
      const { targetWidth, targetHeight } = calculateFocusTargetDimensions(focusedImage.naturalWidth, focusedImage.naturalHeight, windowWidth, windowHeight);
      const { top: calculatedTargetTopPx, left: calculatedTargetLeftPx } = getCenteredPosition(targetWidth, targetHeight, 1.5);
      focusedImageApi.start({ 
        from: { opacity: 0.5, top: `${focusedImage.initialTopPx}px`, left: `${focusedImage.initialLeftPx}px`, width: `${focusedImage.initialWidthPx}px`, height: `${focusedImage.initialHeightPx}px`, transform: `translate(0px, 0px) rotate(${focusedImage.initialRotateDeg}deg) scale(1)` }, 
        to: { opacity: 1, top: `${calculatedTargetTopPx}px`, left: `${calculatedTargetLeftPx}px`, width: `${targetWidth}px`, height: `${targetHeight}px`, transform: 'translate(0px, 0px) rotate(0deg) scale(1)' }, 
        config: activeSpringConfigGuest
      });
    } else if (imageReturningToScrapbook) {
      const { currentIndex: returningDisplayIndex, initialWidthPx, initialHeightPx } = imageReturningToScrapbook;
      const targetScrapbookElement = scrapbookImageRefs.current[returningDisplayIndex];
      const currentItemDataForReturn = displayedImagesAndTheirData.find(d => d.displayIndex === returningDisplayIndex);
      if (targetScrapbookElement && currentItemDataForReturn) {
        const currentRect = targetScrapbookElement.getBoundingClientRect();
        const scrapbookLayoutInfoForReturn = currentItemDataForReturn.initialStyle;
        const baseRotationPutDown = parseRotationFromStyle(scrapbookLayoutInfoForReturn.transform);
        const itemScrollSensitivityPutDown = currentItemDataForReturn.scrollSensitivity;
        const currentDynamicAngleForPutDown = Math.sin(scrollY * itemScrollSensitivityPutDown + returningDisplayIndex * 0.5) * 45;
        const totalCurrentRotationForPutDown = baseRotationPutDown + currentDynamicAngleForPutDown;
        focusedImageApi.start({ 
          to: { top: `${currentRect.top}px`, left: `${currentRect.left}px`, width: `${initialWidthPx}px`, height: `${initialHeightPx}px`, transform: `translate(0px, 0px) rotate(${totalCurrentRotationForPutDown}deg) scale(1)`}, 
          config: activeSpringConfigGuest
        });
        // Opacity fade out for returning image can use a different, perhaps faster config
        focusedImageApi.start({ to: { opacity: 0 }, config: { tension: 300, friction: 20 }}); // This specific one can be different if needed
        returnTimeoutId = setTimeout(() => {
          const currentReturningImageFromRef = imageReturningToScrapbookRef.current;
          setImageReturningToScrapbook(null);
          if (currentReturningImageFromRef) { setLastPutDownIndex(currentReturningImageFromRef.currentIndex); }
          const currentPendingImageFromRef = pendingImageToFocusRef.current;
          if (currentPendingImageFromRef) { setFocusedImage(currentPendingImageFromRef); setPendingImageToFocus(null); }
        }, 50); // Reduced timeout for quicker transition
      } else {
        // Fallback if target element for return animation isn't found
        focusedImageApi.start({ opacity: 0, immediate: true }); // Hide immediately
        setImageReturningToScrapbook(null);
        if (pendingImageToFocus) { setFocusedImage(pendingImageToFocus); setPendingImageToFocus(null); }
      }
    } else {
      // If neither focused nor returning, ensure it's hidden
      focusedImageApi.start({ opacity: 0, immediate: true });
    }
    return () => { if (returnTimeoutId) { clearTimeout(returnTimeoutId); } };
  }, [focusedImage, imageReturningToScrapbook, pendingImageToFocus, focusedImageApi, windowWidth, windowHeight, displayedImagesAndTheirData, scrollY, activeSpringConfigGuest, calculateFocusTargetDimensions, getCenteredPosition]); // Added currentScrollY and activeSpringConfigGuest


  // --- ADDED: useEffect to update text colors when color scheme changes ---
  const levaSetters = useLevaStore(state => state.levaSetters);
  const schemas = useLevaStore(state => state.schemas);
  const store = useLevaStore.getState(); // Make store accessible for the effects below

  useEffect(() => {
    if (!selectedColorScheme || !elementsFromProps || elementsFromProps.length === 0 || !levaSetters || !schemas || Object.keys(levaSetters).length === 0 || Object.keys(schemas).length === 0) {
      return;
    }

    const availableColors = [selectedColorScheme.primary, selectedColorScheme.secondary, selectedColorScheme.accent].filter(Boolean);

    if (availableColors.length === 0) {
      return;
    }

    // console.log(`[GuestExperience] Color scheme changed to '${selectedColorScheme.name}'. Updating text element colors.`);

    elementsFromProps.forEach(element => {
      if (element.type === 'text') {
        const simplifiedType = element.type.replace(/\s+/g, '_');
        const folderName = `element_${element.id}_${element.name ? element.name.replace(/\s+/g, '_') : simplifiedType}`;
        const setter = levaSetters[folderName];
        const elementSchema = schemas[folderName];

        if (setter && elementSchema && elementSchema.textColor) {
          const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
          // console.log(`[GuestExperience]   Updating ${folderName} textColor to ${randomColor}`);
          setter({ textColor: randomColor });
        }
      }
    });
  }, [selectedColorScheme, elementsFromProps, levaSetters, schemas]);
  // --- END ADDED ---

  // --- ADDED: useEffect to update text element font controls when global font family changes ---
  useEffect(() => {
    if (!overallFontFamily || !elementsFromProps || elementsFromProps.length === 0 || !levaSetters || !schemas || Object.keys(levaSetters).length === 0 || Object.keys(schemas).length === 0) {
      return;
    }
    // Ensure store is available and has controlValues
    if (!store || !store.controlValues) {
      return;
    }

    // console.log(`[GuestExperience] Global font family changed to '${overallFontFamily}'. Updating text element font controls.`);

    elementsFromProps.forEach(element => {
      if (element.type === 'text') {
        const simplifiedType = element.type.replace(/\s+/g, '_');
        const folderName = `element_${element.id}_${element.name ? element.name.replace(/\s+/g, '_') : simplifiedType}`;
        const setter = levaSetters[folderName];
        const elementSchema = schemas[folderName];
        const currentElementControls = store.controlValues[folderName];

        if (setter && elementSchema && elementSchema.fontFamily) {
          if (currentElementControls?.fontFamily !== overallFontFamily) {
            // console.log(`[GuestExperience]   Updating ${folderName} fontFamily to ${overallFontFamily}`);
            setter({ fontFamily: overallFontFamily });
          }
        }
      }
    });
  }, [overallFontFamily, elementsFromProps, levaSetters, schemas, store]);
  // --- END ADDED ---

  // --- Event Handlers (Resize, Scroll) ---
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
      setWindowWidth(window.innerWidth);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // ADD useEffect to update scrollY from parallaxRef
  useEffect(() => {
    const parallaxContainer = parallaxRef.current?.container?.current;
    if (!parallaxContainer) return;

    const handleScroll = () => {
      const currentScrollY = parallaxContainer.scrollTop;
      // console.log('[GuestExperience] handleScroll - scrollY:', currentScrollY);
      setScrollY(currentScrollY);
    };

    parallaxContainer.addEventListener('scroll', handleScroll);
    return () => parallaxContainer.removeEventListener('scroll', handleScroll);
  }, [parallaxRef.current]); // Rerun if parallaxRef itself changes (though unlikely)

  // useEffect to specifically log parallaxRef.current.space changes
  useEffect(() => {
    if (parallaxRef.current?.space) {
      // console.log(`[GuestExperience] DEBUG: parallaxRef.current.space updated to: ${parallaxRef.current.space}`);
    } else {
      // console.log(`[GuestExperience] DEBUG: parallaxRef.current.space is currently: ${parallaxRef.current?.space}`);
    }
  }, [parallaxRef.current?.space]);

  // Internal data fetching useEffect is removed.
  // useEffect(() => { ... fetchData ... }, [weddingId, experienceSettings]);

  // --- Focused Image Event Handlers (Needs to be defined before being used in useCallback for handleImageClick) ---
  const handleCloseFocusedImage = useCallback((e) => {
    if (e) e.stopPropagation();
    if (!isScrapbookEnabled) return;

    if (focusedImage) {
      setImageReturningToScrapbook(focusedImage);
      setFocusedImage(null);
      setPendingImageToFocus(null);
    } else if (imageReturningToScrapbook) {
      setImageReturningToScrapbook(null); 
      setFocusedImage(null);
      setPendingImageToFocus(null);
      focusedImageApi.start({opacity: 0, immediate: true});
    }
  }, [isScrapbookEnabled, focusedImage, imageReturningToScrapbook, focusedImageApi, setImageReturningToScrapbook, setFocusedImage, setPendingImageToFocus]);

  const updateAndFocusNewImage = useCallback((newDisplayIndex) => {
    if (!isScrapbookEnabled || !displayedImagesAndTheirData || displayedImagesAndTheirData.length === 0) return null;
    if (newDisplayIndex < 0 || newDisplayIndex >= displayedImagesAndTheirData.length) return null;
  
    setLastPutDownIndex(null);
  
    const targetImageData = displayedImagesAndTheirData.find(d => d.displayIndex === newDisplayIndex);
    const targetImageElement = scrapbookImageRefs.current[newDisplayIndex];
  
    if (!targetImageData || !targetImageElement) {
      // console.warn("updateAndFocusNewImage: Target image data or element not found for index", newDisplayIndex);
      return null;
    }
    
    const newImageSrc = targetImageData.src;
    let naturalDims = imageNaturalDimensions.find(dim => dim.src === newImageSrc);

    if (!naturalDims || !naturalDims.width || !naturalDims.height) {
      if (targetImageElement.naturalWidth > 0 && targetImageElement.naturalHeight > 0) {
        naturalDims = { width: targetImageElement.naturalWidth, height: targetImageElement.naturalHeight, src: newImageSrc };
      } else {
        // console.error("CANNOT NAVIGATE TO IMAGE: Natural dimensions are zero or unavailable for", newImageSrc);
        return null;
      }
    }
  
    const rect = targetImageElement.getBoundingClientRect();
    const baseRotateNav = parseRotationFromStyle(targetImageData.initialStyle.transform);
    const itemScrollSensitivityNav = targetImageData.scrollSensitivity || 0;
    const itemDynamicRotationRangeNav = targetImageData.dynamicRotationRange || 0;
    const currentDynamicAngleForNavPickUp = Math.sin(scrollY * itemScrollSensitivityNav + newDisplayIndex * 0.5) * itemDynamicRotationRangeNav;
    const fullInitialRotateNav = baseRotateNav + currentDynamicAngleForNavPickUp;
  
    return {
      src: newImageSrc,
      altText: targetImageData.altText || `Scrapbook item ${newDisplayIndex + 1}`,
      initialTopPx: rect.top,
      initialLeftPx: rect.left,
      initialWidthPx: rect.width,
      initialHeightPx: rect.height,
      initialRotateDeg: fullInitialRotateNav,
      naturalWidth: naturalDims.width,
      naturalHeight: naturalDims.height,
      currentIndex: newDisplayIndex,
      description: `Image ${newDisplayIndex + 1} description.`, 
      photographer: `Photographer ${newDisplayIndex + 1}.`
    };
  }, [isScrapbookEnabled, displayedImagesAndTheirData, imageNaturalDimensions, scrollY, scrapbookImageRefs]);

  const handlePreviousImage = useCallback((e) => {
    e.stopPropagation();
    if (!isScrapbookEnabled || !focusedImage || !displayedImagesAndTheirData || displayedImagesAndTheirData.length === 0) return;
    const newIndex = (focusedImage.currentIndex - 1 + displayedImagesAndTheirData.length) % displayedImagesAndTheirData.length;
    const newImageDetails = updateAndFocusNewImage(newIndex);
    if (newImageDetails) {
      setImageReturningToScrapbook(focusedImage);
      setPendingImageToFocus(newImageDetails);
      setFocusedImage(null);
    }
  }, [isScrapbookEnabled, focusedImage, displayedImagesAndTheirData, updateAndFocusNewImage, setImageReturningToScrapbook, setPendingImageToFocus, setFocusedImage]);

  const handleNextImage = useCallback((e) => {
    e.stopPropagation();
    if (!isScrapbookEnabled || !focusedImage || !displayedImagesAndTheirData || displayedImagesAndTheirData.length === 0) return;
    const newIndex = (focusedImage.currentIndex + 1) % displayedImagesAndTheirData.length;
    const newImageDetails = updateAndFocusNewImage(newIndex);
    if (newImageDetails) {
      setImageReturningToScrapbook(focusedImage);
      setPendingImageToFocus(newImageDetails);
      setFocusedImage(null);
    }
  }, [isScrapbookEnabled, focusedImage, displayedImagesAndTheirData, updateAndFocusNewImage, setImageReturningToScrapbook, setPendingImageToFocus, setFocusedImage]);

  const handleImageClick = useCallback((details) => {
    if (!isScrapbookEnabled) return;

    setLastPutDownIndex(null);
    const { 
      imageSrc: clickedSrc, 
      altText: clickedAlt, 
      initialStyle: clickedInitialStyle, 
      currentBoundingClientRect: rect, 
      imageElement, 
      index: clickedDisplayIndex 
    } = details;

    let naturalDims = imageNaturalDimensions.find(dim => dim.src === clickedSrc);
    if (!naturalDims || !naturalDims.width || !naturalDims.height) {
      if (imageElement && imageElement.naturalWidth > 0 && imageElement.naturalHeight > 0) {
        naturalDims = { width: imageElement.naturalWidth, height: imageElement.naturalHeight, src: clickedSrc };
      } else {
        // console.error("CANNOT SET FOCUSED IMAGE: Natural dimensions are zero or unavailable for", clickedSrc);
        return;
      }
    }
    
    const clickedItemData = displayedImagesAndTheirData.find(d => d.displayIndex === clickedDisplayIndex);
    if (!clickedItemData) {
      // console.error("Could not find item data for clicked image index:", clickedDisplayIndex);
      return;
    }

    const baseRotateOnClick = parseRotationFromStyle(clickedInitialStyle.transform);
    const itemScrollSensitivityOnClick = clickedItemData.scrollSensitivity || 0;
    const itemDynamicRotationRange = clickedItemData.dynamicRotationRange || 0;
    const currentDynamicAngleForPickUp = Math.sin(scrollY * itemScrollSensitivityOnClick + clickedDisplayIndex * 0.5) * itemDynamicRotationRange;
    const fullInitialRotateOnClick = baseRotateOnClick + currentDynamicAngleForPickUp;

    const clickedImageDetails = {
      src: clickedSrc,
      altText: clickedAlt,
      initialTopPx: rect.top,
      initialLeftPx: rect.left,
      initialWidthPx: rect.width,
      initialHeightPx: rect.height,
      initialRotateDeg: fullInitialRotateOnClick,
      naturalWidth: naturalDims.width,
      naturalHeight: naturalDims.height,
      currentIndex: clickedDisplayIndex,
      description: `Image ${clickedDisplayIndex + 1} from the collection.`,
      photographer: `Photographer details if available.`
    };

    if (focusedImage) {
      setImageReturningToScrapbook(focusedImage);
      setPendingImageToFocus(clickedImageDetails);
      setFocusedImage(null);
    } else {
      setFocusedImage(clickedImageDetails);
      setPendingImageToFocus(null);
      setImageReturningToScrapbook(null);
    }
  }, [
    isScrapbookEnabled, 
    imageNaturalDimensions, 
    displayedImagesAndTheirData, 
    scrollY, 
    focusedImage, 
    setLastPutDownIndex, 
    setImageReturningToScrapbook, 
    setPendingImageToFocus, 
    setFocusedImage
  ]);
  // --- End Focused Image Event Handlers ---

  // --- ADDED: FontGrabber Integration ---
  const googleFontsToLoad = useMemo(() => {
    const fonts = new Set();
    // Ensure store and controlValues are available
    if (!store || !store.controlValues) {
      // If overallFontFamily is a Google font and no store yet, at least add that.
      if (overallFontFamily && isGoogleFont(overallFontFamily)) {
        fonts.add(overallFontFamily.split(',')[0].trim());
      }
      return Array.from(fonts).map(name => ({ name }));
    }

    // Add global font if it's a Google Font
    if (overallFontFamily && isGoogleFont(overallFontFamily)) {
      fonts.add(overallFontFamily.split(',')[0].trim());
    }

    // Add fonts from individual text elements
    elementsFromProps.forEach(element => {
      if (element.type === 'text') {
        const simplifiedType = element.type.replace(/\s+/g, '_');
        const folderName = `element_${element.id}_${element.name ? element.name.replace(/\s+/g, '_') : simplifiedType}`;
        const elementControls = store.controlValues[folderName];
        const textFont = elementControls?.fontFamily;
        if (textFont && isGoogleFont(textFont)) {
          fonts.add(textFont.split(',')[0].trim());
        }
      }
    });

    return Array.from(fonts).map(name => ({ name }));
  }, [overallFontFamily, elementsFromProps, store]);
  // --- END ADDED ---

  return (
    <>
      <Leva hidden={!isSetupMode} />
      <FontGrabber fonts={googleFontsToLoad} /> {/* ADDED FontGrabber INSTANCE */}

      {/* --- ADDED: Save Button --- */}
      {isSetupMode && (
        <div style={{ position: 'fixed', top: '10px', left: '10px', zIndex: 10001 }}>
          <button 
            ref={saveLayoutButtonRef}
            onClick={handleSaveConfiguration} 
            disabled={isSaving}
            style={{
              padding: '10px 20px',
              fontSize: '0.9rem',
              color: 'white',
              backgroundColor: isSaving ? '#cf5200' : '#007bff',
              border: 'none',
              borderRadius: '5px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}
          >
            {isSaving ? 'Saving Layout...' : 'Save Layout Configuration'}
          </button>
          {saveSuccessMessage && <div style={{color: 'lime', background: 'rgba(0,0,0,0.7)', padding: '5px', marginTop: '5px', borderRadius: '3px', fontSize: '0.8em'}}>{saveSuccessMessage}</div>}
          {saveErrorMessage && <div style={{color: 'red', background: 'rgba(0,0,0,0.7)', padding: '5px', marginTop: '5px', borderRadius: '3px', fontSize: '0.8em'}}>{saveErrorMessage}</div>}
        </div>
      )}
      {/* --- END ADDED --- */}

      {/* --- ADDED: Debug HUD --- */}
      {isSetupMode && showGlobalHUDEnabledGuest && (
        <div style={{
          position: 'fixed',
          top: `${saveLayoutButtonHeight}px`, // Position below the save button
          left: '10px',
          zIndex: 10000,
          background: 'rgba(0,0,0,0.6)',
          color: 'white',
          padding: '8px',
          borderRadius: '0 0 5px 5px',
          fontSize: '13px',
          fontFamily: 'monospace',
          minWidth: '200px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}>
          <div>ScrollY: {scrollY.toFixed(0)}</div>
          <div>Scroll %: {(scrollPercentage * 100).toFixed(1)}%</div>
          <div>Total Pages: {TOTAL_PAGES.toFixed(1)}</div>
          <div>Renderable Elements: {renderableElements.length}</div>
          <div>Spring Preset: {activeSpringConfigGuest.name}</div>
          {focusedImage && <div>Focused Img: {focusedImage.currentIndex}</div>}
          {imageReturningToScrapbook && <div>Returning Img: {imageReturningToScrapbook.currentIndex}</div>}
          {/* Add more debug info as needed */}
        </div>
      )}
      {/* --- END ADDED --- */}

      <div style={{ width: '100%', height: '100vh', background: '#f0f0f0' }}>
        <Parallax ref={parallaxRef} pages={TOTAL_PAGES} style={{ top: '0', left: '0', pointerEvents: (focusedImage || imageReturningToScrapbook) ? 'none' : 'auto' }}>
          
          {/* Dynamic Shifting Background Layer */}
          <ParallaxLayer
            offset={0}
            speed={0} // Fixed layer, scrollY prop will handle the shift
            factor={TOTAL_PAGES} // Span all pages
            style={{ zIndex: -20 }} // Ensure it is behind everything
          >
            <ShiftingBackgroundColors 
              scrollY={scrollY} 
              TOTAL_PAGES={TOTAL_PAGES} // Pass TOTAL_PAGES (which is TOTAL_PAGES_GUEST in this scope)
              windowHeight={windowHeight} // Pass windowHeight
              selectedColorScheme={selectedColorScheme} // ADDED: Pass the selected color scheme object
            />
          </ParallaxLayer>

          {/* Generic Elements */}
          {renderableElements.map((element) => {
            let contentToRender = null;
            switch (element.type) {
              case 'text':
                contentToRender = <h2>{element.content}</h2>;
                break;
              case 'photo':
                contentToRender = (
                  <img 
                    src={element.content} 
                    alt={element.name || 'Wedding photo'} 
                    style={{ maxWidth: '80%', maxHeight: '80vh', borderRadius: '8px', border: `3px solid ${element.timelineColor}` }} 
                  />
                );
                break;
              case 'background-image':
                contentToRender = (
                  <div 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      backgroundImage: `url(${element.content})`,
                      backgroundSize: 'cover', 
                      backgroundPosition: 'center', 
                    }} 
                  />
                );
                break;
              default:
                contentToRender = <div>Unsupported element type: {element.type}</div>;
            }

            if (!contentToRender) return null; 

            return (
              <ParallaxLayer
                key={element.key}
                sticky={element.sticky}
                style={{
                  ...centerStyle,
                  zIndex: element.type === 'background-image' ? -5 : (experienceSettings.elements.length - element.id + 1),
                }}
              >
                <ElementWrapper 
                  element={element}
                  experienceSettings={experienceSettings}
                  scrollY={scrollY}
                  windowHeight={windowHeight}
                  TOTAL_PAGES={TOTAL_PAGES}
                >
                  {contentToRender}
                </ElementWrapper>
              </ParallaxLayer>
            );
          }).filter(Boolean)}

          {/* RSVP Form Layer */}
          {rsvpElement && (
            <ParallaxLayer
              offset={rsvpElement.pageOffset}
              sticky={rsvpElement.sticky}
              speed={rsvpElement.speed || 0.5}
              style={{ ...centerStyle, zIndex: 150, pointerEvents: 'none' }}
            >
              <ElementWrapper 
                element={rsvpElement} 
                experienceSettings={experienceSettings} 
                scrollY={scrollY} 
                windowHeight={windowHeight} 
                TOTAL_PAGES={TOTAL_PAGES}
              >
                <RSVPForm 
                  ref={rsvpFormRef}
                  weddingData={weddingData} 
                  backendUrl={weddingData.rsvpEndpoint} 
                />
              </ElementWrapper>
            </ParallaxLayer>
          )}

          {/* Interactive Scrapbook Layer */}
          {scrapbookElement && (
            <ParallaxLayer
              offset={scrapbookElement.pageOffset}
              sticky={scrapbookElement.sticky}
              speed={scrapbookElement.speed || 0.2}
              style={{ ...centerStyle, zIndex: 100, pointerEvents: 'auto' }}
            >
              <InteractiveScrapbook
                weddingData={weddingData}
                config={scrapbookElement.content} 
                scrollY={scrollY}
                // Focus-related props & handlers
                onImageClick={handleImageClick} // Passed down
                focusedImageGlobal={focusedImage} // Pass the focusedImage state
                imageReturningToScrapbookGlobal={imageReturningToScrapbook} // Pass the returning state
                lastPutDownIndexGlobal={lastPutDownIndex} // Pass the last put down index
                scrapbookImageRefs={scrapbookImageRefs} // Pass the refs array (its .current is used internally by IS)
                onDisplayedImagesUpdate={handleDisplayedImagesUpdate} // Pass the memoized callback
                windowWidth={windowWidth}
                windowHeight={windowHeight}
              />
            </ParallaxLayer>
          )}
        </Parallax>
      </div>

      {/* --- Focused Image Modal (from WeddingJourney) --- */}
      <>
        <animated.div style={backdropSpring} onClick={handleCloseFocusedImage} />
        {isScrapbookEnabled && (focusedImage || imageReturningToScrapbook) && (
          <animated.div {...(bindFocusedImageDrag())} style={{ ...focusedImageContainerSpring, zIndex: 1001, touchAction: 'none' }}>
            {(focusedImage || imageReturningToScrapbook) && (
              <div onClick={(e) => e.stopPropagation()} style={{ pointerEvents: 'auto', width: '100%', height: '100%', position: 'relative' }}>
                <img
                  src={focusedImage?.src || imageReturningToScrapbook?.src || ''}
                  alt={focusedImage?.altText || imageReturningToScrapbook?.altText || 'Focused image'}
                  style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', boxShadow: '0px 10px 30px rgba(0,0,0,0.5)', border: '10px solid white', borderRadius: '3px' }}
                />
                {/* Optional: Info box for description/photographer if needed */}
                {focusedImage && (
                  <>
                    <button
                      onClick={handlePreviousImage}
                      disabled={!focusedImage}
                      style={{ position: 'fixed', top: '50%', left: '20px', zIndex: 1002, transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer', pointerEvents: 'auto' }}
                    >
                      &#8592;
                    </button>
                    <button
                      onClick={handleNextImage}
                      disabled={!focusedImage}
                      style={{ position: 'fixed', top: '50%', right: '20px', zIndex: 1002, transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer', pointerEvents: 'auto' }}
                    >
                      &#8594;
                    </button>
                    <animated.div style={{ ...infoBoxSpring, position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 1002, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '10px 20px', borderRadius: '5px', textAlign: 'center', pointerEvents: 'auto' }}>
                      <p style={{ margin: 0, fontSize: '0.9em' }}>{focusedImage.altText}</p>
                      {focusedImage.description && <p style={{ margin: '5px 0 0', fontSize: '0.8em' }}>{focusedImage.description}</p>}
                    </animated.div>
                  </>
                )}
              </div>
            )}
          </animated.div>
        )}
      </>
      {/* --- End Focused Image Modal --- */}

    </>
  );
};

export default GuestExperience; 