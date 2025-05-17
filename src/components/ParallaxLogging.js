import { useEffect, useRef } from 'react';

const ParallaxLogging = ({ currentScrollProgress, trackedAnimations }) => {
  const loggedScrollIncrements = useRef(new Set());
  const loggedAnimationEvents = useRef(new Set());
  const prevScrollProgress = useRef(currentScrollProgress);

  useEffect(() => {
    // Log 5% increments
    const currentPercent = Math.floor(currentScrollProgress * 20) * 5; // 0, 5, 10... up to 100
    const scrollKey = `scroll-${currentPercent}`;

    if (!loggedScrollIncrements.current.has(scrollKey) && currentPercent <= 100) {
      console.log(`[ParallaxLogger] Scroll Progress: ${currentPercent}% (raw: ${currentScrollProgress.toFixed(3)})`);
      loggedScrollIncrements.current.add(scrollKey);
    }

    // Log animation events
    trackedAnimations.forEach(anim => {
      const startEventKey = `${anim.label}-start`;
      const endEventKey = `${anim.label}-end`;

      // Ensure progress markers are valid numbers
      const startMarker = parseFloat(anim.startProgressMarker);
      const endMarker = parseFloat(anim.endProgressMarker);

      if (isNaN(startMarker) || isNaN(endMarker)) {
        if (!loggedAnimationEvents.current.has(`${anim.label}-invalid`)) {
          console.warn(`[ParallaxLogger] Invalid progress markers for ${anim.label}: start=${anim.startProgressMarker}, end=${anim.endProgressMarker}`);
          loggedAnimationEvents.current.add(`${anim.label}-invalid`);
        }
        return; // Skip this animation if markers are invalid
      }

      // ---- Check for START event ----
      // Condition: Current progress is at or past the start marker, AND previous progress was before the start marker.
      if (currentScrollProgress >= startMarker && prevScrollProgress.current < startMarker) {
        if (!loggedAnimationEvents.current.has(startEventKey)) {
          console.log(`[ParallaxLogger] EVENT START: "${anim.label}" opacity changing from ${anim.initialOpacity} towards ${anim.finalOpacity}. (Scroll: ${currentScrollProgress.toFixed(3)} >= Marker: ${startMarker.toFixed(3)})`);
          loggedAnimationEvents.current.add(startEventKey);
        }
      }
      // Condition: Scrolled back BEFORE the start marker, after it was logged. Reset for re-logging.
      else if (currentScrollProgress < startMarker && loggedAnimationEvents.current.has(startEventKey)) {
        console.log(`[ParallaxLogger] EVENT REVERSED: "${anim.label}" scrolled back BEFORE start. (Scroll: ${currentScrollProgress.toFixed(3)} < Marker: ${startMarker.toFixed(3)})`);
        loggedAnimationEvents.current.delete(startEventKey);
      }

      // ---- Check for END event ----
      // Condition: Current progress is at or past the end marker, AND previous progress was before the end marker.
      if (currentScrollProgress >= endMarker && prevScrollProgress.current < endMarker) {
        if (!loggedAnimationEvents.current.has(endEventKey)) {
          console.log(`[ParallaxLogger] EVENT END: "${anim.label}" opacity finished at ${anim.finalOpacity}. (Scroll: ${currentScrollProgress.toFixed(3)} >= Marker: ${endMarker.toFixed(3)})`);
          loggedAnimationEvents.current.add(endEventKey);
        }
      }
      // Condition: Scrolled back BEFORE the end marker, after it was logged. Reset for re-logging.
      else if (currentScrollProgress < endMarker && loggedAnimationEvents.current.has(endEventKey)) {
         console.log(`[ParallaxLogger] EVENT REVERSED: "${anim.label}" scrolled back BEFORE end. (Scroll: ${currentScrollProgress.toFixed(3)} < Marker: ${endMarker.toFixed(3)})`);
         loggedAnimationEvents.current.delete(endEventKey);
      }
    });

    prevScrollProgress.current = currentScrollProgress;

    // Reset 5% scroll log if scrolling back to 0 to allow re-logging from start
    if (currentScrollProgress < 0.01) {
        loggedScrollIncrements.current.clear();
    }

  }, [currentScrollProgress, trackedAnimations]);

  // This component does not render anything
  return null;
};

export default ParallaxLogging; 