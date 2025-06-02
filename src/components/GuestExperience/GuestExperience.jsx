import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
// import { useParams } from 'react-router-dom'; // No longer needed if weddingId comes via props
// import axios from 'axios'; // No longer needed
import { Parallax, ParallaxLayer } from '@react-spring/parallax';
import { Leva } from 'leva';
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
};

// Default spring configuration (can be adjusted)
const defaultSpringConfig = { tension: 170, friction: 26 };

// Define overall controls schema for HUD toggle (similar to WeddingJourney)
const overallControlsSchemaDefinitionGuest = (isSetupModeFromContext) => ({
  showHUD: { value: isSetupModeFromContext, label: 'Show Debug HUD' },
  springPreset: { value: 'default', options: ['default', 'gentle', 'wobbly', 'stiff', 'slow'], label: 'Animation Physics' },
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

  if (element.type === 'text') {
    controlsSchema = {
      ...controlsSchema,
      landingYPosition: { value: 0, step: 1, label: 'Landing Y Position (px)' },
      fadeOutEndYPosition: { value: 1, min: 0, max: 2, step: 0.01, label: 'Fade Out End Y (% duration)' },
      fadeOutAnimationCurve: { value: 'disabled', options: ['disabled', ...Object.keys(animationCurves)], label: 'Fade Out Animation Curve' },
    };
  } else if (element.type === 'photo' && element.name !== 'background-image') {
    controlsSchema = {
      ...controlsSchema,
      landingYPosition: { value: 0, step: 1, label: 'Landing Y Position (px)' },
      startingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Starting Scale' },
      endingScale: { value: 1, min: 0.1, max: 5, step: 0.01, label: 'Ending Scale' },
      scaleEndYPosition: { value: 0.5, min: 0, max: 1, step: 0.01, label: 'Scale End Y (% duration)' },
      scaleAnimationCurve: { value: 'linear', options: Object.keys(animationCurves), label: 'Scale Animation Curve' },
      fadeOutEndYPosition: { value: 1, min: 0, max: 2, step: 0.01, label: 'Fade Out End Y (% duration)' },
      fadeOutAnimationCurve: { value: 'disabled', options: ['disabled', ...Object.keys(animationCurves)], label: 'Fade Out Animation Curve' },
      lockToViewportEdge: { value: 'disabled', options: ['disabled', 'imageBottom-viewportBottom', 'imageTop-viewportTop'], label: 'Lock to Viewport Edge'},
    };
  } else if (element.type === 'component' && element.name === 'RSVP Form') {
    // RSVP Form specific controls can be added here if needed, or managed within RSVPForm itself.
    // For now, ElementWrapper only handles opacity for RSVP Form.
  }
  
  const folderName = `Element ${element.id} (${element.name || element.type})`;
  const controls = useTrackedControls(
    folderName, 
    controlsSchema, 
    { collapsed: true }
  );

  const { 
    opacity = 1, 
    landingYPosition = 0,
    startingScale = 1, 
    endingScale = 1, 
    scaleEndYPosition = 0.5, 
    scaleAnimationCurve = 'linear',
    fadeOutEndYPosition = 1,
    fadeOutAnimationCurve = 'disabled',
    lockToViewportEdge = 'disabled'
  } = controls.values;

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
  let yTransform = initialYFromLanding + (isCentered ? yOffsetToCenter : 0);

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
  
  if (element.id === 4 && console.log) {
    console.log(`[ElementWrapper Debug - ID: ${element.id} (${element.name})]`, {
      scrollY: scrollY,
      landingYPosition: landingYPosition,
      lockToViewportEdge: lockToViewportEdge,
      lockIsActive: lockIsActive,
      measuredHeight: measuredHeight,
      currentScale: currentScale,
      actualDisplayedHeight: actualDisplayedHeight,
      elementStartScroll,
      elementEndScroll,
      windowHeight,
      finalCalculatedYTransform: finalCalculatedYTransform
    });
  }

  let elementOuterStyle = {
    opacity: finalOpacity,
    transform: `translateY(${finalCalculatedYTransform}px) scale(${currentScale})`,
    width: element.type === 'background-image' ? '100%' : 'auto',
    height: element.type === 'background-image' ? '100%' : 'auto',
    // Default pointer-events, can be overridden for RSVP form
  };

  let childToRender = children;
  if (React.isValidElement(children) && (element.type === 'photo' || element.type === 'text')) {
     childToRender = React.cloneElement(children, { ref: currentChildRef });
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
      console.log('[GuestExperience] useEffect: weddingDataFromApp.initialElementLayouts found, calling loadSettingsFromDB.', weddingDataFromApp.initialElementLayouts);
      useLevaStore.getState().loadSettingsFromDB(weddingDataFromApp.initialElementLayouts);
    } else {
      console.log('[GuestExperience] useEffect: weddingDataFromApp.initialElementLayouts NOT found. Leva will use defaults.');
    }
  }, [weddingDataFromApp]); // Dependency on weddingDataFromApp
  // --- END ADDED ---

  // --- Calculate TOTAL_PAGES for Parallax ---
  const TOTAL_PAGES = useMemo(() => {
    const calculated = (experienceSettings?.timelineLength > 0 && windowHeight > 0 
      ? Math.max(1.1, experienceSettings.timelineLength / windowHeight) 
      : 3);
    console.log(`[GuestExperience] Calculated TOTAL_PAGES: ${calculated} (timelineLength: ${experienceSettings?.timelineLength}, windowHeight: ${windowHeight})`);
    return calculated;
  }, [experienceSettings?.timelineLength, windowHeight]);
  // console.log(`[GuestExperience] DEBUG: TOTAL_PAGES is hardcoded to: ${TOTAL_PAGES}`); // Remove hardcoded log

  // useEffect to specifically log parallaxRef.current.space changes
  useEffect(() => {
    const currentTimelineLength = experienceSettings?.timelineLength;
    console.log(`[GuestExperience] DEBUG: parallaxRef.current.space is currently: ${parallaxRef.current?.space}. TOTAL_PAGES: ${TOTAL_PAGES}, timelineLength: ${currentTimelineLength}`);
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
  }, [scrollY, windowHeight, TOTAL_PAGES]); // Dependencies are scrollY, windowHeight, and TOTAL_PAGES

  // --- Leva Controls & HUD ---
  // Overall controls for HUD visibility
  const overallControlsSchema = useMemo(() => overallControlsSchemaDefinitionGuest(isSetupMode), [isSetupMode]);
  const overallControls = useTrackedControls(
    'Overall Controls (Guest)',
    overallControlsSchema,
    { collapsed: false, hidden: false } // Always visible for Guest path
  );
  const { values: overallCtrlValues } = overallControls || {};
  const showGlobalHUDEnabled = overallCtrlValues?.showHUD ?? overallControlsSchema.showHUD.value;
  const { 
    springPreset: selectedSpringPresetKey = overallControlsSchema.springPreset.value
  } = overallCtrlValues || {};

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
  }, [isSetupMode, saveLayoutButtonRef.current, showGlobalHUDEnabled]); // Re-check if button appears/disappears or resizes

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
  const activeSpringConfig = springPresets[selectedSpringPresetKey] || springPresets.default;

  // --- Hooks for Focused Image Animation (Moved to top level) ---
  const backdropSpring = useSpring({ 
    opacity: focusedImage ? 1 : 0, 
    pointerEvents: focusedImage ? 'auto' : 'none',
    position: 'fixed',
    top: 0, left: 0, width: '100vw', height: '100vh', 
    background: 'rgba(0, 0, 0, 0.7)', 
    config: activeSpringConfig
  });

  const [focusedImageContainerSpring, focusedImageApi] = useSpring(() => ({ 
    opacity: 0, 
    top: '50%', 
    left: '50%', 
    width: '0px', 
    height: '0px', 
    transform: 'translate(-50%, -50%) rotate(0deg) scale(0.5)', 
    position: 'fixed', 
    config: activeSpringConfig 
  }));

  const infoBoxSpring = useSpring({ 
    opacity: focusedImage ? 1 : 0, 
    transform: focusedImage ? 'translateY(0px)' : 'translateY(20px)', 
    config: activeSpringConfig, 
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
      console.log(`[GuestExperience] Attempting to save ${viewType} layout settings for ${currentWeddingId}`);
      await useLevaStore.getState().saveSettingsToServer(currentWeddingId, viewType);
      setSaveSuccessMessage(`Layout for ${viewType} view saved successfully!`);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (error) {
      console.error(`[GuestExperience] Error saving ${isMobile ? 'mobile' : 'desktop'} layout settings:`, error);
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
          console.error('Failed to load image for dimensions: ' + src);
          resolve({ width: 0, height: 0, src });
        };
        img.src = src;
      })
    );
    Promise.all(dimensionsPromises).then(dims => {
      if (isMounted) setImageNaturalDimensions(dims);
    }).catch(error => {
      if (isMounted) {
        console.error("Error loading image dimensions:", error);
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
        from: { 
          opacity: 0.5, 
          top: `${focusedImage.initialTopPx}px`, 
          left: `${focusedImage.initialLeftPx}px`, 
          width: `${focusedImage.initialWidthPx}px`, 
          height: `${focusedImage.initialHeightPx}px`, 
          transform: `translate(0px, 0px) rotate(${focusedImage.initialRotateDeg}deg) scale(1)` 
        }, 
        to: { 
          opacity: 1, 
          top: `${calculatedTargetTopPx}px`, 
          left: `${calculatedTargetLeftPx}px`, 
          width: `${targetWidth}px`, 
          height: `${targetHeight}px`, 
          transform: 'translate(0px, 0px) rotate(0deg) scale(1)' 
        }, 
        config: activeSpringConfig 
      });
    } else if (imageReturningToScrapbook) {
      const { 
        currentIndex: returningDisplayIndex, 
        // These were the dimensions of the FOCUSED image, not the original scrapbook item's target return dimensions.
        // initialWidthPx: focusedWidthBeforeReturn,
        // initialHeightPx: focusedHeightBeforeReturn 
      } = imageReturningToScrapbook;
      
      const targetScrapbookElement = scrapbookImageRefs.current[returningDisplayIndex];
      const currentItemDataForReturn = displayedImagesAndTheirData.find(d => d.displayIndex === returningDisplayIndex);

      if (targetScrapbookElement && currentItemDataForReturn && currentItemDataForReturn.initialStyle) {
        const currentRect = targetScrapbookElement.getBoundingClientRect(); // Get fresh rect OF THE SCRAPBOOK ITEM
        
        const targetReturnTopPx = currentRect.top;
        const targetReturnLeftPx = currentRect.left;
        const targetReturnWidthPx = currentRect.width;   // Use currentRect.width for return target
        const targetReturnHeightPx = currentRect.height; // Use currentRect.height for return target

        const scrapbookLayoutInfoForReturn = currentItemDataForReturn.initialStyle;
        const baseRotationPutDown = parseRotationFromStyle(scrapbookLayoutInfoForReturn.transform);
        
        const itemScrollSensitivityPutDown = currentItemDataForReturn.scrollSensitivity || 0;
        const itemDynamicRotationRange = currentItemDataForReturn.dynamicRotationRange || 45;
        const currentDynamicAngleForPutDown = Math.sin(scrollY * itemScrollSensitivityPutDown + returningDisplayIndex * 0.5) * itemDynamicRotationRange;
        
        let totalCurrentRotationForPutDown = baseRotationPutDown + currentDynamicAngleForPutDown;
        // Ensure rotation is a finite number
        if (!Number.isFinite(totalCurrentRotationForPutDown)) {
          console.warn(`Calculated NaN for totalCurrentRotationForPutDown for index ${returningDisplayIndex}. Defaulting to 0. Base: ${baseRotationPutDown}, Dynamic: ${currentDynamicAngleForPutDown}`);
          totalCurrentRotationForPutDown = 0;
        }
        
        const animationToValues = {
          top: `${targetReturnTopPx}px`,
          left: `${targetReturnLeftPx}px`,
          width: `${targetReturnWidthPx}px`,
          height: `${targetReturnHeightPx}px`,
          transform: `translate(0px, 0px) rotate(${totalCurrentRotationForPutDown}deg) scale(1)`
        };

        // console.log(`[GuestExperience] Returning image ${returningDisplayIndex}. Animation TO values:`, animationToValues);
        // console.log(`[GuestExperience] currentRect for return:`, currentRect);
        // console.log(`[GuestExperience] currentItemDataForReturn for return:`, currentItemDataForReturn);

        focusedImageApi.start({ 
          to: animationToValues,
          config: activeSpringConfig 
        });
        focusedImageApi.start({ to: { opacity: 0 }, config: { tension: 300, friction: 20 } }); // Fade out
        
        returnTimeoutId = setTimeout(() => {
          const currentReturningImageFromRef = imageReturningToScrapbookRef.current;
          setImageReturningToScrapbook(null);
          if (currentReturningImageFromRef) { setLastPutDownIndex(currentReturningImageFromRef.currentIndex); }
          
          const currentPendingImageFromRef = pendingImageToFocusRef.current;
          if (currentPendingImageFromRef) { 
            setFocusedImage(currentPendingImageFromRef); 
            setPendingImageToFocus(null); 
          }
        }, defaultSpringConfig.tension > 250 ? 100 : 50);
      } else {
        console.warn("[GuestExperience] Focused image return: Target scrapbook element or its data not found for index", returningDisplayIndex, "Or initialStyle missing. Refs available:", scrapbookImageRefs.current.length, "Displayed data available:", displayedImagesAndTheirData.length);
        focusedImageApi.start({ opacity: 0, immediate: true });
        setImageReturningToScrapbook(null);
        if (pendingImageToFocusRef.current) { 
          setFocusedImage(pendingImageToFocusRef.current);
          setPendingImageToFocus(null);
        }
      }
    } else {
      focusedImageApi.start({ opacity: 0, immediate: true });
    }
    return () => { if (returnTimeoutId) clearTimeout(returnTimeoutId); };
  }, [
    isScrapbookEnabled, 
    focusedImage, 
    imageReturningToScrapbook, 
    focusedImageApi, 
    windowWidth, 
    windowHeight, 
    displayedImagesAndTheirData, 
    scrollY, 
    activeSpringConfig,
    // pendingImageToFocus is not directly in dep array as its ref is used in timeout,
    // but the effect re-runs on focusedImage/imageReturningToScrapbook which are affected by pending.
  ]);
  // --- End Main Focused Image Animation Orchestration useEffect ---


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
      console.log('[GuestExperience] handleScroll - scrollY:', currentScrollY);
      setScrollY(currentScrollY);
    };

    parallaxContainer.addEventListener('scroll', handleScroll);
    return () => parallaxContainer.removeEventListener('scroll', handleScroll);
  }, [parallaxRef.current]); // Rerun if parallaxRef itself changes (though unlikely)

  // useEffect to specifically log parallaxRef.current.space changes
  useEffect(() => {
    if (parallaxRef.current?.space) {
      console.log(`[GuestExperience] DEBUG: parallaxRef.current.space updated to: ${parallaxRef.current.space}`);
    } else {
      console.log(`[GuestExperience] DEBUG: parallaxRef.current.space is currently: ${parallaxRef.current?.space}`);
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
      console.warn("updateAndFocusNewImage: Target image data or element not found for index", newDisplayIndex);
      return null;
    }
    
    const newImageSrc = targetImageData.src;
    let naturalDims = imageNaturalDimensions.find(dim => dim.src === newImageSrc);

    if (!naturalDims || !naturalDims.width || !naturalDims.height) {
      if (targetImageElement.naturalWidth > 0 && targetImageElement.naturalHeight > 0) {
        naturalDims = { width: targetImageElement.naturalWidth, height: targetImageElement.naturalHeight, src: newImageSrc };
      } else {
        console.error("CANNOT NAVIGATE TO IMAGE: Natural dimensions are zero or unavailable for", newImageSrc);
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
        console.error("CANNOT SET FOCUSED IMAGE: Natural dimensions are zero or unavailable for", clickedSrc);
        return;
      }
    }
    
    const clickedItemData = displayedImagesAndTheirData.find(d => d.displayIndex === clickedDisplayIndex);
    if (!clickedItemData) {
      console.error("Could not find item data for clicked image index:", clickedDisplayIndex);
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

  return (
    <>
      <Leva hidden={!isSetupMode} />

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
      {isSetupMode && showGlobalHUDEnabled && (
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
          <div>Spring Preset: {activeSpringConfig.name}</div>
          {focusedImage && <div>Focused Img: {focusedImage.currentIndex}</div>}
          {imageReturningToScrapbook && <div>Returning Img: {imageReturningToScrapbook.currentIndex}</div>}
          {/* Add more debug info as needed */}
        </div>
      )}
      {/* --- END ADDED --- */}

      <div style={{ width: '100%', height: '100vh', background: '#f0f0f0' }}>
        <Parallax ref={parallaxRef} pages={TOTAL_PAGES} style={{ top: '0', left: '0', pointerEvents: (focusedImage || imageReturningToScrapbook) ? 'none' : 'auto' }}>
          
          {/* Generic Elements */}
          {renderableElements.map((element) => {
            let contentToRender = null;
            switch (element.type) {
              case 'text':
                contentToRender = <h2 style={{ color: element.timelineColor !== '#FFFFFF' ? element.timelineColor : '#333' }}>{element.content}</h2>;
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