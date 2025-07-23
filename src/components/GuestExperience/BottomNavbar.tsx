import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSpring, useSpringRef, useChain, animated, config, useTransition } from '@react-spring/web';
import { useControls } from 'leva';
import axios from 'axios';
import { getApiBaseUrl } from '../../config/apiConfig';
import { useLevaStore } from '../../stores/levaStore';
import { useSetupMode } from '../../contexts/SetupModeContext';
import { generateElementFolderName, getElementSchema, springConfigPresets } from './levaSchemas';
import { fontFamilyOptions } from '../../config/fontConfig';

// Utility function to detect and convert URLs to clickable links and format bold text
const convertTextToLinksAndElements = (text: string, linkColor: string, linkHoverColor: string = '#ffffff') => {
  if (!text || typeof text !== 'string') return text;
  
  // Helper function to process text part for bold formatting
  const processBoldText = (textPart: string, baseKey: string) => {
    if (!textPart) return null;
    
    // Regex to find text surrounded by asterisks: *text*
    const boldRegex = /\*([^*]+)\*/g;
    const parts = textPart.split(boldRegex);
    const processedElements: React.ReactNode[] = [];
    
    parts.forEach((part, partIndex) => {
      if (partIndex % 2 === 1) {
        // This is the content that was between asterisks - make it bold
        processedElements.push(
          <strong key={`bold-${baseKey}-${partIndex}`} style={{ fontWeight: 'bold' }}>
            {part}
          </strong>
        );
      } else if (part) {
        // Regular text - add as-is
        processedElements.push(part);
      }
    });
    
    return processedElements.length > 0 ? processedElements : textPart;
  };
  
  // Comprehensive URL regex that catches various formats including venmo.com, paypal.me, etc.
  const urlRegex = /(https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.\-~!$&'()*+,;=:@])*)?(?:\?(?:[\w&=%.\-~!$'()*+,;=:@/])*)?(?:\#(?:[\w.\-~!$&'()*+,;=:@/])*)?|www\.(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.\-~!$&'()*+,;=:@])*)?(?:\?(?:[\w&=%.\-~!$'()*+,;=:@/])*)?(?:\#(?:[\w.\-~!$&'()*+,;=:@/])*)?|(?:[-\w.])+\.(?:com|org|net|edu|gov|mil|int|info|biz|name|museum|coop|aero|pro|tv|co|me|io|ai|ly|be|de|fr|uk|ca|au|jp|cn|ru|br|in|mx|nl|se|no|dk|fi|it|es|pl|cz|hu|ro|bg|hr|si|sk|lt|lv|ee|mt|cy|lu|is|li|mc|sm|va|ad|md|by|ua|ge|am|az|kz|kg|tj|tm|uz|mn|af|pk|bd|lk|mv|np|bt|mm|la|kh|vn|th|my|sg|id|ph|bn|tl|pw|mh|fm|ki|nr|tv|ws|to|vu|fj|sb|nc|pf)(?:\:[0-9]+)?(?:\/(?:[\w\/_.\-~!$&'()*+,;=:@])*)?(?:\?(?:[\w&=%.\-~!$'()*+,;=:@/])*)?(?:\#(?:[\w.\-~!$&'()*+,;=:@/])*)?)/gi;
  
  const parts = text.split(urlRegex);
  const elements: React.ReactNode[] = [];
  
  let urlIndex = 0;
  parts.forEach((part, index) => {
    if (urlRegex.test(part)) {
      // This is a URL - convert to clickable link
      let href = part;
      // Add protocol if missing
      if (!part.startsWith('http://') && !part.startsWith('https://')) {
        href = 'https://' + part;
      }
      
      elements.push(
        <a
          key={`link-${urlIndex}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: linkColor,
            textDecoration: 'underline',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontWeight: '600', // Slightly bolder
            padding: '2px 4px',
            borderRadius: '3px',
            display: 'inline', // Allow wrapping within text flow
            margin: '0',
            wordBreak: 'break-all', // Enable breaking long URLs
            overflowWrap: 'break-word', // Additional wrap support
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = linkHoverColor;
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.textShadow = '0 0 8px rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = linkColor;
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.textShadow = 'none';
          }}
          onClick={(e) => {
            e.stopPropagation(); // Prevent modal from closing
          }}
        >
          🔗 {part}
        </a>
      );
      urlIndex++;
    } else if (part) {
      // Regular text - handle line breaks and bold formatting
      const textParts = part.split('\n');
      textParts.forEach((textPart, textIndex) => {
        if (textIndex > 0) {
          elements.push(<br key={`br-${index}-${textIndex}`} />);
        }
        if (textPart) {
          // Process this text part for bold formatting
          const processedBoldText = processBoldText(textPart, `${index}-${textIndex}`);
          if (Array.isArray(processedBoldText)) {
            // If bold processing returned multiple elements, add each one
            processedBoldText.forEach((element, boldIndex) => {
              elements.push(
                <span key={`text-${index}-${textIndex}-${boldIndex}`}>
                  {element}
                </span>
              );
            });
          } else {
            // Single text element
            elements.push(processedBoldText);
          }
        }
      });
    }
  });
  
  return elements.length > 0 ? elements : text;
};

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
  shrinkToFitContent: boolean; // Whether modal should shrink to fit content or use fixed size
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

// Define the props for the BottomNavbar component
interface BottomNavbarProps {
  scrollY: number;
  startPosition: number; // Start marker position in page units
  endPosition: number;   // End marker position in page units
  windowHeight: number;
  TOTAL_PAGES: number;
  styleControls?: BottomNavbarStyleControls;
  weddingId?: string; // Added to load navbar settings
  element?: any; // Element config for registering controls
  experienceSettings?: any; // Experience settings for registering controls
  overallFontFamily?: any; // Font family for schema
  layoutSettingsFromPreview?: any; // For preview mode
}

const BottomNavbar: React.FC<BottomNavbarProps> = ({
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
}) => {
  const { isSetupMode } = useSetupMode();
  const updateControlValuesInStore = useLevaStore(state => state.updateControlValues);
  
  // Register controls with Leva if in setup mode and element is provided
  const folderName = element ? generateElementFolderName(element) : 'BottomNavbar_Default';
  const fontToUse = typeof overallFontFamily === 'string' ? overallFontFamily : overallFontFamily?.value || fontFamilyOptions[0];
  
  // Get saved values from store (like ElementWrapper does)
  const getSavedValues = useLevaStore(state => state.controlValues[folderName]);
  
  // Always call useControls, but conditionally render/register them
  const shouldRegisterControls = isSetupMode && element && !layoutSettingsFromPreview;
  
    // Create schema with saved values merged in (like ElementWrapper does)
  const schema = React.useMemo(() => {
    if (!element) return {};
    const baseSchema = getElementSchema(element, fontToUse) as any;
    const savedValues = getSavedValues || {};
    
    // console.log(`🔧 BottomNavbar: Creating schema for ${folderName}`, {
    //   timestamp: Date.now(),
    //   baseSchemaKeys: Object.keys(baseSchema),
    //   savedValues,
    //   willMergeSavedValues: Object.keys(savedValues).length > 0
    // });
    
    // Merge saved values into schema (same logic as ElementWrapper)
    const schemaWithSavedValues: any = {};
    Object.keys(baseSchema).forEach(key => {
      schemaWithSavedValues[key] = { 
        ...baseSchema[key], 
        value: savedValues[key] ?? baseSchema[key].value 
      };
    });
    
    return schemaWithSavedValues;
  }, [element, fontToUse, getSavedValues]);
  
  // console.log(`🎭 BottomNavbar: useControls setup for ${folderName}`, {
  //   timestamp: Date.now(),
  //   elementId: element?.id,
  //   isSetupMode,
  //   hasElement: !!element,
  //   hasLayoutSettingsFromPreview: !!layoutSettingsFromPreview,
  //   shouldRegisterControls,
  //   schemaKeys: Object.keys(schema)
  // });
  
  const levaValues = useControls(
    folderName,
    schema,
    { 
      collapsed: true,
      render: () => shouldRegisterControls
    },
    [element?.id, shouldRegisterControls]
  ) as Record<string, any>;
  
  // console.log(`🎛️ BottomNavbar: levaValues received for ${folderName}`, {
  //   timestamp: Date.now(),
  //   levaValues,
  //   shouldRegisterControls
  // });
  
  // Update store with control values
  useEffect(() => {
    // console.log(`📊 BottomNavbar: useEffect for updateControlValuesInStore`, {
    //   timestamp: Date.now(),
    //   folderName,
    //   shouldRegisterControls,
    //   levaValues,
    //   willUpdate: shouldRegisterControls && folderName
    // });
    
    if (shouldRegisterControls && folderName) {
      // console.log(`✅ BottomNavbar: Calling updateControlValuesInStore for ${folderName}`, levaValues);
      updateControlValuesInStore(folderName, levaValues);
    }
  }, [levaValues, folderName, updateControlValuesInStore, shouldRegisterControls]);
  
  // Determine which style controls to use
  const effectiveStyleControls = layoutSettingsFromPreview && folderName
    ? (layoutSettingsFromPreview[folderName] || {})
    : shouldRegisterControls && Object.keys(levaValues || {}).length > 0
    ? levaValues
    : styleControls;



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
    navbarHeight = '20vh',
    backgroundColor = '#000000',
    startingOpacity = 0.8,
    endingOpacity: rawEndingOpacity = 0.5,
    springConfig = 'default',
    textColor = '#ffffff',
    buttonColor = '#333333',
    buttonFontFamily = 'Arial, sans-serif',
    contentFontFamily = 'Arial, sans-serif',
    buttonFontSize = 16,
    modalContentFontSize = 16,
    fontWeight = 'normal',
    itemWidth = 120,
    itemHeight = 50,
    itemSpacing = 20,
    topPadding = 0,
    bottomPadding = 0,
  } = effectiveStyleControls || {};
  
  // Calculate modal title font size (4px larger than content)
  const modalTitleFontSize = modalContentFontSize + 4;

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
        try {
          const apiBase = getApiBaseUrl();
          const response = await axios.get(`${apiBase}/weddings/${weddingId}/navbar-settings`);
          if (response.data?.success && response.data?.data?.items) {
            setNavbarSettings(response.data.data);
          }
        } catch (error) {
          console.error('BottomNavbar: Error loading navbar settings:', error);
          // Continue with empty settings
        } finally {
          setIsLoading(false);
        }
      };

      loadNavbarSettings();
    } else {
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

  // DEBUG: Log button color to verify it's being received
  // console.log(`🎨 BottomNavbar: Button color control received`, {
  //   timestamp: Date.now(),
  //   folderName,
  //   buttonColor,
  //   effectiveStyleControlsKeys: Object.keys(effectiveStyleControls || {}),
  //   hasButtonColor: 'buttonColor' in (effectiveStyleControls || {}),
  //   rawButtonColorValue: effectiveStyleControls?.buttonColor,
  //   willUseGlobalButtonColor: true, // Now always using global buttonColor
  //   individualItemBackgroundColors: sortedItems.map(item => item.backgroundColor)
  // });

  // Create staggered transition for navbar items
  const itemsToAnimate = shouldAnimateItems ? sortedItems : [];

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

  // Calculate if navbar should be visible based on scroll position
  useEffect(() => {
    // Convert start/end positions (in page units) to pixel values
    const startPixel = startPosition * windowHeight;
    const endPixel = endPosition * windowHeight;
    
    // Show navbar when WITHIN the defined range (between start and end)
    const shouldShow = scrollY >= startPixel && scrollY <= endPixel;
    
    setIsVisible(shouldShow);
    
    // Trigger item animations with a slight delay after navbar becomes visible
    if (shouldShow && !shouldAnimateItems) {
      setTimeout(() => {
        setShouldAnimateItems(true);
      }, 100);
    } else if (!shouldShow && shouldAnimateItems) {
      setShouldAnimateItems(false);
    }
  }, [scrollY, startPosition, endPosition, windowHeight, TOTAL_PAGES, shouldAnimateItems]);

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  // Create gradient background using the color and opacity controls
  const gradientBackground = `linear-gradient(to top, ${backgroundColor}${Math.round(startingOpacity * 255).toString(16).padStart(2, '0')}, ${backgroundColor}${Math.round(endingOpacity * 255).toString(16).padStart(2, '0')})`;

  return (
    <>
      {/* Main Navbar Container - now just the background */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
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
          // Apply internal padding to control item positioning
          paddingTop: `${topPadding}px`,
          paddingBottom: `${bottomPadding}px`,
        }}
      >
        {sortedItems.length === 0 && (
          <div style={{
            color: textColor,
            textAlign: 'center',
            fontSize: `${buttonFontSize}px`,
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
            backgroundColor: buttonColor,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
            cursor: 'pointer',
          }}
          // onClick={() => console.log('Simple button clicked:', item.title)}
        >
          <span style={{ color: item.textColor, fontSize: '14px' }}>
            {item.title}
          </span>
        </animated.div>
      ))}

      {/* Animated NavbarItemButton components with LERP transformation */}
      {(() => {
        // console.log('BottomNavbar: About to render itemTransitions, sortedItems.length:', sortedItems.length);
        if (sortedItems.length === 0) return null;
        
        const renderedTransitions = itemTransitions((style, item, _, index) => {
          // console.log('BottomNavbar: Rendering itemTransition for:', {
          //   itemId: item.id,
          //   itemTitle: item.title,
          //   index,
          //   styleOpacity: style.opacity.get ? style.opacity.get() : style.opacity,
          //   styleTransform: style.transform.get ? style.transform.get() : style.transform,
          //   shouldAnimateItems,
          //   expandedItemId
          // });
          
          return (
            <NavbarItemButton
              key={item.id}
              item={item}
              isExpanded={expandedItemId === item.id}
              onToggle={(itemId) => {
                // console.log('BottomNavbar: onToggle called for itemId:', itemId, 'currentExpanded:', expandedItemId);
                setExpandedItemId(expandedItemId === itemId ? null : itemId);
              }}
              viewportDimensions={viewportDimensions}
              buttonFontSize={buttonFontSize}
              modalContentFontSize={modalContentFontSize}
              modalTitleFontSize={modalTitleFontSize}
              fontWeight={fontWeight}
              buttonFontFamily={buttonFontFamily}
              contentFontFamily={contentFontFamily}
              buttonColor={buttonColor}
              springConfig={springConfig}
              totalItems={sortedItems.length}
              itemIndex={index}
              navbarHeight={navbarHeight}
              itemWidth={itemWidth}
              itemHeight={itemHeight}
              itemSpacing={itemSpacing}
              topPadding={topPadding}
              bottomPadding={bottomPadding}
              // Pass useTransition styles directly to NavbarItemButton
              transitionStyle={style}
              transitionEnabled={shouldAnimateItems}
            />
          );
        });
        
        // console.log('BottomNavbar: renderedTransitions type:', typeof renderedTransitions, 'Array.isArray:', Array.isArray(renderedTransitions));
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
  buttonFontSize: number;
  modalContentFontSize: number;
  modalTitleFontSize: number;
  fontWeight: string;
  buttonFontFamily: string;
  contentFontFamily: string;
  buttonColor: string;
  springConfig: string;
  totalItems: number;
  itemIndex: number;
  navbarHeight: string;
  itemWidth: number;
  itemHeight: number;
  itemSpacing: number;
  topPadding: number;
  bottomPadding: number;
  transitionStyle?: any; // useTransition style object
  transitionEnabled?: boolean; // Whether transitions are active
}

const NavbarItemButton: React.FC<NavbarItemButtonProps> = ({
  item,
  isExpanded,
  onToggle,
  viewportDimensions,
  buttonFontSize,
  modalContentFontSize,
  modalTitleFontSize,
  fontWeight,
  buttonFontFamily,
  contentFontFamily,
  buttonColor,
  springConfig,
  totalItems,
  itemIndex,
  navbarHeight,
  itemWidth,
  itemHeight,
  itemSpacing,
  topPadding,
  bottomPadding,
  transitionStyle,
  transitionEnabled = false,
}) => {
  // console.log('NavbarItemButton: Rendering for item:', {
  //   itemId: item.id,
  //   itemTitle: item.title,
  //   isExpanded,
  //   itemIndex,
  //   totalItems,
  //   viewportDimensions,
  //   transitionEnabled,
  //   transitionStyle: transitionStyle ? {
  //     opacity: transitionStyle.opacity?.get?.() || transitionStyle.opacity,
  //     transform: transitionStyle.transform?.get?.() || transitionStyle.transform
  //   } : null,
  //   // Button color debugging
  //   buttonColorFromProps: buttonColor,
  //   itemBackgroundColor: item.backgroundColor,
  //   willUseButtonColor: true // Now always using buttonColor from props
  // });
  const contentSpringRef = useSpringRef();
  const transformSpringRef = useSpringRef();
  const sequentialContentSpringRef = useSpringRef();

  // Calculate button dimensions and position using provided values
  const buttonWidth = itemWidth;
  const buttonHeight = itemHeight;
  
  // Calculate button position in navbar
  const navbarHeightPx = navbarHeight.includes('vh') 
    ? (parseFloat(navbarHeight) / 100) * viewportDimensions.height
    : parseFloat(navbarHeight);
    
  // Calculate button position with both top and bottom padding
  const navbarTop = viewportDimensions.height - navbarHeightPx;
  const availableHeight = navbarHeightPx - topPadding - bottomPadding; // Height available for button centering
  const buttonTop = navbarTop + topPadding + (availableHeight - buttonHeight) / 2;
  
  // Calculate horizontal spacing for buttons using provided spacing
  const totalButtonWidth = buttonWidth * totalItems;
  const totalGap = itemSpacing * (totalItems - 1);
  const startX = (viewportDimensions.width - totalButtonWidth - totalGap) / 2;
  const buttonLeft = startX + itemIndex * (buttonWidth + itemSpacing);

  // Debug position calculations (only for first item to avoid spam)
  if (itemIndex === 0) {
    // console.log('BottomNavbar: Button positioning with top/bottom padding:', {
    //   navbarHeightPx,
    //   topPadding,
    //   bottomPadding,
    //   availableHeight,
    //   buttonHeight,
    //   buttonTop,
    //   navbarTop
    // });
  }

  // Modal dimensions and position - responsive to shrinkToFitContent setting
  let modalHeight: number;
  let modalTop: number;
  
  if (item.shrinkToFitContent) {
    // Content-fit modal: smaller size for text content
    modalHeight = Math.min(viewportDimensions.height * 0.6, 400); // Max 60vh or 400px
    modalTop = (viewportDimensions.height - modalHeight) / 2; // Center vertically
  } else {
    // Fixed size modal: 90vh height as before (great for images)
    modalHeight = viewportDimensions.height * 0.9; // 90vh
    modalTop = viewportDimensions.height * 0.05; // 5vh from top
  }
  
  const modalWidth = Math.min(viewportDimensions.width * 0.8, 500); // Reduced from 0.9 to 0.8 and 600 to 500
  const modalLeft = (viewportDimensions.width - modalWidth) / 2;
  
  // console.log('Modal positioning calculations:', {
  //   viewportHeight: viewportDimensions.height,
  //   viewportWidth: viewportDimensions.width,
  //   modalHeight,
  //   modalWidth,
  //   modalTop,
  //   modalLeft,
  //   shrinkToFitContent: item.shrinkToFitContent,
  //   hasImage: !!item.imageUrl
  // });

  // Process content into sequential animation pieces
  const sequentialContentPieces = useMemo(() => {
    if (!isExpanded) return [];
    
    const pieces: Array<{
      id: string;
      type: 'title' | 'text-line' | 'image';
      content: string;
      originalIndex: number;
    }> = [];
    
    let currentIndex = 0;
    
    // Add title if it should be shown
    if (item.showTitleWhenOpened && item.title) {
      pieces.push({
        id: `title-${currentIndex}`,
        type: 'title',
        content: item.title,
        originalIndex: currentIndex
      });
      currentIndex++;
    }
    
    // Add image before text if it exists
    if (item.imageUrl) {
      pieces.push({
        id: `image-${currentIndex}`,
        type: 'image',
        content: item.imageUrl,
        originalIndex: currentIndex
      });
      currentIndex++;
    }
    
    // Split text content by newlines and add each line
    if (item.textContent) {
      const textLines = item.textContent.split('\n').filter(line => line.trim());
      textLines.forEach((line, lineIndex) => {
        pieces.push({
          id: `text-line-${currentIndex}-${lineIndex}`,
          type: 'text-line',
          content: line,
          originalIndex: currentIndex + lineIndex
        });
      });
    }
    
    return pieces;
  }, [isExpanded, item.title, item.showTitleWhenOpened, item.textContent, item.imageUrl]);

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
      background: buttonColor,
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
      background: buttonColor,
      borderRadius: isExpanded ? 12 : 8,
      zIndex: isExpanded ? 1000 : 250,
      // Apply transition opacity if available, otherwise default to 1
      opacity: transitionStyle?.opacity || 1,
    },

  });

  // Sequential content animation - each piece animates in sequence
  const sequentialContentTransitions = useTransition(
    sequentialContentPieces, 
    {
      ref: sequentialContentSpringRef,
      keys: piece => piece.id,
      from: { opacity: 0, transform: 'translateY(20px) scale(0.95)' },
      enter: { opacity: 1, transform: 'translateY(0px) scale(1)' },
      leave: { opacity: 0, transform: 'translateY(-10px) scale(0.95)' },
      trail: 200, // 180ms delay between each piece (20% increase from 150ms)
      config: config.gentle,
    }
  );

  // Chain animations: transform first, then sequential content
  useChain(
    isExpanded ? [transformSpringRef, sequentialContentSpringRef] : [sequentialContentSpringRef, transformSpringRef],
    [0, isExpanded ? 0.4 : 0.0] // Longer delay to let modal fully appear first
  );

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
          // Responsive padding based on modal type and expansion state
          padding: isExpanded 
            ? (item.shrinkToFitContent ? '12px' : '8px') 
            : '10px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          // Only apply transition transform when not expanded to avoid interfering with modal positioning
          transform: !isExpanded ? (transitionStyle?.transform || undefined) : undefined,
          // Ensure visibility during transitions
          pointerEvents: transitionEnabled ? 'auto' : 'auto',
        }}
        onClick={() => {
          if (!isExpanded) {
            onToggle(item.id);
          }
        }}
      >
        {/* Button state - show title */}
        {!isExpanded && (
          <span style={{
            color: item.textColor,
            fontSize: `${buttonFontSize}px`,
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
              className="bottom-navbar-modal-content"
              style={{
                opacity: 1, // Sequential content handles its own opacity
                width: '100%',
                height: '100%',
                overflow: 'hidden', // Prevent scrollbars completely
                // Responsive padding based on modal type with increased bottom padding
                padding: item.shrinkToFitContent ? '15px 15px 20px 15px' : '10px 10px 16px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center', // Center content vertically within modal
                alignItems: 'center',
                // Responsive gap based on modal type - increased for better spacing
                gap: item.shrinkToFitContent ? '22px' : '16px',
                boxSizing: 'border-box',
                // Additional scrollbar prevention for all browsers
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // IE and Edge
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* CSS for WebKit scrollbar hiding */}
              <style>
                {`
                  .bottom-navbar-modal-content::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                  }
                  .bottom-navbar-modal-content {
                    -webkit-overflow-scrolling: touch;
                  }
                `}
              </style>
              {sequentialContentTransitions((style, piece) => (
                <animated.div style={style} key={piece.id}>
                  {piece.type === 'title' && (
                    <h2 style={{
                      color: item.textColor,
                      fontSize: `${modalTitleFontSize}px`, // Auto-calculated 4px larger than content
                      fontWeight: 'bold',
                      fontFamily: buttonFontFamily,
                      textAlign: 'center',
                      margin: '0',
                      padding: '0 5px', // Reduced padding
                    }}>
                      {piece.content}
                    </h2>
                  )}
                  {piece.type === 'text-line' && (
                    <div style={{
                      color: item.textColor,
                      fontSize: `${modalContentFontSize}px`,
                      fontFamily: contentFontFamily,
                      lineHeight: '1.4',
                      whiteSpace: 'normal', // Allow text to wrap naturally
                      margin: '0',
                      padding: '0 5px',
                      textAlign: 'center',
                      maxWidth: '100%',
                      wordWrap: 'break-word', // Ensure long words wrap properly
                      overflowWrap: 'break-word', // Additional wrap support
                      hyphens: 'auto', // Enable hyphenation for better wrapping
                    }}>
                      {convertTextToLinksAndElements(
                        piece.content as string, 
                        '#4A9EFF', // Bright blue that works on most backgrounds
                        '#FFD700'  // Gold hover color for clear distinction
                      )}
                    </div>
                  )}
                  {piece.type === 'image' && (
                    <img
                      src={piece.content as string}
                      alt="Modal content"
                      style={{
                        width: '95%', // Use 95% of modal width
                        // Responsive height based on shrinkToFitContent setting
                        maxHeight: item.shrinkToFitContent 
                          ? `${modalHeight * 0.7}px` // 70% for content-fit modals
                          : `${modalHeight * 0.92}px`, // 92% for fixed-size modals (images)
                        objectFit: 'contain',
                        borderRadius: '8px',
                        margin: '0 auto', // Remove top/bottom margin, center horizontally
                        display: 'block',
                        // Maintain aspect ratio and center the image
                        alignSelf: 'center',
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