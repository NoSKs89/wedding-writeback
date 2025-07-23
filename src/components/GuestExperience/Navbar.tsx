import React, { useState, useEffect, useRef } from 'react';
import { useSpring, animated, useTransition, config } from '@react-spring/web';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../../config/apiConfig';

interface NavbarItem {
  id: string;
  title: string;
  textContent: string;
  imageUrl?: string;
  backgroundColor: string;
  textColor: string;
  position: number;
  showTitleWhenOpened: boolean;
  shrinkToFitContent: boolean;
}

interface NavbarStyleControls {
  navbarHeight?: string;
  backgroundColor?: string;
  startingOpacity?: number;
  endingOpacity?: number;
  springConfig?: string;
  textContent?: string;
  textColor?: string;
  buttonColor?: string;
  buttonFontFamily?: string;
  contentFontFamily?: string;
  buttonFontSize?: number;
  modalContentFontSize?: number;
  fontWeight?: string;
  itemWidth?: number;
  itemHeight?: number;
  itemSpacing?: number;
  topPadding?: number;
  bottomPadding?: number;
}

interface NavbarProps {
  scrollY: number;
  startPosition: number;
  endPosition: number;
  windowHeight: number;
  TOTAL_PAGES: number;
  styleControls?: NavbarStyleControls;
  weddingId?: string;
  element?: any;
  experienceSettings?: any;
  overallFontFamily?: any;
  layoutSettingsFromPreview?: any;
  navbarType: 'bottom' | 'top' | 'hamburger';
}

const Navbar: React.FC<NavbarProps> = ({
  scrollY,
  startPosition,
  endPosition,
  windowHeight,
  TOTAL_PAGES,
  styleControls = {},
  weddingId,
  element,
  experienceSettings,
  overallFontFamily,
  layoutSettingsFromPreview,
  navbarType
}) => {
  const [items, setItems] = useState<NavbarItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [viewportDimensions, setViewportDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);

  // Load navbar items
  useEffect(() => {
    const loadNavbarSettings = async () => {
      if (!weddingId) return;
      try {
        const apiBase = getApiBaseUrl();
        const response = await axios.get(`${apiBase}/weddings/${weddingId}/navbar-settings`);
        if (response.data && response.data.data) {
          // Handle both legacy and new data formats
          const data = response.data.data;
          if (data.items) {
            setItems(data.items.sort((a: NavbarItem, b: NavbarItem) => a.position - b.position));
          }
        }
      } catch (error) {
        console.error('Error loading navbar settings:', error);
      }
    };
    loadNavbarSettings();
  }, [weddingId]);

  // Calculate progress for opacity based on scroll position
  const progress = Math.min(1, Math.max(0, (scrollY - startPosition * windowHeight) / ((endPosition - startPosition) * windowHeight)));
  const opacity = startPosition === endPosition ? 1 : progress;

  // Spring for navbar visibility - handle legacy bottom navbar behavior
  const navbarSpring = useSpring({
    opacity: opacity * (styleControls.endingOpacity || 1),
    transform: navbarType === 'bottom' || !navbarType // Default to bottom behavior for legacy support
      ? `translateY(${(1 - opacity) * 100}%)` 
      : navbarType === 'top'
      ? `translateY(${(opacity - 1) * 100}%)`
      : 'none',
    config: config.stiff
  });

  // Spring for hamburger menu
  const hamburgerSpring = useSpring({
    opacity: navbarType === 'hamburger' ? opacity : 0,
    config: config.stiff
  });

  // Transition for sidebar items
  const sidebarTransitions = useTransition(isHamburgerOpen ? items : [], {
    from: { opacity: 0, transform: 'translateX(-100%)' },
    enter: { opacity: 1, transform: 'translateX(0%)' },
    leave: { opacity: 0, transform: 'translateX(-100%)' },
    trail: 100,
    config: config.stiff
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setViewportDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render hamburger icon
  const renderHamburger = () => (
    <animated.div
      style={{
        ...hamburgerSpring,
        position: 'fixed',
        top: '20px',
        left: '20px',
        cursor: 'pointer',
        zIndex: 1000,
      }}
      onClick={() => setIsHamburgerOpen(!isHamburgerOpen)}
    >
      <div style={{ width: '30px', height: '3px', backgroundColor: 'black', marginBottom: '6px' }} />
      <div style={{ width: '30px', height: '3px', backgroundColor: 'black', marginBottom: '6px' }} />
      <div style={{ width: '30px', height: '3px', backgroundColor: 'black' }} />
    </animated.div>
  );

  // Render sidebar
  const renderSidebar = () => (
    <animated.div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '300px',
        height: '100vh',
        backgroundColor: 'white',
        boxShadow: '2px 0 5px rgba(0,0,0,0.2)',
        zIndex: 999,
        display: isHamburgerOpen ? 'block' : 'none',
      }}
    >
      {sidebarTransitions((style, item) => (
        <animated.div
          key={item.id}
          style={{
            ...style,
            padding: '15px',
            borderBottom: '1px solid #eee',
            cursor: 'pointer',
          }}
          onClick={() => setExpandedItemId(item.id === expandedItemId ? null : item.id)}
        >
          <h3 style={{ margin: 0, color: item.textColor }}>{item.title}</h3>
          {expandedItemId === item.id && (
            <div style={{ marginTop: '10px' }}>{item.textContent}</div>
          )}
        </animated.div>
      ))}
    </animated.div>
  );

  // Render bottom/top navbar
  const renderNavbar = () => (
    <animated.div
      style={{
        ...navbarSpring,
        position: 'fixed',
        left: 0,
        right: 0,
        height: styleControls.navbarHeight || '60px',
        backgroundColor: styleControls.backgroundColor || 'white',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: `${styleControls.topPadding || 0}px 0 ${styleControls.bottomPadding || 0}px`,
        ...(navbarType === 'bottom' ? { bottom: 0 } : { top: 0 }),
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            cursor: 'pointer',
            padding: '10px',
            color: item.textColor,
            textAlign: 'center',
          }}
          onClick={() => setExpandedItemId(item.id === expandedItemId ? null : item.id)}
        >
          <div>{item.title}</div>
          {expandedItemId === item.id && (
            <div
              style={{
                position: 'fixed',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: item.backgroundColor,
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                maxWidth: '80%',
                maxHeight: '80vh',
                overflow: 'auto',
                ...(navbarType === 'bottom' ? { bottom: '70px' } : { top: '70px' }),
              }}
            >
              {item.textContent}
            </div>
          )}
        </div>
      ))}
    </animated.div>
  );

  return (
    <>
      {navbarType === 'hamburger' ? (
        <>
          {renderHamburger()}
          {renderSidebar()}
        </>
      ) : (
        renderNavbar()
      )}
    </>
  );
};

export default Navbar; 