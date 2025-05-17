import React, { useRef, useEffect, useState } from 'react';
import { Parallax } from 'react-scroll-parallax';
import { useControls, folder } from 'leva';
import RSVPForm from './RSVPForm';

const easingPresets = [
  'linear', 'ease', 'easeIn', 'easeOut', 'easeInOut', 'easeInQuad', 'easeInCubic',
  'easeInQuart', 'easeInQuint', 'easeInSine', 'easeInExpo', 'easeInCirc',
  'easeOutQuad', 'easeOutCubic', 'easeOutQuart', 'easeOutQuint', 'easeOutSine',
  'easeOutExpo', 'easeOutCirc', 'easeInOutQuad', 'easeInOutCubic', 'easeInOutQuart',
  'easeInOutQuint', 'easeInOutSine', 'easeInOutExpo', 'easeInOutCirc', 'easeInBack',
  'easeOutBack', 'easeInOutBack',
];

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

  // --- LEVA CONTROLS ---

  const { elementsAnimationLengthVh } = useControls('Overall Intro Timing', {
    elementsAnimationLengthVh: { value: 2.0, min: 1.0, max: 5.0, step: 0.1, label: '1. Elements Anim Length (xVH)' }
  });

  const journeyPhasesCtrl = useControls('Journey Phases Timing', {
    composedHoldFactor: { value: 0.3, min: 0.0, max: 1.0, step: 0.05, label: '2. Composed Intro Hold (xAnimLen)' },
    groupFadeOutFactor: { value: 0.4, min: 0.1, max: 1.0, step: 0.05, label: '3. Group Fade Out (xAnimLen)' },
    scrapbookRevealStartFactor: { value: 0.5, min: 0.0, max: 1.0, step: 0.05, label: '4a. Scrapbook Reveal (0-1 of Group Fade)'},
    scrapbookDurationFactor: { value: 0.8, min: 0.1, max: 2.0, step: 0.05, label: '4b. Scrapbook Active Duration (xAnimLen)'},
    rsvpAppearanceStartFactor: { value: 0.3, min: 0.0, max: 1.0, step: 0.05, label: '5. RSVP Appear (0-1 of Scrapbook Active)'},
    mainContentScrollFactor: { value: 1.0, min: 0.5, max: 3.0, step: 0.1, label: '6. Main Content Scroll (xVH)' },
  });
  
  const groupFadeOutAnimCtrl = useControls('Intro Group Fade Animation', {
      translateYEndVh: { value: -15, min: -50, max: 0, step: 1, label: 'Group Translate Y End (vh)' },
      fadeOutEasing: { value: 'easeInCubic', options: easingPresets, label: 'Group Fade Easing' },
  });

  const bgControls = useControls('Background Layer', {
    bgInitialScale: { value: 1.0, min: 0.5, max: 2, step: 0.01 },
    bgFinalScale: { value: 1.2, min: 0.5, max: 2, step: 0.01 },
    bgInitialOpacity: { value: 0.5, min: 0, max: 1, step: 0.01 },
    bgFinalOpacity: { value: 0.8, min: 0, max: 1, step: 0.01 },
    bgSpeed: { value: -20, min: -100, max: 30, step: 1 }, // Speed is relative to scroll
    bgEasing: { value: 'easeOutCubic', options: easingPresets },
  });

  const coupleControls = useControls('Couple Image Layer', {
    // Order: Couple starts first, ends with/after Date
    animationStartScroll: { value: 0.0, min: 0, max: 1, step: 0.01, label: 'Start (0-1 of Elements Anim)' },
    animationEndScroll: { value: 0.9, min: 0, max: 1, step: 0.01, label: 'End (0-1 of Elements Anim)' },
    coupleInitialY: { value: 40, min: -50, max: 100, step: 1 },
    coupleFinalY: { value: 25, min: -50, max: 50, step: 1 },
    coupleInitialScale: { value: 0.4, min: 0.1, max: 2, step: 0.01 },
    coupleFinalScale: { value: 1.5, min: 0.1, max: 2, step: 0.01 },
    coupleImageHeightVh: { value: 60, min: 20, max: 100, step: 1 },
    coupleInitialOpacity: { value: 0, min: 0, max: 1, step: 0.01 },
    coupleFinalOpacity: { value: 1, min: 0, max: 1, step: 0.01 },
    coupleEasing: { value: 'easeInOutCubic', options: easingPresets },
  });

  const brideNameControls = useControls('Bride Name Layer', {
    // Order: After couple starts
    animationStartScroll: { value: 0.2, min: 0, max: 1, step: 0.01, label: 'Start (0-1 of Elements Anim)' },
    animationEndScroll: { value: 0.7, min: 0, max: 1, step: 0.01, label: 'End (0-1 of Elements Anim)' },
    initialY: { value: 10, min: -50, max: 50, step: 1 },
    finalY: { value: -24, min: -50, max: 50, step: 1 },
    initialScale: { value: 0.7, min: 0.5, max: 1.5, step: 0.01 },
    finalScale: { value: 1, min: 0.5, max: 1.5, step: 0.01 },
    initialOpacity: { value: 0, min: 0, max: 1, step: 0.01 },
    finalOpacity: { value: 1, min: 0, max: 1, step: 0.01 },
    easing: { value: 'easeOutCubic', options: easingPresets },
  });

  const groomNameControls = useControls('Groom Name Layer', {
    // Order: After bride starts
    animationStartScroll: { value: 0.25, min: 0, max: 1, step: 0.01, label: 'Start (0-1 of Elements Anim)' }, // Slightly after bride
    animationEndScroll: { value: 0.75, min: 0, max: 1, step: 0.01, label: 'End (0-1 of Elements Anim)' },
    initialY: { value: 10, min: -50, max: 50, step: 1 },
    finalY: { value: -20, min: -50, max: 50, step: 1 }, // Position for groom name + &
    initialScale: { value: 0.7, min: 0.5, max: 1.5, step: 0.01 },
    finalScale: { value: 1, min: 0.5, max: 1.5, step: 0.01 },
    initialOpacity: { value: 0, min: 0, max: 1, step: 0.01 },
    finalOpacity: { value: 1, min: 0, max: 1, step: 0.01 },
    easing: { value: 'easeOutCubic', options: easingPresets },
  });
  
  const dateControls = useControls('Date Text Layer', {
    // Order: After groom starts
    animationStartScroll: { value: 0.35, min: 0, max: 1, step: 0.01, label: 'Start (0-1 of Elements Anim)' },
    animationEndScroll: { value: 0.85, min: 0, max: 1, step: 0.01, label: 'End (0-1 of Elements Anim)' },
    dateInitialY: { value: 5, min: -50, max: 50, step: 1 },
    dateFinalY: { value: -16, min: -50, max: 50, step: 1 },
    dateInitialScale: { value: 0.6, min: 0.5, max: 1.5, step: 0.01 },
    dateFinalScale: { value: 1, min: 0.5, max: 1.5, step: 0.01 },
    dateInitialOpacity: { value: 0, min: 0, max: 1, step: 0.01 },
    dateFinalOpacity: { value: 1, min: 0, max: 1, step: 0.01 },
    dateEasing: { value: 'easeOutBack', options: easingPresets },
  });
  
  const scrapbookParallaxCtrl = useControls('Scrapbook Parallax', {
    strength: { value: 15, min: 0, max: 50, step: 1 },
    baseOpacity: {value: 0.9, min: 0, max: 1, step: 0.01, label: "Scrapbook Max Opacity"},
  });

  const journeyWrapperRef = useRef(null);
  const [currentScrollProgress, setCurrentScrollProgress] = useState(0);

  // --- PHASE CALCULATIONS ---
  const elementsAnimLenActualVh = elementsAnimationLengthVh;
  const composedHoldActualVh = elementsAnimLenActualVh * journeyPhasesCtrl.composedHoldFactor;
  const groupFadeOutActualVh = elementsAnimLenActualVh * journeyPhasesCtrl.groupFadeOutFactor;
  const scrapbookActiveActualVh = elementsAnimLenActualVh * journeyPhasesCtrl.scrapbookDurationFactor;
  const mainContentActualVh = journeyPhasesCtrl.mainContentScrollFactor;

  const totalJourneyVh = elementsAnimLenActualVh * 4;
  console.log(`[WeddingJourney] totalJourneyVh (DIAGNOSTIC): ${totalJourneyVh}, elementsAnimLenActualVh: ${elementsAnimLenActualVh}`);

  const elementsAnimEndProgress = totalJourneyVh > 0 ? elementsAnimLenActualVh / totalJourneyVh : 0;
  console.log(`[WeddingJourney] elementsAnimEndProgress: ${elementsAnimEndProgress}`);
  
  const composedHoldEndProgress = elementsAnimEndProgress + (elementsAnimLenActualVh * journeyPhasesCtrl.composedHoldFactor) / totalJourneyVh;
  const groupFadeOutEndProgress = composedHoldEndProgress + (elementsAnimLenActualVh * journeyPhasesCtrl.groupFadeOutFactor) / totalJourneyVh;

  useEffect(() => {
    const wrapper = journeyWrapperRef.current;
    if (!wrapper) return;
    const handleScroll = () => {
      const rect = wrapper.getBoundingClientRect();
      const scrollTop = window.scrollY - wrapper.offsetTop; // Relative to wrapper top
      const scrollHeight = wrapper.scrollHeight - window.innerHeight;
      let progress = 0;
      if (scrollHeight > 0) {
        progress = Math.min(1, Math.max(0, scrollTop / scrollHeight));
      } else {
        progress = rect.top >= 0 ? 0 : 1; // Fallback for non-scrollable or fully visible
      }
      setCurrentScrollProgress(progress);
      console.log(`[WeddingJourney] currentScrollProgress: ${progress.toFixed(3)}`);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    return () => window.removeEventListener('scroll', handleScroll);
  }, [totalJourneyVh]); // Recalculate if totalJourneyVh changes

  // --- DIAGNOSTIC: SIMPLIFIED OPACITY/VISIBILITY --- 
  // For now, let's keep the complex logic for scrapbook and RSVP opacity commented out or simplified
  // to ensure the initial elements can be seen.

  let introElementsGroupOpacity = 1; // DIAGNOSTIC: Force intro elements group to be visible
  let introElementsGroupTranslateY = 0; // DIAGNOSTIC: No initial transform
  
  // If you want to test the fade later, uncomment and refine this:
  // if (currentScrollProgress <= composedHoldEndProgress) {
  //   introElementsGroupOpacity = 1;
  //   introElementsGroupTranslateY = 0;
  // } else if (currentScrollProgress > composedHoldEndProgress && currentScrollProgress <= groupFadeOutEndProgress) {
  //   const phaseProgress = (currentScrollProgress - composedHoldEndProgress) / (groupFadeOutEndProgress - composedHoldEndProgress || 0.001);
  //   introElementsGroupOpacity = 1 - phaseProgress;
  //   introElementsGroupTranslateY = phaseProgress * groupFadeOutAnimCtrl.translateYEndVh;
  // } else {
  //   introElementsGroupOpacity = 0;
  //   introElementsGroupTranslateY = groupFadeOutAnimCtrl.translateYEndVh;
  // }

  let scrapbookOverallOpacity = 0; // DIAGNOSTIC: Keep scrapbook hidden for now
  // ... (scrapbook opacity logic commented out for diagnosis)

  let rsvpOpacity = 0; // DIAGNOSTIC: Keep RSVP hidden for now
  let rsvpPointerEvents = 'none';
  // ... (RSVP opacity logic commented out for diagnosis, but we need to see it eventually)
   // Minimal RSVP visibility for testing its presence
   if (currentScrollProgress > 0.8 && currentScrollProgress < 0.95) { // Arbitrary range for testing
       rsvpOpacity = 1;
       rsvpPointerEvents = 'auto';
   }
  // --- END DIAGNOSTIC --- 

  return (
    <div
      ref={journeyWrapperRef}
      className="wedding-journey-wrapper"
      style={{ height: `${totalJourneyVh * 100}vh`, position: 'relative', background: '#fff' }}
    >
      {/* --- Scrapbook Layer (z-index 1) --- */}
      {resolvedScrapbookImages && resolvedScrapbookImages.length > 0 && (
         <div
            className="scrapbook-layer-sticky-container"
            style={{
            position: 'sticky', top: 0, height: '100vh', width: '100%',
            zIndex: 1, overflow: 'hidden',
            opacity: scrapbookOverallOpacity, // Will be 0 for now
            }}
        >
            {resolvedScrapbookImages.map((src, index) => (
            <Parallax
                key={`scrap-${index}`}
                speed={Math.random() * scrapbookParallaxCtrl.strength - (scrapbookParallaxCtrl.strength / 2)}
                style={{ ...generateScrapbookImageStyle(index, resolvedScrapbookImages.length), zIndex: index + 1 }}
            >
                <img src={src} alt={`Scrapbook ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Parallax>
            ))}
        </div>
      )}


      {/* --- Background Layer (z-index 2) --- */}
      <Parallax
        speed={bgControls.bgSpeed / 5} // Adjust speed factor as it's now relative to a shorter animation phase
        scale={[bgControls.bgInitialScale, bgControls.bgFinalScale, bgControls.bgEasing]}
        opacity={[bgControls.bgInitialOpacity, bgControls.bgFinalOpacity, bgControls.bgEasing]} // Let Parallax handle its own opacity for now
        startScroll={0} // Animates from the very beginning
        endScroll={elementsAnimEndProgress} // Completes its animation by end of element anim phase
        style={{
          position: 'sticky', top: 0, zIndex: 2, height: '100vh', width: '100vw',
          // DIAGNOSTIC: backgroundOpacityOverride removed for now
        }}
      >
        <div style={{ backgroundImage: `url(${introBackground})`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100%', width: '100%' }} />
      </Parallax>

      {/* --- Intro Elements Group (z-index 3) --- */}
      <div
        className="intro-elements-group"
        style={{
          position: 'sticky', top: 0, height: '100vh', width: '100%',
          zIndex: 3,
          opacity: introElementsGroupOpacity, // DIAGNOSTIC: Forced to 1 initially
          transform: `translateY(${introElementsGroupTranslateY}vh)`,
          pointerEvents: introElementsGroupOpacity < 0.1 ? 'none' : 'auto',
          transition: 'none', // DIAGNOSTIC: CSS transitions removed for now
        }}
      >
        <Parallax
          translateY={[`${coupleControls.coupleInitialY}vh`, `${coupleControls.coupleFinalY}vh`]}
          scale={[coupleControls.coupleInitialScale, coupleControls.coupleFinalScale]}
          opacity={[1, coupleControls.coupleFinalOpacity]}
          easing={coupleControls.coupleEasing}
          startScroll={elementsAnimEndProgress * coupleControls.animationStartScroll}
          endScroll={elementsAnimEndProgress * coupleControls.animationEndScroll}
          style={{ height: '100%', width: '100%', position: 'absolute', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <img src={introCouple} alt="Couple" style={{ height: `${coupleControls.coupleImageHeightVh}vh`, width: 'auto', maxWidth: '90%', objectFit: 'contain', filter: 'drop-shadow(0px 8px 20px rgba(0,0,0,0.35))' }} />
        </Parallax>

        <Parallax
          translateY={[`${brideNameControls.initialY}vh`, `${brideNameControls.finalY}vh`]}
          scale={[brideNameControls.initialScale, brideNameControls.finalScale]}
          opacity={[1, brideNameControls.finalOpacity]}
          easing={brideNameControls.easing}
          startScroll={elementsAnimEndProgress * brideNameControls.animationStartScroll}
          endScroll={elementsAnimEndProgress * brideNameControls.animationEndScroll}
          style={{ height: '100%', width: '100%', position: 'absolute', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'white' }}
        >
          <div>
            <h1 style={{ fontSize: 'clamp(2.0rem, 7vw, 4.0rem)', margin: 0, fontWeight: 300, lineHeight: 1.2, textShadow: '2px 2px 8px rgba(0,0,0,0.6)' }}>{brideName}</h1>
          </div>
        </Parallax>
        
        <Parallax
          translateY={[`${groomNameControls.initialY}vh`, `${groomNameControls.finalY}vh`]}
          scale={[groomNameControls.initialScale, groomNameControls.finalScale]}
          opacity={[1, groomNameControls.finalOpacity]}
          easing={groomNameControls.easing}
          startScroll={elementsAnimEndProgress * groomNameControls.animationStartScroll}
          endScroll={elementsAnimEndProgress * groomNameControls.animationEndScroll}
          style={{ height: '100%', width: '100%', position: 'absolute', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'white' }}
        >
          <div>
            <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 2.0rem)', margin: '0.1em 0 0.25em 0', fontWeight: 400, textShadow: '2px 2px 8px rgba(0,0,0,0.6)' }}>&</h1>
            <h1 style={{ fontSize: 'clamp(2.0rem, 7vw, 4.0rem)', margin: 0, fontWeight: 300, lineHeight: 1.2, textShadow: '2px 2px 8px rgba(0,0,0,0.6)' }}>{groomName}</h1>
          </div>
        </Parallax>

        <Parallax
          translateY={[`${dateControls.dateInitialY}vh`, `${dateControls.dateFinalY}vh`]}
          scale={[dateControls.dateInitialScale, dateControls.dateFinalScale]}
          opacity={[1, dateControls.dateFinalOpacity]}
          easing={dateControls.dateEasing}
          startScroll={elementsAnimEndProgress * dateControls.animationStartScroll}
          endScroll={elementsAnimEndProgress * dateControls.animationEndScroll}
          style={{ height: '100%', width: '100%', position: 'absolute', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'white' }}
        >
          <p style={{ fontSize: 'clamp(1.0rem, 3.5vw, 1.6rem)', fontWeight: 300, textShadow: '1px 1px 5px rgba(0,0,0,0.6)' }}>{weddingDate}</p>
        </Parallax>
      </div>

      {/* --- RSVP Form (z-index 100) --- */}
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 100,
          opacity: rsvpOpacity, // Will be 0 or 1 based on arbitrary scroll for now
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