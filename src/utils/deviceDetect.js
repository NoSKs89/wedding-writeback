import { useState, useEffect } from 'react';

export const MOBILE_BREAKPOINT_PX = 768;

export const isMobileView = () => {
  if (typeof window !== 'undefined') {
    return window.innerWidth < MOBILE_BREAKPOINT_PX;
  }
  return false; // Default to false if window is not defined (e.g., SSR)
};

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(isMobileView());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDeviceType = () => {
      setIsMobile(isMobileView());
    };

    window.addEventListener('resize', checkDeviceType);
    // Call handler right away so state gets updated with initial window size
    checkDeviceType();

    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  return isMobile;
}; 