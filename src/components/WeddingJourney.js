import React, { useRef, useEffect, useState } from 'react';
import { ParallaxBanner } from 'react-scroll-parallax';
import RSVPForm from './RSVPForm';
import ParallaxLogging from './ParallaxLogging';

const generateScrapbookImageStyle = (index, totalImages) => {
  const size = Math.random() * 80 + 120;
  const angle = Math.random() * 20 - 10;
  const xBase = (index % Math.max(1, Math.floor(totalImages / 2))) * (100 / Math.max(1, Math.floor(totalImages / 2)));
  const yBase = Math.floor(index / Math.max(1, Math.floor(totalImages / 2))) * 30;
  const topPercent = yBase + (Math.random() * 20);
  const leftPercent = xBase + (Math.random() * 20 - 10);

  return {
    position: 'absolute',
    width: `${size}px`,
    height: 'auto',
    boxShadow: '4px 4px 12px rgba(0,0,0,0.25)',
    border: '6px solid white',
    transform: `rotate(${angle}deg)`,
    top: `${Math.min(80, Math.max(5, topPercent))}%`,
    left: `${Math.min(80, Math.max(5, leftPercent))}%`,
  };
};

const WeddingJourney = ({ weddingData, resolvedScrapbookImages }) => {
  const {
    brideName, groomName, weddingDate,
    introBackground, introCouple,
    rsvpEndpoint
  } = weddingData;

  const journeyWrapperRef = useRef(null);
  const [currentScrollProgress, setCurrentScrollProgress] = useState(0);
  const [scrapbookOpacity, setScrapbookOpacity] = useState(0);
  const [rsvpOpacity, setRsvpOpacity] = useState(0);
  const [rsvpPointerEvents, setRsvpPointerEvents] = useState('none');
  
  // Fixed values
  const totalJourneyHeight = 400; // 4 times the viewport height
  const scrapbookRevealPoint = 0.75; // Show scrapbook at 75% of journey
  const rsvpAppearPoint = 0.85; // Show RSVP at 85% of journey
  const fadeOutStartFactor = 0.6; // Start fading all elements at 60% of journey
  const fadeOutEndFactor = 0.7; // Finish fading elements at 70% of journey
  const scrapbookStrength = 15;
  const scrapbookMaxOpacity = 0.9;

  useEffect(() => {
    const wrapper = journeyWrapperRef.current;
    if (!wrapper) return;
    
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const elementTop = wrapper.offsetTop;
      const viewportHeight = window.innerHeight;
      const elementScrolled = scrollTop - elementTop + viewportHeight;
      const elementHeight = wrapper.offsetHeight;
      
      // Calculate progress as percentage through the journey (0-1)
      const progress = Math.min(1, Math.max(0, elementScrolled / elementHeight));
      setCurrentScrollProgress(progress);

      // Handle scrapbook visibility
      if (progress >= scrapbookRevealPoint) {
        setScrapbookOpacity(scrapbookMaxOpacity);
      } else {
        setScrapbookOpacity(0);
      }
      
      // Handle RSVP form visibility
      if (progress >= rsvpAppearPoint && progress < 0.98) {
        setRsvpOpacity(1);
        setRsvpPointerEvents('auto');
      } else if (progress >= 0.98) {
        setRsvpOpacity(0);
        setRsvpPointerEvents('none');
      } else {
        setRsvpOpacity(0);
        setRsvpPointerEvents('none');
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrapbookRevealPoint, rsvpAppearPoint, scrapbookMaxOpacity]);

  // Define banner layers exactly like the example
  const backgroundLayer = {
    image: introBackground,
    translateY: [0, 30],
    scale: [1.0, 1.15, 'easeOutCubic'],
    opacity: [1.0, 0.8],
    shouldAlwaysCompleteAnimation: true,
    expanded: true
  };
  
  const coupleLayer = {
    translateY: [50, 20],
    scale: [0.6, 1.5, 'easeOutQuad'],
    opacity: [0, 1],
    shouldAlwaysCompleteAnimation: true,
    expanded: false,
    children: (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <img 
          src={introCouple} 
          alt="Couple" 
          style={{ 
            height: '60vh', 
            maxWidth: '90%', 
            width: 'auto', 
            objectFit: 'contain',
            filter: 'drop-shadow(0px 8px 20px rgba(0,0,0,0.35))'
          }} 
        />
      </div>
    )
  };
  
  const brideNameLayer = {
    translateY: [30, -22],
    scale: [0.6, 1.0, 'easeOutQuad'],
    opacity: [0, 1],
    shouldAlwaysCompleteAnimation: true,
    expanded: false,
    startScroll: 0.1, // Start after couple
    children: (
      <div style={{
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }}>
        <h1 style={{ 
          fontSize: 'clamp(2.0rem, 7vw, 4.0rem)',
          margin: 0,
          fontWeight: 300,
          lineHeight: 1.2,
          color: 'white',
          textShadow: '2px 2px 8px rgba(0,0,0,0.6)'
        }}>
          {brideName}
        </h1>
      </div>
    )
  };
  
  const groomNameLayer = {
    translateY: [25, -18],
    scale: [0.6, 1.0, 'easeOutQuad'],
    opacity: [0, 1],
    shouldAlwaysCompleteAnimation: true,
    expanded: false,
    startScroll: 0.2, // Start after bride
    children: (
      <div style={{
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }}>
        <h1 style={{ 
          fontSize: 'clamp(1.2rem, 4vw, 2.0rem)',
          margin: '0.1em 0 0.25em 0',
          fontWeight: 400,
          color: 'white',
          textShadow: '2px 2px 8px rgba(0,0,0,0.6)'
        }}>
          &
        </h1>
        <h1 style={{ 
          fontSize: 'clamp(2.0rem, 7vw, 4.0rem)',
          margin: 0,
          fontWeight: 300,
          lineHeight: 1.2,
          color: 'white',
          textShadow: '2px 2px 8px rgba(0,0,0,0.6)'
        }}>
          {groomName}
        </h1>
      </div>
    )
  };
  
  const dateLayer = {
    translateY: [20, -14],
    scale: [0.6, 1.0, 'easeOutQuad'],
    opacity: [0, 1],
    shouldAlwaysCompleteAnimation: true,
    expanded: false,
    startScroll: 0.3, // Start after groom
    children: (
      <div style={{
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }}>
        <p style={{ 
          fontSize: 'clamp(1.0rem, 3.5vw, 1.6rem)',
          fontWeight: 300,
          color: 'white',
          textShadow: '1px 1px 5px rgba(0,0,0,0.6)'
        }}>
          {weddingDate}
        </p>
      </div>
    )
  };
  
  const fadeOutLayer = {
    opacity: [1, 0],
    translateY: [0, -10],
    easing: 'easeInCubic',
    shouldAlwaysCompleteAnimation: true,
    expanded: false,
    startScroll: fadeOutStartFactor,
    endScroll: fadeOutEndFactor,
    children: (
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'transparent'
      }} />
    )
  };

  // Tracked animations for logger
  const trackedAnimations = [
    {
      label: 'Background Movement',
      startProgressMarker: 0,
      endProgressMarker: fadeOutStartFactor,
      initialOpacity: 1.0,
      finalOpacity: 0.8
    },
    {
      label: 'Couple Image Fade In',
      startProgressMarker: 0,
      endProgressMarker: fadeOutStartFactor,
      initialOpacity: 0,
      finalOpacity: 1
    },
    {
      label: 'Bride Name Fade In',
      startProgressMarker: 0.1,
      endProgressMarker: fadeOutStartFactor,
      initialOpacity: 0,
      finalOpacity: 1
    },
    {
      label: 'Groom Name Fade In',
      startProgressMarker: 0.2,
      endProgressMarker: fadeOutStartFactor,
      initialOpacity: 0,
      finalOpacity: 1
    },
    {
      label: 'Date Text Fade In',
      startProgressMarker: 0.3,
      endProgressMarker: fadeOutStartFactor,
      initialOpacity: 0,
      finalOpacity: 1
    },
    {
      label: 'All Elements Fade Out',
      startProgressMarker: fadeOutStartFactor,
      endProgressMarker: fadeOutEndFactor,
      initialOpacity: 1,
      finalOpacity: 0
    },
    {
      label: 'Scrapbook Appears',
      startProgressMarker: scrapbookRevealPoint,
      endProgressMarker: scrapbookRevealPoint + 0.01,
      initialOpacity: 0,
      finalOpacity: scrapbookMaxOpacity
    },
    {
      label: 'RSVP Form Appears',
      startProgressMarker: rsvpAppearPoint,
      endProgressMarker: rsvpAppearPoint + 0.01,
      initialOpacity: 0,
      finalOpacity: 1
    }
  ];

  return (
    <div
      ref={journeyWrapperRef}
      className="wedding-journey-wrapper"
      style={{ 
        height: `${totalJourneyHeight}vh`, 
        position: 'relative',
        background: '#000',
        overflow: 'hidden'
      }}
    >
      <ParallaxLogging currentScrollProgress={currentScrollProgress} trackedAnimations={trackedAnimations} />
      
      {/* Main Parallax Banner Container */}
      <div style={{ position: 'sticky', top: 0, height: '100vh', width: '100%' }}>
        <ParallaxBanner
          style={{ height: '100%' }}
          layers={[
            backgroundLayer,
            coupleLayer,
            brideNameLayer,
            groomNameLayer,
            dateLayer,
            fadeOutLayer
          ]}
        />
      </div>
      
      {/* Scrapbook Layer */}
      {resolvedScrapbookImages && resolvedScrapbookImages.length > 0 && (
        <div
          className="scrapbook-layer-sticky-container"
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            width: '100%',
            zIndex: 2,
            overflow: 'hidden',
            opacity: scrapbookOpacity,
            transition: 'opacity 0.5s ease-in-out',
          }}
        >
          {resolvedScrapbookImages.map((src, index) => (
            <div
              key={`scrap-${index}`}
              style={{ ...generateScrapbookImageStyle(index, resolvedScrapbookImages.length), zIndex: index + 1 }}
            >
              <img 
                src={src} 
                alt={`Scrapbook ${index + 1}`} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
          ))}
        </div>
      )}

      {/* RSVP Form */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 100,
          opacity: rsvpOpacity,
          pointerEvents: rsvpPointerEvents,
          transition: 'opacity 0.4s ease-in-out',
        }}
      >
        <RSVPForm weddingData={weddingData} backendUrl={rsvpEndpoint} />
      </div>
    </div>
  );
};

export default WeddingJourney;