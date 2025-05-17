import React, { useRef, useEffect, useState } from 'react';
import { Parallax } from 'react-scroll-parallax';
import { useControls, folder } from 'leva';
import RSVPForm from './RSVPForm';
import ParallaxLogging from './ParallaxLogging';

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
    bgInitialOpacity: { value: 1.0, min: 0, max: 1, step: 0.01 },
    bgFinalOpacity: { value: 1.0, min: 0, max: 1, step: 0.01 },
    bgSpeed: { value: -20, min: -100, max: 30, step: 1 },
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

  const totalJourneyVh = elementsAnimLenActualVh + composedHoldActualVh + groupFadeOutActualVh + scrapbookActiveActualVh + mainContentActualVh;

  const elementsAnimEndProgress = totalJourneyVh > 0 ? elementsAnimLenActualVh / totalJourneyVh : 0;
  const composedHoldEndProgress = elementsAnimEndProgress + (composedHoldActualVh / totalJourneyVh);
  const groupFadeOutEndProgress = composedHoldEndProgress + (groupFadeOutActualVh / totalJourneyVh);
  const scrapbookStartActualProgress = groupFadeOutEndProgress - (groupFadeOutActualVh * (1 - journeyPhasesCtrl.scrapbookRevealStartFactor) / totalJourneyVh) ; //Scrapbook starts during fade out of intro
  const scrapbookEndProgress = groupFadeOutEndProgress + (scrapbookActiveActualVh / totalJourneyVh);
  const rsvpAppearStartProgress = scrapbookStartActualProgress + ( (scrapbookEndProgress - scrapbookStartActualProgress) * journeyPhasesCtrl.rsvpAppearanceStartFactor );

  // Log key progress markers once
  useEffect(() => {
    console.log('[WeddingJourney] Key Scroll Progress Markers Initialized:');
    console.log(`  - Elements Animation End: ${elementsAnimEndProgress.toFixed(3)}`);
    console.log(`  - Composed Scene Hold End: ${composedHoldEndProgress.toFixed(3)}`);
    console.log(`  - Group Fade Out End (Intro Vanishes): ${groupFadeOutEndProgress.toFixed(3)}`);
    console.log(`  - Scrapbook Reveal Start: ${scrapbookStartActualProgress.toFixed(3)}`);
    console.log(`  - Scrapbook End: ${scrapbookEndProgress.toFixed(3)}`);
    console.log(`  - RSVP Appearance Start: ${rsvpAppearStartProgress.toFixed(3)}`);
    console.log(`  - Total Journey Scroll Height (x Window Height): ${totalJourneyVh.toFixed(2)}VH`);
  }, [elementsAnimEndProgress, composedHoldEndProgress, groupFadeOutEndProgress, scrapbookStartActualProgress, scrapbookEndProgress, rsvpAppearStartProgress, totalJourneyVh]);

  useEffect(() => {
    const wrapper = journeyWrapperRef.current;
    if (!wrapper) return;
    const handleScroll = () => {
      const scrollTop = window.scrollY - (wrapper.offsetTop || 0); 
      const scrollHeight = wrapper.scrollHeight - window.innerHeight;
      let progress = 0;
      if (scrollHeight > 0) {
        progress = Math.min(1, Math.max(0, scrollTop / scrollHeight));
      } else {
        progress = (wrapper.getBoundingClientRect().top >= 0) ? 0 : 1;
      }
      setCurrentScrollProgress(progress);
      // console.log(`[WeddingJourney] currentScrollProgress: ${progress.toFixed(3)}`); // Logged by ParallaxLogger now
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [totalJourneyVh]);

  // --- COMPOSED INTRO SCENE OPACITY AND TRANSLATE ---
  let composedIntroSceneOpacity;
  let composedIntroSceneTranslateY;

  if (currentScrollProgress <= composedHoldEndProgress) {
    composedIntroSceneOpacity = 1;
    composedIntroSceneTranslateY = 0;
  } else if (currentScrollProgress > composedHoldEndProgress && currentScrollProgress <= groupFadeOutEndProgress) {
    const phaseProgress = Math.max(0, Math.min(1, (currentScrollProgress - composedHoldEndProgress) / (groupFadeOutEndProgress - composedHoldEndProgress || 0.001)));
    composedIntroSceneOpacity = 1 - phaseProgress; // Fade out
    composedIntroSceneTranslateY = phaseProgress * groupFadeOutAnimCtrl.translateYEndVh;
  } else {
    composedIntroSceneOpacity = 0; // Fully faded out and potentially moved
    composedIntroSceneTranslateY = groupFadeOutAnimCtrl.translateYEndVh;
  }
  
  // --- SCRAPBOOK OPACITY ---
  let scrapbookOverallOpacity = 0;
  if (currentScrollProgress >= scrapbookStartActualProgress && currentScrollProgress <= scrapbookEndProgress) {
    // Fade in scrapbook fully once it starts, then it stays until its end point
    // For a more gradual fade-in, you could use phaseProgress within this range
    scrapbookOverallOpacity = scrapbookParallaxCtrl.baseOpacity;
  } else if (currentScrollProgress > scrapbookEndProgress) {
    scrapbookOverallOpacity = 0; // Or fade out if desired
  }
  
  // --- RSVP OPACITY ---
  let rsvpOpacity = 0;
  let rsvpPointerEvents = 'none';
  if (currentScrollProgress >= rsvpAppearStartProgress && currentScrollProgress < 0.98 ) { // Keep RSVP visible until almost end of scroll
       rsvpOpacity = 1;
       rsvpPointerEvents = 'auto';
  } else if (currentScrollProgress >= 0.98) {
      rsvpOpacity = 0; // Fade out RSVP at the very end
      rsvpPointerEvents = 'none';
  }

  // --- Tracked Animations for ParallaxLogger ---
  const trackedAnimations = [
    {
      label: 'Background Appearance',
      startProgressMarker: 0,
      endProgressMarker: elementsAnimEndProgress, // BG animates alongside other elements
      initialOpacity: bgControls.bgInitialOpacity,
      finalOpacity: bgControls.bgFinalOpacity
    },
    {
      label: 'Couple Image Fade In',
      startProgressMarker: elementsAnimEndProgress * coupleControls.animationStartScroll,
      endProgressMarker: elementsAnimEndProgress * coupleControls.animationEndScroll,
      initialOpacity: coupleControls.coupleInitialOpacity, // Use Leva value
      finalOpacity: coupleControls.coupleFinalOpacity
    },
    {
      label: 'Bride Name Fade In',
      startProgressMarker: elementsAnimEndProgress * brideNameControls.animationStartScroll,
      endProgressMarker: elementsAnimEndProgress * brideNameControls.animationEndScroll,
      initialOpacity: brideNameControls.initialOpacity, // Use Leva value
      finalOpacity: brideNameControls.finalOpacity
    },
    {
      label: 'Groom Name Fade In',
      startProgressMarker: elementsAnimEndProgress * groomNameControls.animationStartScroll,
      endProgressMarker: elementsAnimEndProgress * groomNameControls.animationEndScroll,
      initialOpacity: groomNameControls.initialOpacity, // Use Leva value
      finalOpacity: groomNameControls.finalOpacity
    },
    {
      label: 'Date Text Fade In',
      startProgressMarker: elementsAnimEndProgress * dateControls.animationStartScroll,
      endProgressMarker: elementsAnimEndProgress * dateControls.animationEndScroll,
      initialOpacity: dateControls.dateInitialOpacity, // Use Leva value
      finalOpacity: dateControls.dateFinalOpacity
    },
    {
      label: 'Composed Intro Scene Fade Out',
      startProgressMarker: composedHoldEndProgress,
      endProgressMarker: groupFadeOutEndProgress,
      initialOpacity: 1,
      finalOpacity: 0
    },
    {
      label: 'Scrapbook Appears',
      startProgressMarker: scrapbookStartActualProgress,
      endProgressMarker: scrapbookStartActualProgress + 0.001, // Appears quickly
      initialOpacity: 0,
      finalOpacity: scrapbookParallaxCtrl.baseOpacity
    },
    {
      label: 'RSVP Form Appears',
      startProgressMarker: rsvpAppearStartProgress,
      endProgressMarker: rsvpAppearStartProgress + 0.001, // Appears quickly
      initialOpacity: 0,
      finalOpacity: 1
    }
  ];

  return (
    <div
      ref={journeyWrapperRef}
      className="wedding-journey-wrapper"
      style={{ height: `${totalJourneyVh * 100}vh`, position: 'relative', background: '#fff' }}
    >
      <ParallaxLogging currentScrollProgress={currentScrollProgress} trackedAnimations={trackedAnimations} />

      {/* --- Composed Intro Scene Wrapper (handles collective fade-out) --- */}
      <div 
        className="composed-intro-scene-wrapper"
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: '100%',
          zIndex: 10, // Above scrapbook initially
          opacity: composedIntroSceneOpacity,
          transform: `translateY(${composedIntroSceneTranslateY}vh)`,
          transition: 'opacity 0.3s ease-out, transform 0.3s ease-out', // Smooth transition for fade
          pointerEvents: composedIntroSceneOpacity < 0.1 ? 'none' : 'auto',
        }}
      >
        {/* Background Layer (Child of Composed Scene) */}
        <Parallax
          speed={bgControls.bgSpeed / 5} 
          scale={[bgControls.bgInitialScale, bgControls.bgFinalScale, bgControls.bgEasing]}
          opacity={[bgControls.bgInitialOpacity, bgControls.bgFinalOpacity, bgControls.bgEasing]}
          startScroll={0} 
          endScroll={elementsAnimEndProgress} 
          style={{
            position: 'absolute', top: 0, left: 0, zIndex: 1, height: '100%', width: '100%',
          }}
        >
          <div style={{ backgroundImage: `url(${introBackground})`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100%', width: '100%' }} />
        </Parallax>

        {/* Intro Elements Group (Child of Composed Scene) */}
        <div
          className="intro-elements-group"
          style={{
            position: 'absolute', top: 0, left: 0, height: '100%', width: '100%',
            zIndex: 2,
            // Opacity and transform are now handled by 'composed-intro-scene-wrapper'
          }}
        >
          <Parallax
            translateY={[`${coupleControls.coupleInitialY}vh`, `${coupleControls.coupleFinalY}vh`]}
            scale={[coupleControls.coupleInitialScale, coupleControls.coupleFinalScale]}
            opacity={[1, 1]}
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
            opacity={[brideNameControls.initialOpacity, brideNameControls.finalOpacity]} // Reverted
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
            opacity={[groomNameControls.initialOpacity, groomNameControls.finalOpacity]} // Reverted
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
            opacity={[dateControls.dateInitialOpacity, dateControls.dateFinalOpacity]} // Reverted
            easing={dateControls.dateEasing}
            startScroll={elementsAnimEndProgress * dateControls.animationStartScroll}
            endScroll={elementsAnimEndProgress * dateControls.animationEndScroll}
            style={{ height: '100%', width: '100%', position: 'absolute', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'white' }}
          >
            <p style={{ fontSize: 'clamp(1.0rem, 3.5vw, 1.6rem)', fontWeight: 300, textShadow: '1px 1px 5px rgba(0,0,0,0.6)' }}>{weddingDate}</p>
          </Parallax>
        </div>
      </div>
      
      {/* --- Scrapbook Layer (z-index 1, appears under fading intro) --- */}
      {resolvedScrapbookImages && resolvedScrapbookImages.length > 0 && (
         <div
            className="scrapbook-layer-sticky-container"
            style={{
            position: 'sticky', top: 0, height: '100vh', width: '100%',
            zIndex: 1, // Lower z-index than composed intro, revealed as intro fades
            overflow: 'hidden',
            opacity: scrapbookOverallOpacity, 
            transition: 'opacity 0.5s ease-in-out',
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

      {/* --- RSVP Form (z-index 100) --- */}
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 100, // High z-index for modal-like appearance
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