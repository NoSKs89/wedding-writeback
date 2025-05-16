import React, { useRef, useEffect, useState } from 'react';
import { ParallaxBanner } from 'react-scroll-parallax';
import { useControls, folder } from 'leva';

const easingPresets = [
  'linear', 'ease', 'easeIn', 'easeOut', 'easeInOut', 'easeInQuad', 'easeInCubic',
  'easeInQuart', 'easeInQuint', 'easeInSine', 'easeInExpo', 'easeInCirc',
  'easeOutQuad', 'easeOutCubic', 'easeOutQuart', 'easeOutQuint', 'easeOutSine',
  'easeOutExpo', 'easeOutCirc', 'easeInOutQuad', 'easeInOutCubic', 'easeInOutQuart',
  'easeInOutQuint', 'easeInOutSine', 'easeInOutExpo', 'easeInOutCirc', 'easeInBack',
  'easeOutBack', 'easeInOutBack',
];

const ParallaxScrollIntro = ({
  brideName, groomName, weddingDate,
  bgImage, coupleImage,
  onIntroComplete
}) => {
  const { introDurationScrollVh } = useControls('Overall Intro', {
    introDurationScrollVh: { value: 2.0, min: 1.0, max: 4.0, step: 0.1, label: 'Intro Scroll Length (x Screen H)' }
  });

  const bgControls = useControls('Background Layer', {
    bgInitialScale: { value: 1.0, min: 0.5, max: 2, step: 0.01 },
    bgFinalScale: { value: 1.3, min: 0.5, max: 2, step: 0.01 },
    bgInitialOpacity: { value: 0.6, min: 0, max: 1, step: 0.01 },
    bgFinalOpacity: { value: 1, min: 0, max: 1, step: 0.01 },
    bgSpeed: { value: -25, min: -100, max: 30, step: 1 },
    bgEasing: { value: 'easeOutCubic', options: easingPresets },
  });

  const coupleControls = useControls('Couple Image Layer', {
    // translateY: 0 is center. Positive is down, negative is up.
    // 50vh is bottom edge of screen, -50vh is top edge.
    coupleInitialY: { value: 50, min: -50, max: 100, step: 1, label: 'Start Y (vh from center)' }, // Starts at bottom edge
    coupleFinalY: { value: 15, min: -50, max: 50, step: 1, label: 'End Y (vh from center)' }, // Ends slightly below center
    coupleInitialScale: { value: 0.5, min: 0.1, max: 2, step: 0.01 },
    coupleFinalScale: { value: 1.0, min: 0.1, max: 2, step: 0.01 }, // Adjust to fit mobile well
    coupleImageHeightVh: { value: 65, min: 20, max: 100, step: 1, label: 'Image Height (vh)'},
    coupleInitialOpacity: { value: 0, min: 0, max: 1, step: 0.01 },
    coupleFinalOpacity: { value: 1, min: 0, max: 1, step: 0.01 },
    coupleAnimationStartScroll: { value: 0.0, min: 0, max: 1, step: 0.01, label: 'Anim Start Scroll %' },
    coupleAnimationEndScroll: { value: 0.65, min: 0, max: 1, step: 0.01, label: 'Anim End Scroll %' },
    coupleEasing: { value: 'easeOutCubic', options: easingPresets },
  });

  const namesControls = useControls('Names Text Layer', {
    namesInitialY: { value: 0, min: -50, max: 50, step: 1, label: 'Start Y (vh from center)' },
    namesFinalY: { value: -22, min: -50, max: 50, step: 1, label: 'End Y (vh from center)' }, // Above couple
    namesInitialScale: { value: 0.8, min: 0.5, max: 1.5, step: 0.01 },
    namesFinalScale: { value: 1, min: 0.5, max: 1.5, step: 0.01 },
    namesInitialOpacity: { value: 0, min: 0, max: 1, step: 0.01 },
    namesFinalOpacity: { value: 1, min: 0, max: 1, step: 0.01 },
    namesAnimationStartScroll: { value: 0.35, min: 0, max: 1, step: 0.01 }, // After couple starts moving
    namesAnimationEndScroll: { value: 0.85, min: 0, max: 1, step: 0.01 },
    namesEasing: { value: 'easeOutCubic', options: easingPresets },
  });

  const dateControls = useControls('Date Text Layer', {
    dateInitialY: { value: 0, min: -50, max: 50, step: 1, label: 'Start Y (vh from center)' },
    dateFinalY: { value: -16, min: -50, max: 50, step: 1, label: 'End Y (vh from center)' }, // Below names
    dateInitialScale: { value: 0.7, min: 0.5, max: 1.5, step: 0.01 },
    dateFinalScale: { value: 1, min: 0.5, max: 1.5, step: 0.01 },
    dateInitialOpacity: { value: 0, min: 0, max: 1, step: 0.01 },
    dateFinalOpacity: { value: 1, min: 0, max: 1, step: 0.01 },
    dateAnimationStartScroll: { value: 0.45, min: 0, max: 1, step: 0.01 }, // After names start
    dateAnimationEndScroll: { value: 0.90, min: 0, max: 1, step: 0.01 },
    dateEasing: { value: 'easeOutBack', options: easingPresets }, // A bit more playful
  });

  const introWrapperRef = useRef(null);
  const [isSticky, setIsSticky] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);


  useEffect(() => {
    const wrapper = introWrapperRef.current;
    if (!wrapper) return;

    let stickyPointHit = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          // Logic for stickiness
          if (entry.boundingClientRect.top <= 0 && !stickyPointHit) {
            setIsSticky(true);
            stickyPointHit = true; // Prevent rapidly toggling if scrolling up/down near top
          } else if (entry.boundingClientRect.top > 0 && stickyPointHit) {
             // Only unstick if scrolling back up past the sticky trigger point
            if (window.scrollY < wrapper.offsetTop) { // Check if we are truly above the wrapper
                setIsSticky(false);
                stickyPointHit = false;
            }
          }
          
          // Logic for completion: when the wrapper is no longer intersecting and is above the viewport
          if (!entry.isIntersecting && entry.boundingClientRect.bottom < 0) {
            if (typeof onIntroComplete === 'function' && !hasCompleted) {
              onIntroComplete();
              setHasCompleted(true); // Prevent multiple calls
              observer.disconnect(); // Stop observing once completed
            }
          }
        });
      },
      { 
        threshold: [0, 0.01, 0.99, 1.0], // Fine-grained thresholds
        // rootMargin: "0px 0px -100% 0px" // Alternative: use rootMargin to detect when element is fully scrolled past
      }
    );
  
    observer.observe(wrapper);
  
    return () => {
        observer.disconnect();
    }
  }, [onIntroComplete, hasCompleted]);


  const layers = [
    {
      image: bgImage,
      speed: bgControls.bgSpeed,
      scale: [bgControls.bgInitialScale, bgControls.bgFinalScale, bgControls.bgEasing],
      opacity: [bgControls.bgInitialOpacity, bgControls.bgFinalOpacity],
      shouldAlwaysCompleteAnimation: true,
    },
    {
      translateY: [`${coupleControls.coupleInitialY}vh`, `${coupleControls.coupleFinalY}vh`],
      scale: [coupleControls.coupleInitialScale, coupleControls.coupleFinalScale, coupleControls.coupleEasing],
      opacity: [coupleControls.coupleInitialOpacity, coupleControls.coupleFinalOpacity],
      shouldAlwaysCompleteAnimation: true,
      startScroll: coupleControls.coupleAnimationStartScroll,
      endScroll: coupleControls.coupleAnimationEndScroll,
      children: (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
          <img
            src={coupleImage}
            alt="Couple"
            style={{
              height: `${coupleControls.coupleImageHeightVh}vh`,
              width: 'auto',
              maxWidth: '90%',
              objectFit: 'contain',
              filter: 'drop-shadow(0px 8px 20px rgba(0,0,0,0.35))',
            }}
          />
        </div>
      ),
    },
    {
      translateY: [`${namesControls.namesInitialY}vh`, `${namesControls.namesFinalY}vh`],
      scale: [namesControls.namesInitialScale, namesControls.namesFinalScale, namesControls.namesEasing],
      opacity: [namesControls.namesInitialOpacity, namesControls.namesFinalOpacity],
      shouldAlwaysCompleteAnimation: true,
      startScroll: namesControls.namesAnimationStartScroll,
      endScroll: namesControls.namesAnimationEndScroll,
      children: (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', textAlign: 'center', color: 'white', pointerEvents: 'none' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(2.0rem, 7vw, 4.0rem)', margin: 0, fontWeight: 300, lineHeight: 1.2, textShadow: '2px 2px 8px rgba(0,0,0,0.6)' }}>
              {brideName}
            </h1>
            <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 2.0rem)', margin: '0.1em 0 0.25em 0', fontWeight: 400, textShadow: '2px 2px 8px rgba(0,0,0,0.6)' }}>
              &
            </h1>
            <h1 style={{ fontSize: 'clamp(2.0rem, 7vw, 4.0rem)', margin: 0, fontWeight: 300, lineHeight: 1.2, textShadow: '2px 2px 8px rgba(0,0,0,0.6)' }}>
              {groomName}
            </h1>
          </div>
        </div>
      ),
    },
    {
      translateY: [`${dateControls.dateInitialY}vh`, `${dateControls.dateFinalY}vh`],
      scale: [dateControls.dateInitialScale, dateControls.dateFinalScale, dateControls.dateEasing],
      opacity: [dateControls.dateInitialOpacity, dateControls.dateFinalOpacity],
      shouldAlwaysCompleteAnimation: true,
      startScroll: dateControls.dateAnimationStartScroll,
      endScroll: dateControls.dateAnimationEndScroll,
      children: (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', textAlign: 'center', color: 'white', pointerEvents: 'none' }}>
          <p style={{ fontSize: 'clamp(1.0rem, 3.5vw, 1.6rem)', fontWeight: 300, textShadow: '1px 1px 5px rgba(0,0,0,0.6)' }}>
            {weddingDate}
          </p>
        </div>
      ),
    },
  ];

  return (
    <div
      ref={introWrapperRef}
      className="intro-scroll-wrapper"
      style={{ height: `${introDurationScrollVh * 100}vh`, position: 'relative' }}
    >
      {isSticky && <div style={{height: '100vh' /* Placeholder for fixed banner space if needed, typically not */}} /> }
      <ParallaxBanner
        layers={layers}
        style={{
          position: isSticky ? 'fixed' : 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100vh',
          width: '100%',
          backgroundColor: '#333', // Fallback BG, or from Leva
        }}
        className="wedding-intro-banner"
      />
    </div>
  );
};

export default ParallaxScrollIntro;