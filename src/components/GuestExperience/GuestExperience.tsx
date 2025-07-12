import React, { useState, useEffect, useRef, useMemo, useCallback, CSSProperties } from 'react';
import { Parallax, ParallaxLayer, IParallax, ParallaxLayerProps } from '@react-spring/parallax';
import { useControls, folder } from 'leva';
import { useSpring, animated } from 'react-spring';
import { useDrag } from '@use-gesture/react';

import RSVPForm from '../RSVPForm';
import InteractiveScrapbook from './InteractiveScrapbook';
import ShiftingBackgroundColors from './ShiftingBackgroundColors';
import BottomNavbar from './BottomNavbar';
import FontGrabber from '../FontGrabber';
import ElementWrapper from '../ElementWrapper';
import { useLevaStore } from '../../stores/levaStore';
import { useIsMobile } from '../../utils/deviceDetect';
import { useSetupMode } from '../../contexts/SetupModeContext';
import { fontFamilyOptions, isGoogleFont, FontObject } from '../../config/fontConfig';
import { springConfigPresets, weddingColorSchemes, overallControlsSchemaDefinitionGuest, SpringConfigPreset, WeddingColorScheme, parallaxPhysicsPresets, ParallaxPhysicsPreset, animationCurves } from '../../config/levaSchemas';
import { generateElementFolderName, getElementSchema } from './levaSchemas';
import { ElementConfig, ExperienceSettings as ExperienceSettingsType, TimelineMarker } from '../../types';
import { getApiBaseUrl } from '../../config/apiConfig';
import '../../App.css';


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
      background: `linear-gradient(135deg, ${selectedColorScheme.colors.background} 0%, ${selectedColorScheme.colors.primary} 100%)`,
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
          border: `4px solid ${selectedColorScheme.colors.secondary}40`,
          borderTop: `4px solid ${selectedColorScheme.colors.secondary}`,
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
        backgroundColor: `${selectedColorScheme.colors.secondary}20`,
        borderRadius: '3px',
        overflow: 'hidden',
        margin: '0 0 15px 0',
      }}>
        <div style={{
          width: `${progressPercentage}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${selectedColorScheme.colors.secondary}, ${selectedColorScheme.colors.accent})`,
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

  // --- MEMOIZED DERIVED DATA ---
  const { elements: elementsFromBlueprint = [], markers: markersFromBlueprint = [] } = experienceSettingsFromApp || {};
  const TOTAL_PAGES = useMemo(() => (experienceSettingsFromApp?.timelineLength > 0 && windowHeight > 0 ? Math.max(1.1, experienceSettingsFromApp.timelineLength / windowHeight) : 3), [experienceSettingsFromApp?.timelineLength, windowHeight]);

  const renderableElements: ElementDefinition[] = useMemo(() => {
    if (!elementsFromBlueprint.length || !markersFromBlueprint.length) return [];
    const pageMultiplier = TOTAL_PAGES > 1 ? TOTAL_PAGES - 1 : 0;
    return elementsFromBlueprint.map((element): ElementDefinition | null => {
      if (!element || !element.id || element.type === 'empty') return null;
      const startMarker = markersFromBlueprint.find(m => m.elementId === element.id && m.type === 'start');
      const endMarker = markersFromBlueprint.find(m => m.elementId === element.id && m.type === 'end');
      if (!startMarker || !endMarker) return null;
      const pageOffset = startMarker.position * pageMultiplier;
      const endPageOffset = endMarker.position * pageMultiplier;
      const actualEndPage = Math.max(pageOffset + 0.1, endPageOffset);
      return { ...element, key: `ge-el-${element.id}`, sticky: { start: pageOffset, end: actualEndPage }, pageOffset };
    }).filter((el): el is ElementDefinition => el !== null);
  }, [elementsFromBlueprint, markersFromBlueprint, TOTAL_PAGES]);

  // --- OVERALL CONTROLS ---
  const [overallControls, setOverallControls] = useControls(() => ({
    'Overall Controls (Guest)': folder({
        showHUD: { value: false, label: 'Show Debug HUD (Guest)' },
        springPreset: { value: 'default', options: Object.keys(springConfigPresets), label: 'Scrapbook Image Physics (Guest)' },
        parallaxPhysicsPreset: { value: 'default', options: Object.keys(parallaxPhysicsPresets), label: 'Parallax Physics Preset (Guest)' },
        colorScheme: { value: weddingColorSchemes[0].name, options: weddingColorSchemes.map(scheme => scheme.name), label: 'Color Scheme' },
        overallFontFamily: { value: fontFamilyOptions[0], options: fontFamilyOptions, label: 'Global Font Family' },
        previewingLayoutSlot: { value: defaultLayoutSlotToLoad, options: [1, 2, 3, 4, 5], label: 'Previewing Layout Slot' },
        saveToLayoutSlot: { value: defaultLayoutSlotToLoad, options: [1, 2, 3, 4, 5], label: 'Save to Layout Slot' },
    }, { collapsed: true, render: () => isSetupMode }),
  }), [isSetupMode, defaultLayoutSlotToLoad]);
  
  const {
    showHUD: showGlobalHUDEnabledGuest,
    springPreset: selectedSpringPresetKeyGuest,
    parallaxPhysicsPreset: selectedParallaxPhysicsPresetKey,
    colorScheme: selectedColorSchemeName,
    overallFontFamily,
    previewingLayoutSlot,
    saveToLayoutSlot
  } = overallControls;

  // --- LOCAL COMPONENT STATE ---
  const [scrollY, setScrollY] = useState(0);
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  const parallaxRef = useRef<IParallax>(null);

  // Scroll handling for parallax
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const lastScrollY = useRef(0);
  const lastScrollTime = useRef(Date.now());

  // --- PRELOADING STATE ---
  const [isPreloading, setIsPreloading] = useState(true);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [preloadTotal, setPreloadTotal] = useState(0);

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
  const imageReturningToScrapbookRef = useRef(imageReturningToScrapbook);
  const pendingImageToFocusRef = useRef(pendingImageToFocus);
  const scrapbookImageRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => { imageReturningToScrapbookRef.current = imageReturningToScrapbook; }, [imageReturningToScrapbook]);
  useEffect(() => { pendingImageToFocusRef.current = pendingImageToFocus; }, [pendingImageToFocus]);

  // --- DATA LOADING & SLOT SYNC EFFECTS ---
  useEffect(() => {
    console.log(`🚀 GuestExperience: DATA LOADING effect triggered`, {
      timestamp: Date.now(),
      hasInitialElementLayouts: !!weddingDataFromApp?.initialElementLayouts,
      initialElementLayouts: weddingDataFromApp?.initialElementLayouts,
      weddingIdFromApp,
      isMobile,
      defaultLayoutSlotToLoad,
      willCallLoadLayoutSettingsFromDB: !!weddingDataFromApp?.initialElementLayouts,
      willCallSwitchPreviewingSlotInStore: !weddingDataFromApp?.initialElementLayouts && !!weddingIdFromApp
    });
    
    if (weddingDataFromApp?.initialElementLayouts) {
      console.log(`📂 GuestExperience: Calling loadLayoutSettingsFromDB with:`, weddingDataFromApp.initialElementLayouts);
      loadLayoutSettingsFromDB(weddingDataFromApp.initialElementLayouts, defaultLayoutSlotToLoad);
    } else if (weddingIdFromApp) {
      console.log(`🔄 GuestExperience: Calling switchPreviewingSlotInStore for ${isMobile ? 'mobile' : 'desktop'} slot ${defaultLayoutSlotToLoad}`);
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
      setIsPreloading(false);
      return;
    }

    setPreloadTotal(assetsToPreload.length);
    
    const handleProgress = (loaded: number, total: number) => {
      setPreloadProgress(loaded);
    };
    
    const handleComplete = () => {
      setIsPreloading(false);
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
  
  const selectedColorScheme: WeddingColorScheme = weddingColorSchemes.find(scheme => scheme.name === selectedColorSchemeName) || weddingColorSchemes[0];
  
  // Calculate scroll values with parallax physics applied
  const maxScrollableHeight = useMemo(() => (TOTAL_PAGES - 1) * windowHeight, [TOTAL_PAGES, windowHeight]);
  const scrollYWithPhysics = useMemo(() => applyParallaxPhysics(scrollY, maxScrollableHeight), [scrollY, maxScrollableHeight, applyParallaxPhysics]);
  
  const [displayedImagesAndTheirData, setDisplayedImagesAndTheirData] = useState<DisplayedImage[]>([]);
  const isScrapbookEnabled = useMemo(() => renderableElements.some(el => el.type === 'component' && el.name === 'Scrapbook'), [renderableElements]);

  // Register Bottom Navbar controls - simplified approach using existing store values
  const bottomNavbarElement = useMemo(() => renderableElements.find(el => el.type === 'component' && el.name === 'Bottom Navbar'), [renderableElements]);
  const bottomNavbarFolderName = bottomNavbarElement ? generateElementFolderName(bottomNavbarElement) : null;

  // Get the scrapbook element to determine its folder name
  const scrapbookElement = useMemo(() => renderableElements.find(el => el.type === 'component' && el.name === 'Scrapbook'), [renderableElements]);
  const scrapbookFolderName = useMemo(() => scrapbookElement ? generateElementFolderName(scrapbookElement) : null, [scrapbookElement]);
  const showCaptions = scrapbookFolderName ? (controlValues[scrapbookFolderName]?.showCaptions ?? true) : true;

  const centerStyle: CSSProperties = useMemo(() => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', width: '100%' }), []);

  // --- ANIMATION HOOKS ---
  const backdropSpring = useSpring({ opacity: focusedImage ? 1 : 0, pointerEvents: focusedImage ? 'auto' : 'none', config: activeSpringConfigGuest });
  const [focusedImageContainerSpring, focusedImageApi] = useSpring(() => ({ opacity: 0, top: '50%', left: '50%', width: '0px', height: '0px', transform: 'translate(-50%, -50%) rotate(0deg) scale(0.5)', config: activeSpringConfigGuest }));
  const infoBoxSpring = useSpring({ opacity: focusedImage ? 1 : 0, transform: focusedImage ? 'translateY(0px)' : 'translateY(20px)', config: activeSpringConfigGuest, delay: focusedImage ? 300 : 0 });

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
    setShowSaveConfirm(false); setIsSaving(true); setSaveSuccessMessage(null); setSaveErrorMessage(null);
    const viewType = isMobile ? 'mobile' : 'desktop';
    try {
      const layoutSettings = { ...useLevaStore.getState().controlValues, "Overall Controls (Guest)": overallControls };
      await useLevaStore.getState().saveSettingsToServer(weddingIdFromApp, viewType, currentSavingToSlot, layoutSettings);
      setSaveSuccessMessage(`Layout for ${viewType} view saved successfully!`);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (error: any) {
      setSaveErrorMessage(`Failed to save layout. Error: ${error.message || 'Unknown error'}`);
      setTimeout(() => setSaveErrorMessage(null), 7000);
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
      
      lastScrollY.current = currentScrollY;
      lastScrollTime.current = currentTime;
    };
    
    parallaxContainer.addEventListener('scroll', handleScroll);
    return () => parallaxContainer.removeEventListener('scroll', handleScroll);
  }, [parallaxRef.current]);

  const handleDisplayedImagesUpdate = useCallback((newImageData: DisplayedImage[]) => setDisplayedImagesAndTheirData(newImageData), []);

  useEffect(() => {
    let isMounted = true;
    if (!isScrapbookEnabled || !weddingDataFromApp?.scrapbookImages?.length) { if (isMounted) setImageNaturalDimensions([]); return; }
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
  }, [isScrapbookEnabled, weddingDataFromApp]);
  
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

  // --- SHOW LOADING SCREEN DURING PRELOADING ---
  if (isPreloading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: `linear-gradient(135deg, ${selectedColorScheme.colors.background} 0%, ${selectedColorScheme.colors.primary} 100%)`,
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
            border: `4px solid ${selectedColorScheme.colors.secondary}40`,
            borderTop: `4px solid ${selectedColorScheme.colors.secondary}`,
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
          backgroundColor: `${selectedColorScheme.colors.secondary}20`,
          borderRadius: '3px',
          overflow: 'hidden',
          margin: '0 0 15px 0',
        }}>
          <div style={{
            width: `${preloadTotal > 0 ? (preloadProgress / preloadTotal) * 100 : 0}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${selectedColorScheme.colors.secondary}, ${selectedColorScheme.colors.accent})`,
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

        {/* Completion Animation */}
        {preloadProgress >= preloadTotal && preloadTotal > 0 && (
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
  }

  // Add rsvpEndpoint to weddingDataFromApp if it doesn't exist
  const weddingDataWithEndpoint = {
    ...weddingDataFromApp,
    rsvpEndpoint: weddingDataFromApp.rsvpEndpoint || `${getApiBaseUrl()}/rsvp`
  };

  const hasRsvp = renderableElements.some(el => el.type === 'component' && el.name === 'RSVP Form');
  const hasScrapbook = renderableElements.some(el => el.type === 'component' && el.name === 'Scrapbook');

  // --- MAIN RENDER ---
  return (
    <>
      <FontGrabber fonts={googleFontsToLoad} />

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
          height: '100vh', 
          background: selectedColorScheme?.colors?.background || '#1a1a1a',
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
            left: '0', 
            pointerEvents: (focusedImage || imageReturningToScrapbook) ? 'none' : 'auto',
            backgroundColor: selectedColorScheme?.colors?.background || '#1a1a1a',
            // Enhanced hardware acceleration to prevent rendering glitches
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translateZ(0)', // Force GPU acceleration
            WebkitTransform: 'translateZ(0)',
            willChange: 'scroll-position, transform',
            // Hide scrollbars for webkit browsers (Chrome, Safari, most mobile browsers)
            ...(isMobile ? {
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE and Edge
              WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
            } : {})
          }}
        >
          
          {/* Safety background layer to prevent white flashes during scroll */}
          <ParallaxLayer offset={0} speed={0} factor={TOTAL_PAGES} style={{ 
            zIndex: -15, 
            backgroundColor: '#1a1a1a', 
            pointerEvents: 'none',
            // Enhanced GPU acceleration for immediate rendering
            transform: 'translateZ(0)',
            willChange: 'transform',
            backfaceVisibility: 'hidden'
          }}>
          </ParallaxLayer>
          
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
                        display: 'block'
                      }}
                      onError={(e) => console.error('Video playback error:', e)}
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
                          backfaceVisibility: 'hidden' // Prevent rendering glitches
                        }}
                        onError={(e) => console.error('Background video playback error:', e)}
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
                        }}
                      />
                    </div>
                  );
                  break;
                }
                case 'component':
                  if (element.name === 'RSVP Form') {
                    const rsvpFolderName = generateElementFolderName(element);
                    contentToRender = <div style={{ pointerEvents: 'auto' }}><RSVPForm weddingData={weddingDataWithEndpoint} backendUrl={weddingDataWithEndpoint.rsvpEndpoint} styleControlsFromProp={controlValues[rsvpFolderName]} /></div>;
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
                    />;
                  } else if (element.name === 'Bottom Navbar') {
                    // Bottom Navbar renders outside parallax but we need ElementWrapper for controls
                    contentToRender = null; // Will render outside parallax
                  } else { return null; }
                  break;
                default: return null;
              }

              return (
                <ParallaxLayer key={element.key} sticky={element.sticky as ParallaxLayerProps['sticky']} style={{ 
                  ...centerStyle, 
                  zIndex: 
                    element.type === 'background-image' || element.type === 'background-video'
                      ? -5 
                      : element.type === 'component' && element.name === 'Scrapbook' 
                      ? 100 
                      : element.type === 'component' && element.name === 'RSVP Form'
                      ? 150
                      : element.type === 'component' && element.name === 'Bottom Navbar'
                      ? 125
                      : (elementsFromBlueprint.length - (element.id || 0) + 1),
                  pointerEvents: element.type === 'component' && element.name === 'RSVP Form' ? 'none' : 'auto',
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
                    overallFontFamily={overallFontFamily}
                  >
                    {contentToRender}
                  </ElementWrapper>
                </ParallaxLayer>
              );
            }).filter(Boolean)}
        </Parallax>
      </div>

      {/* Render Bottom Navbar outside parallax structure */}
      {(() => {
        const bottomNavbarElements = renderableElements.filter(element => element.type === 'component' && element.name === 'Bottom Navbar');
        
        return bottomNavbarElements.map(element => {
          const folderName = generateElementFolderName(element);
          const bottomNavbarValues = controlValues[folderName] || {};
          
          return (
            <BottomNavbar 
              key={`bottom-navbar-${element.id}`}
              scrollY={scrollYWithPhysics}
              startPosition={element.sticky.start}
              endPosition={element.sticky.end}
              windowHeight={windowHeight}
              TOTAL_PAGES={TOTAL_PAGES}
              styleControls={bottomNavbarValues}
              weddingId={weddingIdFromApp}
              element={element}
              experienceSettings={experienceSettingsFromApp}
              overallFontFamily={overallFontFamily}
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
      </>
    </>
  );
};

export default GuestExperience; 