import React, { useState, useEffect, useRef, useMemo } from 'react';
// import { useParams } from 'react-router-dom'; // No longer needed if weddingId comes via props
// import axios from 'axios'; // No longer needed
import { Parallax, ParallaxLayer } from '@react-spring/parallax';
import { Leva } from 'leva';
// import { getApiBaseUrl } from '../../config/apiConfig'; // No longer needed
import RSVPForm from '../RSVPForm';
// import ScrapbookDisplay from './ScrapbookDisplay'; // IMPORT ScrapbookDisplay
import InteractiveScrapbook from './InteractiveScrapbook'; // IMPORT InteractiveScrapbook
// We might need a Scrapbook component later
// import ScrapbookDisplay from './ScrapbookDisplay'; // Placeholder
import { useLevaStore } from '../../stores/levaStore'; // Import useLevaStore
import { useIsMobile } from '../../utils/deviceDetect'; // Import useIsMobile
import { useTrackedControls } from '../../hooks/useTrackedControls'; // ADDED: Import useTrackedControls

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
      yTransform = (windowHeight - actualDisplayedHeight) / 2 + landingYPosition + 3; 
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
  // const { weddingId } = useParams(); // Replaced by weddingIdFromApp
  const weddingId = weddingIdFromApp;

  // const [weddingData, setWeddingData] = useState(null); // Replaced by weddingDataFromApp
  // const [experienceSettings, setExperienceSettings] = useState(null); // Replaced by experienceSettingsFromApp
  const weddingData = weddingDataFromApp;
  const experienceSettings = experienceSettingsFromApp;

  const [isLoading, setIsLoading] = useState(false); // Initially false, parent will handle loading state
  const [error, setError] = useState(null); // Parent can pass errors if needed, or this can be removed
  const parallaxRef = useRef();
  const rsvpFormRef = useRef(null); 
  const [scrollY, setScrollY] = useState(0); // ADD scrollY state
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 1080);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
  const isMobile = useIsMobile(); // Determine if mobile view

  // REMOVED: const elementChildRef = useRef(null); // This ref is now inside ElementWrapper or used directly for RSVPForm

  // Load settings from server on mount
  useEffect(() => {
    if (weddingId) {
      const viewType = isMobile ? 'mobile' : 'desktop';
      console.log(`[GuestExperience] Attempting to load ${viewType} layout settings for ${weddingId}`);
      useLevaStore.getState().loadSettingsFromServer(weddingId, viewType)
        .catch(err => console.error(`[GuestExperience] Error loading ${viewType} settings:`, err));
    }
  }, [weddingId, isMobile]);

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
      setScrollY(parallaxContainer.scrollTop);
    };

    parallaxContainer.addEventListener('scroll', handleScroll);
    return () => parallaxContainer.removeEventListener('scroll', handleScroll);
  }, [parallaxRef.current]); // Rerun if parallaxRef itself changes (though unlikely)

  // Internal data fetching useEffect is removed.
  // useEffect(() => { ... fetchData ... }, [weddingId, experienceSettings]);

  const TOTAL_PAGES = useMemo(() => {
    if (!experienceSettings || !experienceSettings.timelineLength || windowHeight === 0) {
      return 3; // Default pages
    }
    // Ensure TOTAL_PAGES is at least 1
    return Math.max(1, experienceSettings.timelineLength / windowHeight);
  }, [experienceSettings, windowHeight]);

  const allRenderableElements = useMemo(() => {
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

  const rsvpElement = useMemo(() => 
    allRenderableElements.find(el => el.name === 'RSVP Form' && el.type === 'component')
  , [allRenderableElements]);

  const scrapbookElement = useMemo(() => 
    allRenderableElements.find(el => el.name === 'Scrapbook' && el.type === 'component')
  , [allRenderableElements]);

  const genericRenderableElements = useMemo(() => 
    allRenderableElements.filter(el => 
        (!rsvpElement || el.id !== rsvpElement.id) && 
        (!scrapbookElement || el.id !== scrapbookElement.id)
    )
  , [allRenderableElements, rsvpElement, scrapbookElement]);

  // Loading and error states are now primarily managed by the parent component (WeddingPageController)
  // We can keep minimal checks here for robustness or rely on parent providing valid props.
  if (!weddingData || !experienceSettings) {
    // This check might be redundant if WeddingPageController ensures data is passed.
    // Or it can be a fallback if props are unexpectedly null.
    return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2em' }}>Guest Experience data not fully loaded.</div>;
  }
  
  const centerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    textAlign: 'center',
  };

  const handleSaveConfiguration = async () => {
    if (!weddingId) {
      alert('Wedding ID is missing. Cannot save configuration.');
      return;
    }
    const viewType = isMobile ? 'mobile' : 'desktop';
    try {
      console.log(`[GuestExperience] Saving ${viewType} layout settings for ${weddingId}`);
      await useLevaStore.getState().saveSettingsToServer(weddingId, viewType);
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error(`[GuestExperience] Error saving ${viewType} configuration:`, error);
      alert(`Failed to save configuration: ${error.message}`);
    }
  };

  // Calculate scroll percentage
  let scrollPercentage = 0;
  const totalScrollableHeight = (TOTAL_PAGES - 1) * windowHeight;
  if (totalScrollableHeight > 0) {
    scrollPercentage = Math.min(100, Math.max(0, (scrollY / totalScrollableHeight) * 100));
  }

  return (
    <>
      <Leva />
      {/* Scroll Percentage Indicator */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 10001, // Higher than save button
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '4px',
        fontSize: '0.9em'
      }}>
        Scroll: {scrollPercentage.toFixed(0)}%
      </div>

      {/* Save Configuration Button - Moved to top left */}
      <button 
        onClick={handleSaveConfiguration} 
        style={{ 
          position: 'fixed', 
          top: '60px', // Below scroll indicator
          left: '20px', 
          zIndex: 10000, 
          padding: '10px 15px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px', 
          cursor: 'pointer' 
        }}
      >
        Save Layout Configuration
      </button>

      <div style={{ width: '100%', height: '100vh', background: '#f0f0f0' }}>
        <Parallax ref={parallaxRef} pages={TOTAL_PAGES} style={{ top: '0', left: '0' }}>
          
          {/* Generic Elements */}
          {genericRenderableElements.map((element) => {
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
                config={typeof scrapbookElement.content === 'object' ? scrapbookElement.content : {}} 
                scrollY={scrollY} 
                windowHeight={windowHeight}
                windowWidth={windowWidth}
              />
            </ParallaxLayer>
          )}
        </Parallax>
      </div>
    </>
  );
};

export default GuestExperience; 