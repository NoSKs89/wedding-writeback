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
  const [scrollY, setScrollY] = useState(0); // ADD scrollY state
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 1080);
  const isMobile = useIsMobile(); // Determine if mobile view

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
      };
    }).filter(el => el !== null);
  }, [experienceSettings, TOTAL_PAGES]);

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
              case 'component':
                if (element.name === 'RSVP Form' && weddingData && weddingData.rsvpEndpoint) {
                  contentToRender = <RSVPForm weddingData={weddingData} backendUrl={weddingData.rsvpEndpoint} />;
                } else if (element.name === 'Scrapbook') {
                  const scrapbookConfig = typeof element.content === 'object' ? element.content : {};
                  //contentToRender = <ScrapbookDisplay weddingData={weddingData} config={scrapbookConfig} />;
                  contentToRender = <InteractiveScrapbook weddingData={weddingData} config={scrapbookConfig} scrollY={scrollY} />;
                } else {
                  contentToRender = <div>Dynamic Component: {element.name}</div>;
                }
                break;
              default:
                contentToRender = <div>Unsupported element type: {element.type}</div>;
            }

            const ElementWrapper = ({ children }) => {
              let defaultLandingY = 0;
              let defaultStartingScale = 1;
              let defaultEndingScale = 1;
              let defaultScaleEndYPosition = 0.5; // Mid-point of element's duration
              let defaultAnimationCurve = 'linear';
              let defaultFadeOutEndYPosition = 1; // Default to fade out by the end of duration
              let defaultFadeOutAnimationCurve = 'disabled'; // Default to no fade-out effect

              // Set default landing Y for text elements
              if (element.type === 'text') {
                if (element.id === 1) defaultLandingY = -275; // Bride Name
                else if (element.id === 2) defaultLandingY = -215; // Groom Name
                else if (element.id === 3) defaultLandingY = -400; // Wedding Date
              } else if (element.type === 'photo' && element.name !== 'Background Scene Image') {
                // Specific defaults for photos if needed, e.g.:
                // defaultStartingScale = 0.8;
                // defaultEndingScale = 1.1;
              }

              const controlsConfig = {
                opacity: { value: 1, min: 0, max: 1, step: 0.01 },
              };

              if (element.type === 'text' || (element.type === 'photo' && element.name !== 'Background Scene Image')) {
                controlsConfig.landingYPosition = { value: defaultLandingY, step: 1, label: 'Landing Y (px)' };
                // Add fade-out controls for these types
                controlsConfig.fadeOutEndYPosition = { value: defaultFadeOutEndYPosition, min: 0, max: 1, step: 0.01, label: 'Fade Out End Y (% dur)' };
                controlsConfig.fadeOutAnimationCurve = { value: defaultFadeOutAnimationCurve, options: ['disabled', ...Object.keys(animationCurves)], label: 'Fade Out Curve' };
              }

              // Add scale controls for 'photo' elements (excluding background-image type)
              if (element.type === 'photo' && element.name !== 'Background Scene Image') {
                controlsConfig.startingScale = { value: defaultStartingScale, min: 0.1, max: 5, step: 0.01, label: 'Starting Scale' };
                controlsConfig.endingScale = { value: defaultEndingScale, min: 0.1, max: 5, step: 0.01, label: 'Ending Scale' };
                controlsConfig.scaleEndYPosition = { value: defaultScaleEndYPosition, min: 0, max: 1, step: 0.01, label: 'Scale End Y (% duration)' };
                controlsConfig.scaleAnimationCurve = { value: defaultAnimationCurve, options: Object.keys(animationCurves), label: 'Scale Animation Curve' };
              }

              const trackedControls = useTrackedControls(
                `Element ${element.id} (${element.name || element.type})`, 
                controlsConfig, 
                { collapsed: true }
              );
              const controls = trackedControls.values; // Get the values from the hook's return
            
              // Calculate current scale based on scroll position
              let currentScale = 1;
              let yTransform = controls.landingYPosition || 0;
              let finalOpacity = controls.opacity; // Start with the base opacity

              if (element.type === 'photo' && element.name !== 'Background Scene Image' && controls.startingScale !== undefined) {
                const startMarker = experienceSettings.markers.find(m => m.elementId === element.id && m.type === 'start');
                const endMarker = experienceSettings.markers.find(m => m.elementId === element.id && m.type === 'end');

                if (startMarker && endMarker && parallaxRef.current) {
                  // Consistent page multiplier for scroll calculations
                  const pageMultiplierForScroll = TOTAL_PAGES > 1 ? TOTAL_PAGES - 1 : 0;

                  const elementScrollStart = startMarker.position * pageMultiplierForScroll * windowHeight;
                  
                  const elementMarkerDurationScroll = (endMarker.position - startMarker.position) * pageMultiplierForScroll * windowHeight;
                  const scaleAnimationEndScrollPoint = elementScrollStart + (elementMarkerDurationScroll * controls.scaleEndYPosition);

                  let progress = 0;
                  if (scrollY <= elementScrollStart) {
                    progress = 0;
                  } else if (scrollY >= scaleAnimationEndScrollPoint) {
                    progress = 1;
                  } else if (scaleAnimationEndScrollPoint > elementScrollStart) { // Avoid division by zero
                    // Progress is calculated over the range from elementScrollStart to scaleAnimationEndScrollPoint
                    progress = (scrollY - elementScrollStart) / (scaleAnimationEndScrollPoint - elementScrollStart);
                  } else {
                    // If scaleAnimationEndScrollPoint is at or before elementScrollStart (e.g. scaleEndYPosition is 0)
                    // and scrollY is past elementScrollStart, progress should be 1 if scaleEndYPosition > 0, or 0 if scaleEndYPosition is 0.
                    // However, with min value of scaleEndYPosition being 0, if it's 0, scaleAnimationEndScrollPoint will be elementScrollStart.
                    // In this case, if scrollY > elementScrollStart, progress should be 1 (instant completion at start).
                    // The (scrollY >= scaleAnimationEndScrollPoint) condition above handles this if scaleEndYPosition is 0.
                    // If scaleEndYPosition is > 0 but very small, leading to scaleAnimationEndScrollPoint being very close to elementScrollStart,
                    // this path might be taken. If scaleAnimationEndScrollPoint === elementScrollStart, progress is 1 via prior condition.
                    // This handles the edge case where scaleEndYPosition is 0, making the denominator 0.
                    progress = (controls.scaleEndYPosition > 0) ? 1 : 0; 
                  }
                  
                  const easingFunction = animationCurves[controls.scaleAnimationCurve] || linear;
                  const easedProgress = easingFunction(progress);
                  
                  currentScale = controls.startingScale + (controls.endingScale - controls.startingScale) * easedProgress;
                }
              }

              // Fade-out Logic (for text and non-background photos)
              if ((element.type === 'text' || (element.type === 'photo' && element.name !== 'Background Scene Image')) && controls.fadeOutAnimationCurve !== 'disabled') {
                const startMarker = experienceSettings.markers.find(m => m.elementId === element.id && m.type === 'start');
                const endMarker = experienceSettings.markers.find(m => m.elementId === element.id && m.type === 'end');

                if (startMarker && endMarker && parallaxRef.current) {
                  const pageMultiplierForScroll = TOTAL_PAGES > 1 ? TOTAL_PAGES - 1 : 0;
                  const elementScrollStart = startMarker.position * pageMultiplierForScroll * windowHeight;
                  const elementMarkerDurationScroll = (endMarker.position - startMarker.position) * pageMultiplierForScroll * windowHeight;
                  const fadeOutAnimationEndScrollPoint = elementScrollStart + (elementMarkerDurationScroll * controls.fadeOutEndYPosition);

                  let fadeProgress = 0;
                  if (scrollY <= elementScrollStart) {
                    fadeProgress = 0;
                  } else if (scrollY >= fadeOutAnimationEndScrollPoint) {
                    fadeProgress = 1;
                  } else if (fadeOutAnimationEndScrollPoint > elementScrollStart) {
                    fadeProgress = (scrollY - elementScrollStart) / (fadeOutAnimationEndScrollPoint - elementScrollStart);
                  } else {
                    fadeProgress = (controls.fadeOutEndYPosition > 0) ? 1 : 0;
                  }

                  const fadeEasingFunction = animationCurves[controls.fadeOutAnimationCurve] || linear;
                  const easedFadeProgress = fadeEasingFunction(fadeProgress);

                  // Opacity goes from controls.opacity down to 0
                  finalOpacity = controls.opacity * (1 - easedFadeProgress);
                }
              }

              return (
                <div style={{ 
                  opacity: finalOpacity, // Use the calculated finalOpacity
                  transform: `translateY(${yTransform}px) scale(${currentScale})`,
                  width: element.type === 'background-image' ? '100%' : 'auto',
                  height: element.type === 'background-image' ? '100%' : 'auto',
                  padding: element.type === 'background-image' ? '0' : '20px',
                  // Remove the default semi-transparent white background for most elements
                  background: 'transparent', 
                  borderRadius: (element.type !== 'background-image' && element.type !== 'component') ? '10px' : '0px',
                 }}>
                  {children}
                </div>
              );
            };

            // Conditional rendering for scrapbook to bypass ElementWrapper for testing clicks
            if (element.name === 'Scrapbook') {
              const scrapbookConfig = typeof element.content === 'object' ? element.content : {};
              // Render InteractiveScrapbook directly in ParallaxLayer without ElementWrapper
              return (
                <ParallaxLayer
                  key={element.key}
                  sticky={element.sticky}
                  style={{
                    ...centerStyle,
                    // Ensure scrapbook has a high enough zIndex to be clickable
                    // Let's give it a distinct zIndex for testing, e.g., 50, assuming other elements are lower.
                    zIndex: 50, 
                  }}
                >
                  <InteractiveScrapbook weddingData={weddingData} config={scrapbookConfig} scrollY={scrollY} />
                </ParallaxLayer>
              );
            }

            return (
              <ParallaxLayer
                key={element.key}
                sticky={element.sticky}
                style={{
                  ...centerStyle,
                  zIndex: element.type === 'background-image' ? -5 : (experienceSettings.elements.length - element.id + 1),
                }}
              >
                <ElementWrapper>
                  {contentToRender}
                </ElementWrapper>
              </ParallaxLayer>
            );
          })}
        </Parallax>
      </div>
    </>
  );
};

export default GuestExperience; 