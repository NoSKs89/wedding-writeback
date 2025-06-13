import React, { useState, useEffect, useRef, useMemo, useCallback, CSSProperties } from 'react';
import { Parallax, ParallaxLayer } from '@react-spring/parallax';
import { Leva } from 'leva';
import { useSpring, animated } from 'react-spring';
import { useDrag } from '@use-gesture/react';
import RSVPForm from '../RSVPForm';
import InteractiveScrapbook from './InteractiveScrapbook';
import { useLevaStore } from '../../stores/levaStore';
import { useIsMobile } from '../../utils/deviceDetect';
import ShiftingBackgroundColors from './ShiftingBackgroundColors';
import '../../App.css';
import { fontFamilyOptions, isGoogleFont, FontObject } from '../../config/fontConfig';
import FontGrabber from '../FontGrabber';
import { springConfigPresets, weddingColorSchemes, overallControlsSchemaDefinitionGuest, SpringConfigPreset, WeddingColorScheme } from '../../config/levaSchemas';
import ElementWrapper, { ElementWrapperProps } from '../ElementWrapper';
import { useTrackedControls } from '../../hooks/useTrackedControls.tsx';
import { IParallax, ParallaxLayerProps } from '@react-spring/parallax';
import { ElementConfig, ExperienceSettings as ExperienceSettingsType, TimelineMarker } from '../../types';
import { shallow } from 'zustand/shallow';

// --- Type Definitions ---
interface WeddingData {
  id: string; // Added to satisfy RSVPForm props
  initialElementLayouts: any;
  scrapbookImages: any[];
  scrapbookImageFolder: string;
  rsvpEndpoint: string;
  // Add other properties from weddingDataFromApp as needed
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
  isSetupMode?: boolean;
  forceMobileView?: boolean;
  onControlChange?: () => void;
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

// --- Helper functions ---
const parseRotationFromStyle = (transformString: string | number | undefined): number => {
  if (typeof transformString === 'number') return transformString;
  if (!transformString) return 0;
  const rotateMatch = transformString.match(/rotate\(([-\d.]+)deg\)/);
  return rotateMatch && rotateMatch[1] ? parseFloat(rotateMatch[1]) : 0;
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
  leftPx -= (vw * offsetXvw / 100);
  return { top: topPx, left: leftPx };
};
// --- End Helper functions ---

const GuestExperience: React.FC<GuestExperienceProps> = ({ weddingDataFromApp, experienceSettingsFromApp, weddingIdFromApp, defaultLayoutSlotToLoad, isSetupMode = false, forceMobileView = false, onControlChange = () => {} }) => {
  const isActuallyMobile = useIsMobile();
  const isMobile = forceMobileView || isActuallyMobile;

  // --- Core State ---
  const [weddingData, setWeddingData] = useState<WeddingData>(weddingDataFromApp);
  const [experienceSettings, setExperienceSettings] = useState<ExperienceSettingsType>(experienceSettingsFromApp);
  const [currentWeddingId, setCurrentWeddingId] = useState<string | null>(weddingIdFromApp);
  const [scrollY, setScrollY] = useState(0);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 700);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const parallaxRef = useRef<IParallax>(null);
  const rsvpFormRef = useRef<HTMLDivElement>(null);
  const [currentSavingToSlot, setCurrentSavingToSlot] = useState(defaultLayoutSlotToLoad || 1);

  // --- Leva/Zustand Integration ---
  const controlValues = useLevaStore((state) => state.controlValues);
  const levaSetters = useLevaStore((state) => state.levaSetters);
  const schemas = useLevaStore((state) => state.schemas);

  useEffect(() => {
    if (weddingDataFromApp && weddingDataFromApp.initialElementLayouts) {
      useLevaStore.getState().loadSettingsFromDB(weddingDataFromApp.initialElementLayouts, defaultLayoutSlotToLoad);
    } else {
      useLevaStore.getState().switchPreviewingSlot(currentWeddingId!, isMobile ? 'mobile' : 'desktop', defaultLayoutSlotToLoad || 1);
    }
    setCurrentSavingToSlot(defaultLayoutSlotToLoad || 1);
  }, [weddingDataFromApp, defaultLayoutSlotToLoad, currentWeddingId, isMobile]);

  const TOTAL_PAGES = useMemo(() => {
    return (experienceSettings?.timelineLength > 0 && windowHeight > 0 
      ? Math.max(1.1, experienceSettings.timelineLength / windowHeight) 
      : 3);
  }, [experienceSettings?.timelineLength, windowHeight]);

  const scrollPercentage = useMemo(() => {
    if (TOTAL_PAGES > 1 && windowHeight > 0) {
      const totalScrollableHeight = (TOTAL_PAGES - 1) * windowHeight;
      if (totalScrollableHeight <= 0) return 0;
      return Math.min(1, Math.max(0, scrollY / totalScrollableHeight));
    }
    return 0;
  }, [scrollY, windowHeight, TOTAL_PAGES]);

  // --- Leva Controls & HUD ---
  const overallControlsSchemaGuest = useMemo(() => overallControlsSchemaDefinitionGuest(isSetupMode), [isSetupMode]);
  
  // Correct way using the new hook that integrates with Zustand
  const overallControlsGuest = useTrackedControls(
    'Overall Controls (Guest)',
    overallControlsSchemaGuest,
    { collapsed: true, hidden: !isSetupMode }
  );

  const overallControlsGuestValues = overallControlsGuest?.values || {};
  const {
    showHUD: showGlobalHUDEnabledGuest = false,
    springPreset: selectedSpringPresetKeyGuest = 'default',
    colorScheme: selectedColorSchemeName = weddingColorSchemes[0].name,
    overallFontFamily = fontFamilyOptions[0],
    previewingLayoutSlot = defaultLayoutSlotToLoad || 1,
    saveToLayoutSlot = defaultLayoutSlotToLoad || 1
  } = overallControlsGuestValues;

  const prodSlotForView = isMobile 
    ? (experienceSettings?.defaultLayoutSlotMobile || 'N/A') 
    : (experienceSettings?.defaultLayoutSlotDesktop || 'N/A');

  const activeSpringConfigGuest: SpringConfigPreset = springConfigPresets[selectedSpringPresetKeyGuest as keyof typeof springConfigPresets] || springConfigPresets.default;
  const selectedColorScheme: WeddingColorScheme = weddingColorSchemes.find(scheme => scheme.name === selectedColorSchemeName) || weddingColorSchemes[0];

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const saveLayoutButtonRef = useRef<HTMLButtonElement>(null);
  const [saveLayoutButtonHeight, setSaveLayoutButtonHeight] = useState(0);
  useEffect(() => { 
    if (saveLayoutButtonRef.current) setSaveLayoutButtonHeight(saveLayoutButtonRef.current.offsetHeight + 10);
  }, [isSetupMode, showGlobalHUDEnabledGuest]);

  const centerStyle: CSSProperties = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    width: '100%',
  }), []);

  // --- Focused Image Logic State ---
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

  // --- Animation Hooks ---
  const backdropSpring = useSpring({ 
    opacity: focusedImage ? 1 : 0, 
    pointerEvents: focusedImage ? 'auto' : 'none',
    config: activeSpringConfigGuest
  });

  const [focusedImageContainerSpring, focusedImageApi] = useSpring(() => ({ 
    opacity: 0, 
    top: '50%', left: '50%', 
    width: '0px', height: '0px', 
    transform: 'translate(-50%, -50%) rotate(0deg) scale(0.5)', 
    config: activeSpringConfigGuest
  }));

  const infoBoxSpring = useSpring({ 
    opacity: focusedImage ? 1 : 0, 
    transform: focusedImage ? 'translateY(0px)' : 'translateY(20px)', 
    config: activeSpringConfigGuest,
    delay: focusedImage ? 300 : 0 
  });

  const bindFocusedImageDrag = useDrag(
    ({ last, movement: [mx], velocity: [vx], direction: [dx], event }) => {
      event?.stopPropagation();
      if (!focusedImage || !last) return;
      const viewportWidth = windowWidth;
      if (Math.abs(mx) > viewportWidth / 4 || Math.abs(vx) > 0.3) {
        const syntheticEvent = { stopPropagation: () => {} };
        if (dx > 0) handlePreviousImage(syntheticEvent); 
        else if (dx < 0) handleNextImage(syntheticEvent);
      }
    },
    { axis: 'x', filterTaps: true, enabled: !!focusedImage }
  );

  // --- Dynamic Content Calculation ---
  const { elements: elementsFromProps = [] } = experienceSettings || {};
  const renderableElements: ElementDefinition[] = useMemo(() => {
    if (!experienceSettings || !experienceSettings.elements || !experienceSettings.markers) return [];
    const pageMultiplier = TOTAL_PAGES > 1 ? TOTAL_PAGES - 1 : 0;
    return experienceSettings.elements.map((element): ElementDefinition | null => {
      if (!element || !element.id) return null; // Strategy 2: Guard clause
      const startMarker = experienceSettings.markers.find(m => m.elementId === element.id && m.type === 'start');
      const endMarker = experienceSettings.markers.find(m => m.elementId === element.id && m.type === 'end');
      if (!startMarker || !endMarker || element.type === 'empty') return null;
      const pageOffset = startMarker.position * pageMultiplier;
      const endPageOffset = endMarker.position * pageMultiplier;
      const actualEndPage = Math.max(pageOffset + (pageOffset < pageMultiplier ? 0.1 : 0), endPageOffset);
      return { ...element, key: `ge-el-${element.id}`, sticky: { start: pageOffset, end: actualEndPage }, pageOffset };
    }).filter((el): el is ElementDefinition => el !== null);
  }, [experienceSettings, TOTAL_PAGES]);

  const isScrapbookEnabled = useMemo(() => renderableElements.some(el => el.type === 'component' && el.name === 'Scrapbook'), [renderableElements]);
  const scrapbookElement = useMemo(() => renderableElements.find(el => el.type === 'component' && el.name === 'Scrapbook'), [renderableElements]);
  const rsvpElement = useMemo(() => renderableElements.find(el => el.type === 'component' && el.name === 'RSVP Form'), [renderableElements]);
  const [displayedImagesAndTheirData, setDisplayedImagesAndTheirData] = useState<DisplayedImage[]>([]);

  // --- Handlers ---
  const handleSaveConfiguration = () => {
    if (!currentWeddingId) {
      setSaveErrorMessage('Cannot save: Wedding ID is missing.');
      setTimeout(() => setSaveErrorMessage(null), 5000);
      return;
    }
    setShowSaveConfirm(true);
  };

  const confirmSave = async () => {
    setShowSaveConfirm(false);
    setIsSaving(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    const viewType = isMobile ? 'mobile' : 'desktop';
    try {
      await useLevaStore.getState().saveSettingsToServer(currentWeddingId!, viewType, currentSavingToSlot);
      setSaveSuccessMessage(`Layout for ${viewType} view (Slot ${currentSavingToSlot}) saved successfully!`);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (error: any) {
      const errorMsg = error.message || (error.response?.data?.message) || 'Unknown error';
      setSaveErrorMessage(`Failed to save layout to Slot ${currentSavingToSlot}. Error: ${errorMsg}`);
      setTimeout(() => setSaveErrorMessage(null), 7000);
    }
    setIsSaving(false);
  };

  const cancelSave = () => setShowSaveConfirm(false);
  const handleDisplayedImagesUpdate = useCallback((newImageData: DisplayedImage[]) => setDisplayedImagesAndTheirData(newImageData), []);

  useEffect(() => {
    let isMounted = true;
    if (!isScrapbookEnabled || !weddingData?.scrapbookImages?.length) {
      if (isMounted) setImageNaturalDimensions([]);
      return;
    }
    const imagePaths = weddingData.scrapbookImages.map((img: any) => {
      if (img.fileName?.startsWith('http')) return img.fileName;
      const folder = weddingData.scrapbookImageFolder.endsWith('/') ? weddingData.scrapbookImageFolder : weddingData.scrapbookImageFolder + '/';
      return folder + (img.fileName.startsWith('/') ? img.fileName.substring(1) : img.fileName);
    });
    const dimsPromises = imagePaths.map((src: string) => new Promise<NaturalImageDimensions>(resolve => {
      if (!src) return resolve({ width: 0, height: 0, src: '' });
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, src });
      img.onerror = () => resolve({ width: 0, height: 0, src });
      img.src = src;
    }));
    Promise.all(dimsPromises).then(dims => {
        if (isMounted) setImageNaturalDimensions(dims);
    });
    return () => { isMounted = false; };
  }, [isScrapbookEnabled, weddingData]);

  // --- Main Animation Orchestration useEffect ---
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
    let returnTimeoutId: NodeJS.Timeout | null = null;
    if (focusedImage) {
      const { targetWidth, targetHeight } = calculateFocusTargetDimensions(focusedImage.naturalWidth, focusedImage.naturalHeight, windowWidth, windowHeight);
      const { top, left } = getCenteredPosition(targetWidth, targetHeight, 1.5);
      focusedImageApi.start({
        from: { opacity: 0.5, top: `${focusedImage.initialTopPx}px`, left: `${focusedImage.initialLeftPx}px`, width: `${focusedImage.initialWidthPx}px`, height: `${focusedImage.initialHeightPx}px`, transform: `translate(0px, 0px) rotate(${focusedImage.initialRotateDeg}deg) scale(1)` },
        to: { opacity: 1, top: `${top}px`, left: `${left}px`, width: `${targetWidth}px`, height: `${targetHeight}px`, transform: 'translate(0px, 0px) rotate(0deg) scale(1)' },
      });
    } else if (imageReturningToScrapbook) {
      const { currentIndex, initialWidthPx, initialHeightPx } = imageReturningToScrapbook;
      const targetEl = scrapbookImageRefs.current[currentIndex];
      const itemData = displayedImagesAndTheirData.find(d => d.displayIndex === currentIndex);
      if (targetEl && itemData) {
        const rect = targetEl.getBoundingClientRect();
        const baseRot = parseRotationFromStyle(itemData.initialStyle.transform);
        const dynamicRot = Math.sin(scrollY * (itemData.itemScrollSensitivity || 0) + currentIndex * 0.5) * (itemData.itemDynamicRotationRange || 0);
        focusedImageApi.start({
          to: { top: `${rect.top}px`, left: `${rect.left}px`, width: `${initialWidthPx}px`, height: `${initialHeightPx}px`, transform: `translate(0px, 0px) rotate(${baseRot + dynamicRot}deg) scale(1)` },
          onRest: () => {
            const currentReturning = imageReturningToScrapbookRef.current;
            setImageReturningToScrapbook(null);
            if (currentReturning) setLastPutDownIndex(currentReturning.currentIndex);
            const pending = pendingImageToFocusRef.current;
            if (pending) { setFocusedImage(pending); setPendingImageToFocus(null); }
          }
        });
        focusedImageApi.start({ to: { opacity: 0 }, config: { tension: 300, friction: 20 } });
      } else {
        focusedImageApi.start({ opacity: 0, immediate: true });
        setImageReturningToScrapbook(null);
        if (pendingImageToFocus) { setFocusedImage(pendingImageToFocus); setPendingImageToFocus(null); }
      }
    } else {
      focusedImageApi.start({ opacity: 0, immediate: true });
    }
    return () => {
        if (returnTimeoutId) clearTimeout(returnTimeoutId);
    };
  }, [focusedImage, imageReturningToScrapbook, pendingImageToFocus, focusedImageApi, windowWidth, windowHeight, displayedImagesAndTheirData, scrollY, activeSpringConfigGuest]);

  // --- Leva Effects for Color/Font Sync ---
  useEffect(() => {
    if (!selectedColorScheme || !elementsFromProps.length || !levaSetters || !schemas) return;
    const colors = [selectedColorScheme.primary, selectedColorScheme.secondary, selectedColorScheme.accent].filter(Boolean) as string[];
    if (colors.length === 0) return;
    elementsFromProps.forEach(el => {
      if (el.type === 'text') {
        const folderName = `element_${el.id}_${el.name ? el.name.replace(/\s+/g, '_') : el.type.replace(/\s+/g, '_')}`;
        const setter = levaSetters[folderName];
        if (setter && schemas[folderName]?.textColor) setter({ textColor: colors[Math.floor(Math.random() * colors.length)] });
      }
    });
  }, [selectedColorScheme, elementsFromProps, levaSetters, schemas]);

  useEffect(() => {
    if (!overallFontFamily || !elementsFromProps.length || !levaSetters || !schemas) return;
    elementsFromProps.forEach(el => {
      if (el.type === 'text') {
        const folderName = `element_${el.id}_${el.name ? el.name.replace(/\s+/g, '_') : el.type.replace(/\s+/g, '_')}`;
        const setter = levaSetters[folderName];
        if (setter && schemas[folderName]?.fontFamily && controlValues[folderName]?.fontFamily !== overallFontFamily) {
          setter({ fontFamily: overallFontFamily });
        }
      }
    });
  }, [overallFontFamily, elementsFromProps, levaSetters, schemas, controlValues]);

  // --- Event Handlers (Resize, Scroll) ---
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const parallaxContainer = parallaxRef.current?.container.current;
    if (!parallaxContainer) return;
    const handleScroll = () => setScrollY(parallaxContainer.scrollTop);
    parallaxContainer.addEventListener('scroll', handleScroll);
    return () => parallaxContainer.removeEventListener('scroll', handleScroll);
  }, [parallaxRef.current]);

  // --- Focused Image Handlers ---
  const handleCloseFocusedImage = useCallback((e: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isScrapbookEnabled) return;
    if (focusedImage) {
      setImageReturningToScrapbook(focusedImage);
      setFocusedImage(null);
      setPendingImageToFocus(null);
    } else {
      setImageReturningToScrapbook(null);
      setFocusedImage(null);
      setPendingImageToFocus(null);
      focusedImageApi.start({ opacity: 0, immediate: true });
    }
  }, [isScrapbookEnabled, focusedImage, focusedImageApi]);

  const updateAndFocusNewImage = useCallback((newDisplayIndex: number): FocusedImageState | null => {
    if (!isScrapbookEnabled || !displayedImagesAndTheirData?.length) return null;
    if (newDisplayIndex < 0 || newDisplayIndex >= displayedImagesAndTheirData.length) return null;
    const targetData = displayedImagesAndTheirData.find(d => d.displayIndex === newDisplayIndex);
    const targetEl = scrapbookImageRefs.current[newDisplayIndex];
    if (!targetData || !targetEl) return null;
    let naturalDims = imageNaturalDimensions.find(dim => dim.src === targetData.src);
    if (!naturalDims?.width) {
        if (targetEl.naturalWidth > 0) {
            naturalDims = { width: targetEl.naturalWidth, height: targetEl.naturalHeight, src: targetData.src };
        }
        else return null;
    }
    const rect = targetEl.getBoundingClientRect();
    const baseRot = parseRotationFromStyle(targetData.initialStyle.transform);
    const dynamicRot = Math.sin(scrollY * (targetData.itemScrollSensitivity || 0) + newDisplayIndex * 0.5) * (targetData.itemDynamicRotationRange || 0);
    return {
      ...targetData,
      initialTopPx: rect.top, initialLeftPx: rect.left,
      initialWidthPx: rect.width, initialHeightPx: rect.height,
      initialRotateDeg: baseRot + dynamicRot,
      naturalWidth: naturalDims.width, naturalHeight: naturalDims.height,
      currentIndex: newDisplayIndex,
    };
  }, [isScrapbookEnabled, displayedImagesAndTheirData, imageNaturalDimensions, scrollY]);

  const handlePreviousImage = useCallback((e: React.MouseEvent | { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!focusedImage || !displayedImagesAndTheirData?.length) return;
    const newIndex = (focusedImage.currentIndex - 1 + displayedImagesAndTheirData.length) % displayedImagesAndTheirData.length;
    const newDetails = updateAndFocusNewImage(newIndex);
    if (newDetails) {
      setImageReturningToScrapbook(focusedImage);
      setPendingImageToFocus(newDetails);
      setFocusedImage(null);
    }
  }, [focusedImage, displayedImagesAndTheirData, updateAndFocusNewImage]);

  const handleNextImage = useCallback((e: React.MouseEvent | { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!focusedImage || !displayedImagesAndTheirData?.length) return;
    const newIndex = (focusedImage.currentIndex + 1) % displayedImagesAndTheirData.length;
    const newDetails = updateAndFocusNewImage(newIndex);
    if (newDetails) {
      setImageReturningToScrapbook(focusedImage);
      setPendingImageToFocus(newDetails);
      setFocusedImage(null);
    }
  }, [focusedImage, displayedImagesAndTheirData, updateAndFocusNewImage]);

  const handleImageClick = useCallback((details: any) => {
    if (!isScrapbookEnabled) return;
    const { imageSrc, altText, initialStyle, currentBoundingClientRect: rect, imageElement, index } = details;
    let naturalDims = imageNaturalDimensions.find(dim => dim.src === imageSrc);
    if (!naturalDims?.width) {
        if (imageElement?.naturalWidth > 0) {
            naturalDims = { width: imageElement.naturalWidth, height: imageElement.naturalHeight, src: imageSrc };
        }
        else return;
    }
    const itemData = displayedImagesAndTheirData.find(d => d.displayIndex === index);
    if (!itemData) return;
    const baseRot = parseRotationFromStyle(initialStyle.transform);
    const dynamicRot = Math.sin(scrollY * (itemData.itemScrollSensitivity || 0) + index * 0.5) * (itemData.itemDynamicRotationRange || 0);
    const clickedDetails: FocusedImageState = {
      ...itemData,
      initialTopPx: rect.top, initialLeftPx: rect.left,
      initialWidthPx: rect.width, initialHeightPx: rect.height,
      initialRotateDeg: baseRot + dynamicRot,
      naturalWidth: naturalDims.width, naturalHeight: naturalDims.height,
      currentIndex: index
    };
    if (focusedImage) {
      setImageReturningToScrapbook(focusedImage);
      setPendingImageToFocus(clickedDetails);
      setFocusedImage(null);
    } else {
      setFocusedImage(clickedDetails);
    }
  }, [isScrapbookEnabled, imageNaturalDimensions, displayedImagesAndTheirData, scrollY, focusedImage]);

  // --- Leva Slot Syncing ---
  const switchPreviewingSlotInStore = useLevaStore(state => state.switchPreviewingSlot);
  useEffect(() => {
    if (previewingLayoutSlot !== useLevaStore.getState().currentPreviewingSlot) {
      switchPreviewingSlotInStore(currentWeddingId!, isMobile ? 'mobile' : 'desktop', previewingLayoutSlot);
    }
  }, [previewingLayoutSlot, currentWeddingId, isMobile, switchPreviewingSlotInStore]);
  
  useEffect(() => {
    const overallControlsSetter = levaSetters['Overall Controls (Guest)'];
    if (overallControlsSetter) {
      overallControlsSetter({ saveToLayoutSlot: previewingLayoutSlot });
    }
  }, [previewingLayoutSlot, levaSetters]);

  useEffect(() => {
    if (typeof saveToLayoutSlot === 'number') setCurrentSavingToSlot(saveToLayoutSlot);
  }, [saveToLayoutSlot]);
  
  const googleFontsToLoad: FontObject[] = useMemo(() => {
    const fonts = new Set<string>();
    if (overallFontFamily && isGoogleFont(overallFontFamily as string)) fonts.add((overallFontFamily as string).split(',')[0].trim());
    elementsFromProps.forEach(el => {
      if (el.type === 'text') {
        const folderName = `element_${el.id}_${el.name ? el.name.replace(/\s+/g, '_') : el.type.replace(/\s+/g, '_')}`;
        const textFont = controlValues[folderName]?.fontFamily;
        if (textFont && isGoogleFont(textFont)) fonts.add(textFont.split(',')[0].trim());
      }
    });
    return Array.from(fonts).map(name => ({ name }));
  }, [overallFontFamily, elementsFromProps, controlValues]);

  return (
    <>
      <Leva hidden={!isSetupMode} />
      <FontGrabber fonts={googleFontsToLoad} />

      {isSetupMode && (
        <div style={{ position: 'fixed', top: '10px', left: '10px', zIndex: 10001, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <button ref={saveLayoutButtonRef} onClick={handleSaveConfiguration} disabled={isSaving || showSaveConfirm}
            style={{ padding: '10px 15px', fontSize: '0.9rem', color: 'white', backgroundColor: isSaving ? '#cf5200' : (showSaveConfirm ? '#ffc107' : '#007bff'), border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            {isSaving ? 'Saving...' : 'Save Layout'}
          </button>
          {saveSuccessMessage && <div style={{color: 'lime', background: 'rgba(0,0,0,0.7)', padding: '5px', borderRadius: '3px'}}>{saveSuccessMessage}</div>}
          {saveErrorMessage && <div style={{color: 'red', background: 'rgba(0,0,0,0.7)', padding: '5px', borderRadius: '3px'}}>{saveErrorMessage}</div>}
        </div>
      )}
      {showSaveConfirm && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '20px', borderRadius: '8px', zIndex: 10002, textAlign: 'center' }}>
          <p>Overwrite Layout Slot {currentSavingToSlot}?</p>
          <button onClick={confirmSave} style={{ padding: '8px 15px', margin: '0 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}>Yes, Save</button>
          <button onClick={cancelSave} style={{ padding: '8px 15px', margin: '0 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px' }}>Cancel</button>
        </div>
      )}

      {isSetupMode && showGlobalHUDEnabledGuest && (
        <div style={{ position: 'fixed', top: `${saveLayoutButtonHeight}px`, left: '10px', zIndex: 10000, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px', borderRadius: '0 0 5px 5px', fontSize: '13px', fontFamily: 'monospace' }}>
          <div>ScrollY: {scrollY.toFixed(0)} | %: {(scrollPercentage * 100).toFixed(1)}</div>
          <div>Previewing: {previewingLayoutSlot} | Saving to: {currentSavingToSlot} | Prod: {prodSlotForView}</div>
        </div>
      )}

      <div style={{ width: '100%', height: '100vh', background: '#f0f0f0' }}>
        <Parallax ref={parallaxRef} pages={TOTAL_PAGES} style={{ top: '0', left: '0', pointerEvents: (focusedImage || imageReturningToScrapbook) ? 'none' : 'auto' }}>
          
          <ParallaxLayer offset={0} speed={0} factor={TOTAL_PAGES} style={{ zIndex: -20 }}>
            <ShiftingBackgroundColors scrollY={scrollY} TOTAL_PAGES={TOTAL_PAGES} windowHeight={windowHeight} selectedColorScheme={selectedColorScheme} />
          </ParallaxLayer>

          {renderableElements
            .filter(element => element && element.id)
            .map((element) => {
            let contentToRender;
            switch (element.type) {
              case 'text': contentToRender = <h2>{element.content}</h2>; break;
              case 'photo': contentToRender = <img src={element.content} alt={element.name || 'Wedding photo'} style={{ maxWidth: '80%', maxHeight: '80vh', borderRadius: '8px' }} />; break;
              case 'background-image': contentToRender = <div style={{ width: '100%', height: '100%', backgroundImage: `url(${element.content})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />; break;
              default: return null;
            }
            return (
              <ParallaxLayer key={element.key} sticky={element.sticky as ParallaxLayerProps['sticky']} style={{ ...centerStyle, zIndex: element.type === 'background-image' ? -5 : (experienceSettings.elements.length - element.id + 1) }}>
                <ElementWrapper element={element} experienceSettings={experienceSettings} scrollY={scrollY} windowHeight={windowHeight} TOTAL_PAGES={TOTAL_PAGES} onControlChange={onControlChange}>
                  {contentToRender}
                </ElementWrapper>
              </ParallaxLayer>
            );
          }).filter(Boolean)}

          {rsvpElement && (
            <ParallaxLayer offset={rsvpElement.pageOffset} sticky={rsvpElement.sticky as ParallaxLayerProps['sticky']} speed={rsvpElement.speed || 0.5} style={{ ...centerStyle, zIndex: 150, pointerEvents: 'none' }}>
              <ElementWrapper element={rsvpElement} experienceSettings={experienceSettings} scrollY={scrollY} windowHeight={windowHeight} TOTAL_PAGES={TOTAL_PAGES} onControlChange={onControlChange}>
                <RSVPForm ref={rsvpFormRef} weddingData={weddingData} backendUrl={weddingData.rsvpEndpoint} />
              </ElementWrapper>
            </ParallaxLayer>
          )}

          {scrapbookElement && (
            <ParallaxLayer offset={scrapbookElement.pageOffset} sticky={scrapbookElement.sticky as ParallaxLayerProps['sticky']} speed={scrapbookElement.speed || 0.2} style={{ ...centerStyle, zIndex: 100, pointerEvents: 'auto' }}>
              <InteractiveScrapbook weddingData={weddingData} config={scrapbookElement.content} scrollY={scrollY} onImageClick={handleImageClick} focusedImageGlobal={focusedImage} imageReturningToScrapbookGlobal={imageReturningToScrapbook} lastPutDownIndexGlobal={lastPutDownIndex} scrapbookImageRefs={ scrapbookImageRefs} onDisplayedImagesUpdate={handleDisplayedImagesUpdate} windowWidth={windowWidth} windowHeight={windowHeight} />
            </ParallaxLayer>
          )}
        </Parallax>
      </div>

      <>
        <animated.div style={{ ...backdropSpring, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.7)', zIndex: 1000 } as any} onClick={handleCloseFocusedImage} />
        {isScrapbookEnabled && (focusedImage || imageReturningToScrapbook) && (
          <animated.div {...bindFocusedImageDrag()} style={{ ...focusedImageContainerSpring, zIndex: 1001, position: 'fixed', touchAction: 'none' } as any}>
            {(focusedImage || imageReturningToScrapbook) && (
              <div onClick={e => e.stopPropagation()} style={{ pointerEvents: 'auto', width: '100%', height: '100%', position: 'relative' }}>
                <img src={focusedImage?.src || imageReturningToScrapbook?.src} alt={focusedImage?.altText || imageReturningToScrapbook?.altText}
                  style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', boxShadow: '0px 10px 30px rgba(0,0,0,0.5)', border: '10px solid white', borderRadius: '3px' }}
                />
                {focusedImage && (
                  <>
                    <button onClick={handlePreviousImage} style={{ position: 'fixed', top: '50%', left: '20px', zIndex: 1002, transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer' }}>&#8592;</button>
                    <button onClick={handleNextImage} style={{ position: 'fixed', top: '50%', right: '20px', zIndex: 1002, transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer' }}>&#8594;</button>
                    <animated.div style={{ ...infoBoxSpring, position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 1002, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '10px 20px', borderRadius: '5px', textAlign: 'center' } as any}>
                      <p style={{ margin: 0 }}>{focusedImage.altText}</p>
                      {focusedImage.description && <p style={{ margin: '5px 0 0', fontSize: '0.8em' }}>{focusedImage.description}</p>}
                    </animated.div>
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
