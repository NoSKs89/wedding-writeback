import React, { useState, useEffect, useRef, useMemo, useCallback, CSSProperties } from 'react';
import { Parallax, ParallaxLayer, IParallax, ParallaxLayerProps } from '@react-spring/parallax';
import { useControls, folder } from 'leva';
import { useSpring, animated, config, useTransition } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';

import RSVPForm from '../RSVPForm';
import PromptForm from '../PromptForm';
import InteractiveScrapbook from './InteractiveScrapbook';
import ShiftingBackgroundColors from './ShiftingBackgroundColors';
import FontGrabber from '../FontGrabber';
import ScrollHint from '../ScrollHint';
import ElementWrapper from '../ElementWrapper';
import { useLevaStore } from '../../stores/levaStore';
import { useIsMobile } from '../../utils/deviceDetect';
import { useSetupMode } from '../../contexts/SetupModeContext';
import { UserInfoProvider } from '../../contexts/UserInfoContext';
import { fontFamilyOptions, isGoogleFont, FontObject } from '../../config/fontConfig';
import { springConfigPresets, weddingColorSchemes, overallControlsSchemaDefinitionGuest, SpringConfigPreset, WeddingColorScheme, parallaxPhysicsPresets, ParallaxPhysicsPreset, animationCurves } from '../../config/levaSchemas';
import { generateElementFolderName, getElementSchema } from './levaSchemas';
import { ElementConfig, ExperienceSettings as ExperienceSettingsType, TimelineMarker } from '../../types';
import { getApiBaseUrl } from '../../config/apiConfig';
import { updateThemeColor, resetThemeColor, darkenColorForStatusBar, getActualGradientStartColor } from '../../utils/themeColor';
import '../../App.css';
import Navbar from './Navbar';


// --- TYPE DEFINITIONS ---
interface WeddingData {
  id: string; 
  initialElementLayouts: any;
  scrapbookImages: any[];
  scrapbookImageFolder: string;
  rsvpEndpoint: string;
}

type ElementDefinition = ElementConfig & {
  key: string;
  sticky: { start: number, end: number };
  pageOffset: number;
  speed?: number;
};

interface GuestExperienceProps {
  weddingDataFromApp: WeddingData;
  experienceSettingsFromApp: ExperienceSettingsType;
  weddingIdFromApp: string;
  defaultLayoutSlotToLoad?: number;
  isSetupModeFromProps?: boolean;
  forceMobileView?: boolean;
  saveButtonContainerStyle?: CSSProperties;
}

interface FocusedImageState {
  src: string;
  altText: string;
  description?: string;
  initialTopPx: number;
  initialLeftPx: number;
  initialWidthPx: number;
  initialHeightPx: number;
  initialRotateDeg: number;
  naturalWidth: number;
  naturalHeight: number;
  currentIndex: number;
  displayIndex: number;
  itemScrollSensitivity?: number;
  itemDynamicRotationRange?: number;
  initialStyle: CSSProperties;
}

interface DisplayedImage {
  displayIndex: number;
  src: string;
  altText: string;
  description: string;
  initialStyle: CSSProperties;
  itemScrollSensitivity: number;
  itemDynamicRotationRange: number;
}

interface NaturalImageDimensions {
  width: number;
  height: number;
  src: string;
}

// --- HELPER FUNCTIONS ---
const parseRotationFromStyle = (transformString: string | number | undefined): number => {
  if (typeof transformString === 'number') return transformString;
  if (!transformString) return 0;
  const rotateMatch = transformString.match(/rotate\(([-\d.]+)deg\)/);
  return rotateMatch?.[1] ? parseFloat(rotateMatch[1]) : 0;
};

const calculateFocusTargetDimensions = (naturalW: number, naturalH: number, viewportW: number, viewportH: number) => {
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

const getCenteredPosition = (targetWidth: number, targetHeight: number, offsetXvw = 0) => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
  let leftPx = (vw - targetWidth) / 2;
  const topPx = (vh - targetHeight) / 2;
  leftPx -= (vw * offsetXvw) / 100;
  return { top: topPx, left: leftPx };
};

// --- PRELOADING MANAGER ---
interface PreloadedAsset {
  type: 'image' | 'video';
  src: string;
  loaded: boolean;
  error?: boolean;
}

const PreloadingManager: React.FC<{ 
  assets: string[]; 
  onComplete: () => void; 
  onProgress?: (loaded: number, total: number) => void 
}> = ({ assets, onComplete, onProgress }) => {
  const [loadedAssets, setLoadedAssets] = useState<PreloadedAsset[]>([]);
  
  useEffect(() => {
    if (assets.length === 0) {
      onComplete();
      return;
    }

    const assetPromises = assets.map((src, index) => {
      return new Promise<PreloadedAsset>((resolve) => {
        const isVideo = src.match(/\.(mp4|mov|avi|webm|mkv)$/i);
        
        if (isVideo) {
          // Preload video
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            resolve({ type: 'video', src, loaded: true });
          };
          video.onerror = () => {
            resolve({ type: 'video', src, loaded: true, error: true });
          };
          video.src = src;
        } else {
          // Preload image
          const img = new Image();
          img.onload = () => {
            resolve({ type: 'image', src, loaded: true });
          };
          img.onerror = () => {
            resolve({ type: 'image', src, loaded: true, error: true });
          };
          img.src = src;
        }
      });
    });

    // Track progress as assets load
    Promise.allSettled(assetPromises.map((promise, index) => 
      promise.then(asset => {
        setLoadedAssets(prev => {
          const newAssets = [...prev, asset];
          if (onProgress) {
            onProgress(newAssets.length, assets.length);
          }
          return newAssets;
        });
        return asset;
      })
    )).then(() => {
      // Small delay to ensure smooth transition
      setTimeout(onComplete, 300);
    });
  }, [assets, onComplete, onProgress]);

  return null; // This component doesn't render anything
};

// --- LOADING SCREEN COMPONENT ---
const LoadingScreen: React.FC<{ 
  progress: number; 
  total: number; 
  selectedColorScheme: WeddingColorScheme 
}> = ({ progress, total, selectedColorScheme }) => {
  const progressPercentage = total > 0 ? (progress / total) * 100 : 0;
  const isComplete = progress >= total && total > 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: '#fdf9f7', // Warm off-white to match logo background
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      color: selectedColorScheme.colors.text,
      fontFamily: 'Arial, sans-serif',
    }}>
      {/* Animated Loading Icon */}
      <div style={{
        width: '80px',
        height: '80px',
        margin: '0 0 30px 0',
        position: 'relative',
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          border: `4px solid #B07A8C40`, // Use logo pink color with alpha
          borderTop: `4px solid #B07A8C`, // Use logo pink color
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.7; transform: scale(1.05); }
            }
            @keyframes shimmer {
              0% { background-position: -200px 0; }
              100% { background-position: 200px 0; }
            }
          `}
        </style>
      </div>

      {/* Loading Text */}
      <h2 style={{
        margin: '0 0 20px 0',
        fontSize: '2rem',
        fontWeight: '300',
        textAlign: 'center',
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        Loading Experience
      </h2>

      {/* Progress Bar */}
      <div style={{
        width: '300px',
        height: '6px',
        backgroundColor: '#B07A8C20', // Use logo pink color with alpha for background
        borderRadius: '3px',
        overflow: 'hidden',
        margin: '0 0 15px 0',
      }}>
        <div style={{
          width: `${progressPercentage}%`,
          height: '100%',
          background: `#B07A8C`, // Use logo pink color for progress
          borderRadius: '3px',
          transition: 'width 0.3s ease',
          backgroundSize: '200px 100%',
          animation: progressPercentage < 100 ? 'shimmer 1.5s infinite' : 'none',
        }} />
      </div>

      {/* Progress Text */}
      <p style={{
        margin: '0',
        fontSize: '1rem',
        opacity: 0.8,
        textAlign: 'center',
      }}>
        {total > 0 ? `Loading assets... ${progress}/${total}` : 'Preparing experience...'}
      </p>

      {/* Completion Animation */}
      {isComplete && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '4rem',
          animation: 'pulse 0.5s ease-in-out',
        }}>
          ✨
        </div>
      )}
    </div>
  );
};

// --- GUEST EXPERIENCE COMPONENT ---
const GuestExperience: React.FC<GuestExperienceProps> = (props) => {
  const { 
    weddingDataFromApp, 
    experienceSettingsFromApp, 
    weddingIdFromApp, 
    defaultLayoutSlotToLoad = 1,
    isSetupModeFromProps = false, 
    forceMobileView = false,
    saveButtonContainerStyle,
  } = props;

  const { isSetupMode } = useSetupMode();
  const isActuallyMobile = useIsMobile();
  const isMobile = forceMobileView !== undefined ? forceMobileView : isActuallyMobile;

  // --- LEVA & ZUSTAND STORE ---
  const isSwitchingSlots = useLevaStore(state => state.isSwitchingSlots);
  const switchPreviewingSlotInStore = useLevaStore(state => state.switchPreviewingSlot);
  const loadLayoutSettingsFromDB = useLevaStore(state => state.loadSettingsFromDB);
  const controlValues = useLevaStore(state => state.controlValues);

  const [windowHeight, setWindowHeight] = useState(() => typeof window !== 'undefined' ? window.innerHeight : 700);

  // --- PRE-RENDERING STATE ---
  const [scrapbookImagesPreRendered, setScrapbookImagesPreRendered] = useState(false);
  const preRenderContainerRef = useRef<HTMLDivElement | null>(null);

  // --- DERIVED STATE & MEMOIZATIONS ---
  const { elements: elementsFromBlueprint = [], markers: markersFromBlueprint = [] } = experienceSettingsFromApp || {};
  
  // Add immediate logging when experienceSettingsFromApp changes
  useEffect(() => {
    console.log('🔄 Experience Settings Changed:', {
      timestamp: Date.now(),
      hasExperienceSettings: !!experienceSettingsFromApp,
      experienceSettingsKeys: experienceSettingsFromApp ? Object.keys(experienceSettingsFromApp) : 'none',
      elementsCount: elementsFromBlueprint.length,
      markersCount: markersFromBlueprint.length,
      rawExperienceSettings: experienceSettingsFromApp
    });
  }, [experienceSettingsFromApp, elementsFromBlueprint.length, markersFromBlueprint.length]);
  
  console.log('📋 Experience Settings Analysis:', {
    timestamp: Date.now(),
    hasExperienceSettings: !!experienceSettingsFromApp,
    elementsFromBlueprintCount: elementsFromBlueprint.length,
    markersFromBlueprintCount: markersFromBlueprint.length,
    allElements: elementsFromBlueprint.map(el => ({ id: el.id, type: el.type, name: el.name, content: el.content })),
    allMarkers: markersFromBlueprint.map(m => ({ elementId: m.elementId, type: m.type, position: m.position })),
    navbarElements: elementsFromBlueprint.filter(el => el.type === 'component' && el.name === 'Navbar'),
    bottomNavbarElements: elementsFromBlueprint.filter(el => el.type === 'component' && el.name === 'Bottom Navbar'),
    allComponentElements: elementsFromBlueprint.filter(el => el.type === 'component').map(el => ({ id: el.id, name: el.name, content: el.content })),
    elementsWithMarkers: elementsFromBlueprint.map(el => {
      const startMarker = markersFromBlueprint.find(m => m.elementId === el.id && m.type === 'start');
      const endMarker = markersFromBlueprint.find(m => m.elementId === el.id && m.type === 'end');
      return {
        id: el.id,
        name: el.name,
        type: el.type,
        hasStartMarker: !!startMarker,
        hasEndMarker: !!endMarker,
        startPosition: startMarker?.position,
        endPosition: endMarker?.position
      };
    }),
    fullExperienceSettings: experienceSettingsFromApp
  });
  const TOTAL_PAGES = useMemo(() => (experienceSettingsFromApp?.timelineLength > 0 && windowHeight > 0 ? Math.max(1.1, experienceSettingsFromApp.timelineLength / windowHeight) : 3), [experienceSettingsFromApp?.timelineLength, windowHeight]);

  const renderableElements: ElementDefinition[] = useMemo(() => {
    console.log('🏗️ Creating Renderable Elements:', {
      timestamp: Date.now(),
      elementsFromBlueprintCount: elementsFromBlueprint.length,
      markersFromBlueprintCount: markersFromBlueprint.length,
      TOTAL_PAGES,
      elementsFromBlueprint: elementsFromBlueprint.map(el => ({ id: el.id, type: el.type, name: el.name })),
      markersFromBlueprint: markersFromBlueprint.map(m => ({ elementId: m.elementId, type: m.type, position: m.position }))
    });
    
    if (!elementsFromBlueprint.length || !markersFromBlueprint.length) {
      console.log('❌ No elements or markers from blueprint, returning empty array');
      return [];
    }
    
    const pageMultiplier = TOTAL_PAGES > 1 ? TOTAL_PAGES - 1 : 0;
    const result = elementsFromBlueprint.map((element): ElementDefinition | null => {
      // Log each element being processed
      console.log('🔍 Processing Element:', {
        timestamp: Date.now(),
        elementId: element?.id,
        elementName: element?.name,
        elementType: element?.type,
        hasId: !!element?.id,
        isNotEmpty: element?.type !== 'empty',
        startMarker: markersFromBlueprint.find(m => m.elementId === element?.id && m.type === 'start'),
        endMarker: markersFromBlueprint.find(m => m.elementId === element?.id && m.type === 'end'),
        willBeIncluded: !!(element && element.id && element.type !== 'empty' && 
          markersFromBlueprint.find(m => m.elementId === element.id && m.type === 'start') &&
          markersFromBlueprint.find(m => m.elementId === element.id && m.type === 'end')),
        // Special logging for navbar elements
        isNavbarElement: element?.type === 'navbar' || (element?.type === 'component' && element?.name === 'Navbar'),
        isLegacyNavbar: element?.type === 'navbar',
        isNewNavbar: element?.type === 'component' && element?.name === 'Navbar'
      });
      
      if (!element || !element.id || element.type === 'empty') return null;
      const startMarker = markersFromBlueprint.find(m => m.elementId === element.id && m.type === 'start');
      const endMarker = markersFromBlueprint.find(m => m.elementId === element.id && m.type === 'end');
      if (!startMarker || !endMarker) return null;
      const pageOffset = startMarker.position * pageMultiplier;
      const endPageOffset = endMarker.position * pageMultiplier;
      const actualEndPage = Math.max(pageOffset + 0.1, endPageOffset);
      return { ...element, key: `ge-el-${element.id}`, sticky: { start: pageOffset, end: actualEndPage }, pageOffset };
    }).filter((el): el is ElementDefinition => el !== null);
    
    console.log('✅ Renderable Elements Created:', {
      timestamp: Date.now(),
      resultCount: result.length,
      result: result.map(el => ({ id: el.id, type: el.type, name: el.name, sticky: el.sticky })),
      navbarElements: result.filter(el => el.type === 'component' && el.name === 'Navbar')
    });
    
    return result;
  }, [elementsFromBlueprint, markersFromBlueprint, TOTAL_PAGES]);

  const [displayedImagesAndTheirData, setDisplayedImagesAndTheirData] = useState<DisplayedImage[]>([]);
  const isScrapbookEnabled = useMemo(() => renderableElements.some(el => el.type === 'component' && el.name === 'Scrapbook'), [renderableElements]);

  // --- OVERALL CONTROLS ---
  const [allOverallControlsForSaving, setAllOverallControlsForSaving] = useControls(() => ({
    'Overall Controls (Guest)': folder(
      overallControlsSchemaDefinitionGuest(isSetupMode),
      { collapsed: true, render: () => isSetupMode }
    ),
  }), [isSetupMode, defaultLayoutSlotToLoad]);

  // Extract the actual controls object for saving (contains ALL properties)
  const overallControls = allOverallControlsForSaving;
  const setOverallControls = setAllOverallControlsForSaving;
  
  const {
    showHUD: showGlobalHUDEnabledGuest,
    springPreset: selectedSpringPresetKeyGuest,
    parallaxPhysicsPreset: selectedParallaxPhysicsPresetKey,
    colorScheme: selectedColorSchemeName,
    overallFontFamily,
    previewingLayoutSlot,
    saveToLayoutSlot,
    autoScrollDuration,
    autoScrollEasing,
    
    // Arrow styling controls
    arrowTextColor,
    arrowBackgroundColor,
    arrowBackgroundOpacity,
    arrowBorderRadius,
    arrowFontSize,
    arrowPadding,
    arrowShadowEnabled,
    arrowShadowColor,
    arrowShadowBlur,
    arrowShadowOffsetX,
    arrowShadowOffsetY,
    arrowBorderEnabled,
    arrowBorderColor,
    arrowBorderWidth,
    arrowBackdropBlur,
  } = overallControls;

  // Debug logging for auto navigation controls
  useEffect(() => {
    console.log(`[ARROW_COLOR_DEBUG] 🎨 Arrow styling values from useControls:`, {
      arrowBackgroundColor,
      arrowTextColor,
      arrowBackgroundOpacity,
      source: 'from Leva useControls',
      timestamp: Date.now()
    });
  }, [arrowBackgroundColor, arrowTextColor, arrowBackgroundOpacity]);

  // --- LOCAL COMPONENT STATE ---
  const [scrollY, setScrollY] = useState(0);
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  const parallaxRef = useRef<IParallax>(null);

  // Scroll handling for parallax
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const lastScrollY = useRef(0);
  const lastScrollTime = useRef(Date.now());

  // --- SCROLL HINT STATE ---
  const [showScrollHintVisible, setShowScrollHintVisible] = useState(true);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const [shouldFadeHint, setShouldFadeHint] = useState(false);

  // --- AUTO NAVIGATION STATE ---
  const [autoNavigationEnabled, setAutoNavigationEnabled] = useState(false);
  const [currentAutoIndex, setCurrentAutoIndex] = useState(-1); // Start at -1 (not at any auto element)
  const [autoElements, setAutoElements] = useState<Array<{elementId: number, sequence: number, endPosition: number}>>([]);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  // --- FORM SUBMISSION TRACKING ---
  const [formSubmissions, setFormSubmissions] = useState<{[elementId: number]: boolean}>({});
  const [currentViewedAutoElement, setCurrentViewedAutoElement] = useState<number | null>(null);
  const [effectTriggerCounter, setEffectTriggerCounter] = useState(0);

  // Form submission handlers
  const handleFormSubmission = useCallback((elementId: number) => {
    console.log(`[FORM_SUBMISSION] ✅ Form submitted for element ${elementId}`, {
      elementId,
      currentFormSubmissions: formSubmissions,
      willUpdateTo: { ...formSubmissions, [elementId]: true }
    });
    setFormSubmissions(prev => {
      const updated = { ...prev, [elementId]: true };
      console.log(`[FORM_SUBMISSION] 🔄 Form submissions state updated:`, updated);
      return updated;
    });
  }, [formSubmissions]);

  const handleRSVPSubmission = useCallback((elementId: number) => {
    console.log(`[FORM_SUBMISSION] 📝 RSVP Form submitted for element ${elementId}`);
    handleFormSubmission(elementId);
  }, [handleFormSubmission]);

  const handlePromptSubmission = useCallback((elementId: number) => {
    console.log(`[FORM_SUBMISSION] 💬 Prompt Form submitted for element ${elementId}`);
    handleFormSubmission(elementId);
  }, [handleFormSubmission]);

  // --- VIDEO FADE LOGIC ---
  const handleVideoTimeUpdate = useCallback((elementId: number, event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.target as HTMLVideoElement;
    const { currentTime, duration } = video;
    
    // Find the element to get its fade settings
    const element = elementsFromBlueprint.find(el => el.id === elementId);
    if (!element) return;
    
    const videoFolderName = generateElementFolderName(element);
    const videoControls = controlValues[videoFolderName] || {};
    const { enableVideoFade = true, videoFadeDuration = 1.5 } = videoControls;
    
    // Only apply fade logic if enabled
    if (!enableVideoFade) {
      setVideoOpacity(prev => ({ ...prev, [elementId]: 1 }));
      return;
    }
    
    if (duration > 0) {
      const timeRemaining = duration - currentTime;
      const fadeStartTime = videoFadeDuration; // Use custom fade duration
      const fadeRestartTime = videoFadeDuration; // Use custom fade duration for restart
      
      if (timeRemaining <= fadeStartTime && timeRemaining > 0) {
        // Fading out - near end of video
        const fadeProgress = (fadeStartTime - timeRemaining) / fadeStartTime;
        const opacity = 1 - fadeProgress;
        setVideoOpacity(prev => ({ ...prev, [elementId]: opacity }));
      } else if (currentTime <= fadeRestartTime) {
        // Fading in - just after restart
        const fadeProgress = currentTime / fadeRestartTime;
        const opacity = fadeProgress;
        setVideoOpacity(prev => ({ ...prev, [elementId]: opacity }));
      } else {
        // Normal playback - full opacity
        setVideoOpacity(prev => ({ ...prev, [elementId]: 1 }));
      }
    }
  }, [elementsFromBlueprint, controlValues]);

  // --- REACT SPRING SCROLL ANIMATION ---
  // --- EASING FUNCTIONS ---
  const getEasingFunction = (easingType: string) => {
    switch (easingType) {
      case 'easeOut':
        return (t: number) => 1 - Math.pow(1 - t, 3);
      case 'easeInOut':
        return (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      case 'linear':
        return (t: number) => t;
      case 'bouncy':
        return (t: number) => {
          const n1 = 7.5625;
          const d1 = 2.75;
          if (t < 1 / d1) {
            return n1 * t * t;
          } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
          } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
          } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
          }
        };
      default:
        return (t: number) => 1 - Math.pow(1 - t, 3);
    }
  };

  // --- CUSTOM SCROLL ANIMATION WITH LAYOUT SHIFT PROTECTION ---
  const animateScrollTo = useCallback((targetPosition: number, duration: number = 4000, easingType: string = 'easeOut') => {
    // console.log(`[AUTO_NAV] 🚀 animateScrollTo called:`, { targetPosition, duration, easingType });
    
    const parallaxContainer = parallaxRef.current?.container.current;
    if (!parallaxContainer) {
      // console.log(`[AUTO_NAV] ❌ No parallax container found`);

      setIsAutoScrolling(false);
      return;
    }

    const startPosition = parallaxContainer.scrollTop;
    const distance = targetPosition - startPosition;
    const startTime = performance.now();
    
    // Track if layout shifts during animation
    let lastScrollHeight = parallaxContainer.scrollHeight;
    let layoutShiftDetected = false;

    // console.log(`[AUTO_NAV] 🚀 Animation setup:`, {
    //   startPosition,
    //   targetPosition,
    //   distance,
    //   duration,
    //   initialScrollHeight: lastScrollHeight
    // });

    const easing = getEasingFunction(easingType);

    const animateFrame = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);
      
      // Check for layout shifts (images loading, content changing)
      const currentScrollHeight = parallaxContainer.scrollHeight;
      if (currentScrollHeight !== lastScrollHeight) {
        layoutShiftDetected = true;
        // console.log(`[AUTO_NAV] ⚠️ Layout shift detected during animation:`, {
        //   oldHeight: lastScrollHeight,
        //   newHeight: currentScrollHeight,
        //   heightDiff: currentScrollHeight - lastScrollHeight,
        //   progress: Math.round(progress * 100) / 100
        // });
        lastScrollHeight = currentScrollHeight;
      }
      
      const currentPosition = startPosition + (distance * easedProgress);
      

      
      // Apply scroll with performance optimization
      if (parallaxContainer.scrollTop !== currentPosition) {
        parallaxContainer.scrollTop = currentPosition;
      }
      
      if (progress < 1) {
        requestAnimationFrame(animateFrame);
      } else {
        // console.log(`[AUTO_NAV] ✅ Animation completed!`, {
        //   finalPosition: parallaxContainer.scrollTop,
        //   targetWas: targetPosition,
        //   layoutShiftsDetected: layoutShiftDetected,
        //   finalScrollHeight: parallaxContainer.scrollHeight
        // });

        setIsAutoScrolling(false);
      }
    };

    // console.log(`[AUTO_NAV] ▶️ Starting animation with requestAnimationFrame`);
    requestAnimationFrame(animateFrame);
  }, [getEasingFunction]);

  // --- AUTO NAVIGATION ARROW ANIMATIONS ---
  // Separate state for arrow scaling that lasts longer than isAutoScrolling
  const [arrowsInTransition, setArrowsInTransition] = useState(false);

  // Destructure scroll hint and arrow controls
  const { 
    showScrollHint, 
    scrollHintDuration, 
    fadeOnceDetected,
    // Auto Navigation Arrow Controls
    arrowNormalScale,
    arrowNormalOpacity,
    arrowShrinkScale,
    arrowBounceScale,
    arrowAnimationSpeed,
    arrowBounceSpeed,
    arrowHoldDuration
  } = (overallControls as any) || {};

  // Debug: Log control values on mount to verify they're accessible
  useEffect(() => {
    console.log(`[ARROW_CONTROLS] 🔧 Arrow controls detected:`, {
      arrowNormalScale,
      arrowNormalOpacity,
      arrowShrinkScale,
      arrowBounceScale,
      arrowAnimationSpeed,
      arrowBounceSpeed,
      arrowHoldDuration,
      overallControlsKeys: Object.keys(overallControls || {})
    });
  }, []);

  // Spring animations for arrow scaling during auto-scroll (after controls are available)
  const [prevArrowSpring, prevArrowApi] = useSpring(() => ({
    scale: arrowNormalScale || 1,
    opacity: arrowNormalOpacity || 1,
    config: config.wobbly,
  }));

  const [nextArrowSpring, nextArrowApi] = useSpring(() => ({
    scale: arrowNormalScale || 1,
    opacity: arrowNormalOpacity || 1,
    config: config.wobbly,
  }));

  // Simple state-based opacity with CSS transitions for arrow visibility
  const [arrowOpacity, setArrowOpacity] = useState(1);
  
  // Track if arrows should be visible (for pointer events)
  const [arrowsVisible, setArrowsVisible] = useState(true);



  // Start arrow transition when auto-scroll begins
  useEffect(() => {
    if (isAutoScrolling && !arrowsInTransition) {
      setArrowsInTransition(true);
    }
  }, [isAutoScrolling, arrowsInTransition]);

  // End arrow transition with delay after auto-scroll completes
  useEffect(() => {
    if (!isAutoScrolling && arrowsInTransition) {
      const holdTime = arrowHoldDuration || 800;
      const timer = setTimeout(() => {
        setArrowsInTransition(false);
      }, holdTime);
      
      return () => clearTimeout(timer);
    }
  }, [isAutoScrolling, arrowsInTransition, arrowHoldDuration]);

  // Animate arrows based on transition state (not just isAutoScrolling)
  useEffect(() => {
    if (arrowsInTransition) {
      const shrinkScale = arrowShrinkScale || 0.001;
      const animSpeed = arrowAnimationSpeed || 1200;
      // Scale down EXTREMELY dramatically and KEEP IT SMALL
      prevArrowApi.start({ 
        scale: shrinkScale,
        opacity: 0.3, // Slight fade during shrink
        config: { ...config.wobbly, tension: animSpeed, friction: 15 }
      });
      nextArrowApi.start({ 
        scale: shrinkScale,
        opacity: 0.3,
        config: { ...config.wobbly, tension: animSpeed, friction: 15 }
      });
    } else {
      const bounceScale = arrowBounceScale || 1.5;
      const bounceSpeed = arrowBounceSpeed || 180;
      const normalScale = arrowNormalScale || 1.0;
      const normalOpacity = arrowNormalOpacity || 1.0;
      
      // When transition completes: bounce MUCH BIGGER then settle to normal
      prevArrowApi.start({ 
        scale: bounceScale,
        opacity: normalOpacity,
        config: { ...config.wobbly, tension: bounceSpeed, friction: 8 },
        onRest: () => {
          prevArrowApi.start({ 
            scale: normalScale,
            opacity: normalOpacity,
            config: { ...config.wobbly, tension: 250, friction: 15 }
          });
        }
      });
      nextArrowApi.start({ 
        scale: bounceScale,
        opacity: normalOpacity,
        config: { ...config.wobbly, tension: bounceSpeed, friction: 8 },
        onRest: () => {
          nextArrowApi.start({ 
            scale: normalScale,
            opacity: normalOpacity,
            config: { ...config.wobbly, tension: 250, friction: 15 }
          });
        }
      });
    }
  }, [arrowsInTransition, prevArrowApi, nextArrowApi, arrowShrinkScale, arrowAnimationSpeed, arrowBounceScale, arrowBounceSpeed, arrowNormalScale, arrowNormalOpacity]);

  // Update arrows to normal scale/opacity when controls change (but not during animation)
  useEffect(() => {
    if (!arrowsInTransition && !isAutoScrolling) {
      const normalScale = arrowNormalScale || 1.0;
      const normalOpacity = arrowNormalOpacity || 1.0;
      
      console.log(`[ARROW_CONTROLS] 🎛️ Updating arrows with control values:`, {
        normalScale,
        normalOpacity,
        shrinkScale: arrowShrinkScale || 0.001,
        bounceScale: arrowBounceScale || 1.5,
        animSpeed: arrowAnimationSpeed || 1200,
        bounceSpeed: arrowBounceSpeed || 180,
        holdDuration: arrowHoldDuration || 800
      });
      
      prevArrowApi.start({ 
        scale: normalScale,
        opacity: normalOpacity,
        config: config.gentle 
      });
      nextArrowApi.start({ 
        scale: normalScale,
        opacity: normalOpacity,
        config: config.gentle 
      });
    }
  }, [arrowNormalScale, arrowNormalOpacity, arrowShrinkScale, arrowBounceScale, arrowAnimationSpeed, arrowBounceSpeed, arrowHoldDuration, arrowsInTransition, isAutoScrolling, prevArrowApi, nextArrowApi]);

  // Simple scroll detection for hint
  useEffect(() => {
    console.log('[GUEST_EXP] 🔧 SCROLL HANDLER SETUP - Starting with:', {
      'parallaxRef.current': !!parallaxRef.current,
      'parallaxRef.current?.container': !!parallaxRef.current?.container,
      'parallaxRef.current?.container.current': !!parallaxRef.current?.container.current,
      hasUserScrolled,
      fadeOnceDetected,
      scrollHintDuration,
      showScrollHint,
      TOTAL_PAGES,
      windowHeight
    });

    // Function to set up scroll detection
    const setupScrollDetection = () => {
      const parallaxContainer = parallaxRef.current?.container.current;
      
      if (parallaxContainer) {
        console.log('[GUEST_EXP] ✅ Parallax container found:', {
          tagName: parallaxContainer.tagName,
          className: parallaxContainer.className,
          id: parallaxContainer.id,
          scrollTop: parallaxContainer.scrollTop,
          scrollHeight: parallaxContainer.scrollHeight,
          clientHeight: parallaxContainer.clientHeight
        });

        const handleScrollForHint = () => {
          const currentScrollY = parallaxContainer.scrollTop;
          const maxScrollableHeight = (TOTAL_PAGES - 1) * windowHeight;
          const scrollProgress = maxScrollableHeight > 0 ? (currentScrollY / maxScrollableHeight) * 100 : 0;

          // console.log('[GUEST_EXP] 🔍 SCROLL EVENT DETAILED:', { currentScrollY, maxScrollableHeight, scrollProgress: scrollProgress.toFixed(2) + '%' }); // Commented out to reduce console spam

          if (!hasUserScrolled && currentScrollY > 5) {
            console.log('[GUEST_EXP] 🚨 User started scrolling! Setting hasUserScrolled to TRUE');
            setHasUserScrolled(true);
            if (fadeOnceDetected) {
              console.log('[GUEST_EXP] 🚨 fadeOnceDetected is TRUE - Setting shouldFadeHint to TRUE');
              setShouldFadeHint(true);
            } else {
              console.log('[GUEST_EXP] ❌ fadeOnceDetected is FALSE - NOT setting shouldFadeHint');
            }
          } else if (hasUserScrolled) {
            // console.log('[GUEST_EXP] User has already scrolled (hasUserScrolled=true), currentScrollY:', currentScrollY); // Commented out to reduce spam
          } else {
            // console.log('[GUEST_EXP] User has not scrolled enough yet (currentScrollY <= 5):', currentScrollY); // Commented out to reduce spam
          }

          if (scrollProgress > scrollHintDuration) {
            console.log(`[GUEST_EXP] 📊 Scroll progress exceeded duration, hiding hint. Progress: ${scrollProgress.toFixed(2)}% > Duration: ${scrollHintDuration}%`);
            setShowScrollHintVisible(false);
          } else if (showScrollHint && scrollProgress <= scrollHintDuration) {
            console.log(`[GUEST_EXP] 📊 Scroll progress within duration. Progress: ${scrollProgress.toFixed(2)}% <= Duration: ${scrollHintDuration}%`);
            if (!hasUserScrolled || !fadeOnceDetected) {
              console.log('[GUEST_EXP] Conditions met to keep hint visible');
              setShowScrollHintVisible(true);
            } else {
              console.log('[GUEST_EXP] User scrolled and fade detected - hint should remain hidden/faded');
            }
          }
        };

        // Test the handler immediately to see current scroll position
        console.log('[GUEST_EXP] 🧪 Testing scroll handler immediately...');
        handleScrollForHint();

        console.log('[GUEST_EXP] 🎯 Adding scroll event listener to parallax container');
        parallaxContainer.addEventListener('scroll', handleScrollForHint);
        
        return () => {
          console.log('[GUEST_EXP] 🧹 Cleaning up scroll listeners');
          parallaxContainer.removeEventListener('scroll', handleScrollForHint);
        };
      } else {
        console.log('[GUEST_EXP] ❌ No parallax container found, using fallback scroll detection');
        
        // Fallback: Use document body scroll detection
        const handleFallbackScroll = () => {
          const currentScrollY = window.scrollY || document.documentElement.scrollTop;
          const maxScrollableHeight = (TOTAL_PAGES - 1) * windowHeight;
          const scrollProgress = maxScrollableHeight > 0 ? (currentScrollY / maxScrollableHeight) * 100 : 0;

          console.log('[GUEST_EXP] 🔄 FALLBACK SCROLL EVENT:', { 
            currentScrollY, 
            maxScrollableHeight, 
            scrollProgress: scrollProgress.toFixed(2) + '%', 
            scrollHintDuration: scrollHintDuration + '%',
            hasUserScrolled,
            fadeOnceDetected,
            source: 'window/document',
            windowScrollY: window.scrollY,
            docElementScrollTop: document.documentElement.scrollTop,
            bodyScrollTop: document.body.scrollTop
          });

          if (!hasUserScrolled && currentScrollY > 5) {
            console.log('[GUEST_EXP] 🚨 FALLBACK: User started scrolling! Setting hasUserScrolled to TRUE');
            setHasUserScrolled(true);
            if (fadeOnceDetected) {
              console.log('[GUEST_EXP] 🚨 FALLBACK: fadeOnceDetected is TRUE - Setting shouldFadeHint to TRUE');
              setShouldFadeHint(true);
            }
          }

          if (scrollProgress > scrollHintDuration) {
            console.log(`[GUEST_EXP] 📊 FALLBACK: Scroll progress exceeded duration, hiding hint. Progress: ${scrollProgress.toFixed(2)}%`);
            setShowScrollHintVisible(false);
          }
        };

        // Multiple fallback event types
        const handleAnyInteraction = (eventType: string) => {
          console.log(`[GUEST_EXP] 🎭 ANY INTERACTION DETECTED: ${eventType}`);
          if (!hasUserScrolled) {
            console.log('[GUEST_EXP] 🚨 ANY INTERACTION: Setting hasUserScrolled to TRUE (any interaction)');
            setHasUserScrolled(true);
            if (fadeOnceDetected) {
              console.log('[GUEST_EXP] 🚨 ANY INTERACTION: Setting shouldFadeHint to TRUE');
              setShouldFadeHint(true);
            }
          }
        };

        // Properly typed event handlers
        const handleWheel = () => handleAnyInteraction('wheel');
        const handleTouchmove = () => handleAnyInteraction('touchmove');
        const handleKeydown = (e: KeyboardEvent) => {
          if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) {
            handleAnyInteraction(`keydown:${e.key}`);
          }
        };

        console.log('[GUEST_EXP] 🪟 Adding fallback window scroll listener');
        window.addEventListener('scroll', handleFallbackScroll);
        
        // Create wrapper functions for document scroll events
        const handleDocumentScroll = () => handleFallbackScroll();
        const handleBodyScroll = () => handleFallbackScroll();
        
        // Add more event listeners to catch any scroll-like behavior
        console.log('[GUEST_EXP] 🎭 Adding additional interaction listeners');
        document.addEventListener('scroll', handleDocumentScroll);
        document.body.addEventListener('scroll', handleBodyScroll);
        window.addEventListener('wheel', handleWheel);
        window.addEventListener('touchmove', handleTouchmove);
        window.addEventListener('keydown', handleKeydown);
        
        // Test fallback handler immediately
        console.log('[GUEST_EXP] 🧪 Testing fallback scroll handler immediately...');
        handleFallbackScroll();
        
        return () => {
          console.log('[GUEST_EXP] 🧹 Cleaning up fallback scroll listener');
          window.removeEventListener('scroll', handleFallbackScroll);
          document.removeEventListener('scroll', handleDocumentScroll);
          document.body.removeEventListener('scroll', handleBodyScroll);
          window.removeEventListener('wheel', handleWheel);
          window.removeEventListener('touchmove', handleTouchmove);
          window.removeEventListener('keydown', handleKeydown);
        };
      }
    };

    // Try to set up immediately
    const cleanup = setupScrollDetection();
    
    // If no parallax container found, try again after a delay
    if (!parallaxRef.current?.container.current) {
      console.log('[GUEST_EXP] ⏰ Parallax container not ready, retrying in 100ms...');
      const retryTimeout = setTimeout(() => {
        console.log('[GUEST_EXP] 🔁 Retrying scroll handler setup...');
        const retryCleanup = setupScrollDetection();
        if (retryCleanup) {
          // If we got a cleanup function from retry, use it
          return retryCleanup;
        }
      }, 100);
      
      return () => {
        clearTimeout(retryTimeout);
        if (cleanup) cleanup();
      };
    }
    
    return cleanup;
  }, [hasUserScrolled, fadeOnceDetected, scrollHintDuration, TOTAL_PAGES, windowHeight, showScrollHint, parallaxRef]);

  // Update hint visibility when showScrollHint control changes
  useEffect(() => {
    console.log('[GUEST_EXP] 🎛️ Control change effect triggered:', { 
      showScrollHint, 
      hasUserScrolled, 
      currentShouldFadeHint: shouldFadeHint,
      willHideHint: !showScrollHint,
      willShowHint: showScrollHint && !hasUserScrolled 
    });
    
    if (!showScrollHint) {
      console.log('[GUEST_EXP] 🎛️ CONTROL: Hiding hint (control disabled)');
      setShowScrollHintVisible(false);
    } else if (!hasUserScrolled) {
      console.log('[GUEST_EXP] 🎛️ CONTROL: Showing hint (control enabled, no scroll yet) and resetting fade');
      setShowScrollHintVisible(true);
      setShouldFadeHint(false); // Reset fade state when re-enabling
    } else {
      console.log('[GUEST_EXP] 🎛️ CONTROL: showScrollHint enabled but user has already scrolled');
    }
  }, [showScrollHint, hasUserScrolled]);

  // --- PRELOADING STATE ---
  const [isPreloading, setIsPreloading] = useState(true);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [preloadTotal, setPreloadTotal] = useState(0);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  
  // --- SAVE LOGIC STATE ---
  const [currentSavingToSlot, setCurrentSavingToSlot] = useState(defaultLayoutSlotToLoad);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // --- FOCUSED IMAGE STATE ---
  const [focusedImage, setFocusedImage] = useState<FocusedImageState | null>(null);
  const [imageReturningToScrapbook, setImageReturningToScrapbook] = useState<FocusedImageState | null>(null);
  const [pendingImageToFocus, setPendingImageToFocus] = useState<FocusedImageState | null>(null);
  const [lastPutDownIndex, setLastPutDownIndex] = useState<number | null>(null);
  const [imageNaturalDimensions, setImageNaturalDimensions] = useState<NaturalImageDimensions[]>([]);
  
  // Video fade state - track opacity of videos by element ID
  const [videoOpacity, setVideoOpacity] = useState<{[elementId: number]: number}>({});

  // Debug effect to verify currentViewedAutoElement changes
  // useEffect(() => {
  //   console.log(`[FORM_ARROWS] 🔄 currentViewedAutoElement changed to:`, currentViewedAutoElement);
  // }, [currentViewedAutoElement]);

  // Update arrow visibility with smooth animation
  useEffect(() => {
    // Calculate visibility conditions
    let shouldShowArrows = !!(experienceSettingsFromApp?.autoNavigationEnabled && autoElements.length > 0 && !focusedImage);
    
    // Hide arrows if we're currently viewing an unsubmitted form element
    if (shouldShowArrows && currentViewedAutoElement) {
      const currentElement = elementsFromBlueprint.find(el => el.id === currentViewedAutoElement);
      if (currentElement && currentElement.type === 'component' && 
          (currentElement.name === 'RSVP Form' || currentElement.name === 'Prompt Form')) {
        const isSubmitted = formSubmissions[currentViewedAutoElement] || false;
        if (!isSubmitted) {
          shouldShowArrows = false;
          // console.log(`[FORM_ARROWS] 🚫 DECISION: Hiding arrows - on unsubmitted ${currentElement.name} (element ${currentViewedAutoElement})`);
        } else {
          // console.log(`[FORM_ARROWS] ✅ DECISION: Keeping arrows - ${currentElement.name} has been submitted (element ${currentViewedAutoElement})`);
        }
      }
    }

    // console.log(`[FORM_ARROWS] 🎯 FINAL DECISION: shouldShowArrows =`, shouldShowArrows);
    
    // Simple state-based opacity change with smooth CSS transition
    const targetOpacity = shouldShowArrows ? 1 : 0;
    // console.log(`[FORM_ARROWS] 🚀 Setting arrow opacity to:`, targetOpacity);
    setArrowOpacity(targetOpacity);
    
    // Update pointer events state
    setArrowsVisible(!!shouldShowArrows);
  }, [
    experienceSettingsFromApp?.autoNavigationEnabled,
    autoElements.length,
    focusedImage,
    currentViewedAutoElement,
    elementsFromBlueprint,
    formSubmissions
  ]);

  const imageReturningToScrapbookRef = useRef(imageReturningToScrapbook);
  const pendingImageToFocusRef = useRef(pendingImageToFocus);
  const scrapbookImageRefs = useRef<(HTMLImageElement | null)[]>([]);

  const initialGradient = useMemo(() => {
    const gradientControls = controlValues['Dynamic Background Gradient'] || {};
    const {
      gradientMode = 'Scheme: Primary & Secondary',
      gradientColorStart = '#ee0038',
      gradientColorStop = '#00e1fe',
      gradientAngleOffset = -160,
    } = gradientControls;

    let actualStartColor = gradientColorStart;
    let actualEndColor = gradientColorStop;

    const scheme = weddingColorSchemes.find(s => s.name === selectedColorSchemeName) || weddingColorSchemes[0];

    if (scheme && gradientMode !== 'Override') {
      switch (gradientMode) {
        case 'Scheme: Primary & Secondary':
          actualStartColor = scheme.colors.primary || gradientColorStart;
          actualEndColor = scheme.colors.secondary || gradientColorStop;
          break;
        case 'Scheme: Primary & Accent':
          actualStartColor = scheme.colors.primary || gradientColorStart;
          actualEndColor = scheme.colors.accent || gradientColorStop;
          break;
        case 'Scheme: Secondary & Accent':
          actualStartColor = scheme.colors.secondary || gradientColorStart;
          actualEndColor = scheme.colors.accent || gradientColorStop;
          break;
        case 'Scheme: Text & Background':
          actualStartColor = scheme.colors.text || gradientColorStart;
          actualEndColor = scheme.colors.background || gradientColorStop;
          break;
        default:
          actualStartColor = gradientColorStart;
          actualEndColor = gradientColorStop;
      }
    }
    
    const angle = gradientAngleOffset || 0;
    return `linear-gradient(${angle}deg, ${actualStartColor}, ${actualEndColor})`;
  }, [controlValues, selectedColorSchemeName]);

  useEffect(() => { imageReturningToScrapbookRef.current = imageReturningToScrapbook; }, [imageReturningToScrapbook]);
  useEffect(() => { pendingImageToFocusRef.current = pendingImageToFocus; }, [pendingImageToFocus]);

  // --- DATA LOADING & SLOT SYNC EFFECTS ---
  useEffect(() => {
    console.log(`🚀 GuestExperience: DATA LOADING effect triggered`, {
      timestamp: Date.now(),
      hasInitialElementLayouts: !!weddingDataFromApp?.initialElementLayouts,
      weddingIdFromApp,
      isMobile,
      defaultLayoutSlotToLoad,
      willCallLoadLayoutSettingsFromDB: !!weddingDataFromApp?.initialElementLayouts,
      willCallSwitchPreviewingSlotInStore: !weddingDataFromApp?.initialElementLayouts && !!weddingIdFromApp
    });
    
    // LOG ARROW COLOR FROM INITIAL LAYOUTS
    if (weddingDataFromApp?.initialElementLayouts) {
      console.log(`[ARROW_COLOR_DEBUG] 📂 Initial element layouts arrow data:`, {
        hasOverallControls: !!weddingDataFromApp.initialElementLayouts['Overall Controls (Guest)'],
        overallControls: weddingDataFromApp.initialElementLayouts['Overall Controls (Guest)'],
        arrowBackgroundColor: weddingDataFromApp.initialElementLayouts['Overall Controls (Guest)']?.arrowBackgroundColor,
        source: 'from initialElementLayouts',
        timestamp: Date.now()
      });
      loadLayoutSettingsFromDB(weddingDataFromApp.initialElementLayouts, defaultLayoutSlotToLoad);
    } else if (weddingIdFromApp) {
      console.log(`[ARROW_COLOR_DEBUG] 🔄 No initial layouts, will fetch from server for ${isMobile ? 'mobile' : 'desktop'} slot ${defaultLayoutSlotToLoad}`);
      switchPreviewingSlotInStore(weddingIdFromApp, isMobile ? 'mobile' : 'desktop', defaultLayoutSlotToLoad);
    }
  }, [weddingDataFromApp?.initialElementLayouts, weddingIdFromApp, isMobile, defaultLayoutSlotToLoad, loadLayoutSettingsFromDB, switchPreviewingSlotInStore]);

  useEffect(() => {
    const currentStoreSlot = useLevaStore.getState().currentPreviewingSlot;
    if (previewingLayoutSlot !== currentStoreSlot && weddingIdFromApp) {
      switchPreviewingSlotInStore(weddingIdFromApp, isMobile ? 'mobile' : 'desktop', previewingLayoutSlot);
    }
  }, [previewingLayoutSlot, weddingIdFromApp, isMobile, switchPreviewingSlotInStore]);
  
  useEffect(() => { 
    setOverallControls({ saveToLayoutSlot: previewingLayoutSlot });
  }, [previewingLayoutSlot, setOverallControls]);

  useEffect(() => { setCurrentSavingToSlot(saveToLayoutSlot); }, [saveToLayoutSlot]);

  // --- AUTO NAVIGATION PROCESSING ---
  useEffect(() => {
    console.log('[AUTO_NAV_PROCESSING] Starting auto elements processing...');
    console.log('[AUTO_NAV_PROCESSING] elementsFromBlueprint:', elementsFromBlueprint);
    
    const processedAutoElements: Array<{elementId: number, sequence: number, endPosition: number}> = [];
    
    // Extract elements with auto sequences from elementsFromBlueprint (NOT controlValues!)
    elementsFromBlueprint.forEach(element => {
      console.log(`[AUTO_NAV_PROCESSING] Checking element ${element.id}:`, {
        id: element.id,
        type: element.type,
        name: element.name,
        autoSequence: element.autoSequence,
        hasAutoSequence: 'autoSequence' in element
      });
      
      if ('autoSequence' in element && element.autoSequence && element.autoSequence !== null) {
        const sequenceValue = typeof element.autoSequence === 'string' 
          ? parseInt(element.autoSequence, 10) 
          : element.autoSequence;
        
        console.log(`[AUTO_NAV_PROCESSING] Element ${element.id} has valid autoSequence:`, {
          raw: element.autoSequence,
          parsed: sequenceValue,
          isValid: !isNaN(sequenceValue) && sequenceValue > 0
        });
        
        // Only proceed if we have a valid number
        if (!isNaN(sequenceValue) && sequenceValue > 0) {
          // Find the element in renderableElements to get its start position
          const renderableElement = renderableElements.find(el => el.id === element.id);
          console.log(`[AUTO_NAV_PROCESSING] Looking for renderable element ${element.id}:`, {
            found: !!renderableElement,
            elementData: renderableElement ? { id: renderableElement.id, type: renderableElement.type, sticky: renderableElement.sticky } : null
          });
          
          if (renderableElement) {
            processedAutoElements.push({
              elementId: element.id,
              sequence: sequenceValue,
              endPosition: renderableElement.sticky.end // Changed from .start to .end
            });
            console.log(`[AUTO_NAV_PROCESSING] ✅ Added auto element: ${element.id} -> Auto ${sequenceValue} at END position ${renderableElement.sticky.end}`);
          }
        }
      } else {
        console.log(`[AUTO_NAV_PROCESSING] Element ${element.id} has no valid autoSequence`);
      }
    });

    // Sort by sequence number
    processedAutoElements.sort((a, b) => a.sequence - b.sequence);
    setAutoElements(processedAutoElements);
    
    // Enable auto navigation if there are auto elements
    const willEnable = processedAutoElements.length > 0;
    setAutoNavigationEnabled(willEnable);
    
    console.log('[AUTO_NAV_PROCESSING] FINAL RESULTS:', {
      total: processedAutoElements.length,
      elements: processedAutoElements,
      willShowArrows: processedAutoElements.length > 1,
      autoNavigationEnabled: willEnable,
      timestamp: Date.now()
    });
  }, [elementsFromBlueprint, renderableElements]);

  const googleFontsToLoad = useMemo<FontObject[]>(() => {
    const fonts = new Set<string>();
    if (overallFontFamily && isGoogleFont(overallFontFamily)) fonts.add(overallFontFamily.split(',')[0].trim());
    elementsFromBlueprint.forEach(el => {
      if (el.type === 'text') {
        const folderName = generateElementFolderName(el);
        const textFont = controlValues[folderName]?.fontFamily;
        if (textFont && isGoogleFont(textFont)) fonts.add(textFont.split(',')[0].trim());
      }
    });
    return Array.from(fonts).map(name => ({ name }));
  }, [overallFontFamily, elementsFromBlueprint, controlValues]);

  // --- ASSET COLLECTION FOR PRELOADING ---
  const assetsToPreload = useMemo(() => {
    const assets: string[] = [];
    
    // Collect assets from renderable elements
    renderableElements.forEach(element => {
      if (element.type === 'photo' && typeof element.content === 'string') {
        assets.push(element.content);
      } else if (element.type === 'video' && typeof element.content === 'string') {
        assets.push(element.content);
      } else if (element.type === 'background-image' && typeof element.content === 'string') {
        assets.push(element.content);
      } else if (element.type === 'background-video' && typeof element.content === 'string') {
        assets.push(element.content);
      }
    });
    
    // Collect scrapbook images
    if (weddingDataFromApp?.scrapbookImages?.length) {
      weddingDataFromApp.scrapbookImages.forEach((img: any) => {
        const imageSrc = img.fileName?.startsWith('http') 
          ? img.fileName 
          : `${weddingDataFromApp.scrapbookImageFolder.replace(/\/$/, '')}/${img.fileName.replace(/^\//, '')}`;
        if (imageSrc) {
          assets.push(imageSrc);
        }
      });
    }
    
    // Remove duplicates
    return Array.from(new Set(assets));
  }, [renderableElements, weddingDataFromApp]);

  // --- PRELOADING MANAGER INTEGRATION ---
  useEffect(() => {
    if (assetsToPreload.length === 0) {
      // Even with no assets, add delay and fade for consistency
      setTimeout(() => {
        setShowLoadingScreen(false);
      }, 2000);
      return;
    }

    setPreloadTotal(assetsToPreload.length);
    
    const handleProgress = (loaded: number, total: number) => {
      setPreloadProgress(loaded);
    };
    
    const handleComplete = () => {
      // Add 2 second delay after assets load to allow DOM to finalize, then start fade
      setTimeout(() => {
        setShowLoadingScreen(false); // This triggers the fade animation
      }, 2000);
    };

    // Simple preloading logic without separate component
    const preloadAssets = async () => {
      let loadedCount = 0;
      
      const loadPromises = assetsToPreload.map((src) => {
        return new Promise<void>((resolve) => {
          const isVideo = src.match(/\.(mp4|mov|avi|webm|mkv)$/i);
          
          if (isVideo) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
              loadedCount++;
              handleProgress(loadedCount, assetsToPreload.length);
              resolve();
            };
            video.onerror = () => {
              loadedCount++;
              handleProgress(loadedCount, assetsToPreload.length);
              resolve();
            };
            video.src = src;
          } else {
            const img = new Image();
            img.onload = () => {
              loadedCount++;
              handleProgress(loadedCount, assetsToPreload.length);
              resolve();
            };
            img.onerror = () => {
              loadedCount++;
              handleProgress(loadedCount, assetsToPreload.length);
              resolve();
            };
            img.src = src;
          }
        });
      });

      await Promise.allSettled(loadPromises);
      setTimeout(handleComplete, 300); // Small delay for smooth transition
    };

    preloadAssets();
  }, [assetsToPreload]);

  // --- SCRAPBOOK PRE-RENDERING ---
  useEffect(() => {
    if (!isScrapbookEnabled || !weddingDataFromApp?.scrapbookImages?.length || scrapbookImagesPreRendered) {
      return;
    }

    // Lightweight image preloading instead of heavy pre-rendering with DOM elements
    const preloadScrapbookImages = async () => {
      // Check if scrapbook is disabled to prevent S3 costs - calculate locally to avoid initialization order issues
      const currentScrapbookElement = renderableElements.find(el => el.type === 'component' && el.name === 'Scrapbook');
      const currentScrapbookFolderName = currentScrapbookElement ? generateElementFolderName(currentScrapbookElement) : null;
      const isScrapbookDisabled = currentScrapbookFolderName ? (controlValues[currentScrapbookFolderName]?.scrapbookDisabled ?? false) : false;
      
      if (isScrapbookDisabled) {
        console.log('[SCRAPBOOK PRELOAD] ❌ Scrapbook is disabled, skipping preload to save S3 costs');
        setScrapbookImagesPreRendered(true);
        return;
      }
      
      console.log('[SCRAPBOOK PRELOAD] Starting lightweight preload of scrapbook images...');
      
      // Get scrapbook image sources
      const scrapbookImages = weddingDataFromApp.scrapbookImages || [];
      const imageSources = scrapbookImages.map((img: any) => 
        img.fileName?.startsWith('http') 
          ? img.fileName 
          : `${weddingDataFromApp.scrapbookImageFolder?.replace(/\/$/, '') || ''}/${img.fileName?.replace(/^\//, '') || ''}`
      ).filter(Boolean);

      if (imageSources.length === 0) {
        setScrapbookImagesPreRendered(true);
        return;
      }

      // Simple image preloading without DOM manipulation
      const preloadPromises = imageSources.slice(0, 15).map((src: string) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          
          img.onload = () => {
            // Force decode for better performance when images actually render
            if ('decode' in img) {
              img.decode().then(() => resolve()).catch(() => resolve());
            } else {
              resolve();
            }
          };
          
          img.onerror = () => {
            console.warn('[SCRAPBOOK PRELOAD] Failed to preload:', src);
            resolve();
          };
          
          img.src = src;
        });
      });

      try {
        await Promise.allSettled(preloadPromises);
        console.log('[SCRAPBOOK PRELOAD] Completed lightweight preload of scrapbook images');
        
        // Small delay to ensure all decoding is complete
        setTimeout(() => {
          setScrapbookImagesPreRendered(true);
        }, 100);
        
      } catch (error) {
        console.error('[SCRAPBOOK PRELOAD] Error during preloading:', error);
        setScrapbookImagesPreRendered(true);
      }
    };

    // Start preloading after a small delay to allow other loading to complete
    const preloadTimeout = setTimeout(preloadScrapbookImages, 500);
    
    return () => {
      clearTimeout(preloadTimeout);
    };
  }, [isScrapbookEnabled, weddingDataFromApp, scrapbookImagesPreRendered, renderableElements, controlValues]);

  // Cleanup pre-render container when component unmounts (no longer needed)
  useEffect(() => {
    return () => {
      if (preRenderContainerRef.current) {
        document.body.removeChild(preRenderContainerRef.current);
        preRenderContainerRef.current = null;
      }
    };
  }, []);

  const activeSpringConfigGuest: SpringConfigPreset = springConfigPresets[selectedSpringPresetKeyGuest as keyof typeof springConfigPresets] || springConfigPresets.default;
  const activeParallaxPhysicsGuest: ParallaxPhysicsPreset = parallaxPhysicsPresets[selectedParallaxPhysicsPresetKey as keyof typeof parallaxPhysicsPresets] || parallaxPhysicsPresets.default;
  
  // Helper function to apply parallax physics to scroll values
  const applyParallaxPhysics = useCallback((rawScrollValue: number, maxValue?: number): number => {
    const { scrollSpeedMultiplier, scrollEasing, momentumDamping, responsiveness } = activeParallaxPhysicsGuest;
    
    // Apply speed multiplier
    let adjustedValue = rawScrollValue * scrollSpeedMultiplier;
    
    // Apply easing if specified and we have a max value for normalization
    if (scrollEasing !== 'linear' && maxValue && maxValue > 0) {
      const normalizedProgress = Math.min(1, Math.max(0, adjustedValue / maxValue));
      const easingFunction = animationCurves[scrollEasing as keyof typeof animationCurves];
      if (easingFunction) {
        const easedProgress = easingFunction(normalizedProgress);
        adjustedValue = easedProgress * maxValue;
      }
    }
    
    // Apply responsiveness (damping for rapid changes)
    adjustedValue *= responsiveness;
    
    return adjustedValue;
  }, [activeParallaxPhysicsGuest]);
  
  // --- AUTO NAVIGATION FUNCTIONS ---
  const scrollToAutoElement = useCallback((autoIndex: number) => {
    // console.log(`[AUTO_NAV] 🚀 scrollToAutoElement called with autoIndex: ${autoIndex}`, {
    //   autoElementsLength: autoElements.length,
    //   targetElementExists: !!autoElements[autoIndex],
    //   isAutoScrolling,
    //   autoScrollDuration,
    //   autoScrollEasing,
    //   animateScrollToExists: !!animateScrollTo
    // });
    
    if (!autoElements[autoIndex]) {
      // console.log(`[AUTO_NAV] ❌ No auto element at index ${autoIndex}`);
      return;
    }
    
    if (isAutoScrolling) {
      // console.log(`[AUTO_NAV] ❌ Already auto scrolling, skipping`);
      return;
    }
    
    const targetElement = autoElements[autoIndex];
    const targetScrollPosition = targetElement.endPosition * windowHeight;
    
    // console.log(`[AUTO_NAV] 🚀 React Spring scrolling to auto element ${targetElement.sequence} (element ${targetElement.elementId}) at END position ${targetScrollPosition}px`);
    
    setIsAutoScrolling(true);
    setCurrentAutoIndex(autoIndex);
    
    // Use custom animation for smooth, controlled scrolling
    animateScrollTo(targetScrollPosition, autoScrollDuration, autoScrollEasing);
  }, [autoElements, isAutoScrolling, windowHeight, autoScrollDuration, autoScrollEasing, animateScrollTo]);

  const handleAutoNext = useCallback(() => {
    // console.log(`[AUTO_NAV] 🔵 handleAutoNext clicked!`, {
    //   currentAutoIndex,
    //   autoElementsLength: autoElements.length,
    //   canGoNext: currentAutoIndex < autoElements.length - 1,
    //   isAutoScrolling,
    //   autoElements: autoElements.map(el => ({ elementId: el.elementId, sequence: el.sequence }))
    // });
    
    if (currentAutoIndex < autoElements.length - 1) {
      const nextIndex = currentAutoIndex + 1;
      // console.log(`[AUTO_NAV] 🔵 Calling scrollToAutoElement with nextIndex: ${nextIndex}`);
      scrollToAutoElement(nextIndex);
    } else {
      // console.log(`[AUTO_NAV] 🔵 Cannot go next - already at last element or beyond`);
    }
  }, [currentAutoIndex, autoElements.length, scrollToAutoElement, isAutoScrolling, autoElements]);

  const handleAutoPrevious = useCallback(() => {
    console.log(`[AUTO_NAV] 🔴 handleAutoPrevious clicked!`, {
      currentAutoIndex,
      canGoPrevious: currentAutoIndex > -1,
      isAutoScrolling,
      autoElements: autoElements.map(el => ({ elementId: el.elementId, sequence: el.sequence }))
    });
    
    if (currentAutoIndex > -1) {
      if (currentAutoIndex === 0) {
        // Go back to top with React Spring
        console.log(`[AUTO_NAV] 🔴 Going to top - setCurrentAutoIndex(-1)`);
        setCurrentAutoIndex(-1);
        setIsAutoScrolling(true);
        
        console.log(`[AUTO_NAV] 🚀 Custom animation scrolling to top`);
        
        animateScrollTo(0, autoScrollDuration * 0.75, autoScrollEasing);
      } else {
        const prevIndex = currentAutoIndex - 1;
        console.log(`[AUTO_NAV] 🔴 Calling scrollToAutoElement with prevIndex: ${prevIndex}`);
        scrollToAutoElement(prevIndex);
      }
    } else {
      console.log(`[AUTO_NAV] 🔴 Cannot go previous - currentAutoIndex is -1`);
    }
  }, [currentAutoIndex, scrollToAutoElement, autoScrollDuration, autoScrollEasing, animateScrollTo, isAutoScrolling, autoElements]);
  
  const selectedColorScheme: WeddingColorScheme = weddingColorSchemes.find(scheme => scheme.name === selectedColorSchemeName) || weddingColorSchemes[0];
  
  // Update theme color dynamically based on gradient start color
  useEffect(() => {
    if (isMobile) {
      const gradientControls = controlValues['Dynamic Background Gradient'] || {};
      const actualStartColor = getActualGradientStartColor(gradientControls, selectedColorScheme);
      const darkenedColor = darkenColorForStatusBar(actualStartColor, 0.3); // Darken by 30% for better contrast
      updateThemeColor(darkenedColor);
    }
    
    // Cleanup function to reset theme color when component unmounts
    return () => {
      if (isMobile) {
        resetThemeColor();
      }
    };
  }, [controlValues, selectedColorScheme, isMobile]);
  
  // Calculate scroll values with parallax physics applied
  const maxScrollableHeight = useMemo(() => (TOTAL_PAGES - 1) * windowHeight, [TOTAL_PAGES, windowHeight]);
  const scrollYWithPhysics = useMemo(() => applyParallaxPhysics(scrollY, maxScrollableHeight), [scrollY, maxScrollableHeight, applyParallaxPhysics]);
  
  // Update the navbar element finder - look for Navbar component elements
  const navbarElement = useMemo(() => {
    // Temporarily support both legacy 'navbar' type and new 'component' type
    const found = renderableElements.find(el => 
      (el.type === 'component' && el.name === 'Navbar') || 
      (el.type === 'navbar' && el.name === 'Navbar')
    );
    console.log('🔍 Navbar Element Detection:', {
      timestamp: Date.now(),
      totalRenderableElements: renderableElements.length,
      renderableElementTypes: renderableElements.map(el => ({ type: el.type, name: el.name, id: el.id })),
      foundNavbarElement: found,
      foundNavbarElementDetails: found ? {
        id: found.id,
        type: found.type,
        name: found.name,
        sticky: found.sticky,
        content: found.content
      } : null,
      // Debug info
      allNavbarElements: renderableElements.filter(el => 
        (el.type === 'component' && el.name === 'Navbar') || 
        (el.type === 'navbar' && el.name === 'Navbar')
      )
    });
    return found;
  }, [renderableElements]);
  const navbarFolderName = navbarElement ? generateElementFolderName(navbarElement) : null;

  // Get the scrapbook element to determine its folder name
  const scrapbookElement = useMemo(() => renderableElements.find(el => el.type === 'component' && el.name === 'Scrapbook'), [renderableElements]);
  const scrapbookFolderName = useMemo(() => scrapbookElement ? generateElementFolderName(scrapbookElement) : null, [scrapbookElement]);
  const showCaptions = scrapbookFolderName ? (controlValues[scrapbookFolderName]?.showCaptions ?? true) : true;

  const centerStyle: CSSProperties = useMemo(() => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', width: '100%' }), []);

  // --- ANIMATION HOOKS ---
  const backdropSpring = useSpring({ opacity: focusedImage ? 1 : 0, pointerEvents: focusedImage ? 'auto' : 'none', config: activeSpringConfigGuest });
  const [focusedImageContainerSpring, focusedImageApi] = useSpring(() => ({ opacity: 0, top: '50%', left: '50%', width: '0px', height: '0px', transform: 'translate(-50%, -50%) rotate(0deg) scale(0.5)', config: activeSpringConfigGuest }));
  const infoBoxSpring = useSpring({ opacity: focusedImage ? 1 : 0, transform: focusedImage ? 'translateY(0px)' : 'translateY(20px)', config: activeSpringConfigGuest, delay: focusedImage ? 300 : 0 });
  
  // Loading screen fade animation
  const loadingScreenSpring = useSpring({ 
    opacity: showLoadingScreen ? 1 : 0,
    config: { tension: 200, friction: 25 }, // Smooth fade animation
    onRest: () => {
      // Only hide loading screen completely after fade animation completes
      if (!showLoadingScreen) {
        setIsPreloading(false);
      }
    }
  });

  const bindFocusedImageDrag = useDrag(({ last, movement: [mx], velocity: [vx], direction: [dx], event }) => {
    event?.stopPropagation();
    if (!focusedImage || !last) return;
    if (Math.abs(mx) > windowWidth / 4 || Math.abs(vx) > 0.3) {
      const syntheticEvent = { stopPropagation: () => {} };
      if (dx > 0) handlePreviousImage(syntheticEvent); else if (dx < 0) handleNextImage(syntheticEvent);
    }
  }, { axis: 'x', filterTaps: true, enabled: !!focusedImage });

  // --- EVENT HANDLERS & OTHER EFFECTS ---
  const handleSaveConfiguration = () => { if (weddingIdFromApp) setShowSaveConfirm(true); else { setSaveErrorMessage('Cannot save: Wedding ID is missing.'); setTimeout(() => setSaveErrorMessage(null), 5000); } };
  const cancelSave = () => setShowSaveConfirm(false);
  const confirmSave = async () => {
    setShowSaveConfirm(false);
    setIsSaving(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    console.log(`[SAVE] Attempting to save to slot ${currentSavingToSlot}...`);
    try {
      // Use only the full controlValues from the store
      const layoutSettings = useLevaStore.getState().controlValues;
      // LOG ARROW COLOR BEING SAVED
      console.log(`[ARROW_COLOR_DEBUG] 💾 Saving arrow color data:`, {
        currentArrowBackgroundColor: layoutSettings["Overall Controls (Guest)"]?.arrowBackgroundColor,
        fullOverallControls: layoutSettings["Overall Controls (Guest)"] || {},
        slot: currentSavingToSlot,
        timestamp: Date.now()
      });
      await useLevaStore.getState().saveSettingsToServer(weddingIdFromApp, isMobile ? 'mobile' : 'desktop', currentSavingToSlot, layoutSettings);
      setSaveSuccessMessage(`Layout saved to slot ${currentSavingToSlot}!`);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (error) {
      console.error('[SAVE] Save failed:', error);
      setSaveErrorMessage('Save failed. Please try again.');
      setTimeout(() => setSaveErrorMessage(null), 5000);
    }
    setIsSaving(false);
  };
  
  useEffect(() => {
    const handleResize = () => { setWindowHeight(window.innerHeight); setWindowWidth(window.innerWidth); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const parallaxContainer = parallaxRef.current?.container.current;
    if (!parallaxContainer) return;
    
    const handleScroll = () => {
      const currentScrollY = parallaxContainer.scrollTop;
      const currentTime = Date.now();
      
      // Calculate scroll velocity for debug display
      const deltaScroll = Math.abs(currentScrollY - lastScrollY.current);
      const deltaTime = currentTime > lastScrollTime.current ? currentTime - lastScrollTime.current : 1;
      const velocity = deltaScroll / deltaTime;
      
      // Update scroll state naturally - no artificial capping
      setScrollY(currentScrollY);
      setScrollVelocity(velocity);
      
      // Detect which auto element is currently in view - improved detection for forms
      if (autoElements.length > 0) {
        const currentScrollPercent = currentScrollY / windowHeight;
        let detectedElementId: number | null = null;
        
        // Find which auto element we're currently viewing
        for (let i = 0; i < autoElements.length; i++) {
          const autoElement = autoElements[i];
          const renderableElement = renderableElements.find(el => el.id === autoElement.elementId);
          
          if (renderableElement) {
            const elementStart = renderableElement.sticky.start;
            const elementEnd = renderableElement.sticky.end;
            
            // Check if we're within the element's actual range (start to end)
            if (currentScrollPercent >= elementStart && currentScrollPercent <= elementEnd) {
              detectedElementId = autoElement.elementId;
              
              // Special logging for form elements
              const elementBlueprint = elementsFromBlueprint.find(el => el.id === autoElement.elementId);
              if (elementBlueprint && elementBlueprint.type === 'component' && 
                  (elementBlueprint.name === 'RSVP Form' || elementBlueprint.name === 'Prompt Form')) {
                // console.log(`[FORM_DETECTION] 🎯 Currently viewing ${elementBlueprint.name} (element ${autoElement.elementId})`, { scrollPercent: currentScrollPercent.toFixed(3), isSubmitted: formSubmissions[autoElement.elementId] || false }); // Commented out to reduce spam
              }
              break;
            }
          }
        }
        
        // Only update if the detected element has actually changed
        if (detectedElementId !== currentViewedAutoElement) {
          // console.log(`[AUTO_ELEMENT_DETECTION] 🔄 Setting currentViewedAutoElement:`, {
          //   from: currentViewedAutoElement,
          //   to: detectedElementId,
          //   scrollPercent: currentScrollPercent.toFixed(3)
          // });
          setCurrentViewedAutoElement(detectedElementId);
        }
      }
      
      lastScrollY.current = currentScrollY;
      lastScrollTime.current = currentTime;
    };
    
    parallaxContainer.addEventListener('scroll', handleScroll);
    return () => parallaxContainer.removeEventListener('scroll', handleScroll);
  }, [autoElements, renderableElements, elementsFromBlueprint, formSubmissions, currentViewedAutoElement, windowHeight]);

  const handleDisplayedImagesUpdate = useCallback((newImageData: DisplayedImage[]) => setDisplayedImagesAndTheirData(newImageData), []);

  useEffect(() => {
    let isMounted = true;
    
    // Check if scrapbook is disabled to prevent S3 costs - calculate locally to avoid initialization order issues  
    const currentScrapbookElement = renderableElements.find(el => el.type === 'component' && el.name === 'Scrapbook');
    const currentScrapbookFolderName = currentScrapbookElement ? generateElementFolderName(currentScrapbookElement) : null;
    const isScrapbookDisabled = currentScrapbookFolderName ? (controlValues[currentScrapbookFolderName]?.scrapbookDisabled ?? false) : false;
    
    if (!isScrapbookEnabled || !weddingDataFromApp?.scrapbookImages?.length || isScrapbookDisabled) { 
      if (isMounted) setImageNaturalDimensions([]); 
      return; 
    }
    
    const imagePaths = weddingDataFromApp.scrapbookImages.map((img: any) => img.fileName?.startsWith('http') ? img.fileName : `${weddingDataFromApp.scrapbookImageFolder.replace(/\/$/, '')}/${img.fileName.replace(/^\//, '')}`);
    const dimsPromises = imagePaths.map((src: string) => new Promise<NaturalImageDimensions>(resolve => {
      if (!src) return resolve({ width: 0, height: 0, src: '' });
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, src });
      img.onerror = () => resolve({ width: 0, height: 0, src });
      img.src = src;
    }));
    Promise.all(dimsPromises).then(dims => { if (isMounted) setImageNaturalDimensions(dims); });
    return () => { isMounted = false; };
  }, [isScrapbookEnabled, weddingDataFromApp, renderableElements, controlValues]);
  
  useEffect(() => {
    if (!isScrapbookEnabled) {
      if (focusedImage || imageReturningToScrapbook || pendingImageToFocus) { setFocusedImage(null); setImageReturningToScrapbook(null); setPendingImageToFocus(null); focusedImageApi.start({ opacity: 0, immediate: true }); }
      return;
    }
    if (focusedImage) {
      const { targetWidth, targetHeight } = calculateFocusTargetDimensions(focusedImage.naturalWidth, focusedImage.naturalHeight, windowWidth, windowHeight);
      const { top, left } = getCenteredPosition(targetWidth, targetHeight, 1.5);
      focusedImageApi.start({ from: { opacity: 0.5, top: `${focusedImage.initialTopPx}px`, left: `${focusedImage.initialLeftPx}px`, width: `${focusedImage.initialWidthPx}px`, height: `${focusedImage.initialHeightPx}px`, transform: `translate(0px, 0px) rotate(${focusedImage.initialRotateDeg}deg) scale(1)` }, to: { opacity: 1, top: `${top}px`, left: `${left}px`, width: `${targetWidth}px`, height: `${targetHeight}px`, transform: 'translate(0px, 0px) rotate(0deg) scale(1)' } });
    } else if (imageReturningToScrapbook) {
      const { currentIndex, initialWidthPx, initialHeightPx } = imageReturningToScrapbook;
      const targetEl = scrapbookImageRefs.current[currentIndex];
      const itemData = displayedImagesAndTheirData.find(d => d.displayIndex === currentIndex);
      if (targetEl && itemData) {
        const rect = targetEl.getBoundingClientRect();
        const baseRot = parseRotationFromStyle(itemData.initialStyle.transform);
        const dynamicRot = Math.sin(scrollYWithPhysics * (itemData.itemScrollSensitivity || 0) + currentIndex * 0.5) * (itemData.itemDynamicRotationRange || 0);
        focusedImageApi.start({ to: { top: `${rect.top}px`, left: `${rect.left}px`, width: `${initialWidthPx}px`, height: `${initialHeightPx}px`, transform: `translate(0px, 0px) rotate(${baseRot + dynamicRot}deg) scale(1)` }, onRest: () => { const current = imageReturningToScrapbookRef.current; setImageReturningToScrapbook(null); if (current) setLastPutDownIndex(current.currentIndex); const pending = pendingImageToFocusRef.current; if (pending) { setFocusedImage(pending); setPendingImageToFocus(null); } } });
        focusedImageApi.start({ to: { opacity: 0 }, config: { tension: 300, friction: 20 } });
      } else {
        focusedImageApi.start({ opacity: 0, immediate: true });
        setImageReturningToScrapbook(null);
        if (pendingImageToFocus) { setFocusedImage(pendingImageToFocus); setPendingImageToFocus(null); }
      }
    } else {
      focusedImageApi.start({ opacity: 0, immediate: true });
    }
  }, [focusedImage, imageReturningToScrapbook, pendingImageToFocus, focusedImageApi, windowWidth, windowHeight, displayedImagesAndTheirData, scrollYWithPhysics, activeSpringConfigGuest]);
  
  const handleCloseFocusedImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (focusedImage) { setImageReturningToScrapbook(focusedImage); setFocusedImage(null); setPendingImageToFocus(null); }
  }, [focusedImage]);

  const updateAndFocusNewImage = useCallback((newDisplayIndex: number): FocusedImageState | null => {
    if (!isScrapbookEnabled || !displayedImagesAndTheirData?.length) return null;
    const targetData = displayedImagesAndTheirData.find(d => d.displayIndex === newDisplayIndex);
    const targetEl = scrapbookImageRefs.current[newDisplayIndex];
    if (!targetData || !targetEl) return null;
    let naturalDims = imageNaturalDimensions.find(dim => dim.src === targetData.src);
    if (!naturalDims?.width) { if (targetEl.naturalWidth > 0) naturalDims = { width: targetEl.naturalWidth, height: targetEl.naturalHeight, src: targetData.src }; else return null; }
    const rect = targetEl.getBoundingClientRect();
    const baseRot = parseRotationFromStyle(targetData.initialStyle.transform);
    const dynamicRot = Math.sin(scrollYWithPhysics * (targetData.itemScrollSensitivity || 0) + newDisplayIndex * 0.5) * (targetData.itemDynamicRotationRange || 0);
    return { ...targetData, initialTopPx: rect.top, initialLeftPx: rect.left, initialWidthPx: rect.width, initialHeightPx: rect.height, initialRotateDeg: baseRot + dynamicRot, naturalWidth: naturalDims.width, naturalHeight: naturalDims.height, currentIndex: newDisplayIndex };
  }, [isScrapbookEnabled, displayedImagesAndTheirData, imageNaturalDimensions, scrollYWithPhysics]);

  const handlePreviousImage = useCallback((e: React.MouseEvent | { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!focusedImage || !displayedImagesAndTheirData?.length) return;
    const newIndex = (focusedImage.currentIndex - 1 + displayedImagesAndTheirData.length) % displayedImagesAndTheirData.length;
    const newDetails = updateAndFocusNewImage(newIndex);
    if (newDetails) { setImageReturningToScrapbook(focusedImage); setPendingImageToFocus(newDetails); setFocusedImage(null); }
  }, [focusedImage, displayedImagesAndTheirData, updateAndFocusNewImage]);

  const handleNextImage = useCallback((e: React.MouseEvent | { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!focusedImage || !displayedImagesAndTheirData?.length) return;
    const newIndex = (focusedImage.currentIndex + 1) % displayedImagesAndTheirData.length;
    const newDetails = updateAndFocusNewImage(newIndex);
    if (newDetails) { setImageReturningToScrapbook(focusedImage); setPendingImageToFocus(newDetails); setFocusedImage(null); }
  }, [focusedImage, displayedImagesAndTheirData, updateAndFocusNewImage]);

  const handleImageClick = useCallback((details: any) => {
    const { imageSrc, initialStyle, currentBoundingClientRect: rect, imageElement, index } = details;
    let naturalDims = imageNaturalDimensions.find(dim => dim.src === imageSrc);
    if (!naturalDims?.width) { if (imageElement?.naturalWidth > 0) naturalDims = { width: imageElement.naturalWidth, height: imageElement.naturalHeight, src: imageSrc }; else return; }
    const itemData = displayedImagesAndTheirData.find(d => d.displayIndex === index);
    if (!itemData) return;
    const baseRot = parseRotationFromStyle(initialStyle.transform);
    const dynamicRot = Math.sin(scrollYWithPhysics * (itemData.itemScrollSensitivity || 0) + index * 0.5) * (itemData.itemDynamicRotationRange || 0);
    const clickedDetails: FocusedImageState = { ...itemData, initialTopPx: rect.top, initialLeftPx: rect.left, initialWidthPx: rect.width, initialHeightPx: rect.height, initialRotateDeg: baseRot + dynamicRot, naturalWidth: naturalDims.width, naturalHeight: naturalDims.height, currentIndex: index };
    if (focusedImage) { setImageReturningToScrapbook(focusedImage); setPendingImageToFocus(clickedDetails); setFocusedImage(null); }
    else { setFocusedImage(clickedDetails); }
  }, [imageNaturalDimensions, displayedImagesAndTheirData, scrollYWithPhysics, focusedImage]);

  // --- LOADING GUARD ---
  if (isSwitchingSlots || !experienceSettingsFromApp) {
    return null; 
  }

  // --- RENDER MAIN EXPERIENCE (with loading screen overlay when preloading) ---

  // Add rsvpEndpoint to weddingDataFromApp if it doesn't exist
  const weddingDataWithEndpoint = {
    ...weddingDataFromApp,
    rsvpEndpoint: weddingDataFromApp.rsvpEndpoint || `${getApiBaseUrl()}/rsvp`
  };

  const hasRsvp = renderableElements.some(el => el.type === 'component' && el.name === 'RSVP Form');
  const hasScrapbook = renderableElements.some(el => el.type === 'component' && el.name === 'Scrapbook');

  // --- MAIN RENDER ---
  return (
    <UserInfoProvider>
      <FontGrabber fonts={googleFontsToLoad} />

      {/* Loading Screen Overlay - shows on top of main experience during preloading */}
      {isPreloading && (
        <animated.div style={{
          ...loadingScreenSpring,
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: '#fdf9f7', // Warm off-white to match logo background
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: '0px',
          zIndex: 999999,
          color: selectedColorScheme.colors.text,
          fontFamily: 'Arial, sans-serif',
          pointerEvents: 'none', // Allow interaction with content below when fading
    }}>
      {/* Wedding Logo */}
      <div style={{
        margin: '0 0 40px 0',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <img 
          src="/Logo.png" 
          alt="Wedding Logo" 
          style={{
            maxWidth: '112.5px', // 25% smaller than 150px
            maxHeight: '112.5px',
            objectFit: 'contain',
            background: 'transparent',
            mixBlendMode: 'multiply',
          }}
        />
      </div>

      {/* Animated Loading Icon */}
      <div style={{
        width: '80px',
        height: '80px',
        margin: '0 0 30px 0',
        position: 'relative',
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          border: `4px solid #B07A8C40`, // Use logo pink color with alpha
          borderTop: `4px solid #B07A8C`, // Use logo pink color
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.7; transform: scale(1.05); }
            }
            @keyframes shimmer {
              0% { background-position: -200px 0; }
              100% { background-position: 200px 0; }
            }
          `}
        </style>
      </div>

      {/* Loading Text */}
      <h2 style={{
        margin: '0 0 20px 0',
        fontSize: '2rem',
        fontWeight: '300',
        textAlign: 'center',
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        Loading Experience
      </h2>

      {/* Progress Bar */}
      <div style={{
        width: '300px',
        height: '6px',
        backgroundColor: '#B07A8C20', // Use logo pink color with alpha for background
        borderRadius: '3px',
        overflow: 'hidden',
        margin: '0 0 15px 0',
      }}>
        <div style={{
          width: `${preloadTotal > 0 ? (preloadProgress / preloadTotal) * 100 : 0}%`,
          height: '100%',
          background: `#B07A8C`, // Use logo pink color for progress
          borderRadius: '3px',
          transition: 'width 0.3s ease',
          backgroundSize: '200px 100%',
          animation: preloadProgress < preloadTotal ? 'shimmer 1.5s infinite' : 'none',
        }} />
      </div>

          {/* Progress Text */}
          <p style={{
            margin: '0',
            fontSize: '1rem',
            opacity: 0.8,
            textAlign: 'center',
          }}>
            {preloadTotal > 0 ? `Loading assets... ${preloadProgress}/${preloadTotal}` : 'Preparing experience...'}
          </p>

          {/* Completion Animation - Removed star emoji */}
        </animated.div>
      )}

      {isSetupMode && (
        <>
          {/* Fixed Save Button */}
          <div style={saveButtonContainerStyle || { position: 'fixed', top: '8px', left: '8px', zIndex: 10001 }}>
            <button onClick={handleSaveConfiguration} disabled={isSaving || showSaveConfirm} style={{ padding: '12px 20px', fontSize: '0.9rem', color: 'white', backgroundColor: isSaving ? '#cf5200' : (showSaveConfirm ? '#ffc107' : '#007bff'), border: 'none', borderRadius: '5px', cursor: 'pointer', width: '180px', height: '45px', margin: '0' }}>
              {isSaving ? 'Saving...' : 'Save Layout'}
            </button>
          </div>
          
          {/* Success/Error Messages - positioned separately */}
          {saveSuccessMessage && (
            <div style={{
              position: 'fixed', 
              top: '8px', 
              left: '196px', 
              zIndex: 10001,
              color: 'lime', 
              background: 'rgba(0,0,0,0.7)', 
              padding: '12px 15px', 
              borderRadius: '5px',
              fontSize: '0.9rem',
              margin: '0'
            }}>
              {saveSuccessMessage}
            </div>
          )}
          {saveErrorMessage && (
            <div style={{
              position: 'fixed', 
              top: '8px', 
              left: '196px', 
              zIndex: 10001,
              color: 'red', 
              background: 'rgba(0,0,0,0.7)', 
              padding: '12px 15px', 
              borderRadius: '5px',
              fontSize: '0.9rem',
              margin: '0'
            }}>
              {saveErrorMessage}
            </div>
          )}
        </>
      )}
      {showSaveConfirm && (
        <>
          {/* Modal backdrop */}
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              backgroundColor: 'rgba(0, 0, 0, 0.5)', 
              zIndex: 999998,
              pointerEvents: 'auto'
            }} 
            onClick={cancelSave}
          />
          {/* Modal content */}
          <div style={{ 
            position: 'fixed', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
            background: 'white', 
            padding: '20px', 
            borderRadius: '8px', 
            zIndex: 999999, 
            textAlign: 'center', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            pointerEvents: 'auto'
          }}>
            <p>Overwrite Layout Slot {currentSavingToSlot}?</p>
            <button 
              onClick={confirmSave} 
              style={{ 
                padding: '8px 15px', 
                margin: '0 10px', 
                background: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px',
                cursor: 'pointer',
                pointerEvents: 'auto'
              }}
            >
              Yes, Save
            </button>
            <button 
              onClick={cancelSave} 
              style={{ 
                padding: '8px 15px', 
                margin: '0 10px', 
                background: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px',
                cursor: 'pointer',
                pointerEvents: 'auto'
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {isSetupMode && showGlobalHUDEnabledGuest && (
        <div style={{ position: 'fixed', top: "60px", left: '10px', zIndex: 10000, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px', borderRadius: '0 0 5px 5px', fontSize: '13px', fontFamily: 'monospace' }}>
          <div>ScrollY: {scrollY.toFixed(0)} | %: {(scrollY / ((TOTAL_PAGES - 1) * windowHeight) * 100).toFixed(1)}</div>
          <div>Velocity: {scrollVelocity.toFixed(2)} px/ms | Natural Scrolling</div>
          <div>Previewing: {previewingLayoutSlot} | Saving to: {currentSavingToSlot} | Prod: {isMobile ? experienceSettingsFromApp.defaultLayoutSlotMobile : experienceSettingsFromApp.defaultLayoutSlotDesktop}</div>
        </div>
      )}

      <div 
        className={isMobile ? 'guest-experience-mobile-container' : ''}
        style={{ 
          width: '100%', 
          height: '100dvh', 
          background: initialGradient,
          // Hide scrollbars on mobile and all devices
          ...(isMobile ? {
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE and Edge
          } : {})
        }}
      >
        <Parallax 
          ref={parallaxRef} 
          pages={TOTAL_PAGES} 
          className={isMobile ? 'guest-experience-mobile-parallax' : ''}
          style={{ 
            top: '0', 
            height: '100dvh',
            left: '0', 
            pointerEvents: (focusedImage || imageReturningToScrapbook) ? 'none' : 'auto',
            backgroundColor: 'transparent',
            // Enhanced hardware acceleration to prevent rendering glitches
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translateZ(0)', // Force GPU acceleration
            WebkitTransform: 'translateZ(0)',
            willChange: 'scroll-position, transform',
            // Performance optimizations during auto-scroll
            ...(isAutoScrolling && {
              contain: 'layout style paint', // Optimize layout calculations during animation
              contentVisibility: 'auto', // Optimize off-screen content rendering
            }),
            // Hide scrollbars for webkit browsers (Chrome, Safari, most mobile browsers)
            ...(isMobile ? {
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE and Edge
              WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
            } : {})
          }}
        >
          
          {/* Dynamic gradient background */}
          <ParallaxLayer offset={0} speed={0} factor={TOTAL_PAGES} style={{ zIndex: -20 }}>
            <ShiftingBackgroundColors 
              scrollY={scrollYWithPhysics} 
              TOTAL_PAGES={TOTAL_PAGES} 
              windowHeight={windowHeight} 
              selectedColorScheme={selectedColorScheme}
            />
          </ParallaxLayer>

          {renderableElements
            .map((element, index) => {
              let contentToRender;
              switch (element.type) {
                case 'text': contentToRender = <h2>{element.content}</h2>; break;
                case 'photo': contentToRender = <img src={element.content} alt={element.name || 'Wedding photo'} style={{ maxWidth: '80%', maxHeight: '80vh', borderRadius: '8px' }} />; break;
                case 'video': {
                  const videoFolderName = generateElementFolderName(element);
                  const videoControls = controlValues[videoFolderName] || {};
                  const { autoplay = true, loop = true, muted = true, showControls = false } = videoControls;
                  
                  contentToRender = (
                    <video 
                      src={element.content} 
                      autoPlay={autoplay}
                      loop={loop}
                      muted={muted}
                      controls={showControls}
                      playsInline={true}
                      webkit-playsinline="true"
                      preload="metadata"
                      style={{ 
                        width: 'auto',
                        height: 'auto',
                        borderRadius: '8px',
                        objectFit: 'contain',
                        display: 'block',
                        opacity: videoOpacity[element.id] ?? 1,
                        transition: 'opacity 0.3s ease-in-out'
                      }}
                      onError={(e) => console.error('Video playback error:', e)}
                      onTimeUpdate={(e) => handleVideoTimeUpdate(element.id, e)}
                      onLoadedMetadata={(e) => {
                        // Programmatic play for iOS Safari compatibility
                        if (autoplay && muted) {
                          const video = e.target as HTMLVideoElement;
                          const playPromise = video.play();
                          if (playPromise !== undefined) {
                            playPromise.catch((error: any) => {
                              console.log('Video autoplay failed:', error);
                            });
                          }
                        }
                        // Initialize opacity
                        setVideoOpacity(prev => ({ ...prev, [element.id]: 1 }));
                      }}
                    />
                  );
                  break;
                }
                case 'background-image': contentToRender = <div style={{ width: '100%', height: '100%', backgroundImage: `url(${element.content})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />; break;
                case 'background-video': {
                  const bgVideoFolderName = generateElementFolderName(element);
                  const bgVideoControls = controlValues[bgVideoFolderName] || {};
                  const { autoplay = true, loop = true, muted = true, showControls = false } = bgVideoControls;
                  
                  contentToRender = (
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundColor: '#000000' // Fallback during video load
                    }}>
                      <video 
                        src={element.content} 
                        autoPlay={autoplay}
                        loop={loop}
                        muted={muted}
                        controls={showControls}
                        playsInline={true}
                        webkit-playsinline="true"
                        preload="metadata"
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          backgroundColor: '#000000',
                          backfaceVisibility: 'hidden', // Prevent rendering glitches
                          opacity: videoOpacity[element.id] ?? 1,
                          transition: 'opacity 0.3s ease-in-out'
                        }}
                        onError={(e) => console.error('Background video playback error:', e)}
                        onTimeUpdate={(e) => handleVideoTimeUpdate(element.id, e)}
                        onLoadedMetadata={(e) => {
                          // Programmatic play for iOS Safari compatibility
                          if (autoplay && muted) {
                            const video = e.target as HTMLVideoElement;
                            const playPromise = video.play();
                            if (playPromise !== undefined) {
                              playPromise.catch((error: any) => {
                                console.log('Background video autoplay failed:', error);
                              });
                            }
                          }
                          // Initialize opacity
                          setVideoOpacity(prev => ({ ...prev, [element.id]: 1 }));
                        }}
                      />
                    </div>
                  );
                  break;
                }
                case 'component':
                  if (element.name === 'RSVP Form') {
                    const rsvpFolderName = generateElementFolderName(element);
                    contentToRender = <div style={{ pointerEvents: 'auto' }}><RSVPForm weddingData={weddingDataWithEndpoint} backendUrl={weddingDataWithEndpoint.rsvpEndpoint} styleControlsFromProp={controlValues[rsvpFolderName]} onSubmit={() => handleRSVPSubmission(element.id)} /></div>;
                  } else if (element.name === 'Prompt Form') {
                    const promptFolderName = generateElementFolderName(element);
                    contentToRender = <div style={{ pointerEvents: 'auto' }}><PromptForm weddingData={weddingDataWithEndpoint} backendUrl={getApiBaseUrl()} styleControlsFromProp={controlValues[promptFolderName]} onSubmit={() => handlePromptSubmission(element.id)} /></div>;
                  } else if (element.name === 'Scrapbook') {
                    const scrapbookElementFolderName = generateElementFolderName(element);
                    contentToRender = <InteractiveScrapbook 
                      weddingData={weddingDataFromApp} 
                      config={element.content} 
                      scrollY={scrollYWithPhysics} 
                      onImageClick={handleImageClick} 
                      focusedImageGlobal={focusedImage} 
                      imageReturningToScrapbookGlobal={imageReturningToScrapbook} 
                      lastPutDownIndexGlobal={lastPutDownIndex} 
                      scrapbookImageRefs={scrapbookImageRefs} 
                      onDisplayedImagesUpdate={handleDisplayedImagesUpdate} 
                      windowWidth={windowWidth} 
                      windowHeight={windowHeight} 
                      layoutControlsFromProp={controlValues[scrapbookElementFolderName]}
                      TOTAL_PAGES={TOTAL_PAGES}
                      elementSticky={element.sticky}
                    />;
                  } else if (element.name === 'Navbar') {
                    // REMOVE: Do not render Navbar here, it will be rendered outside parallax structure
                    contentToRender = null;
                  } else if (element.name === 'Bottom Navbar') {
                    // Legacy Bottom Navbar - skip rendering as it's replaced by Navbar
                    contentToRender = null;
                  } else { return null; }
                  break;
                default: return null;
              }

              return (
                <ParallaxLayer key={element.key} sticky={element.sticky as ParallaxLayerProps['sticky']} style={{ 
                  ...centerStyle, 
                  // Fix for scrapbook pointer events - simplified since container handles positioning
                  ...(element.type === 'component' && element.name === 'Scrapbook' ? {
                    overflow: 'visible',
                    pointerEvents: 'auto',
                  } : {}),
                  zIndex: 
                    element.type === 'background-image' || element.type === 'background-video'
                      ? -5 
                      : element.type === 'component' && element.name === 'Scrapbook' 
                      ? 100 
                      : element.type === 'component' && element.name === 'RSVP Form'
                      ? 150
                      : element.type === 'component' && element.name === 'Prompt Form'
                      ? 140
                      : (element.type === 'component' && element.name === 'Navbar')
                      ? 125
                      : element.type === 'component' && element.name === 'Bottom Navbar'
                      ? 125
                      : (elementsFromBlueprint.length - (element.id || 0) + 1),
                  pointerEvents: element.type === 'component' && (element.name === 'RSVP Form' || element.name === 'Prompt Form') ? 'none' : 'auto',
                  backgroundColor: (element.type === 'background-image' || element.type === 'background-video') 
                    ? '#000000' 
                    : 'transparent', // Background layers get black background, others transparent
                }}>
                  <ElementWrapper 
                    element={element} 
                    experienceSettings={experienceSettingsFromApp} 
                    scrollY={scrollYWithPhysics} 
                    windowHeight={windowHeight} 
                    TOTAL_PAGES={TOTAL_PAGES}
                    layoutSettingsFromPreview={isSetupMode ? undefined : controlValues}
                    overallFontFamily={overallFontFamily}
                  >
                    {contentToRender}
                  </ElementWrapper>
                </ParallaxLayer>
              );
            }).filter(Boolean)}
        </Parallax>
      </div>

      {/* Render Navbar outside parallax structure */}
      {(() => {
        // Temporarily support both legacy 'navbar' type and new 'component' type
        const navbarElements = renderableElements.filter(element => 
          (element.type === 'component' && element.name === 'Navbar') || 
          (element.type === 'navbar' && element.name === 'Navbar')
        );
        
        console.log('🎯 Navbar Rendering Section:', {
          timestamp: Date.now(),
          totalRenderableElements: renderableElements.length,
          navbarElementsFound: navbarElements.length,
          navbarElements: navbarElements.map(el => ({
            id: el.id,
            type: el.type,
            name: el.name,
            sticky: el.sticky,
            content: el.content
          })),
          willRenderNavbars: navbarElements.length > 0
        });
        
        return navbarElements.map(element => {
          const folderName = generateElementFolderName(element);
          const navbarValues = controlValues[folderName] || {};
          const navbarContent = typeof element.content === 'object' ? element.content : { navbarType: 'bottom', items: [] };
          
          console.log('🎨 Rendering Navbar Element:', {
            timestamp: Date.now(),
            elementId: element.id,
            folderName,
            navbarValues,
            navbarContent,
            navbarType: navbarContent.navbarType,
            stickyStart: element.sticky.start,
            stickyEnd: element.sticky.end,
            scrollY: scrollYWithPhysics,
            windowHeight,
            TOTAL_PAGES
          });
          
          return (
            <Navbar 
              key={`navbar-${element.id}`}
              scrollY={scrollYWithPhysics}
              startPosition={element.sticky.start}
              endPosition={element.sticky.end}
              windowHeight={windowHeight}
              TOTAL_PAGES={TOTAL_PAGES}
              styleControls={navbarValues}
              weddingId={weddingIdFromApp}
              element={element}
              experienceSettings={experienceSettingsFromApp}
              overallFontFamily={overallFontFamily}
              navbarType={navbarContent.navbarType}
              autoElements={autoElements}
              scrollToAutoElement={scrollToAutoElement}
              includeAutoNav={experienceSettingsFromApp?.autoNavigationEnabled}
            />
          );
        });
      })()}

      <>
        <animated.div style={{ ...backdropSpring, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.7)', zIndex: 1000 } as any} onClick={handleCloseFocusedImage} />
        {isScrapbookEnabled && (focusedImage || imageReturningToScrapbook) && (
          <animated.div {...bindFocusedImageDrag()} style={{ ...focusedImageContainerSpring, zIndex: 1001, position: 'fixed', touchAction: 'none' } as any}>
            {(focusedImage || imageReturningToScrapbook) && (
              <div onClick={e => e.stopPropagation()} style={{ pointerEvents: 'auto', width: '100%', height: '100%', position: 'relative' }}>
                <img src={focusedImage?.src || imageReturningToScrapbook?.src} alt={focusedImage?.altText || imageReturningToScrapbook?.altText} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', boxShadow: '0px 10px 30px rgba(0,0,0,0.5)', border: '10px solid white', borderRadius: '3px' }} />
                {focusedImage && (
                  <>
                    <button onClick={handlePreviousImage} style={{ position: 'fixed', top: '50%', left: '20px', zIndex: 1002, transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer' }}>&#8592;</button>
                    <button onClick={handleNextImage} style={{ position: 'fixed', top: '50%', right: '20px', zIndex: 1002, transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer' }}>&#8594;</button>
                    {showCaptions && (
                      <animated.div style={{ ...infoBoxSpring, position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 1002, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '10px 20px', borderRadius: '5px', textAlign: 'center' } as any}>
                        <p style={{ margin: 0 }}>{focusedImage.altText}</p>
                        {focusedImage.description && <p style={{ margin: '5px 0 0', fontSize: '0.8em' }}>{focusedImage.description}</p>}
                      </animated.div>
                    )}
                  </>
                )}
              </div>
            )}
          </animated.div>
        )}

        {/* Scroll Hint */}
        {(() => {
          // Don't show scroll hint if auto navigation is enabled
          if (experienceSettingsFromApp?.autoNavigationEnabled) {
            return null;
          }
          
          return (
            <ScrollHint 
              isVisible={showScrollHintVisible}
              selectedColorScheme={{ colors: { primary: '#007bff', text: '#333333', accent: '#6c757d' } }}
              shouldFade={shouldFadeHint}
              fadeOnceDetected={fadeOnceDetected}
            />
          );
        })()}







        {/* Auto Navigation Arrows */}
        {(() => {
          // Generate arrow styles from controls
          const generateArrowStyle = (isDisabled: boolean) => {
            const baseStyle: React.CSSProperties = {
              position: 'fixed',
              top: '50%',
              zIndex: 2000,
              border: 'none',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              lineHeight: 1,
              color: isDisabled ? '#888888' : arrowTextColor,
              fontSize: `${arrowFontSize}px`,
              padding: `${arrowPadding}px`,
              borderRadius: `${arrowBorderRadius}px`,
              background: 'transparent',
              backdropFilter: arrowBackdropBlur > 0 ? `blur(${arrowBackdropBlur}px)` : 'none',
              WebkitBackdropFilter: arrowBackdropBlur > 0 ? `blur(${arrowBackdropBlur}px)` : 'none',
              opacity: isDisabled ? 0.2 : 1,
            };

            // Apply text shadow if enabled (shadow on the arrow symbol itself)
            if (arrowShadowEnabled) {
              baseStyle.textShadow = `${arrowShadowOffsetX}px ${arrowShadowOffsetY}px ${arrowShadowBlur}px ${arrowShadowColor}`;
            }

            // Apply border if enabled
            if (arrowBorderEnabled) {
              baseStyle.border = `${arrowBorderWidth}px solid ${isDisabled ? '#888888' : arrowBorderColor}`;
            }

            return baseStyle;
          };

          // Always render arrows if auto navigation is enabled and we have auto elements
          // Visibility is now controlled by animated opacity instead of conditional rendering
          if (experienceSettingsFromApp?.autoNavigationEnabled && autoElements.length > 0) {
            return (
              <>
                {/* Previous Arrow - Styled */}
                <animated.button
                  onClick={handleAutoPrevious}
                  style={{
                    ...generateArrowStyle(isAutoScrolling || currentAutoIndex <= 0),
                    left: '20px',
                    transform: prevArrowSpring.scale.to((s: number) => `translateY(-50%) scale(${s})`),
                    opacity: arrowOpacity,
                    transition: 'opacity 0.4s ease-in-out',
                    pointerEvents: arrowsVisible ? 'auto' : 'none',
                  }}
                  disabled={isAutoScrolling || currentAutoIndex <= 0}
                >
                  &#8592;
                </animated.button>

                {/* Next Arrow - Styled */}
                <animated.button
                  onClick={handleAutoNext}
                  style={{
                    ...generateArrowStyle(isAutoScrolling || currentAutoIndex >= autoElements.length - 1),
                    right: '20px',
                    transform: nextArrowSpring.scale.to((s: number) => `translateY(-50%) scale(${s})`),
                    opacity: arrowOpacity,
                    transition: 'opacity 0.4s ease-in-out',
                    pointerEvents: arrowsVisible ? 'auto' : 'none',
                  }}
                  disabled={isAutoScrolling || currentAutoIndex >= autoElements.length - 1}
                >
                  &#8594;
                </animated.button>


              </>
            );
          } else {
            if (focusedImage) {
              console.log('[AUTO_NAV_DEBUG] 🖼️ HIDING AUTO ARROWS - Scrapbook image is focused');
            } else {
              console.log('[AUTO_NAV_DEBUG] ❌ NO AUTO ELEMENTS - Checking elementsFromBlueprint');
              console.table(elementsFromBlueprint.map(el => ({ 
                id: el.id, 
                type: el.type, 
                name: el.name, 
                autoSequence: el.autoSequence,
                hasAutoSequence: 'autoSequence' in el
              })));
            }
            
                          // Only show "No Auto Elements Found" message if there are truly no auto elements
              // Don't show it when arrows are hidden due to focused scrapbook image
              if (!focusedImage && autoElements.length === 0) {
                return (
                  <div
                    style={{
                      position: 'fixed',
                      top: '10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 2000,
                      backgroundColor: 'rgba(255, 140, 0, 0.9)',
                      color: 'white',
                      padding: '15px 25px',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      maxWidth: '400px',
                    }}
                  >
                    ⚠️ No Auto Elements Found<br/>
                    <small style={{ fontSize: '12px', fontWeight: 'normal' }}>
                      Check setup page and click "Save Configuration"
                    </small>
                  </div>
                );
              }
              
              // If scrapbook image is focused, return null (hide arrows without warning message)
              return null;
          }
        })()}
      </>
    </UserInfoProvider>
  );
};

export default GuestExperience; 