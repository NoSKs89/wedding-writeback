import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Parallax, ParallaxLayer, IParallax } from '@react-spring/parallax';
import { useSpring, animated } from 'react-spring';
import RSVPForm from './RSVPForm';
import styles from './styles.module.css';
import '../App.css';

// Type Definitions
interface WeddingData {
  brideName: string;
  groomName: string;
  weddingDate: string;
  introBackground: string;
  introCouple: string;
  rsvpEndpoint: string;
  id: string | number;
  isPlated?: boolean;
  platedOptions?: any[];
}

// Interface for ResolvedScrapbookImage (if re-enabled)
// interface ResolvedScrapbookImage {
//   src: string;
// }

interface WeddingJourneyProps {
  weddingData: WeddingData;
  resolvedScrapbookImages: string[];
}

const FADE_OUT_SCROLL_RANGE_PIXELS = 1; // Adjust this value to control fade speed/distance

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
  const [scrollY, setScrollY] = useState(0);

  // This function will be called on scroll events from the parallax container
  const updateScrollPosition = useCallback(() => {
    if (parallaxRef.current && parallaxRef.current.container.current) {
      setScrollY(parallaxRef.current.container.current.scrollTop);
    }
  }, []); // parallaxRef is stable, so empty dependency array is fine

  // Effect to attach scroll listener to the parallax container
  useEffect(() => {
    const scrollContainer = parallaxRef.current?.container.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateScrollPosition);
      updateScrollPosition(); // Initial call to set scrollY based on current position
      return () => {
        scrollContainer.removeEventListener('scroll', updateScrollPosition);
      };
    }
  }, [updateScrollPosition]); // Re-run if updateScrollPosition changes (it won't due to useCallback)

  const backgroundOpacity = Math.max(0, 1 - scrollY / 1000);
  // Spring for opacity fade based on scrollY (pixels)
  const backgroundOpacitySpring = useSpring({
    opacity: backgroundOpacity,
    config: { tension: 80, friction: 26 },
  });
  
  const totalPages = 3;
  const backgroundStickyStart = 0;
  const backgroundStickyEnd = 1; // Layer remains sticky for 1 page height

  const coupleImageOffset = 0.3;
  const coupleImageSpeed = 0.4;

  const textStartOffset = 0.6;
  const textSpeed = 0.5;

  const rsvpFormOffset = 2;
  const rsvpFormSpeed = 0.3;

  const centerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  };

  return (
    <div className="wedding-journey-wrapper" style={{ width: '100%', height: '100%', background: '#000' }}>
      {/* Opacity Debug Display */}
      <div 
        style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          padding: '5px 10px',
          background: 'rgba(255, 255, 255, 0.8)',
          color: 'black',
          zIndex: 200, // Ensure it's on top
          fontSize: '16px',
          borderRadius: '4px'
        }}
      >
        ScrollY: {scrollY.toFixed(0)} | Opacity: {backgroundOpacity.toFixed(3)}
      </div>

      {/* <ParallaxLogging currentScrollProgress={0} trackedAnimations={[]} /> // Placeholder if re-added */}
      <Parallax 
        ref={parallaxRef} 
        pages={totalPages} 
        style={{ top: '0', left: '0' }}
      >

        {/* Background Layer - Sticky with Pixel-Based Fade Out */}
        <ParallaxLayer
          sticky={{ start: backgroundStickyStart, end: backgroundStickyEnd }}
          style={{ zIndex: -1 }}
        >
          <animated.div
            style={{
              ...backgroundOpacitySpring, // Apply fade animation
              width: '100%',
              height: '100vh',
              backgroundImage: `url(${introBackground})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center'
            }}
            className={styles.background}
          />
        </ParallaxLayer>

        {/* Intro Couple Image Layer */}
        <ParallaxLayer
          offset={coupleImageOffset}
          speed={coupleImageSpeed}
          style={{ ...centerStyle, zIndex: 1 }}
        >
          <img src={introCouple} alt="Couple" className="introCoupleImage" />
        </ParallaxLayer>

        {/* Text Layers */}
        <ParallaxLayer
          offset={textStartOffset}
          speed={textSpeed}
          style={{ ...centerStyle, zIndex: 2 }}
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
          style={{ ...centerStyle, zIndex: 100 }}
        >
          <div>
            <RSVPForm weddingData={weddingData} backendUrl={rsvpEndpoint} />
          </div>
        </ParallaxLayer>

      </Parallax>
    </div>
  );
};

export default WeddingJourney; 