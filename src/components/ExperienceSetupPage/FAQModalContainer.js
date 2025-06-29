import React, { useState, useEffect, useRef } from 'react';
import { useSpring, useSpringRef, useChain, animated, config } from '@react-spring/web';
import FAQ from './FAQ'; // Assuming FAQ is in the same directory

const FaqModalContainer = ({ activeModal, setActiveModal, isMobile, isLandscape }) => {
  const [isFaqHovered, setIsFaqHovered] = useState(false);
  const [viewportDimensions, setViewportDimensions] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1200, 
    height: typeof window !== 'undefined' ? window.innerHeight : 800 
  });
  const faqHoverTimeoutRef = useRef(null);

  const isFaqOpen = activeModal === 'faq';
  const overflowStyle = 'hidden';

  // Update viewport dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      setViewportDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate pixel positions based on viewport
  const buttonWidth = isMobile ? viewportDimensions.width * 0.1 : 80; // ~10% of width or 80px
  const buttonHeight = isMobile ? viewportDimensions.height * 0.1 : 60; // ~10% of height or 60px
  
  // Position button to the left of "Experience Setup" heading, below the navbar
  // Accounting for: navbar (~60px) + page padding (~20px) + heading area (~40px)
  const buttonTop = 180; // Lower position to align with the heading area
  const buttonLeft = isMobile ? 20 : 250; // Much further right to align with content area

  // Modal dimensions and position (centered)
  const modalWidth = isMobile ? viewportDimensions.width * 0.8 : viewportDimensions.width * 0.45;
  const modalHeight = isMobile ? (isLandscape ? viewportDimensions.height * 0.775 : viewportDimensions.height * 0.9) : viewportDimensions.height * 0.805;
  const modalTop = (viewportDimensions.height - modalHeight) / 2;
  const modalLeft = (viewportDimensions.width - modalWidth) / 2;

  const faqSpringRef = useSpringRef();
  const faqTransRef = useSpringRef();

  const { borderRadius: faqBR, width: faqW, height: faqH, borderWidth: faqBW, background: faqBG, transform: faqT, ...faqRest } = useSpring({
    ref: faqSpringRef,
    config: isFaqOpen ? config.stiff : { tension: 300, friction: 30 },
    from: {
      position: 'absolute', 
      width: buttonWidth, 
      height: buttonHeight, 
      top: buttonTop, 
      left: buttonLeft, 
      background: 'rgba(0, 0, 0, 0.2)',
      borderWidth: (isMobile && isLandscape) ? 0 : 2,
      borderColor: '#fff',
      borderStyle: 'solid',
      borderRadius: 5, 
      zIndex: 50, 
      transform: 'translate(0px, 0px)'
    },
    to: {
      position: isFaqOpen ? 'fixed' : 'absolute',
      width: isFaqOpen ? modalWidth : buttonWidth, 
      height: isFaqOpen ? modalHeight : buttonHeight, 
      top: isFaqOpen ? modalTop : buttonTop, 
      left: isFaqOpen ? modalLeft : buttonLeft,
      background: isFaqOpen
        ? 'rgba(60, 60, 60, 0.85)'
        : isFaqHovered
          ? '#FFD700'
          : 'rgba(0, 0, 0, 0.2)',
      borderWidth: isFaqOpen ? 0 : ((isMobile && isLandscape) ? 0 : 2),
      borderColor: '#fff',
      borderStyle: 'solid',
      borderRadius: isFaqOpen ? 8 : 5, 
      opacity: 1, 
      zIndex: isFaqOpen ? 1000 : 50,
      transform: 'translate(0px, 0px)' // Always use pixels, no percentage transforms needed
    }
  });

  useChain(
    isFaqOpen ? [faqSpringRef, faqTransRef] : [faqTransRef, faqSpringRef],
    [0, isFaqOpen ? 0.3 : 0.0]
  );

  useEffect(() => {
    return () => {
      clearTimeout(faqHoverTimeoutRef.current);
    };
  }, []);

  if (isMobile && !isLandscape) {
    return null;
  }

  return (
    <animated.div
      style={{
        ...faqRest,
        width: faqW, height: faqH, borderRadius: faqBR, background: faqBG,
        borderWidth: faqBW, overflow: overflowStyle, borderColor: '#fff', borderStyle: 'solid',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        cursor: isFaqOpen ? 'default' : 'pointer', transform: faqT,
        boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
      }}
      onClick={() => { if (!isFaqOpen) setActiveModal('faq'); }}
      onMouseEnter={() => {
        if (!isFaqOpen) {
          clearTimeout(faqHoverTimeoutRef.current);
          setIsFaqHovered(true);
          faqHoverTimeoutRef.current = setTimeout(() => {
            setIsFaqHovered(false);
          }, 5000);
        }
      }}
      onMouseLeave={() => {
        clearTimeout(faqHoverTimeoutRef.current);
        setIsFaqHovered(false);
      }}
    >
      {!isFaqOpen && (
          <span style={{
            color: isFaqHovered ? '#333' : '#fff',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            fontSize: isMobile ? '0.8em' : '1em'
          }}>
              FAQ
          </span>
      )}
      <FAQ
          isFaqOpen={isFaqOpen} // Prop name for FAQ component
          onClose={() => setActiveModal(null)}
          faqTransRef={faqTransRef}
      />
    </animated.div>
  );
};

export default FaqModalContainer; 