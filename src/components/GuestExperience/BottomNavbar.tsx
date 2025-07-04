import React, { useState, useEffect, useRef } from 'react';
import { useSpring, useSpringRef, useChain, animated, config, useTransition } from '@react-spring/web';
import axios from 'axios';
import { getApiBaseUrl } from '../../config/apiConfig';

// Define the structure for navbar content items
interface NavbarContentItem {
  id: string;
  title: string;
  textContent: string;
  imageUrl?: string;
  backgroundColor: string;
  textColor: string;
  position: number; // Order position on navbar
  showTitleWhenOpened: boolean; // Whether to show title in modal
}

// Define the structure for navbar settings
interface NavbarSettings {
  items: NavbarContentItem[];
}

// Define the structure for navbar style controls
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
  itemWidth?: number;
  itemHeight?: number;
  itemSpacing?: number;
  bottomPadding?: number;
}

// Define the props for the BottomNavbar component
interface BottomNavbarProps {
  scrollY: number;
  startPosition: number; // Start marker position in page units
  endPosition: number;   // End marker position in page units
  windowHeight: number;
  TOTAL_PAGES: number;
  styleControls?: BottomNavbarStyleControls;
  weddingId?: string; // Added to load navbar settings
}

const BottomNavbar: React.FC<BottomNavbarProps> = ({
  scrollY,
  startPosition,
  endPosition,
  windowHeight,
  TOTAL_PAGES,
  styleControls = {},
  weddingId,
}) => {
  const [navbarSettings, setNavbarSettings] = useState<NavbarSettings>({ items: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [viewportDimensions, setViewportDimensions] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1200, 
    height: typeof window !== 'undefined' ? window.innerHeight : 800 
  });

  // Extract style controls with defaults
  const {
    navbarHeight = '10vh',
    backgroundColor = '#000000',
    startingOpacity = 0.8,
    endingOpacity = 0.4,
    springConfig = 'gentle',
    textColor = '#FFFFFF',
    fontFamily = 'Arial, sans-serif',
    fontSize = 16,
    fontWeight = 'normal',
    itemWidth = 120,
    itemHeight = 50,
    itemSpacing = 20,
    bottomPadding = 0,
  } = styleControls;

  const getSpringConfig = (configName: string) => {
    switch (configName) {
      case 'slow': return { tension: 100, friction: 50 };
      case 'gentle': return config.gentle;
      case 'wobbly': return config.wobbly;
      case 'stiff': return config.stiff;
      case 'fast': return { tension: 300, friction: 30 };
      default: return config.gentle;
    }
  };

  // Load navbar settings from API
  useEffect(() => {
    if (weddingId) {
      const loadNavbarSettings = async () => {
        console.log('BottomNavbar: Loading settings for wedding ID:', weddingId);
        try {
          const apiBase = getApiBaseUrl();
          const response = await axios.get(`${apiBase}/weddings/${weddingId}/navbar-settings`);
          console.log('BottomNavbar: API response:', response.data);
          if (response.data?.success && response.data?.data?.items) {
            setNavbarSettings(response.data.data);
            console.log('BottomNavbar: Settings updated, items count:', response.data.data.items.length);
          } else {
            console.log('BottomNavbar: No items in response');
          }
        } catch (error) {
          console.error('BottomNavbar: Error loading navbar settings:', error);
          // Continue with empty settings
        } finally {
          setIsLoading(false);
          console.log('BottomNavbar: Loading complete');
        }
      };

      loadNavbarSettings();
    } else {
      console.log('BottomNavbar: No wedding ID provided');
      setIsLoading(false);
    }
  }, [weddingId]);

  // Update viewport dimensions on resize
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

  // Sort items by position
  const sortedItems = [...navbarSettings.items].sort((a, b) => a.position - b.position);

  // Calculate if navbar should be visible based on scroll position
  useEffect(() => {
    // Convert start/end positions (in page units) to pixel values
    const startPixel = startPosition * windowHeight;
    const endPixel = endPosition * windowHeight;
    
    // Show navbar when WITHIN the defined range (between start and end)
    const shouldShow = scrollY >= startPixel && scrollY <= endPixel;
    
    console.log('BottomNavbar visibility calc:', {
      scrollY,
      startPosition,
      endPosition,
      windowHeight,
      startPixel,
      endPixel,
      shouldShow,
      currentlyVisible: isVisible,
      sortedItemsLength: sortedItems.length
    });
    
    setIsVisible(shouldShow);
  }, [scrollY, startPosition, endPosition, windowHeight, TOTAL_PAGES]);

  // Debug the current state
  console.log('BottomNavbar render state:', {
    isLoading,
    isVisible,
    sortedItemsLength: sortedItems.length,
    navbarSettingsItemsLength: navbarSettings.items.length,
    weddingId
  });

  if (isLoading) {
    console.log('BottomNavbar: Still loading, returning null');
    return null; // Don't show anything while loading
  }

  // Create gradient background using the color and opacity controls
  const gradientBackground = `linear-gradient(to top, ${backgroundColor}${Math.round(startingOpacity * 255).toString(16).padStart(2, '0')}, ${backgroundColor}${Math.round(endingOpacity * 255).toString(16).padStart(2, '0')})`;

  return (
    <>
      {/* Main Navbar Container */}
      <div
        style={{
          position: 'fixed',
          bottom: bottomPadding,
          left: 0,
          right: 0,
          height: navbarHeight,
          background: gradientBackground,
          zIndex: 200,
          pointerEvents: isVisible ? 'auto' : 'none',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 20px',
        }}
      >
        {sortedItems.length > 0 ? (
          <div style={{
            display: 'flex',
            gap: `${itemSpacing}px`,
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            width: '100%',
            height: '100%',
          }}>
            {sortedItems.map((item, index) => (
              <NavbarItemButton
                key={item.id}
                item={item}
                isExpanded={expandedItemId === item.id}
                onToggle={(itemId) => setExpandedItemId(expandedItemId === itemId ? null : itemId)}
                viewportDimensions={viewportDimensions}
                fontSize={fontSize}
                fontWeight={fontWeight}
                fontFamily={fontFamily}
                springConfig={springConfig}
                totalItems={sortedItems.length}
                itemIndex={index}
                navbarHeight={navbarHeight}
                itemWidth={itemWidth}
                itemHeight={itemHeight}
                itemSpacing={itemSpacing}
                bottomPadding={bottomPadding}
              />
            ))}
          </div>
        ) : (
          <div style={{
            color: textColor,
            textAlign: 'center',
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            fontFamily: fontFamily,
            opacity: 0.7,
          }}>
            Configure Items In /setup
          </div>
        )}
      </div>
    </>
  );
};

// Individual navbar item that transforms from button to modal (FAQ pattern)
interface NavbarItemButtonProps {
  item: NavbarContentItem;
  isExpanded: boolean;
  onToggle: (itemId: string) => void;
  viewportDimensions: { width: number, height: number };
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  springConfig: string;
  totalItems: number;
  itemIndex: number;
  navbarHeight: string;
  itemWidth: number;
  itemHeight: number;
  itemSpacing: number;
  bottomPadding: number;
}

const NavbarItemButton: React.FC<NavbarItemButtonProps> = ({
  item,
  isExpanded,
  onToggle,
  viewportDimensions,
  fontSize,
  fontWeight,
  fontFamily,
  springConfig,
  totalItems,
  itemIndex,
  navbarHeight,
  itemWidth,
  itemHeight,
  itemSpacing,
  bottomPadding,
}) => {
  const contentSpringRef = useSpringRef();
  const transformSpringRef = useSpringRef();

  // Calculate button dimensions and position using provided values
  const buttonWidth = itemWidth;
  const buttonHeight = itemHeight;
  
  // Calculate button position in navbar
  const navbarHeightPx = navbarHeight.includes('vh') 
    ? (parseFloat(navbarHeight) / 100) * viewportDimensions.height
    : parseFloat(navbarHeight);
    
  const buttonTop = viewportDimensions.height - navbarHeightPx - bottomPadding + (navbarHeightPx - buttonHeight) / 2;
  
  // Calculate horizontal spacing for buttons using provided spacing
  const totalButtonWidth = buttonWidth * totalItems;
  const totalGap = itemSpacing * (totalItems - 1);
  const startX = (viewportDimensions.width - totalButtonWidth - totalGap) / 2;
  const buttonLeft = startX + itemIndex * (buttonWidth + itemSpacing);

  // Modal dimensions and position (centered)
  const modalWidth = Math.min(viewportDimensions.width * 0.9, 600);
  const modalHeight = Math.min(viewportDimensions.height * 0.8, 500);
  const modalTop = (viewportDimensions.height - modalHeight) / 2;
  const modalLeft = (viewportDimensions.width - modalWidth) / 2;

  const getSpringConfig = (configName: string) => {
    switch (configName) {
      case 'slow': return { tension: 100, friction: 50 };
      case 'gentle': return config.gentle;
      case 'wobbly': return config.wobbly;
      case 'stiff': return config.stiff;
      case 'fast': return { tension: 300, friction: 30 };
      default: return config.gentle;
    }
  };

  // Main transform animation - button becomes modal
  const { borderRadius, width, height, background, ...transformRest } = useSpring({
    ref: transformSpringRef,
    config: isExpanded ? config.stiff : getSpringConfig(springConfig),
    from: {
      position: 'fixed' as const,
      width: buttonWidth,
      height: buttonHeight,
      top: buttonTop,
      left: buttonLeft,
      background: item.backgroundColor,
      borderRadius: 8,
      zIndex: isExpanded ? 1000 : 250,
      opacity: 1,
    },
    to: {
      position: 'fixed' as const,
      width: isExpanded ? modalWidth : buttonWidth,
      height: isExpanded ? modalHeight : buttonHeight,
      top: isExpanded ? modalTop : buttonTop,
      left: isExpanded ? modalLeft : buttonLeft,
      background: item.backgroundColor,
      borderRadius: isExpanded ? 12 : 8,
      zIndex: isExpanded ? 1000 : 250,
      opacity: 1,
    }
  });

  // Content fade animation
  const { opacity: contentOpacity } = useSpring({
    ref: contentSpringRef,
    config: config.gentle,
    opacity: isExpanded ? 1 : 0,
    delay: isExpanded ? 200 : 0,
  });

  // Chain animations: transform first, then content
  useChain(
    isExpanded ? [transformSpringRef, contentSpringRef] : [contentSpringRef, transformSpringRef],
    [0, isExpanded ? 0.3 : 0.0]
  );

  // Prepare content items for transition animation
  const contentItems = isExpanded ? [
    { id: 'title', content: item.showTitleWhenOpened && item.title ? item.title : null },
    { id: 'text', content: item.textContent },
    { id: 'image', content: item.imageUrl }
  ].filter(contentItem => contentItem.content) : [];

  const transitions = useTransition(contentItems, {
    keys: contentItem => contentItem.id,
    from: { opacity: 0, transform: 'translateY(15px)' },
    enter: { opacity: 1, transform: 'translateY(0px)' },
    leave: { opacity: 0, transform: 'translateY(-15px)' },
    trail: 100,
    config: config.gentle,
  });

  return (
    <>
      {/* Backdrop for expanded modal */}
      {isExpanded && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
          onClick={() => onToggle(item.id)}
        />
      )}

      {/* The transforming button/modal element */}
      <animated.div
        style={{
          ...transformRest,
          width,
          height,
          borderRadius,
          background,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isExpanded ? 'flex-start' : 'center',
          alignItems: 'center',
          cursor: isExpanded ? 'default' : 'pointer',
          padding: isExpanded ? '20px' : '10px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
        onClick={() => !isExpanded && onToggle(item.id)}
      >
        {/* Button state - show title */}
        {!isExpanded && (
          <span style={{
            color: item.textColor,
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            fontFamily: fontFamily,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {item.title}
          </span>
        )}

        {/* Modal state - show animated content */}
        {isExpanded && (
          <>
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(item.id);
              }}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                color: item.textColor,
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1001,
              }}
            >
              ×
            </button>

            {/* Animated content */}
            <animated.div
              style={{
                opacity: contentOpacity,
                width: '100%',
                height: '100%',
                overflow: 'auto',
                paddingTop: '20px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {transitions((style, contentItem) => (
                <animated.div style={style} key={contentItem.id}>
                  {contentItem.id === 'title' && (
                    <h2 style={{
                      color: item.textColor,
                      fontSize: `${fontSize + 6}px`,
                      fontWeight: 'bold',
                      fontFamily: fontFamily,
                      textAlign: 'center',
                      margin: '0 0 20px 0',
                    }}>
                      {contentItem.content}
                    </h2>
                  )}
                  {contentItem.id === 'text' && (
                    <div style={{
                      color: item.textColor,
                      fontSize: `${fontSize}px`,
                      fontFamily: fontFamily,
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                      margin: '0 0 20px 0',
                    }}>
                      {contentItem.content}
                    </div>
                  )}
                  {contentItem.id === 'image' && (
                    <img
                      src={contentItem.content as string}
                      alt="Modal content"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        margin: '0 auto',
                        display: 'block',
                      }}
                    />
                  )}
                </animated.div>
              ))}
            </animated.div>
          </>
        )}
      </animated.div>
    </>
  );
};

export default BottomNavbar; 