import React, { useState, useEffect, useRef, useMemo } from 'react';
// import { useParams } from 'react-router-dom'; // No longer needed if weddingId comes via props
// import axios from 'axios'; // No longer needed
import { Parallax, ParallaxLayer } from '@react-spring/parallax';
import { Leva, useControls } from 'leva';
// import { getApiBaseUrl } from '../../config/apiConfig'; // No longer needed
import RSVPForm from '../RSVPForm';
// We might need a Scrapbook component later
// import ScrapbookDisplay from './ScrapbookDisplay'; // Placeholder

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
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Internal data fetching useEffect is removed.
  // useEffect(() => { ... fetchData ... }, [weddingId, experienceSettings]);

  const TOTAL_PAGES = useMemo(() => {
    if (!experienceSettings || !experienceSettings.timelineLength || windowHeight === 0) {
      return 3; // Default pages
    }
    return Math.max(1, experienceSettings.timelineLength / windowHeight);
  }, [experienceSettings, windowHeight]);

  const renderableElements = useMemo(() => {
    if (!experienceSettings || !experienceSettings.elements || !experienceSettings.markers) {
      return [];
    }
    return experienceSettings.elements.map(element => {
      const startMarker = experienceSettings.markers.find(m => m.elementId === element.id && m.type === 'start');
      const endMarker = experienceSettings.markers.find(m => m.elementId === element.id && m.type === 'end');

      if (!startMarker || !endMarker || element.type === 'empty') {
        return null;
      }
      
      const pageOffset = startMarker.position * TOTAL_PAGES;
      const endPageOffset = endMarker.position * TOTAL_PAGES;
      const actualEndPage = Math.max(pageOffset + 0.1, endPageOffset);

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

  return (
    <>
      <Leva />
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
                  contentToRender = <div>Scrapbook Placeholder (Max Images: {element.content?.maxImages || 'N/A'})</div>;
                } else {
                  contentToRender = <div>Dynamic Component: {element.name}</div>;
                }
                break;
              default:
                contentToRender = <div>Unsupported element type: {element.type}</div>;
            }

            const ElementWrapper = ({ children }) => {
              // eslint-disable-next-line react-hooks/rules-of-hooks
              const controls = useControls(`Element ${element.id} (${element.name || element.type})`, {
                opacity: { value: 1, min: 0, max: 1, step: 0.01 },
              }, {
                collapsed: true, 
              });
            
              return (
                <div style={{ 
                  opacity: controls.opacity,
                  width: element.type === 'background-image' ? '100%' : 'auto',
                  height: element.type === 'background-image' ? '100%' : 'auto',
                  padding: element.type === 'background-image' ? '0' : '20px',
                  background: (element.type !== 'background-image' && element.type !== 'component') ? 'rgba(255,255,255,0.3)' : 'transparent',
                  borderRadius: (element.type !== 'background-image' && element.type !== 'component') ? '10px' : '0px',
                 }}>
                  {children}
                </div>
              );
            };

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