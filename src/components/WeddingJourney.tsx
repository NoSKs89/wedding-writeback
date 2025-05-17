import React, { useRef, useEffect, useCallback } from 'react';
import { Parallax, ParallaxLayer, IParallax } from '@react-spring/parallax';
import { useSpring, animated } from 'react-spring';
import RSVPForm from './RSVPForm'; // Now .tsx
// import ParallaxLogging from './ParallaxLogging'; // Now .tsx, but commented out for now
import styles from './styles.module.css'; // Assuming this is for general layer styling if needed
import '../App.css'; // For global styles like .textLayerContent, .introCoupleImage etc.

// Type Definitions
interface WeddingData {
  brideName: string;
  groomName: string;
  weddingDate: string;
  introBackground: string;
  introCouple: string;
  rsvpEndpoint: string;
  id: string | number; // Changed from optional to required
  isPlated?: boolean;
  platedOptions?: any[]; // from RSVPForm usage, make more specific if possible
}

interface ResolvedScrapbookImage {
  // Assuming resolvedScrapbookImages is an array of strings (image URLs)
  // If it's more complex, adjust this interface
  src: string;
  // add other properties if they exist for scrapbook items
}

interface WeddingJourneyProps {
  weddingData: WeddingData;
  resolvedScrapbookImages: string[]; // Changed from ResolvedScrapbookImage[] assuming it's just URLs
}

// Helper to generate scrapbook image styles (remains largely the same, but ensure CSS works)
const generateScrapbookImageStyle = (index: number, totalImages: number): React.CSSProperties => {
  const size = Math.random() * 80 + 120;
  const angle = Math.random() * 20 - 10;
  // Adjust positioning logic if needed for ParallaxLayer context
  const xBase = (index % Math.max(1, Math.floor(totalImages / 2))) * (100 / Math.max(1, Math.floor(totalImages / 2)));
  const yBase = Math.floor(index / Math.max(1, Math.floor(totalImages / 2))) * 30;
  const topPercent = yBase + (Math.random() * 20);
  const leftPercent = xBase + (Math.random() * 20 - 10);

  return {
    position: 'absolute',
    width: `${size}px`,
    height: 'auto',
    transform: `rotate(${angle}deg)`,
    top: `${Math.min(80, Math.max(5, topPercent))}%`,
    left: `${Math.min(80, Math.max(5, leftPercent))}%`,
    // Using className for base styles, specific styles applied inline
  };
};

const WeddingJourney: React.FC<WeddingJourneyProps> = ({ weddingData, resolvedScrapbookImages }) => {
  const {
    brideName, groomName, weddingDate,
    introBackground, introCouple, rsvpEndpoint
  } = weddingData;

  const parallaxRef = React.useRef<IParallax>(null);

  // Opacity animation constants
  const backgroundFadeStartOffset = 1.5; // Start fading background out
  const backgroundFadeEndOffset = 2.0;   // Background fully faded out
  const rsvpFadeStartOffset = 2.0;       // RSVP starts fading in (coincides with bg fully out)
  const rsvpFadeDuration = 0.5;          // Duration of RSVP fade-in (in pages)
  const rsvpFadeEndOffset = rsvpFadeStartOffset + rsvpFadeDuration;

  // Springs for opacity
  const [backgroundSpring, apiBg] = useSpring(() => ({ opacity: 1 }));
  const [rsvpSpring, apiRsvp] = useSpring(() => ({ opacity: 0 }));

  const handleScroll = useCallback(() => {
    if (parallaxRef.current) {
      const currentScrollPages = parallaxRef.current.current;

      // Background opacity calculation
      let bgOpacity;
      if (currentScrollPages < backgroundFadeStartOffset) {
        bgOpacity = 1;
      } else if (currentScrollPages >= backgroundFadeEndOffset) {
        bgOpacity = 0;
      } else {
        bgOpacity = 1 - (currentScrollPages - backgroundFadeStartOffset) / (backgroundFadeEndOffset - backgroundFadeStartOffset);
      }
      apiBg.start({ opacity: Math.max(0, Math.min(1, bgOpacity)) });

      // RSVP opacity calculation
      let rsvpOpacityVal;
      if (currentScrollPages < rsvpFadeStartOffset) {
        rsvpOpacityVal = 0;
      } else if (currentScrollPages >= rsvpFadeEndOffset) {
        rsvpOpacityVal = 1;
      } else {
        rsvpOpacityVal = (currentScrollPages - rsvpFadeStartOffset) / (rsvpFadeEndOffset - rsvpFadeStartOffset);
      }
      apiRsvp.start({ opacity: Math.max(0, Math.min(1, rsvpOpacityVal)), immediate: true });
    }
  }, [apiBg, apiRsvp, backgroundFadeStartOffset, backgroundFadeEndOffset, rsvpFadeStartOffset, rsvpFadeEndOffset]);

  useEffect(() => {
    const currentParallaxRef = parallaxRef.current;
    const scrollContainer = currentParallaxRef?.container.current; // Access the DOM element

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial call to set correct opacities
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]); // Effect depends on handleScroll

  // Define total pages for the parallax container.
  const totalPages = 3; // Adjusted: page 0-1 for intro, page 2 for RSVP

  // Offsets for layers (0-indexed)
  const backgroundStickyStart = 0;    // Background appears from the start
  const backgroundStickyEnd = 4;      // Background sticky until page 2 starts (covers first two pages of scroll, i.e., pages 0 and 1)
  
  const coupleImageOffset = 0.3;      // Couple image starts appearing on page 0
  const coupleImageSpeed = 0.4;

  const textStartOffset = 0.6;        // Text starts appearing on page 0
  const textSpeed = 0.5;

  // const scrapbookOffset = backgroundStickyEnd; // Scrapbook removed for now
  // const scrapbookSpeed = 0.6;

  const rsvpFormOffset = 2; // Starts appearing at the beginning of page 2
  const rsvpFormSpeed = 0.3;


  // Common style for centering content in a ParallaxLayer
  const centerStyle: React.CSSProperties = { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    flexDirection: 'column' 
  };

  return (
    <div className="wedding-journey-wrapper" style={{ width: '100%', height: '100%', background: '#000' }}>
      {/* <ParallaxLogging currentScrollProgress={0} trackedAnimations={[]} /> // Placeholder if re-added */}
      <Parallax ref={parallaxRef} pages={totalPages} style={{ top: '0', left: '0' }}>
        
        {/* Background Layer - Sticky */}
        <ParallaxLayer
          offset={backgroundStickyStart}
          speed={0.01} // Subtle movement for sticky background if desired
          sticky={{ start: backgroundStickyStart, end: backgroundStickyEnd }}
          style={{ zIndex: -1 }} // Ensure background is behind other content
        >
          {/* Apply opacity spring to an animated.div that handles the background image */}
          <animated.div 
            style={{
              ...backgroundSpring, // Contains opacity
              width: '100%', 
              height: '100vh', 
              backgroundImage: `url(${introBackground})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center'
            }} 
            className={styles.background} // Keep className if it adds other non-conflicting styles
          />
        </ParallaxLayer>

        {/* Intro Couple Image Layer */}
        <ParallaxLayer
          offset={coupleImageOffset}
          speed={coupleImageSpeed}
          style={{ ...centerStyle, zIndex: 1 }} // Higher zIndex than background
        >
          <img src={introCouple} alt="Couple" className="introCoupleImage" />
        </ParallaxLayer>

        {/* Text Layers (Bride, Groom, Date) - could be one layer or multiple */}
        {/* For simplicity, placing them in one layer group with slight vertical offset in styling */}
        <ParallaxLayer
          offset={textStartOffset}
          speed={textSpeed}
          style={{ ...centerStyle, zIndex: 2 }} // Higher zIndex
        >
          <div className="textLayerContent">
            <h1>{brideName}</h1>
            <h1 className="ampersand">&</h1>
            <h1>{groomName}</h1>
            <p>{weddingDate}</p>
          </div>
        </ParallaxLayer>

        {/* Scrapbook Layer */}
        {/* {resolvedScrapbookImages && resolvedScrapbookImages.length > 0 && (
          <ParallaxLayer
            offset={scrapbookOffset}
            speed={scrapbookSpeed}
            style={{ ...centerStyle, zIndex: 3 }} // Higher zIndex
          >
            <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
              {resolvedScrapbookImages.map((src, index) => (
                <div
                  key={`scrap-${index}`}
                  // Apply base class and dynamic styles
                  className="scrapbookImage" 
                  style={{ 
                    ...generateScrapbookImageStyle(index, resolvedScrapbookImages.length),
                    zIndex: index + 1 
                  }}
                >
                  <img 
                    src={src} 
                    alt={`Scrapbook ${index + 1}`} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </div>
              ))}
            </div>
          </ParallaxLayer>
        )} */}

        {/* RSVP Form Layer */}
        <ParallaxLayer
          offset={rsvpFormOffset}
          speed={rsvpFormSpeed}
          style={{ ...centerStyle, zIndex: 100 }} // Highest zIndex for modal-like appearance
        >
          {/* Apply opacity spring to the content of the RSVP layer */}
          <animated.div style={rsvpSpring}>
            <RSVPForm weddingData={weddingData} backendUrl={rsvpEndpoint} />
          </animated.div>
        </ParallaxLayer>

      </Parallax>
    </div>
  );
};

export default WeddingJourney; 