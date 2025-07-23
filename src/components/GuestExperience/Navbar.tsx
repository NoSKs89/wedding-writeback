import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSpring, animated, useTransition, config, useSpringRef, useChain } from '@react-spring/web';
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
  // Auto-nav props
  autoElements?: Array<{elementId: number, sequence: number, endPosition: number}>;
  scrollToAutoElement?: (autoIndex: number) => void;
  includeAutoNav?: boolean;
}

// Utility function to convert text to links and format bold text
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
  navbarType,
  autoElements = [],
  scrollToAutoElement,
  includeAutoNav = false
}) => {
  console.log('🚀 Navbar Component Mounted:', {
    timestamp: Date.now(),
    props: {
      scrollY,
      startPosition,
      endPosition,
      windowHeight,
      TOTAL_PAGES,
      styleControls,
      weddingId,
      elementId: element?.id,
      navbarType,
      hasLayoutSettingsFromPreview: !!layoutSettingsFromPreview,
      autoElements: autoElements,
      autoElementsLength: autoElements?.length || 0,
      includeAutoNav: includeAutoNav,
      hasScrollToAutoElement: !!scrollToAutoElement
    }
  });

  const [items, setItems] = useState<NavbarItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [viewportDimensions, setViewportDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [navbarIncludeAutoNav, setNavbarIncludeAutoNav] = useState<boolean>(false);

  // Load navbar items
  useEffect(() => {
    const loadNavbarSettings = async () => {
      console.log('📡 Loading Navbar Settings:', {
        timestamp: Date.now(),
        weddingId,
        hasWeddingId: !!weddingId
      });
      
      if (!weddingId) {
        console.log('❌ No weddingId provided, skipping navbar settings load');
        return;
      }
      
      try {
        const apiBase = getApiBaseUrl();
        console.log('🌐 Making API request to:', `${apiBase}/weddings/${weddingId}/navbar-settings`);
        
        const response = await axios.get(`${apiBase}/weddings/${weddingId}/navbar-settings`);
        console.log('📥 Navbar Settings API Response:', {
          timestamp: Date.now(),
          status: response.status,
          hasData: !!response.data,
          data: response.data,
          hasItems: !!(response.data && response.data.data && response.data.data.items),
          itemCount: response.data?.data?.items?.length || 0
        });
        
        if (response.data && response.data.data) {
          // Handle both legacy and new data formats
          const data = response.data.data;
          if (data.items) {
            const sortedItems = data.items.sort((a: NavbarItem, b: NavbarItem) => a.position - b.position);
            console.log('✅ Setting navbar items:', {
              timestamp: Date.now(),
              itemCount: sortedItems.length,
              items: sortedItems.map((item: NavbarItem) => ({ id: item.id, title: item.title, position: item.position }))
            });
            setItems(sortedItems);
          } else {
            console.log('⚠️ No items found in navbar settings data');
          }
          
          // Load includeAutoNav setting
          const loadedIncludeAutoNav = data.includeAutoNav || false;
          console.log('✅ Setting navbar includeAutoNav:', {
            timestamp: Date.now(),
            includeAutoNav: loadedIncludeAutoNav
          });
          setNavbarIncludeAutoNav(loadedIncludeAutoNav);
        } else {
          console.log('⚠️ No data found in navbar settings response');
        }
      } catch (error) {
        console.error('❌ Error loading navbar settings:', error);
      }
    };
    loadNavbarSettings();
  }, [weddingId]);

  // Calculate progress for opacity based on scroll position
  // For navbar elements, we want full opacity when scrollY is at or after startPosition
  const progress = Math.min(1, Math.max(0, (scrollY - startPosition * windowHeight) / ((endPosition - startPosition) * windowHeight)));
  const opacity = startPosition === endPosition ? 1 : (scrollY >= startPosition * windowHeight ? 1 : progress);
  
  console.log('👁️ Navbar Visibility Calculation:', {
    timestamp: Date.now(),
    scrollY,
    startPosition,
    endPosition,
    windowHeight,
    startPixel: startPosition * windowHeight,
    endPixel: endPosition * windowHeight,
    progress,
    opacity,
    isAlwaysVisible: startPosition === endPosition,
    navbarType,
    itemCount: items.length
  });

  // Spring for navbar visibility - handle legacy bottom navbar behavior
  const navbarSpring = useSpring({
    opacity: opacity * (styleControls.endingOpacity || 1),
    transform: navbarType === 'bottom' || !navbarType // Default to bottom behavior for legacy support
      ? `translateY(${(1 - opacity) * 100}%)` 
      : navbarType === 'top'
      ? `translateY(${(opacity - 1) * 100}%)` // Reverse animation for top
      : 'none',
    config: config.stiff
  });

  // Spring for hamburger menu - make it more prominent
  const hamburgerSpring = useSpring({
    opacity: navbarType === 'hamburger' ? (opacity * (styleControls.endingOpacity || 1)) : 0,
    transform: navbarType === 'hamburger' ? 'scale(1)' : 'scale(0.8)',
    config: config.stiff
  });

  // Spring for sidebar overlay - use gentle config to avoid wobbly effect
  const sidebarSpring = useSpring({
    opacity: isHamburgerOpen ? 1 : 0,
    transform: isHamburgerOpen ? 'translateX(0%)' : 'translateX(-100%)',
    config: config.gentle
  });

  // Transition for sidebar items - use gentle config to avoid wobbly effect
  const sidebarTransitions = useTransition(isHamburgerOpen ? items : [], {
    from: { opacity: 0, transform: 'translateX(-50px)' },
    enter: { opacity: 1, transform: 'translateX(0px)' },
    leave: { opacity: 0, transform: 'translateX(-50px)' },
    trail: 150,
    config: config.gentle
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

  // Render hamburger icon with better styling
  const renderHamburger = () => (
    <animated.div
      style={{
        ...hamburgerSpring,
        position: 'fixed',
        top: '20px',
        left: '20px',
        cursor: 'pointer',
        zIndex: 100000, // Higher than sidebar to stay on top
        backgroundColor: 'rgba(255, 255, 255, 0.95)', // More opaque white
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', // Stronger shadow
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)', // Subtle border
      }}
      onClick={() => setIsHamburgerOpen(!isHamburgerOpen)}
    >
      <div style={{ 
        width: '24px', 
        height: '2px', 
        backgroundColor: isHamburgerOpen ? '#666' : '#333', 
        marginBottom: '6px',
        transition: 'transform 0.3s ease, background-color 0.3s ease',
        transform: isHamburgerOpen ? 'rotate(45deg) translate(6px, 6px)' : 'none'
      }} />
      <div style={{ 
        width: '24px', 
        height: '2px', 
        backgroundColor: isHamburgerOpen ? '#666' : '#333', 
        marginBottom: '6px',
        transition: 'opacity 0.3s ease, background-color 0.3s ease',
        opacity: isHamburgerOpen ? 0 : 1
      }} />
      <div style={{ 
        width: '24px', 
        height: '2px', 
        backgroundColor: isHamburgerOpen ? '#666' : '#333',
        transition: 'transform 0.3s ease, background-color 0.3s ease',
        transform: isHamburgerOpen ? 'rotate(-45deg) translate(6px, -6px)' : 'none'
      }} />
    </animated.div>
  );

  // Render sidebar with better styling
  const renderSidebar = () => (
    <>
      {/* Backdrop overlay */}
      {isHamburgerOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99998, // Higher than backdrop
          }}
          onClick={() => setIsHamburgerOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <animated.div
        style={{
          ...sidebarSpring,
          position: 'fixed',
          top: 0,
          left: 0,
          width: '320px',
          height: '100vh',
          backgroundColor: 'white',
          boxShadow: '2px 0 20px rgba(0,0,0,0.3)',
          zIndex: 99999, // Same as hamburger
          overflowY: 'auto',
          paddingTop: '80px', // Space for hamburger icon
        }}
      >
        <div style={{ padding: '20px' }}>
          <h2 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '24px', 
            fontWeight: 'bold',
            color: '#333',
            borderBottom: '2px solid #eee',
            paddingBottom: '10px'
          }}>
            Menu
          </h2>
          
          {sidebarTransitions((style, item) => (
            <animated.div
              key={item.id}
              style={{
                opacity: style.opacity,
                marginBottom: '15px',
                padding: '15px',
                backgroundColor: item.backgroundColor,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                border: '1px solid rgba(0,0,0,0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
              onClick={() => {
                setExpandedItemId(item.id === expandedItemId ? null : item.id);
                // Don't close sidebar when clicking items
              }}
            >
              <h3 style={{ 
                margin: 0, 
                color: item.textColor,
                fontSize: '18px',
                fontWeight: '600'
              }}>
                {item.title}
              </h3>
            </animated.div>
          ))}

          {/* Auto-Nav Items */}
          {(() => {
            const shouldShowAutoNav = navbarIncludeAutoNav && includeAutoNav && autoElements.length > 0;
            console.log('🔍 Auto-Nav Condition Check:', {
              timestamp: Date.now(),
              navbarIncludeAutoNav,
              includeAutoNav,
              autoElementsLength: autoElements.length,
              shouldShowAutoNav,
              autoElements: autoElements
            });
            return shouldShowAutoNav;
          })() && (
            <>
              {/* Divider */}
              <div style={{
                margin: '20px 0 15px 0',
                borderTop: '2px solid #e0e0e0',
                position: 'relative'
              }}>
                <span style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'white',
                  padding: '0 10px',
                  color: '#666',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  Auto Navigation
                </span>
              </div>

              {/* Auto-Nav Items */}
              {autoElements.map((autoElement, index) => {
                // Find the corresponding element to get its name
                const matchingElement = experienceSettings?.elements?.find((el: any) => el.id === autoElement.elementId);
                console.log('🔍 Auto-Nav Element Name Lookup:', {
                  timestamp: Date.now(),
                  autoElementId: autoElement.elementId,
                  autoSequence: autoElement.sequence,
                  matchingElement: matchingElement,
                  elementName: matchingElement?.name,
                  contentName: matchingElement?.content?.name,
                  finalName: matchingElement?.name || matchingElement?.content?.name || `Auto ${autoElement.sequence}`
                });
                
                const elementName = matchingElement?.name || 
                                   matchingElement?.content?.name || 
                                   `Auto ${autoElement.sequence}`;
                
                return (
                  <div
                    key={`auto-nav-${autoElement.elementId}`}
                    style={{
                      marginBottom: '12px',
                      padding: '12px 15px',
                      backgroundColor: '#4a90e2', // Different color for auto-nav items
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: '1px solid rgba(74, 144, 226, 0.3)',
                      boxShadow: '0 2px 8px rgba(74, 144, 226, 0.2)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(74, 144, 226, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0px)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(74, 144, 226, 0.2)';
                    }}
                    onClick={() => {
                      if (scrollToAutoElement) {
                        scrollToAutoElement(index);
                        setIsHamburgerOpen(false); // Close sidebar when clicking auto-nav item
                      }
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between'
                    }}>
                      <h3 style={{ 
                        margin: 0, 
                        color: '#ffffff',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}>
                        {elementName}
                      </h3>
                      <span style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        minWidth: '20px',
                        textAlign: 'center'
                      }}>
                        {autoElement.sequence}
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </animated.div>
    </>
  );

  // Render bottom/top navbar with enhanced styling
  const renderNavbar = () => (
    <animated.div
      style={{
        ...navbarSpring,
        position: 'fixed',
        left: 0,
        right: 0,
        height: styleControls.navbarHeight || '60px',
        backgroundColor: styleControls.backgroundColor || 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: navbarType === 'bottom' 
          ? '0 -2px 10px rgba(0,0,0,0.1)' 
          : '0 2px 10px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: `${styleControls.topPadding || 0}px 0 ${styleControls.bottomPadding || 0}px`,
        ...(navbarType === 'bottom' ? { bottom: 0 } : { top: 0 }),
        zIndex: 99999, // Consistent high z-index
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            cursor: 'pointer',
            padding: '10px 15px',
            color: item.textColor,
            textAlign: 'center',
            borderRadius: '6px',
            transition: 'background-color 0.2s ease',
            fontWeight: '500',
            fontSize: '14px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
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
                color: item.textColor,
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                maxWidth: '90%',
                maxHeight: '80vh',
                overflow: 'auto',
                zIndex: 100000, // Higher than navbar
                backdropFilter: 'blur(10px)',
                ...(navbarType === 'bottom' ? { bottom: '80px' } : { top: '80px' }),
              }}
            >
              {item.showTitleWhenOpened && (
                <h3 style={{ 
                  margin: '0 0 15px 0', 
                  fontSize: '20px',
                  fontWeight: 'bold',
                  borderBottom: `1px solid ${item.textColor}20`,
                  paddingBottom: '10px'
                }}>
                  {item.title}
                </h3>
              )}
              <div style={{ 
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                fontSize: '14px'
              }}>
                {item.textContent}
              </div>
            </div>
          )}
        </div>
      ))}
    </animated.div>
  );

  console.log('🎭 Navbar Render Decision:', {
    timestamp: Date.now(),
    navbarType,
    willRenderHamburger: navbarType === 'hamburger',
    willRenderNavbar: navbarType !== 'hamburger',
    itemCount: items.length,
    opacity,
    isVisible: opacity > 0
  });

  // Debug indicator removed

  // Get the expanded item for modal
  const expandedItem = expandedItemId ? items.find(item => item.id === expandedItemId) : null;

  // Process content into sequential animation pieces - always call useMemo
  const sequentialContentPieces = useMemo(() => {
    if (!expandedItem) return [];
    
    const pieces: Array<{
      id: string;
      type: 'title' | 'text-line' | 'image';
      content: string;
      originalIndex: number;
    }> = [];
    
    let currentIndex = 0;
    
    // Add title if it should be shown
    if (expandedItem.showTitleWhenOpened && expandedItem.title) {
      pieces.push({
        id: `title-${currentIndex}`,
        type: 'title',
        content: expandedItem.title,
        originalIndex: currentIndex
      });
      currentIndex++;
    }
    
    // Add image before text if it exists
    if (expandedItem.imageUrl) {
      pieces.push({
        id: `image-${currentIndex}`,
        type: 'image',
        content: expandedItem.imageUrl,
        originalIndex: currentIndex
      });
      currentIndex++;
    }
    
    // Split text content by newlines and add each line
    if (expandedItem.textContent) {
      const textLines = expandedItem.textContent.split('\n').filter(line => line.trim());
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
  }, [expandedItem?.title, expandedItem?.showTitleWhenOpened, expandedItem?.textContent, expandedItem?.imageUrl]);

  // Modal animation - slides in from bottom center - always call useSpring
  const modalSpring = useSpring({
    from: {
      opacity: 0,
      transform: 'translateY(100vh) scale(0.8)',
    },
    to: {
      opacity: expandedItem ? 1 : 0,
      transform: expandedItem ? 'translateY(0) scale(1)' : 'translateY(100vh) scale(0.8)',
    },
    config: config.stiff,
  });

  // Sequential content animation - each piece animates in sequence - always call useTransition
  const sequentialContentTransitions = useTransition(
    sequentialContentPieces, 
    {
      keys: piece => piece.id,
      from: { opacity: 0, transform: 'translateY(20px) scale(0.95)' },
      enter: { opacity: 1, transform: 'translateY(0px) scale(1)' },
      leave: { opacity: 0, transform: 'translateY(-10px) scale(0.95)' },
      trail: 200, // 200ms delay between each piece
      config: config.gentle,
    }
  );

  // Hamburger modal that animates in from bottom center
  const HamburgerModal = () => {
    if (!expandedItem) return null;

    // Modal dimensions and position - responsive to shrinkToFitContent setting
    let modalHeight: number;
    let modalTop: number;
    
    if (expandedItem.shrinkToFitContent) {
      // Content-fit modal: smaller size for text content
      modalHeight = Math.min(viewportDimensions.height * 0.6, 400); // Max 60vh or 400px
      modalTop = (viewportDimensions.height - modalHeight) / 2; // Center vertically
    } else {
      // Fixed size modal: 90vh height as before (great for images)
      modalHeight = viewportDimensions.height * 0.9; // 90vh
      modalTop = viewportDimensions.height * 0.05; // 5vh from top
    }
    
    const modalWidth = Math.min(viewportDimensions.width * 0.8, 500); // Reduced from 0.9 to 0.8 and 600 to 500
    const modalLeft = (viewportDimensions.width - modalWidth) / 2; // Center horizontally

    return (
      <>
        {/* Modal */}
        <animated.div
          style={{
            position: 'fixed',
            top: modalTop,
            left: modalLeft,
            width: modalWidth,
            height: modalHeight,
            backgroundColor: expandedItem.backgroundColor,
            borderRadius: 12,
            zIndex: 100001,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            cursor: 'default',
            padding: expandedItem.shrinkToFitContent ? '12px' : '8px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            ...modalSpring,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setExpandedItemId(null)}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              color: expandedItem.textColor,
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100002,
            }}
          >
            ×
          </button>

          {/* Animated content */}
          <animated.div
            className="hamburger-modal-content"
            style={{
              opacity: 1, // Sequential content handles its own opacity
              width: '100%',
              height: '100%',
              overflow: 'hidden', // Prevent scrollbars completely
              // Responsive padding based on modal type with increased bottom padding
              padding: expandedItem.shrinkToFitContent ? '15px 15px 20px 15px' : '10px 10px 16px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center', // Center content vertically within modal
              alignItems: 'center',
              // Responsive gap based on modal type - increased for better spacing
              gap: expandedItem.shrinkToFitContent ? '22px' : '16px',
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
                .hamburger-modal-content::-webkit-scrollbar {
                  display: none !important;
                  width: 0 !important;
                  height: 0 !important;
                }
                .hamburger-modal-content {
                  -webkit-overflow-scrolling: touch;
                }
              `}
            </style>
            {sequentialContentTransitions((style, piece) => (
              <animated.div style={style} key={piece.id}>
                {piece.type === 'title' && (
                  <h2 style={{
                    color: expandedItem.textColor,
                    fontSize: '24px', // Auto-calculated 4px larger than content
                    fontWeight: 'bold',
                    textAlign: 'center',
                    margin: '0',
                    padding: '0 5px', // Reduced padding
                  }}>
                    {piece.content}
                  </h2>
                )}
                {piece.type === 'text-line' && (
                  <div style={{
                    color: expandedItem.textColor,
                    fontSize: '16px',
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
                      maxHeight: expandedItem.shrinkToFitContent 
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
        </animated.div>
      </>
    );
  };

  return (
    <>
      {navbarType === 'hamburger' ? (
        <>
          {renderHamburger()}
          {renderSidebar()}
          <HamburgerModal />
        </>
      ) : (
        renderNavbar()
      )}
    </>
  );
};

export default Navbar; 