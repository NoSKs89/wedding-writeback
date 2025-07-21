import React, { useEffect } from 'react';
import { animated, useSpring } from 'react-spring';

interface ScrollHintProps {
  isVisible: boolean;
  selectedColorScheme: any;
  shouldFade?: boolean;
  fadeOnceDetected?: boolean;
}

const ScrollHint: React.FC<ScrollHintProps> = ({ 
  isVisible, 
  selectedColorScheme, 
  shouldFade = false, 
  fadeOnceDetected = true 
}) => {
  console.log('[SCROLL_HINT] Render - All Props:', { 
    isVisible, 
    shouldFade, 
    fadeOnceDetected,
    conditionForFading: shouldFade && fadeOnceDetected,
    timestamp: Date.now() 
  });
  
  // Animation for the hint visibility with fade detection logic
  const [hintSpring, hintApi] = useSpring(() => ({
    opacity: 1, // Start visible, let useEffect control it
    transform: 'translateY(0px)',
    config: { tension: 200, friction: 25 }
  }));

  // IMMEDIATE animation update - run every render
  React.useLayoutEffect(() => {
    console.log('[SCROLL_HINT] useLayoutEffect - Evaluating conditions:', { 
      isVisible, 
      shouldFade, 
      fadeOnceDetected,
      condition1_notVisible: !isVisible,
      condition2_shouldFadeAndDetected: shouldFade && fadeOnceDetected,
      willShow_condition1: !isVisible,
      willShow_condition2: shouldFade && fadeOnceDetected,
      finalDecision: !isVisible ? 'HIDING' : (shouldFade && fadeOnceDetected) ? 'FADING' : 'SHOWING'
    });
    
    // If not visible, always hide regardless of fade state
    if (!isVisible) {
      console.log('[SCROLL_HINT] HIDING (not visible)');
      hintApi.start({
        opacity: 0,
        transform: 'translateY(10px)',
        config: { tension: 200, friction: 25 }
      });
    } else if (shouldFade && fadeOnceDetected) {
      console.log('[SCROLL_HINT] FADING (user scrolled) - shouldFade:', shouldFade, 'fadeOnceDetected:', fadeOnceDetected);
      // Smooth fade to 0 opacity
      hintApi.start({
        opacity: 0,
        transform: 'translateY(10px)',
        config: { tension: 150, friction: 20 }
      });
    } else {
      console.log('[SCROLL_HINT] SHOWING (normal state) - shouldFade:', shouldFade, 'fadeOnceDetected:', fadeOnceDetected, 'isVisible:', isVisible);
      // Normal visibility control - show hint
      hintApi.start({
        opacity: 1,
        transform: 'translateY(0px)',
        config: { tension: 200, friction: 25 }
      });
    }
  }); // Run every render

  // Pulsing animation for the arrow
  const pulseSpring = useSpring({
    from: { transform: 'translateY(0px)', opacity: 0.7 },
    to: async (next) => {
      while (isVisible && !(shouldFade && fadeOnceDetected)) {
        await next({ transform: 'translateY(5px)', opacity: 1 });
        await next({ transform: 'translateY(0px)', opacity: 0.7 });
      }
    },
    config: { duration: 1500 }
  });

  const { primary, text, accent } = selectedColorScheme?.colors || { primary: '#007bff', text: '#333333', accent: '#6c757d' };

  // Don't render at all if not visible and fade is complete
  if (!isVisible && !shouldFade) {
    console.log('[SCROLL_HINT] Not rendering - not visible and no fade');
    return null;
  }

  // CSS keyframes for arrow animation
  const arrowAnimation = `
    @keyframes bounceDown {
      0%, 20%, 50%, 80%, 100% {
        transform: translateY(0px);
      }
      40% {
        transform: translateY(-8px);
      }
      60% {
        transform: translateY(-4px);
      }
    }
  `;

  return (
    <>
      <style>{arrowAnimation}</style>
      <animated.div
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          zIndex: 1000,
          pointerEvents: 'none',
          userSelect: 'none',
          // Combine horizontal centering with spring vertical animation
          transform: hintSpring.transform.to((t: string) => `translateX(-50%) ${t}`),
          opacity: hintSpring.opacity,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            // Ensure the content itself is also centered
            textAlign: 'center',
          }}
        >
          {/* Text */}
          <div
            style={{
              color: text,
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '16px',
              textAlign: 'center',
              textShadow: '0 2px 6px rgba(0,0,0,0.4)',
              padding: '12px 24px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '25px',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap'
            }}
          >
            Scroll To Continue
          </div>
          
          {/* Large SVG Arrow with Animation */}
          <animated.div
            style={{
              ...pulseSpring,
              animation: 'bounceDown 2s infinite',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))',
                display: 'block',
              }}
            >
              <path 
                d="M7 10L12 15L17 10" 
                stroke="#000000" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M7 6L12 11L17 6" 
                stroke="#000000" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                opacity="0.6"
              />
            </svg>
          </animated.div>
        </div>
      </animated.div>
    </>
  );
};

export default ScrollHint; 