import React, { useState, useEffect, useRef } from 'react';
import styles from './InteractiveImageGrid.module.css';

const InteractiveImageGrid = ({ images }) => {
  const [isInactive, setIsInactive] = useState(false);
  const inactivityTimer = useRef(null);

  const resetInactivityTimer = () => {
    setIsInactive(false);
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    inactivityTimer.current = setTimeout(() => {
      setIsInactive(true);
    }, 5000); // 5 seconds of inactivity
  };

  useEffect(() => {
    resetInactivityTimer();

    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('mousedown', resetInactivityTimer);
    window.addEventListener('keypress', resetInactivityTimer);
    window.addEventListener('touchmove', resetInactivityTimer);
    window.addEventListener('scroll', resetInactivityTimer);

    return () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
      window.removeEventListener('mousemove', resetInactivityTimer);
      window.removeEventListener('mousedown', resetInactivityTimer);
      window.removeEventListener('keypress', resetInactivityTimer);
      window.removeEventListener('touchmove', resetInactivityTimer);
      window.removeEventListener('scroll', resetInactivityTimer);
    };
  }, []);

  const getTilt = (index) => {
    if (!isInactive) {
      return 'rotate(0deg)';
    }
    // Create a varied, pattern-like tilt
    const tilts = [-2.5, 3, -1.5, 2, -3.5, 1];
    return `rotate(${tilts[index % tilts.length]}deg)`;
  };
  
  if (!images || images.length === 0) {
    return <div className={styles.emptyMessage}>No photos yet. Be the first to share one!</div>;
  }

  return (
    <div className={`${styles.gridContainer} ${isInactive ? styles.inactive : ''}`}>
      {images.map((image, index) => (
        <div 
          key={image.id || index} 
          className={styles.gridItem} 
          style={{ transform: getTilt(index) }}
        >
          <img src={image.url} alt={`Uploaded by ${image.uploadedBy}`} />
          <div className={styles.uploaderInfo}>
            {image.uploadedBy || 'Anonymous'}
          </div>
        </div>
      ))}
    </div>
  );
};

export default InteractiveImageGrid; 