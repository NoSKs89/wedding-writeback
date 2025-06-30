import React, { useEffect, useState } from 'react';
import { useSpring, animated, config } from 'react-spring';

interface BottomNavbarStyleControls {
  navbarHeight?: string;
  backgroundColor?: string;
  startingOpacity?: number;
  endingOpacity?: number;
  springConfig?: string;
  textContent?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
}

interface BottomNavbarProps {
  scrollY: number;
  startPosition: number; // Start marker position in page units
  endPosition: number;   // End marker position in page units
  windowHeight: number;
  TOTAL_PAGES: number;
  styleControls?: BottomNavbarStyleControls;
}

const BottomNavbar: React.FC<BottomNavbarProps> = ({
  scrollY,
  startPosition,
  endPosition,
  windowHeight,
  TOTAL_PAGES,
  styleControls = {},
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // Extract style controls with defaults
  const {
    navbarHeight = '20vh',
    backgroundColor = '#000000',
    startingOpacity = 0.8,
    endingOpacity = 0.5,
    springConfig = 'default',
    textContent = 'Bottom Navigation',
    textColor = '#ffffff',
    fontFamily = 'Arial, sans-serif',
    fontSize = 16,
    fontWeight = 'normal',
  } = styleControls;

  // Map spring config names to react-spring configs
  const getSpringConfig = (configName: string) => {
    switch (configName) {
      case 'gentle': return config.gentle;
      case 'wobbly': return config.wobbly;
      case 'stiff': return config.stiff;
      case 'slow': return config.slow;
      case 'molasses': return config.molasses;
      case 'default':
      default:
        return { tension: 280, friction: 60 };
    }
  };

  // Calculate if navbar should be visible based on scroll position
  useEffect(() => {
    // Convert start/end positions (in page units) to pixel values
    const startPixel = startPosition * windowHeight;
    const endPixel = endPosition * windowHeight;
    
    // Show navbar when WITHIN the defined range (between start and end)
    const shouldShow = scrollY >= startPixel && scrollY <= endPixel;
    setIsVisible(shouldShow);
  }, [scrollY, startPosition, endPosition, windowHeight, TOTAL_PAGES]);

  // Spring animation for sliding up/down
  const navbarSpring = useSpring({
    transform: isVisible ? 'translateY(0%)' : 'translateY(100%)',
    opacity: isVisible ? 1 : 0,
    config: getSpringConfig(springConfig),
  });

  // Create gradient background using the color and opacity controls
  const gradientBackground = `linear-gradient(to top, ${backgroundColor}${Math.round(startingOpacity * 255).toString(16).padStart(2, '0')}, ${backgroundColor}${Math.round(endingOpacity * 255).toString(16).padStart(2, '0')})`;

  return (
    <animated.div
      style={{
        ...navbarSpring,
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: navbarHeight,
        background: gradientBackground,
        zIndex: 200,
        pointerEvents: isVisible ? 'auto' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{
        color: textColor,
        textAlign: 'center',
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        fontFamily: fontFamily,
      }}>
        {textContent}
      </div>
    </animated.div>
  );
};

export default BottomNavbar; 