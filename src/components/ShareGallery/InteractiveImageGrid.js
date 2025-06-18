import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useSpring, animated } from 'react-spring';
import styles from './InteractiveImageGrid.module.css';

// Custom hook for scroll-based parallax spring
function useScrollSpring(ref) {
  const [spring, api] = useSpring(() => ({
    parallax: 0,
    config: { mass: 1, tension: 180, friction: 26 },
  }));

  useEffect(() => {
    if (!ref.current) return;
    function handleScroll() {
      const rect = ref.current.getBoundingClientRect();
      const windowH = window.innerHeight;
      // Distance from center of viewport, normalized [-1, 1]
      const centerY = rect.top + rect.height / 2;
      const distFromCenter = (centerY - windowH / 2) / (windowH / 2);
      // Clamp and scale for effect
      const clamped = Math.max(-1, Math.min(1, distFromCenter));
      api.start({ parallax: clamped });
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [ref, api]);

  return spring;
}

// Per-tile component
function GridImageTile({
  image,
  index,
  focusedIndex,
  inView,
  getTransformForGridItem,
  onClick,
  setInViewAtIndex,
  cancelFocus,
  isInactive,
}) {
  const ref = useRef(null);
  const spring = useScrollSpring(ref);

  // Intersection Observer for in-view animation
  useEffect(() => {
    if (!ref.current) return;
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInViewAtIndex(index);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [index, setInViewAtIndex]);

  // Classic tilt values for this tile
  const classicTilt = getTransformForGridItem(index, true); // true = get raw tilt values

  // Compute transform
  const logTransform = (p) => {
    if (!isInactive) {
      // Active: snap together, no tilt, no parallax
      return 'rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)';
    } else {
      // Inactive: blend classic tilt and parallax (add parallax to Y axis)
      // classicTilt: { x, y, z }
      const yWithParallax = classicTilt.y + p * 45; // Blend parallax into Y
      return `rotateX(${classicTilt.x}deg) rotateY(${yWithParallax}deg) rotateZ(${classicTilt.z}deg) scale(0.9)`;
    }
  };

  return (
    <animated.div
      key={image.id || index}
      ref={ref}
      className={
        styles.gridItem +
        (inView ? ' ' + styles.inView : '')
      }
      style={{
        transform: spring.parallax.to(logTransform),
        transition: 'transform 0.5s cubic-bezier(.4,2,.6,1), opacity 0.5s cubic-bezier(.4,2,.6,1)',
        opacity: focusedIndex === index ? 0 : 1,
      }}
      onClick={() => {
        if (focusedIndex === index && cancelFocus) {
          cancelFocus();
        } else {
          onClick(index);
        }
      }}
    >
      <img src={image.url} alt={`Uploaded by ${image.uploadedBy}`} />
      <div className={styles.uploaderInfo}>{image.uploadedBy || 'Anonymous'}</div>
    </animated.div>
  );
}

const InteractiveImageGrid = ({ images, onFocusImage, focusedIndex, cancelFocus }) => {
  const [isInactive, setIsInactive] = React.useState(false);
  const inactivityTimer = useRef(null);
  const gridRef = useRef(null);
  const [inViewArr, setInViewArr] = useState([]);

  useEffect(() => {
    setInViewArr(Array(images.length).fill(false));
  }, [images.length]);

  // Set inView for a specific index (for animation)
  const setInViewAtIndex = useCallback((idx) => {
    setInViewArr(prev => {
      if (prev[idx]) return prev;
      const next = [...prev];
      next[idx] = true;
      return next;
    });
  }, []);

  // Inactivity timer logic (allow tilt even when focused)
  const resetInactivityTimer = useCallback(() => {
    setIsInactive(false);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      setIsInactive(true);
    }, 3000);
  }, []);

  useEffect(() => {
    resetInactivityTimer();
    const events = ['mousemove', 'mousedown', 'keypress', 'touchmove', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetInactivityTimer));
    return () => {
      events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetInactivityTimer]);

  // Classic tilt values for each tile
  const getClassicTilt = useCallback((index) => {
    const numColumns = 2;
    const rowIndex = Math.floor(index / numColumns);
    const colIndex = index % numColumns;
    const x = rowIndex % 2 === 0 ? 8 : -8;
    const y = colIndex === 0 ? -8 : 8;
    const z = (index % 4 - 2) * 2;
    return { x, y, z };
  }, []);

  // getTransformForGridItem returns either classic tilt values or a string
  const getTransformForGridItem = useCallback((index, asObject = false) => {
    if (asObject) return getClassicTilt(index);
    if (!isInactive) return 'rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)';
    const { x, y, z } = getClassicTilt(index);
    return `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg) scale(0.9)`;
  }, [isInactive, getClassicTilt]);

  // Handle image click: send data to parent
  const handleImageClick = (index) => {
    resetInactivityTimer();
    // Focus logic unchanged
    const el = document.querySelectorAll('.' + styles.gridItem)[index];
    if (!el) return;
    const domRect = el.getBoundingClientRect();
    const spreadRect = {
      top: domRect.top,
      left: domRect.left,
      width: domRect.width,
      height: domRect.height,
      right: domRect.right,
      bottom: domRect.bottom,
      x: domRect.x,
      y: domRect.y,
    };
    const startTransform = 'scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)';
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const imgEl = el.querySelector('img');
    const aspect = (imgEl && imgEl.naturalWidth > 0) ? imgEl.naturalHeight / imgEl.naturalWidth : (spreadRect.height / spreadRect.width);
    const targetW = Math.min(screenW * 0.9, 800);
    const targetH = targetW * aspect;
    const endRect = {
      top: (screenH - targetH) / 2,
      left: (screenW - targetW) / 2,
      width: targetW,
      height: targetH,
    };
    if (onFocusImage) {
      onFocusImage({
        url: images[index].url,
        uploader: images[index].uploadedBy,
        startRect: spreadRect,
        startTransform,
        endRect,
        index,
      });
      console.log('[GRID] onFocusImage called:', {
        url: images[index].url,
        startRect: spreadRect,
        startTransform,
        endRect,
        index,
      });
    }
  };

  return (
    <div className={styles.gridWrapper}>
      <div ref={gridRef} className={styles.gridContainer}>
        {images.map((image, index) => (
          <GridImageTile
            key={image.id || index}
            image={image}
            index={index}
            focusedIndex={focusedIndex}
            inView={inViewArr[index]}
            getTransformForGridItem={getTransformForGridItem}
            onClick={handleImageClick}
            setInViewAtIndex={setInViewAtIndex}
            cancelFocus={cancelFocus}
            isInactive={isInactive}
          />
        ))}
      </div>
    </div>
  );
};

export default InteractiveImageGrid;