import React, { useEffect, useRef, useCallback } from 'react';
import styles from './InteractiveImageGrid.module.css';

const InteractiveImageGrid = ({ images, onFocusImage, focusedIndex }) => {
  const [isInactive, setIsInactive] = React.useState(false);
  const inactivityTimer = useRef(null);
  const gridRef = useRef(null);
  const imageRefs = useRef([]);

  useEffect(() => {
    imageRefs.current = Array(images.length).fill().map((_, i) => imageRefs.current[i] || React.createRef());
  }, [images.length]);

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

  // Calculate transform for grid item
  const getTransformForGridItem = useCallback((index) => {
    if (!isInactive || !gridRef.current) return 'rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)';
    const gridComputedStyle = window.getComputedStyle(gridRef.current);
    const numColumns = gridComputedStyle.getPropertyValue('grid-template-columns').split(' ').length;
    if (numColumns === 0) return 'scale(0.9)';
    const rowIndex = Math.floor(index / numColumns);
    const colIndex = index % numColumns;
    const xAngle = rowIndex % 2 === 0 ? 8 : -8;
    const yAngle = (colIndex - (numColumns - 1) / 2) * 2;
    const zAngle = (index % 7 - 3) * -1;
    const scale = 'scale(0.9)';
    return `rotateX(${xAngle}deg) rotateY(${yAngle}deg) rotateZ(${zAngle}deg) ${scale}`;
  }, [isInactive]);

  // Handle image click: send data to parent
  const handleImageClick = (index) => {
    resetInactivityTimer();
    const el = imageRefs.current[index]?.current;
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
    <div ref={gridRef} className={styles.gridContainer}>
      {images.map((image, index) => (
        <div
          key={image.id || index}
          ref={imageRefs.current[index]}
          className={styles.gridItem}
          style={{
            transform: getTransformForGridItem(index),
            transition: 'transform 0.5s ease, opacity 0.5s ease',
            opacity: focusedIndex === index ? 0 : 1,
          }}
          onClick={() => handleImageClick(index)}
        >
          <img src={image.url} alt={`Uploaded by ${image.uploadedBy}`} />
          <div className={styles.uploaderInfo}>{image.uploadedBy || 'Anonymous'}</div>
        </div>
      ))}
    </div>
  );
};

export default InteractiveImageGrid;