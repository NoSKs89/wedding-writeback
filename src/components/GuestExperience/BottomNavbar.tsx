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
  buttonFontFamily?: string;
  contentFontFamily?: string;
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
  const [shouldAnimateItems, setShouldAnimateItems] = useState(false);
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
    endingOpacity: rawEndingOpacity = 0.4,
    springConfig = 'gentle',
    textColor = '#FFFFFF',
    buttonFontFamily = 'Arial, sans-serif',
    contentFontFamily = 'Arial, sans-serif',
    fontSize = 16,
    fontWeight = 'normal',
    itemWidth = 120,
    itemHeight = 50,
    itemSpacing = 20,
    bottomPadding = 0,
  } = styleControls;

  // Ensure endingOpacity is never 0 to prevent invisible navbar
  const endingOpacity = rawEndingOpacity === 0 ? 0.3 : rawEndingOpacity;

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

  // Debug expanded item changes
  useEffect(() => {
    console.log('BottomNavbar: expandedItemId changed to:', expandedItemId);
  }, [expandedItemId]);

  // Create staggered transition for navbar items
  const itemsToAnimate = shouldAnimateItems ? sortedItems : [];
  console.log('BottomNavbar: itemTransitions setup:', {
    shouldAnimateItems,
    sortedItemsLength: sortedItems.length,
    itemsToAnimateLength: itemsToAnimate.length,
    itemsToAnimate: itemsToAnimate.map(item => ({ id: item.id, title: item.title }))
  });

  const itemTransitions = useTransition(
    itemsToAnimate, 
    {
      from: { opacity: 0, transform: 'translateY(100px)' },
      enter: { opacity: 1, transform: 'translateY(0px)' },
      leave: { opacity: 0, transform: 'translateY(100px)' },
      trail: 150, // 150ms delay between each item
      config: getSpringConfig(springConfig),
      keys: (item) => item.id,
    }
  );

  console.log('BottomNavbar: itemTransitions result length:', itemTransitions.length);

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
    
    // Trigger item animations with a slight delay after navbar becomes visible
    if (shouldShow && !shouldAnimateItems) {
      console.log('BottomNavbar: Starting item animations with delay');
      setTimeout(() => {
        console.log('BottomNavbar: Setting shouldAnimateItems to true');
        setShouldAnimateItems(true);
      }, 100);
    } else if (!shouldShow && shouldAnimateItems) {
      console.log('BottomNavbar: Hiding item animations');
      setShouldAnimateItems(false);
    }
    
    console.log('BottomNavbar: shouldAnimateItems current state:', shouldAnimateItems);
  }, [scrollY, startPosition, endPosition, windowHeight, TOTAL_PAGES, shouldAnimateItems]);

  // Debug the current state
  console.log('BottomNavbar render state:', {
    isLoading,
    isVisible,
    shouldAnimateItems,
    sortedItemsLength: sortedItems.length,
    navbarSettingsItemsLength: navbarSettings.items.length,
    expandedItemId,
    weddingId
  });

  if (isLoading) {
    console.log('BottomNavbar: Still loading, returning null');
    return null; // Don't show anything while loading
  }

  console.log('BottomNavbar: About to render, final check:', {
    sortedItemsLength: sortedItems.length,
    isVisible,
    shouldAnimateItems,
    itemTransitionsWillRender: sortedItems.length > 0
  });

  // Create gradient background using the color and opacity controls
  const gradientBackground = `linear-gradient(to top, ${backgroundColor}${Math.round(startingOpacity * 255).toString(16).padStart(2, '0')}, ${backgroundColor}${Math.round(endingOpacity * 255).toString(16).padStart(2, '0')})`;

  return (
    <>
      {/* Main Navbar Container - now just the background */}
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
        {sortedItems.length === 0 && (
          <div style={{
            color: textColor,
            textAlign: 'center',
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            fontFamily: buttonFontFamily,
            opacity: 0.7,
          }}>
            Configure Items In /setup
          </div>
        )}
      </div>

      {/* TEMPORARY: Simple test to see if items render at all - DISABLED */}
      {false && sortedItems.length > 0 && !shouldAnimateItems && (
        <div style={{ position: 'fixed', top: '100px', left: '100px', zIndex: 1000, background: 'red', color: 'white', padding: '10px' }}>
          TEST: {sortedItems.length} items loaded but not animating
        </div>
      )}

      {/* TEMPORARY: Simple useTransition test without LERP complexity - DISABLED */}
      {false && sortedItems.length > 0 && shouldAnimateItems && itemTransitions((style, item, _, index) => (
        <animated.div
          key={item.id}
          style={{
            ...style,
            position: 'fixed',
            bottom: `${70 + index * 60}px`,
            left: '50px',
            width: '80px',
            height: '30px',
            backgroundColor: item.backgroundColor,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
            cursor: 'pointer',
          }}
          onClick={() => console.log('Simple button clicked:', item.title)}
        >
          <span style={{ color: item.textColor, fontSize: '14px' }}>
            {item.title}
          </span>
        </animated.div>
      ))}

      {/* Animated NavbarItemButton components with LERP transformation */}
      {(() => {
        console.log('BottomNavbar: About to render itemTransitions, sortedItems.length:', sortedItems.length);
        if (sortedItems.length === 0) return null;
        
        const renderedTransitions = itemTransitions((style, item, _, index) => {
          console.log('BottomNavbar: Rendering itemTransition for:', {
            itemId: item.id,
            itemTitle: item.title,
            index,
            styleOpacity: style.opacity.get ? style.opacity.get() : style.opacity,
            styleTransform: style.transform.get ? style.transform.get() : style.transform,
            shouldAnimateItems,
            expandedItemId
          });
          
          return (
            <NavbarItemButton
              key={item.id}
              item={item}
              isExpanded={expandedItemId === item.id}
              onToggle={(itemId) => {
                console.log('BottomNavbar: onToggle called for itemId:', itemId, 'currentExpanded:', expandedItemId);
                setExpandedItemId(expandedItemId === itemId ? null : itemId);
              }}
              viewportDimensions={viewportDimensions}
              fontSize={fontSize}
              fontWeight={fontWeight}
              buttonFontFamily={buttonFontFamily}
              contentFontFamily={contentFontFamily}
              springConfig={springConfig}
              totalItems={sortedItems.length}
              itemIndex={index}
              navbarHeight={navbarHeight}
              itemWidth={itemWidth}
              itemHeight={itemHeight}
              itemSpacing={itemSpacing}
              bottomPadding={bottomPadding}
              // Pass useTransition styles directly to NavbarItemButton
              transitionStyle={style}
              transitionEnabled={shouldAnimateItems}
            />
          );
        });
        
        console.log('BottomNavbar: renderedTransitions type:', typeof renderedTransitions, 'Array.isArray:', Array.isArray(renderedTransitions));
        return renderedTransitions;
      })()}
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
  buttonFontFamily: string;
  contentFontFamily: string;
  springConfig: string;
  totalItems: number;
  itemIndex: number;
  navbarHeight: string;
  itemWidth: number;
  itemHeight: number;
  itemSpacing: number;
  bottomPadding: number;
  transitionStyle?: any; // useTransition style object
  transitionEnabled?: boolean; // Whether transitions are active
}

const NavbarItemButton: React.FC<NavbarItemButtonProps> = ({
  item,
  isExpanded,
  onToggle,
  viewportDimensions,
  fontSize,
  fontWeight,
  buttonFontFamily,
  contentFontFamily,
  springConfig,
  totalItems,
  itemIndex,
  navbarHeight,
  itemWidth,
  itemHeight,
  itemSpacing,
  bottomPadding,
  transitionStyle,
  transitionEnabled = false,
}) => {
  console.log('NavbarItemButton: Rendering for item:', {
    itemId: item.id,
    itemTitle: item.title,
    isExpanded,
    itemIndex,
    totalItems,
    viewportDimensions,
    transitionEnabled,
    transitionStyle: transitionStyle ? {
      opacity: transitionStyle.opacity?.get?.() || transitionStyle.opacity,
      transform: transitionStyle.transform?.get?.() || transitionStyle.transform
    } : null
  });
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

  console.log('NavbarItemButton: Position calculations for', item.title, {
    buttonWidth,
    buttonHeight,
    navbarHeightPx,
    buttonTop,
    buttonLeft,
    startX,
    totalButtonWidth,
    totalGap,
    itemIndex,
    totalItems,
    transitionTransform: transitionStyle?.transform,
    transitionOpacity: transitionStyle?.opacity
  });

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

  // Main transform animation - button becomes modal, with transition integration
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
      // Apply transition opacity if available, otherwise default to 1
      opacity: transitionStyle?.opacity || 1,
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
      // Apply transition opacity if available, otherwise default to 1
      opacity: transitionStyle?.opacity || 1,
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
          // Apply transition transform if available
          transform: transitionStyle?.transform || undefined,
          // Ensure visibility during transitions
          pointerEvents: transitionEnabled ? 'auto' : 'auto',
          // DEBUG: Temporary visible border
          border: '3px solid lime',
        }}
        onClick={() => {
          console.log('NavbarItemButton clicked:', { itemId: item.id, itemTitle: item.title, isExpanded });
          if (!isExpanded) {
            onToggle(item.id);
          }
        }}
      >
        {/* Button state - show title */}
        {!isExpanded && (
          <span style={{
            color: item.textColor,
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            fontFamily: buttonFontFamily,
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
                      fontFamily: buttonFontFamily,
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
                      fontFamily: contentFontFamily,
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