import React, { useState, useEffect, useRef } from 'react';
import { useSpring, useSpringRef, useChain, animated, config } from '@react-spring/web';
import FAQ from './FAQ'; // Assuming FAQ is in the same directory

const FaqModalContainer = ({ activeModal, setActiveModal, isMobile, isLandscape }) => {
  const [isFaqHovered, setIsFaqHovered] = useState(false);
  const faqHoverTimeoutRef = useRef(null);

  const isFaqOpen = activeModal === 'faq';
  const overflowStyle = 'hidden';

  const faqSpringRef = useSpringRef();
  const faqTransRef = useSpringRef();

  const { borderRadius: faqBR, width: faqW, height: faqH, borderWidth: faqBW, background: faqBG, transform: faqT, ...faqRest } = useSpring({
    ref: faqSpringRef,
    config: isFaqOpen ? config.stiff : { tension: 300, friction: 30 },
    from: {
      position: 'absolute', width: '10%', height: isMobile ? '10%' : '7.5%', top: isMobile ? '1.75%' : '-5.75%', left: isMobile ? '14.5%' : '16.5%', border: 'none',
      background: 'rgba(0, 0, 0, 0.2)',
      borderWidth: (isMobile && isLandscape) ? '0px' : '2px',
      borderColor: '#fff', borderStyle: 'solid',
      borderRadius: '5px', zIndex: 50, transform: 'translate(0%, 0%)'
    },
    to: {
      position: 'absolute', 
      width: isFaqOpen ? isMobile ? '80%' : '45%' : '10%', 
      height: isFaqOpen ? isMobile ? (isLandscape ? '77.5%' : '90%') : '80.5%' : isMobile ? '10%' : '7.5%', 
      border: 'auto',
      marginBottom: isMobile && isFaqOpen && !isLandscape ? '30px' : '0px',
      top: isFaqOpen ? (isMobile && isLandscape) ? '1%' : '50%' : '1.75%', 
      left: isFaqOpen ? '50%' : isMobile ? '14.5%' : '16.5%',
      background: isFaqOpen
        ? 'rgba(60, 60, 60, 0.85)'
        : isFaqHovered
          ? '#FFD700'
          : 'rgba(0, 0, 0, 0.2)',
      borderWidth: isFaqOpen ? '0px' : ((isMobile && isLandscape) ? '0px' : '2px'),
      borderColor: '#fff', borderStyle: 'solid',
      borderRadius: isFaqOpen ? '8px' : '5px', opacity: 1, zIndex: isFaqOpen ? 1000 : 50,
      transform: isFaqOpen 
        ? (isMobile && isLandscape) 
          ? 'translate(-50%, 0%)'
          : 'translate(-50%, -50%)' 
        : 'translate(0%, 0%)'
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