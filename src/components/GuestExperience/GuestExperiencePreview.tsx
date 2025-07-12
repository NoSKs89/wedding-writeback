import React, { useState, useEffect, useRef, useMemo, useCallback, CSSProperties } from 'react';
import { Parallax, ParallaxLayer, IParallax, ParallaxLayerProps } from '@react-spring/parallax';
import { useSpring, animated } from 'react-spring';
import { useDrag } from '@use-gesture/react';
import { useControls, folder } from 'leva';

import RSVPForm from '../RSVPForm';
import InteractiveScrapbook from './InteractiveScrapbook';
import ShiftingBackgroundColors from './ShiftingBackgroundColors';
import BottomNavbar from './BottomNavbar';
import FontGrabber from '../FontGrabber';
import ElementWrapper from '../ElementWrapper';

import { useIsMobile } from '../../utils/deviceDetect';
import { fontFamilyOptions, isGoogleFont, FontObject } from '../../config/fontConfig';
import { springConfigPresets, weddingColorSchemes, SpringConfigPreset, WeddingColorScheme, parallaxPhysicsPresets, ParallaxPhysicsPreset, animationCurves } from '../../config/levaSchemas';
import { generateElementFolderName } from './levaSchemas';
import { ElementConfig, ExperienceSettings as ExperienceSettingsType, TimelineMarker } from '../../types';
import '../../App.css';

// --- TYPE DEFINITIONS ---
interface WeddingData {
  id: string;
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

interface GuestExperiencePreviewProps {
  weddingDataFromApp: WeddingData;
  experienceSettingsFromApp: ExperienceSettingsType;
  layoutSettingsFromPreview: any;
  forceMobileView?: boolean;
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  hudContent?: React.ReactNode;
  weddingId?: string; // Added for BottomNavbar
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


const GuestExperiencePreview: React.FC<GuestExperiencePreviewProps> = ({
  weddingDataFromApp,
  experienceSettingsFromApp,
  layoutSettingsFromPreview,
  forceMobileView = false,
  onScroll,
  hudContent,
  weddingId,
}) => {
  const [notification, setNotification] = useState({ text: '', visible: false });
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notificationSpring = useSpring({
    opacity: notification.visible ? 1 : 0,
    config: { tension: 280, friction: 60 },
  });

  const [isUserActive, setIsUserActive] = useState(true);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleUserActivity = () => {
      if (!isUserActive) {
        setIsUserActive(true);
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(() => {
        setIsUserActive(false);
      }, 5000); // 5 seconds of inactivity
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll'];
    events.forEach(event => window.addEventListener(event, handleUserActivity));
    handleUserActivity();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
    };
  }, [isUserActive]);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    
    if (isUserActive) {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      setNotification({ text: 'Preview Updated', visible: true });
      notificationTimeoutRef.current = setTimeout(() => {
        // Hide it, but keep the text for a smoother fade-out
        setNotification(n => ({ ...n, visible: false }));
      }, 1500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutSettingsFromPreview, isUserActive]);

  useEffect(() => {
    if (!isUserActive) {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      setNotification({ text: 'User Inactive', visible: true });
    } else {
      if (notification.text === 'User Inactive') {
        setNotification({ text: '', visible: false });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserActive, notification.text]);

  const isActuallyMobile = useIsMobile();
  const isMobile = forceMobileView || isActuallyMobile;

  const {
    'Overall Controls (Guest)': overallControls,
    'RSVP Form Style': rsvpStyleControlsFromSettings,
    'Scrapbook Layout (Guest)': scrapbookLayoutControlsFromSettings,
    'Dynamic Background Gradient': dynamicGradientControlsFromSettings,
    ...elementControls
  } = layoutSettingsFromPreview || {};

  const {
    springPreset: selectedSpringPresetKeyGuest = 'default',
    parallaxPhysicsPreset: selectedParallaxPhysicsPresetKey = 'default',
    colorScheme: selectedColorSchemeName = weddingColorSchemes[0].name,
    overallFontFamily = fontFamilyOptions[0],
  } = overallControls || {};

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

  const [scrollY, setScrollY] = useState(0);
  const [windowHeight, setWindowHeight] = useState(() => typeof window !== 'undefined' ? window.innerHeight : 700);
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  const parallaxRef = useRef<IParallax>(null);

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

  const googleFontsToLoad = useMemo<FontObject[]>(() => {
    const fonts = new Set<string>();
    if (overallFontFamily && isGoogleFont(overallFontFamily)) fonts.add(overallFontFamily.split(',')[0].trim());
    elementsFromBlueprint.forEach(el => {
      if (el.type === 'text') {
        const folderName = generateElementFolderName(el);
        const textFont = layoutSettingsFromPreview[folderName]?.fontFamily;
        if (textFont && isGoogleFont(textFont)) fonts.add(textFont.split(',')[0].trim());
      }
    });
    return Array.from(fonts).map(name => ({ name }));
  }, [overallFontFamily, elementsFromBlueprint, layoutSettingsFromPreview]);
  
  // Calculate scroll values with parallax physics applied
  const maxScrollableHeight = useMemo(() => (TOTAL_PAGES - 1) * windowHeight, [TOTAL_PAGES, windowHeight]);
  const scrollYWithPhysics = useMemo(() => applyParallaxPhysics(scrollY, maxScrollableHeight), [scrollY, maxScrollableHeight, applyParallaxPhysics]);

  const selectedColorScheme: WeddingColorScheme = weddingColorSchemes.find(scheme => scheme.name === selectedColorSchemeName) || weddingColorSchemes[0];

  const { 
    background, 
    primary, 
    secondary, 
    accent, 
    text, 
    textOnPrimary, 
    textOnSecondary, 
    textOnAccent 
  } = selectedColorScheme?.colors || weddingColorSchemes[0].colors;

  const [displayedImagesAndTheirData, setDisplayedImagesAndTheirData] = useState<DisplayedImage[]>([]);
  const isScrapbookEnabled = useMemo(() => renderableElements.some(el => el.type === 'component' && el.name === 'Scrapbook'), [renderableElements]);

  // Get the scrapbook element to determine its folder name
  const scrapbookElement = useMemo(() => renderableElements.find(el => el.type === 'component' && el.name === 'Scrapbook'), [renderableElements]);
  const scrapbookFolderName = useMemo(() => scrapbookElement ? generateElementFolderName(scrapbookElement) : null, [scrapbookElement]);
  const showCaptions = scrapbookFolderName ? (elementControls[scrapbookFolderName]?.showCaptions ?? true) : true;

  const centerStyle: CSSProperties = useMemo(() => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', width: '100%' }), []);

  const backdropSpring = useSpring({ opacity: focusedImage ? 1 : 0, pointerEvents: focusedImage ? 'auto' : 'none', config: activeSpringConfigGuest });
  const [focusedImageContainerSpring, focusedImageApi] = useSpring(() => ({ opacity: 0, top: '50%', left: '50%', width: '0px', height: '0px', transform: 'translate(-50%, -50%) rotate(0deg) scale(0.5)', config: activeSpringConfigGuest }));
  const infoBoxSpring = useSpring({ opacity: focusedImage ? 1 : 0, transform: focusedImage ? 'translateY(0px)' : 'translateY(20px)', config: activeSpringConfigGuest, delay: focusedImage ? 300 : 0 });
  const bindFocusedImageDrag = useDrag(({ last, movement: [mx], velocity: [vx], direction: [dx], event }) => { event?.stopPropagation(); if (!focusedImage || !last) return; if (Math.abs(mx) > windowWidth / 4 || Math.abs(vx) > 0.3) { const syntheticEvent = { stopPropagation: () => {} }; if (dx > 0) handlePreviousImage(syntheticEvent); else if (dx < 0) handleNextImage(syntheticEvent); } }, { axis: 'x', filterTaps: true, enabled: !!focusedImage });
  
  useEffect(() => {
    const parallaxContainer = parallaxRef.current?.container.current;
    if (parallaxContainer) {
      const handleResize = () => { setWindowHeight(window.innerHeight); setWindowWidth(window.innerWidth); };
      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = parallaxContainer;
        setScrollY(scrollTop);
        if (onScroll) {
          onScroll(scrollTop, scrollHeight, clientHeight);
        }
      };
      parallaxContainer.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
      return () => {
        parallaxContainer.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [onScroll]);

  const handleDisplayedImagesUpdate = useCallback((images: DisplayedImage[]) => {
    setDisplayedImagesAndTheirData(images);
  }, []);

  useEffect(() => { let isMounted = true; if (!isScrapbookEnabled || !weddingDataFromApp?.scrapbookImages?.length) { if (isMounted) setImageNaturalDimensions([]); return; } const imagePaths = weddingDataFromApp.scrapbookImages.map((img: any) => img.fileName?.startsWith('http') ? img.fileName : `${weddingDataFromApp.scrapbookImageFolder.replace(/\/$/, '')}/${img.fileName.replace(/^\//, '')}`); const dimsPromises = imagePaths.map((src: string) => new Promise<NaturalImageDimensions>(resolve => { if (!src) return resolve({ width: 0, height: 0, src: '' }); const img = new Image(); img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, src }); img.onerror = () => resolve({ width: 0, height: 0, src }); img.src = src; })); Promise.all(dimsPromises).then(dims => { if (isMounted) setImageNaturalDimensions(dims); }); return () => { isMounted = false; }; }, [isScrapbookEnabled, weddingDataFromApp]);
  useEffect(() => { if (!isScrapbookEnabled) { if (focusedImage || imageReturningToScrapbook || pendingImageToFocus) { setFocusedImage(null); setImageReturningToScrapbook(null); setPendingImageToFocus(null); focusedImageApi.start({ opacity: 0, immediate: true }); } return; } if (focusedImage) { const { targetWidth, targetHeight } = calculateFocusTargetDimensions(focusedImage.naturalWidth, focusedImage.naturalHeight, windowWidth, windowHeight); const { top, left } = getCenteredPosition(targetWidth, targetHeight, 1.5); focusedImageApi.start({ from: { opacity: 0.5, top: `${focusedImage.initialTopPx}px`, left: `${focusedImage.initialLeftPx}px`, width: `${focusedImage.initialWidthPx}px`, height: `${focusedImage.initialHeightPx}px`, transform: `translate(0px, 0px) rotate(${focusedImage.initialRotateDeg}deg) scale(1)` }, to: { opacity: 1, top: `${top}px`, left: `${left}px`, width: `${targetWidth}px`, height: `${targetHeight}px`, transform: 'translate(0px, 0px) rotate(0deg) scale(1)' } }); } else if (imageReturningToScrapbook) { const { currentIndex, initialWidthPx, initialHeightPx } = imageReturningToScrapbook; const targetEl = scrapbookImageRefs.current[currentIndex]; const itemData = displayedImagesAndTheirData.find(d => d.displayIndex === currentIndex); if (targetEl && itemData) { const rect = targetEl.getBoundingClientRect(); const baseRot = parseRotationFromStyle(itemData.initialStyle.transform); const dynamicRot = Math.sin(scrollYWithPhysics * (itemData.itemScrollSensitivity || 0) + currentIndex * 0.5) * (itemData.itemDynamicRotationRange || 0); focusedImageApi.start({ to: { top: `${rect.top}px`, left: `${rect.left}px`, width: `${initialWidthPx}px`, height: `${initialHeightPx}px`, transform: `translate(0px, 0px) rotate(${baseRot + dynamicRot}deg) scale(1)` }, onRest: () => { const current = imageReturningToScrapbookRef.current; setImageReturningToScrapbook(null); if (current) setLastPutDownIndex(current.currentIndex); const pending = pendingImageToFocusRef.current; if (pending) { setFocusedImage(pending); setPendingImageToFocus(null); } } }); focusedImageApi.start({ to: { opacity: 0 }, config: { tension: 300, friction: 20 } }); } else { focusedImageApi.start({ opacity: 0, immediate: true }); setImageReturningToScrapbook(null); if (pendingImageToFocus) { setFocusedImage(pendingImageToFocus); setPendingImageToFocus(null); } } } else { focusedImageApi.start({ opacity: 0, immediate: true }); } }, [focusedImage, imageReturningToScrapbook, pendingImageToFocus, focusedImageApi, windowWidth, windowHeight, displayedImagesAndTheirData, scrollYWithPhysics, activeSpringConfigGuest]);
  const handleCloseFocusedImage = useCallback((e: React.MouseEvent) => { e.stopPropagation(); if (focusedImage) { setImageReturningToScrapbook(focusedImage); setFocusedImage(null); setPendingImageToFocus(null); } }, [focusedImage]);
  const updateAndFocusNewImage = useCallback((newDisplayIndex: number): FocusedImageState | null => { if (!isScrapbookEnabled || !displayedImagesAndTheirData?.length) return null; const targetData = displayedImagesAndTheirData.find(d => d.displayIndex === newDisplayIndex); const targetEl = scrapbookImageRefs.current[newDisplayIndex]; if (!targetData || !targetEl) return null; let naturalDims = imageNaturalDimensions.find(dim => dim.src === targetData.src); if (!naturalDims?.width) { if (targetEl.naturalWidth > 0) naturalDims = { width: targetEl.naturalWidth, height: targetEl.naturalHeight, src: targetData.src }; else return null; } const rect = targetEl.getBoundingClientRect(); const baseRot = parseRotationFromStyle(targetData.initialStyle.transform); const dynamicRot = Math.sin(scrollYWithPhysics * (targetData.itemScrollSensitivity || 0) + newDisplayIndex * 0.5) * (targetData.itemDynamicRotationRange || 0); return { ...targetData, initialTopPx: rect.top, initialLeftPx: rect.left, initialWidthPx: rect.width, initialHeightPx: rect.height, initialRotateDeg: baseRot + dynamicRot, naturalWidth: naturalDims.width, naturalHeight: naturalDims.height, currentIndex: newDisplayIndex }; }, [isScrapbookEnabled, displayedImagesAndTheirData, imageNaturalDimensions, scrollYWithPhysics]);
  const handlePreviousImage = useCallback((e: React.MouseEvent | { stopPropagation: () => void }) => { e.stopPropagation(); if (!focusedImage || !displayedImagesAndTheirData?.length) return; const newIndex = (focusedImage.currentIndex - 1 + displayedImagesAndTheirData.length) % displayedImagesAndTheirData.length; const newDetails = updateAndFocusNewImage(newIndex); if (newDetails) { setImageReturningToScrapbook(focusedImage); setPendingImageToFocus(newDetails); setFocusedImage(null); } }, [focusedImage, displayedImagesAndTheirData, updateAndFocusNewImage]);
  const handleNextImage = useCallback((e: React.MouseEvent | { stopPropagation: () => void }) => { e.stopPropagation(); if (!focusedImage || !displayedImagesAndTheirData?.length) return; const newIndex = (focusedImage.currentIndex + 1) % displayedImagesAndTheirData.length; const newDetails = updateAndFocusNewImage(newIndex); if (newDetails) { setImageReturningToScrapbook(focusedImage); setPendingImageToFocus(newDetails); setFocusedImage(null); } }, [focusedImage, displayedImagesAndTheirData, updateAndFocusNewImage]);
  const handleImageClick = useCallback((itemData: any) => {
    const { initialStyle, src, altText, description, displayIndex, itemScrollSensitivity, itemDynamicRotationRange } = itemData;

    const scrapbookImageElement = scrapbookImageRefs.current[displayIndex];

    if (!scrapbookImageElement || !initialStyle.width || !initialStyle.height) {
      console.warn('Cannot focus image: Missing element or initial dimensions.', { scrapbookImageElement, initialStyle });
      return;
    }

    const { top, left, width, height } = scrapbookImageElement.getBoundingClientRect();
    const rotation = parseRotationFromStyle(scrapbookImageElement.style.transform);
    
    const { naturalWidth, naturalHeight } = scrapbookImageElement;

    const focusData: FocusedImageState = {
      src,
      altText,
      description,
      initialTopPx: top,
      initialLeftPx: left,
      initialWidthPx: width,
      initialHeightPx: height,
      initialRotateDeg: rotation,
      naturalWidth,
      naturalHeight,
      currentIndex: -1, // Not used here, maybe for a different list?
      displayIndex,
      itemScrollSensitivity,
      itemDynamicRotationRange,
      initialStyle,
    };
    
    if (imageReturningToScrapbookRef.current) {
      setPendingImageToFocus(focusData);
    } else {
      setFocusedImage(focusData);
    }
  }, []);

  const renderElement = (el: ElementDefinition, index: number) => {
    let componentToRender;
    switch (el.type) {
      case 'text': componentToRender = <h2>{el.content}</h2>; break;
      case 'photo': componentToRender = <img src={el.content} alt={el.name || 'Wedding photo'} style={{ maxWidth: '80%', maxHeight: '80vh', borderRadius: '8px' }} />; break;
      case 'video': {
        const videoFolderName = generateElementFolderName(el);
        const videoControls = elementControls[videoFolderName] || {};
        const { autoplay = true, loop = true, muted = true, showControls = false } = videoControls;
        
        componentToRender = (
          <video 
            src={el.content} 
            autoPlay={autoplay}
            loop={loop}
            muted={muted}
            controls={showControls}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              width: 'auto',
              height: 'auto',
              borderRadius: '8px',
              objectFit: 'contain'
            }}
            onError={(e) => console.error('Video playback error:', e)}
          />
        );
        break;
      }
      case 'background-image': componentToRender = <div style={{ width: '100%', height: '100%', backgroundImage: `url(${el.content})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />; break;
      case 'background-video': {
        const bgVideoFolderName = generateElementFolderName(el);
        const bgVideoControls = elementControls[bgVideoFolderName] || {};
        const { autoplay = true, loop = true, muted = true, showControls = false } = bgVideoControls;
        
        componentToRender = (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            position: 'relative',
            overflow: 'hidden'
          }}>
            <video 
              src={el.content} 
              autoPlay={autoplay}
              loop={loop}
              muted={muted}
              controls={showControls}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                position: 'absolute',
                top: 0,
                left: 0
              }}
              onError={(e) => console.error('Background video playback error:', e)}
            />
          </div>
        );
        break;
      }
      case 'component':
        if (el.name === 'RSVP Form') {
          const rsvpFolderName = generateElementFolderName(el);
          componentToRender = (
            <RSVPForm
              weddingData={weddingDataFromApp}
              backendUrl={weddingDataFromApp.rsvpEndpoint}
              elementName={rsvpFolderName}
              styleControlsFromProp={elementControls[rsvpFolderName]}
            />
          );
        } else if (el.name === 'Scrapbook') {
          const scrapbookElementFolderName = generateElementFolderName(el);
          componentToRender = (
            <InteractiveScrapbook
              weddingData={weddingDataFromApp}
              config={el}
              scrollY={scrollYWithPhysics}
              onImageClick={handleImageClick}
              focusedImageGlobal={focusedImage}
              imageReturningToScrapbookGlobal={imageReturningToScrapbook}
              lastPutDownIndexGlobal={lastPutDownIndex}
              scrapbookImageRefs={scrapbookImageRefs}
              onDisplayedImagesUpdate={handleDisplayedImagesUpdate}
              windowWidth={windowWidth}
              windowHeight={windowHeight}
              layoutControlsFromProp={elementControls[scrapbookElementFolderName]}
              TOTAL_PAGES={TOTAL_PAGES}
            />
          );
        } else if (el.name === 'Bottom Navbar') {
          // Bottom Navbar will be rendered outside parallax structure, so skip here
          return null;
        } else return null;
        break;
      default: return null;
    }

    return (
      <ParallaxLayer key={el.key} sticky={el.sticky as ParallaxLayerProps['sticky']} style={{ 
          ...centerStyle, 
          zIndex: 
            el.type === 'background-image' || el.type === 'background-video'
              ? -5
              : el.type === 'component' && el.name === 'Scrapbook'
              ? 100
              : el.type === 'component' && el.name === 'RSVP Form'
              ? 150
              : el.type === 'component' && el.name === 'Bottom Navbar'
              ? 125
              : (renderableElements.length - index) + 10,
          pointerEvents: el.type === 'component' && el.name === 'RSVP Form' ? 'none' : 'auto',
      }}>
        <ElementWrapper 
          element={el} 
          experienceSettings={experienceSettingsFromApp} 
          scrollY={scrollYWithPhysics} 
          windowHeight={windowHeight} 
          TOTAL_PAGES={TOTAL_PAGES} 
          layoutSettingsFromPreview={elementControls}
          overallFontFamily={overallFontFamily}
        >
          {componentToRender}
        </ElementWrapper>
      </ParallaxLayer>
    );
  };

  return (
    <>
      <animated.div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        zIndex: 99999,
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        pointerEvents: 'none',
        ...notificationSpring
      }}>
        {notification.text}
      </animated.div>
      <FontGrabber fonts={googleFontsToLoad} />
      <div style={{ width: '100%', height: '100vh', background: background }}>
        <Parallax
          ref={parallaxRef}
          pages={TOTAL_PAGES}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <ParallaxLayer
            offset={0}
            speed={0}
            sticky={{ start: 0, end: TOTAL_PAGES }}
            style={{
              zIndex: -20,
              width: '100%',
              height: '100%',
            }}
          >
            <ShiftingBackgroundColors 
              scrollY={scrollYWithPhysics} 
              TOTAL_PAGES={TOTAL_PAGES} 
              windowHeight={windowHeight} 
              selectedColorScheme={selectedColorScheme}
              gradientControls={dynamicGradientControlsFromSettings}
            />
          </ParallaxLayer>

          {renderableElements.map((el, index) => renderElement(el, index)).filter(Boolean)}

          {/* Render the HUD content if it exists */}
          {hudContent && (
            <ParallaxLayer sticky={{ start: 0, end: TOTAL_PAGES }} style={{ zIndex: 1000 }}>
              {hudContent}
            </ParallaxLayer>
          )}
        </Parallax>
      </div>

      {/* Render Bottom Navbar outside parallax structure */}
      {renderableElements
        .filter(element => element.type === 'component' && element.name === 'Bottom Navbar')
        .map(element => {
          const bottomNavbarFolderName = generateElementFolderName(element);
          return (
            <BottomNavbar 
              key={`bottom-navbar-${element.id}`}
              scrollY={scrollYWithPhysics}
              startPosition={element.sticky.start}
              endPosition={element.sticky.end}
              windowHeight={windowHeight}
              TOTAL_PAGES={TOTAL_PAGES}
              styleControls={elementControls[bottomNavbarFolderName]}
              weddingId={weddingId}
              element={element}
              experienceSettings={experienceSettingsFromApp}
              overallFontFamily={overallFontFamily}
              layoutSettingsFromPreview={layoutSettingsFromPreview}
            />
          );
        })
      }

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

export default GuestExperiencePreview; 