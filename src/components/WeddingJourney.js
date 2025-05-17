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
    // opacity: 0.85, // Opacity for scrapbook images is handled by scrapbookOverallOpacity now
  };
};

const WeddingJourney = ({ weddingData, resolvedScrapbookImages }) => {
  const {
    brideName, groomName, weddingDate,
    introBackground, introCouple,
    rsvpEndpoint
  } = weddingData;

  // --- LEVA CONTROLS ---
  const { introDurationScrollVh } = useControls('Overall Intro', {
    introDurationScrollVh: { value: 2.0, min: 1.0, max: 4.0, step: 0.1, label: '1. Intro Length (xVH)' }
  });
  // IMPORTANT: Assuming your Leva controls for bgControls, coupleControls, etc. are defined as you had them.
  // I'll reference them here. Make sure they are actually defined in your version of the file.
  // If not, you'll need to uncomment and use the Leva definitions from the previous correct version.
  // For brevity, I'm assuming they exist. Example:
  const bgControls = useControls('Background Layer', {
    bgInitialScale: { value: 1.0, min: 0.5, max: 2, step: 0.01 },
    bgFinalScale: { value: 1.3, min: 0.5, max: 2, step: 0.01 },
    bgInitialOpacity: { value: 0.6, min: 0, max: 1, step: 0.01 },
    bgFinalOpacity: { value: 1, min: 0, max: 1, step: 0.01 },
    bgSpeed: { value: -25, min: -100, max: 30, step: 1 },
    bgEasing: { value: 'easeOutCubic', options: easingPresets },
  });
  const coupleControls = useControls('Couple Image Layer', {
    coupleInitialY: { value: 50, min: -50, max: 100, step: 1, label: 'Start Y (vh from center)' },
    coupleFinalY: { value: 28, min: -50, max: 50, step: 1, label: 'End Y (vh from center)' },
    coupleInitialScale: { value: 0.5, min: 0.1, max: 2, step: 0.01 },
    coupleFinalScale: { value: 1.59, min: 0.1, max: 2, step: 0.01 },
    coupleImageHeightVh: { value: 65, min: 20, max: 100, step: 1, label: 'Image Height (vh)'},
    coupleInitialOpacity: { value: 0, min: 0, max: 1, step: 0.01 },
    coupleFinalOpacity: { value: 1, min: 0, max: 1, step: 0.01 },
    coupleAnimationStartScroll: { value: 0.0, min: 0, max: 1, step: 0.01, label: 'Anim Start Scroll %' },
    coupleAnimationEndScroll: { value: 0.65, min: 0, max: 1, step: 0.01, label: 'Anim End Scroll %' },
    coupleEasing: { value: 'easeOutCubic', options: easingPresets },
  });
  const namesControls = useControls('Names Text Layer', {
    namesInitialY: { value: 0, min: -50, max: 50, step: 1, label: 'Start Y (vh from center)' },
    namesFinalY: { value: -22, min: -50, max: 50, step: 1, label: 'End Y (vh from center)' },
    namesInitialScale: { value: 0.8, min: 0.5, max: 1.5, step: 0.01 },
    namesFinalScale: { value: 1, min: 0.5, max: 1.5, step: 0.01 },
    namesInitialOpacity: { value: 0, min: 0, max: 1, step: 0.01 },
    namesFinalOpacity: { value: 1, min: 0, max: 1, step: 0.01 },
    namesAnimationStartScroll: { value: 0.35, min: 0, max: 1, step: 0.01 },
    namesAnimationEndScroll: { value: 0.85, min: 0, max: 1, step: 0.01 },
    namesEasing: { value: 'easeOutCubic', options: easingPresets },
  });
  const dateControls = useControls('Date Text Layer', {
    dateInitialY: { value: 0, min: -50, max: 50, step: 1, label: 'Start Y (vh from center)' },
    dateFinalY: { value: -16, min: -50, max: 50, step: 1, label: 'End Y (vh from center)' },
    dateInitialScale: { value: 0.7, min: 0.5, max: 1.5, step: 0.01 },
    dateFinalScale: { value: 1, min: 0.5, max: 1.5, step: 0.01 },
    dateInitialOpacity: { value: 0, min: 0, max: 1, step: 0.01 },
    dateFinalOpacity: { value: 1, min: 0, max: 1, step: 0.01 },
    dateAnimationStartScroll: { value: 0.45, min: 0, max: 1, step: 0.01 },
    dateAnimationEndScroll: { value: 0.90, min: 0, max: 1, step: 0.01 },
    dateEasing: { value: 'easeOutBack', options: easingPresets },
  });


  const journeyCtrl = useControls('Journey Phases', {
    introHoldFactor: { value: 0.2, min: 0.0, max: 0.5, step: 0.05, label: '2. Intro Hold (xIntroLen)' },
    introFadeOutFactor: { value: 0.3, min: 0.1, max: 0.5, step: 0.05, label: '3. Intro Fade (xIntroLen)' },
    scrapbookRevealFactor: { value: 0.1, min: 0.0, max: 0.3, step: 0.05, label: '4. Scrapbook Reveal Overlap (xIntroLen)'},
    rsvpAppearanceFactor: { value: 0.2, min: 0.1, max: 0.5, step: 0.05, label: '5. RSVP Appear (xIntroLen)'},
    mainContentScrollFactor: { value: 1.0, min: 0.5, max: 3.0, step: 0.1, label: '6. Main Scroll (xVH)' },
  });
  
  const scrapbookParallaxCtrl = useControls('Scrapbook Parallax', {
    strength: { value: 10, min: 0, max: 50, step: 1 },
    opacityStart: {value: 0.2, min: 0, max: 1, step: 0.01},
    opacityEnd: {value: 0.85, min: 0, max: 1, step: 0.01},
  });

  const introElementsFadeCtrl = useControls('Intro Elements Fade Out', {
    opacityStartFactor: { value: 0.0, min: 0.0, max: 1.0, step: 0.01, label: 'Opacity Start (0-1 of fade phase)'},
    opacityEndFactor: { value: 1.0, min: 0.0, max: 1.0, step: 0.01, label: 'Opacity End (0-1 of fade phase)'},
    translateYEndVh: { value: -30, min: -100, max: 100, step: 1, label: 'Translate Y End (vh)'},
  });

  const journeyWrapperRef = useRef(null);
  const [currentScrollProgress, setCurrentScrollProgress] = useState(0);

  const introPhaseVh = introDurationScrollVh;
  const holdPhaseVh = introPhaseVh * journeyCtrl.introHoldFactor;
  const fadeOutPhaseVh = introPhaseVh * journeyCtrl.introFadeOutFactor;
  const mainContentVh = journeyCtrl.mainContentScrollFactor;
  const totalJourneyVh = introPhaseVh + holdPhaseVh + fadeOutPhaseVh + mainContentVh;

  useEffect(() => {
    const wrapper = journeyWrapperRef.current;
    if (!wrapper) return;
    const handleScroll = () => {
      const rect = wrapper.getBoundingClientRect();
      const scrollTop = -rect.top;
      const scrollHeight = wrapper.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const progress = Math.min(1, Math.max(0, scrollTop / scrollHeight));
        setCurrentScrollProgress(progress);
      } else {
        setCurrentScrollProgress(rect.top >= 0 ? 0 : 1);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [totalJourneyVh]);

  const introEndProgress = introPhaseVh / totalJourneyVh;
  const holdEndProgress = (introPhaseVh + holdPhaseVh) / totalJourneyVh;
  const fadeOutEndProgress = (introPhaseVh + holdPhaseVh + fadeOutPhaseVh) / totalJourneyVh;
  const scrapbookRevealStartProgress = Math.max(0, introEndProgress - (introPhaseVh * journeyCtrl.scrapbookRevealFactor) / totalJourneyVh);
  const rsvpAppearanceStartProgress = holdEndProgress;
  const rsvpFullyVisibleProgress = fadeOutEndProgress;

  let introElementsOpacity = 1;
  let introElementsTranslateY = 0;
  if (currentScrollProgress > holdEndProgress && currentScrollProgress <= fadeOutEndProgress) {
    const fadePhaseProgress = (currentScrollProgress - holdEndProgress) / (fadeOutEndProgress - holdEndProgress || 0.001);
    const opacityProgress = Math.max(0, Math.min(1, (fadePhaseProgress - introElementsFadeCtrl.opacityStartFactor) / (introElementsFadeCtrl.opacityEndFactor - introElementsFadeCtrl.opacityStartFactor || 1)));
    introElementsOpacity = 1 - opacityProgress;
    introElementsTranslateY = opacityProgress * introElementsFadeCtrl.translateYEndVh;
  } else if (currentScrollProgress > fadeOutEndProgress) {
    introElementsOpacity = 0;
    introElementsTranslateY = introElementsFadeCtrl.translateYEndVh;
  }

  let rsvpOpacity = 0;
  let rsvpPointerEvents = 'none';
  if (currentScrollProgress >= rsvpAppearanceStartProgress) {
    const rsvpPhaseProgress = (currentScrollProgress - rsvpAppearanceStartProgress) / (rsvpFullyVisibleProgress - rsvpAppearanceStartProgress || 0.001);
    rsvpOpacity = Math.min(1, Math.max(0, rsvpPhaseProgress));
    rsvpPointerEvents = rsvpOpacity > 0.5 ? 'auto' : 'none';
  }

  let scrapbookOverallOpacity = 0;
  if (currentScrollProgress >= scrapbookRevealStartProgress) {
    const scrapbookPhaseProgress = (currentScrollProgress - scrapbookRevealStartProgress) / ((fadeOutEndProgress + 0.05) - scrapbookRevealStartProgress || 0.001);
    scrapbookOverallOpacity = Math.min(1, Math.max(0, scrapbookPhaseProgress)) * (scrapbookParallaxCtrl.opacityEnd - scrapbookParallaxCtrl.opacityStart) + scrapbookParallaxCtrl.opacityStart;
  }

  return (
    <div
      ref={journeyWrapperRef}
      className="wedding-journey-wrapper"
      style={{ height: `${totalJourneyVh * 100}vh`, position: 'relative', background: '#fff' }}
    >
      <div
        className="scrapbook-layer-sticky-container"
        style={{
          position: 'sticky', top: 0, height: '100vh', width: '100%',
          zIndex: 1, overflow: 'hidden',
          opacity: scrapbookOverallOpacity,
        }}
      >
        {(resolvedScrapbookImages || []).map((src, index) => (
          <Parallax
            key={`scrap-${index}`}
            speed={Math.random() * scrapbookParallaxCtrl.strength - (scrapbookParallaxCtrl.strength / 2)}
            style={{ ...generateScrapbookImageStyle(index, resolvedScrapbookImages.length), zIndex: index + 1, opacity: 1 }}
          >
            <img
              src={src}
              alt={`Scrapbook ${index + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Parallax>
        ))}
      </div>

      <Parallax
        speed={bgControls.bgSpeed / 5}
        scale={[bgControls.bgInitialScale, bgControls.bgFinalScale, bgControls.bgEasing]} // Easing added
        opacity={[bgControls.bgInitialOpacity, (currentScrollProgress > introEndProgress ? 0 : bgControls.bgFinalOpacity), bgControls.bgEasing]} // Easing added
        startScroll={0}
        endScroll={holdEndProgress}
        // Removed direct easing prop
        style={{ position: 'sticky', top: 0, zIndex: 2, height: '100vh', width: '100vw' }}
      >
        <div style={{ backgroundImage: `url(${introBackground})`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100%', width: '100%' }} />
      </Parallax>

      <div
        className="intro-elements-group"
        style={{
          position: 'sticky', top: 0, height: '100vh', width: '100%',
          zIndex: 3,
          opacity: introElementsOpacity,
          transform: `translateY(${introElementsTranslateY}vh)`,
          pointerEvents: introElementsOpacity < 0.1 ? 'none' : 'auto',
          transition: introElementsOpacity < 1 && introElementsOpacity > 0 ? 'opacity 0.4s ease-out, transform 0.4s ease-out' : 'none',
        }}
      >
        <Parallax
          translateY={[`${coupleControls.coupleInitialY}vh`, `${coupleControls.coupleFinalY}vh`, coupleControls.coupleEasing]}
          scale={[coupleControls.coupleInitialScale, coupleControls.coupleFinalScale, coupleControls.coupleEasing]}
          opacity={[coupleControls.coupleInitialOpacity, coupleControls.coupleFinalOpacity, coupleControls.coupleEasing]}
          startScroll={introEndProgress * coupleControls.coupleAnimationStartScroll} // Adjusted start for overall journey
          endScroll={introEndProgress * coupleControls.coupleAnimationEndScroll}     // Adjusted end for overall journey
          // Removed direct easing prop
          style={{ height: '100%', width: '100%', position: 'absolute', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <img src={introCouple} alt="Couple" style={{ height: `${coupleControls.coupleImageHeightVh}vh`, width: 'auto', maxWidth: '90%', objectFit: 'contain', filter: 'drop-shadow(0px 8px 20px rgba(0,0,0,0.35))' }} />
        </Parallax>

        <Parallax
          translateY={[`${namesControls.namesInitialY}vh`, `${namesControls.namesFinalY}vh`, namesControls.namesEasing]}
          scale={[namesControls.namesInitialScale, namesControls.namesFinalScale, namesControls.namesEasing]}
          opacity={[namesControls.namesInitialOpacity, namesControls.namesFinalOpacity, namesControls.namesEasing]}
          startScroll={introEndProgress * namesControls.namesAnimationStartScroll}
          endScroll={introEndProgress * namesControls.namesAnimationEndScroll}
          // Removed direct easing prop
          style={{ height: '100%', width: '100%', position: 'absolute', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'white' }}
        >
          <div>
            <h1 style={{ fontSize: 'clamp(2.0rem, 7vw, 4.0rem)', margin: 0, fontWeight: 300, lineHeight: 1.2, textShadow: '2px 2px 8px rgba(0,0,0,0.6)' }}>{brideName}</h1>
            <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 2.0rem)', margin: '0.1em 0 0.25em 0', fontWeight: 400, textShadow: '2px 2px 8px rgba(0,0,0,0.6)' }}>&</h1>
            <h1 style={{ fontSize: 'clamp(2.0rem, 7vw, 4.0rem)', margin: 0, fontWeight: 300, lineHeight: 1.2, textShadow: '2px 2px 8px rgba(0,0,0,0.6)' }}>{groomName}</h1>
          </div>
        </Parallax>

        <Parallax
          translateY={[`${dateControls.dateInitialY}vh`, `${dateControls.dateFinalY}vh`, dateControls.dateEasing]}
          scale={[dateControls.dateInitialScale, dateControls.dateFinalScale, dateControls.dateEasing]}
          opacity={[dateControls.dateInitialOpacity, dateControls.dateFinalOpacity, dateControls.dateEasing]}
          startScroll={introEndProgress * dateControls.dateAnimationStartScroll}
          endScroll={introEndProgress * dateControls.dateAnimationEndScroll}
          // Removed direct easing prop
          style={{ height: '100%', width: '100%', position: 'absolute', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: 'white' }}
        >
          <p style={{ fontSize: 'clamp(1.0rem, 3.5vw, 1.6rem)', fontWeight: 300, textShadow: '1px 1px 5px rgba(0,0,0,0.6)' }}>{weddingDate}</p>
        </Parallax>
      </div>

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
        <RSVPForm weddingId={weddingData.id} backendUrl={rsvpEndpoint} />
      </div>
    </div>
  );
};

export default WeddingJourney;