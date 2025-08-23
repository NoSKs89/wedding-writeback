import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSpring, animated, useTransition, config, useSpringRef, useChain } from '@react-spring/web';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../../config/apiConfig';
import { useUserInfo } from '../../contexts/UserInfoContext';

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
  isFormSubmitted?: boolean; // Add optional property for form submission status
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
  // Move modalStack to the top so it's available for all hooks
  const [modalStack, setModalStack] = useState<Array<{ id: string, item: any }>>([]);
  // console.log('🚀 Navbar Component Mounted:', {
  //   timestamp: Date.now(),
  //   props: {
  //     scrollY,
  //     startPosition,
  //     endPosition,
  //     windowHeight,
  //     TOTAL_PAGES,
  //     styleControls,
  //     weddingId,
  //     elementId: element?.id,
  //     navbarType,
  //     hasLayoutSettingsFromPreview: !!layoutSettingsFromPreview,
  //     autoElements: autoElements,
  //     autoElementsLength: autoElements?.length || 0,
  //     includeAutoNav: includeAutoNav,
  //     hasScrollToAutoElement: !!scrollToAutoElement
  //   }
  // });

  const [items, setItems] = useState<NavbarItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [viewportDimensions, setViewportDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [navbarIncludeAutoNav, setNavbarIncludeAutoNav] = useState<boolean>(false);
  
  // Form submission tracking
  const { formSubmissions } = useUserInfo();
  
  // DEBUG: Log form submissions state
  console.log('🔍 [FORM_SUBMISSIONS_DEBUG] formSubmissions:', {
    timestamp: Date.now(),
    formSubmissions,
    rsvpSubmitted: formSubmissions?.rsvpSubmitted,
    promptFormSubmitted: formSubmissions?.promptFormSubmitted,
    hasFormSubmissions: !!formSubmissions
  });

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
  
  // console.log('👁️ Navbar Visibility Calculation:', {
  //   timestamp: Date.now(),
  //   scrollY,
  //   startPosition,
  //   endPosition,
  //   windowHeight,
  //   startPixel: startPosition * windowHeight,
  //   endPixel: endPosition * windowHeight,
  //   progress,
  //   opacity,
  //   isAlwaysVisible: startPosition === endPosition,
  //   navbarType,
  //   itemCount: items.length
  // });

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

  // LOGGING: expandedItemId
  useEffect(() => {
    console.log('[MODAL] expandedItemId:', expandedItemId);
  }, [expandedItemId]);

  // A. SidebarItems construction (guarantee only one divider and one set of auto-nav items)
  const sidebarItems = useMemo(() => {
    const normal = items.map(item => ({
      ...item,
      isAutoNav: false,
      type: 'normal',
      id: `nav-${item.id}`,
      sequence: undefined
    }));
    const autoNav = (navbarIncludeAutoNav && includeAutoNav && autoElements.length > 0)
      ? autoElements.map((autoElement, index) => {
          const matchingElement = experienceSettings?.elements?.find((el: any) => el.id === autoElement.elementId);
          const elementName = matchingElement?.name || matchingElement?.content?.name || `Auto ${autoElement.sequence}`;
          
          // DEBUG: Log matching element details
          console.log('🔍 [MATCHING_ELEMENT_DEBUG]', {
            timestamp: Date.now(),
            autoElementId: autoElement.elementId,
            matchingElement: matchingElement ? {
              id: matchingElement.id,
              type: matchingElement.type,
              name: matchingElement.name,
              contentType: matchingElement.content?.type,
              contentName: matchingElement.content?.name
            } : null,
            elementName,
            hasMatchingElement: !!matchingElement
          });
          
          // Check if this auto element corresponds to a form that has been submitted
          const isFormSubmitted = (() => {
            if (!matchingElement) {
              console.log('❌ [FORM_CHECK] No matching element found for autoElement:', autoElement.elementId);
              return false;
            }
            
            // Check if this is an RSVP form
            if (matchingElement.type === 'rsvp' || 
                (matchingElement.content && matchingElement.content.type === 'rsvp') ||
                elementName.toLowerCase().includes('rsvp')) {
              const result = formSubmissions.rsvpSubmitted;
              console.log('✅ [FORM_CHECK] RSVP form detected:', {
                autoElementId: autoElement.elementId,
                elementName,
                formSubmissions: formSubmissions,
                rsvpSubmitted: formSubmissions.rsvpSubmitted,
                result
              });
              return result;
            }
            
            // Check if this is a prompt form
            if (matchingElement.type === 'promptform' || 
                (matchingElement.content && matchingElement.content.type === 'promptform') ||
                elementName.toLowerCase().includes('prompt')) {
              const result = formSubmissions.promptFormSubmitted;
              console.log('✅ [FORM_CHECK] Prompt form detected:', {
                autoElementId: autoElement.elementId,
                elementName,
                formSubmissions: formSubmissions,
                promptFormSubmitted: formSubmissions.promptFormSubmitted,
                result
              });
              return result;
            }
            
            console.log('❌ [FORM_CHECK] No form type detected for element:', {
              autoElementId: autoElement.elementId,
              elementName,
              elementType: matchingElement.type,
              contentType: matchingElement.content?.type
            });
            return false;
          })();
          
          return {
            id: `auto-nav-${autoElement.elementId}`,
            title: elementName,
            isAutoNav: true,
            type: 'autoNav',
            sequence: autoElement.sequence as number | undefined,
            backgroundColor: '#4a90e2',
            textColor: '#fff',
            textContent: '',
            imageUrl: undefined,
            position: 0,
            showTitleWhenOpened: false,
            shrinkToFitContent: false,
            isFormSubmitted, // Add form submission status
          };
          
          // DEBUG: Log final auto-nav item
          console.log('🔍 [AUTO_NAV_ITEM_DEBUG]', {
            timestamp: Date.now(),
            autoElementId: autoElement.elementId,
            elementName,
            isFormSubmitted,
            finalItem: {
              id: `auto-nav-${autoElement.elementId}`,
              title: elementName,
              isAutoNav: true,
              isFormSubmitted
            }
          });
        }) : [];
    let result = [...normal];
    if (autoNav.length > 0) {
      // Add a divider with all required properties (dummy values for unused fields)
      result.push({
        id: 'divider-auto-nav',
        type: 'divider',
        isAutoNav: false,
        sequence: undefined,
        title: '',
        textContent: '',
        imageUrl: undefined,
        backgroundColor: '',
        textColor: '',
        position: 0,
        showTitleWhenOpened: false,
        shrinkToFitContent: false,
      });
      result = result.concat(autoNav as any);
    }
    // LOGGING: Sidebar items structure
    console.log('[SIDEBAR_ITEMS_BUILD] result:', result);
    
    // DEBUG: Log auto-nav items with form submission status
    const autoNavItems = result.filter(item => item.isAutoNav);
    console.log('🔍 [SIDEBAR_AUTO_NAV_DEBUG] Auto-nav items with form status:', {
      timestamp: Date.now(),
      autoNavItems: autoNavItems.map(item => ({
        id: item.id,
        title: item.title,
        isAutoNav: item.isAutoNav,
        isFormSubmitted: item.isFormSubmitted
      })),
      totalAutoNavItems: autoNavItems.length
    });
    
    return result;
  }, [items, navbarIncludeAutoNav, includeAutoNav, autoElements, experienceSettings, formSubmissions]);


  // LOGGING: Sidebar items
  useEffect(() => {
    console.log('[SIDEBAR_ITEMS] sidebarItems:', sidebarItems);
    sidebarItems.forEach((item, idx) => {
      console.log(`[SIDEBAR_RENDER] index=${idx}`, item);
    });
  }, [sidebarItems]);

  // LOGGING: Modal stack
  useEffect(() => {
    console.log('[MODAL_STACK_STATE]', modalStack);
  }, [modalStack]);

  const sidebarTransitions = useTransition(isHamburgerOpen ? sidebarItems : [], {
    from: { opacity: 0, transform: 'translateX(-50px)' },
    enter: { opacity: 1, transform: 'translateX(0px)' },
    leave: { opacity: 0, transform: 'translateX(-50px)' },
    trail: 150,
    config: config.gentle
  });


  // B. Decoupled Modal Stack
  // LOGGING: Modal stack
  useEffect(() => {
    console.log('[MODAL_STACK]', modalStack);
  }, [modalStack]);

  // Open modal for a normal item
  const openModal = (item: any) => {
    setModalStack([{ id: item.id, item }]);
  };

  // Animate out and then open new modal
  const handleSidebarItemClick = (item: any) => {
    console.log('[SIDEBAR CLICK]', { item }); // <-- Add this log
    if (item.type === 'divider') return;
    if (item.isAutoNav) {
      // If a modal is open, close it and close the sidebar
      if (modalStack.length > 0) {
        setModalStack([]);
        setIsHamburgerOpen(false);
      }
      if (scrollToAutoElement) {
        const autoIndex = sidebarItems.filter(i => i.type === 'autoNav').findIndex(i => i.id === item.id);
        scrollToAutoElement(autoIndex);
        setIsHamburgerOpen(false);
      }
      return;
    }
    // Only normal items open modal
    if (modalStack.length > 0 && modalStack[0].id === item.id) {
      setModalStack([]); // close
      return;
    }
    if (modalStack.length > 0) {
      // Animate out current modal, then open new one
      setModalStack([]);
      setTimeout(() => {
        setModalStack([{ id: item.id, item }]);
      }, 250); // match modal close animation duration
    } else {
      setModalStack([{ id: item.id, item }]);
    }
  };

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
            zIndex: 1000, // Lowered to ensure modal is always on top
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
          
          {sidebarTransitions((style, item) => {
            if (item.type === 'divider') {
              return (
                <animated.div key={item.id} style={{ ...style, margin: '20px 0 15px 0', width: '100%' }}>
                  <div style={{
                    borderTop: '2px solid #e0e0e0',
                    position: 'relative',
                    width: '100%',
                    marginBottom: '0',
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
                      letterSpacing: '1px',
                      zIndex: 1
                    }}>
                      Auto Navigation
                    </span>
                  </div>
                  {/* Spacer to prevent overlap */}
                  <div style={{ height: '15px' }}></div>
                </animated.div>
              );
            }
            return (
              <animated.div
                key={item.id}
                style={{
                  opacity: style.opacity,
                  marginBottom: '15px',
                  padding: '15px',
                  backgroundColor: item.isAutoNav ? '#4a90e2' : item.backgroundColor,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                  border: item.isAutoNav ? '1px solid rgba(74, 144, 226, 0.3)' : '1px solid rgba(0,0,0,0.1)',
                  boxShadow: item.isAutoNav ? '0 2px 8px rgba(74, 144, 226, 0.2)' : undefined,
                  color: item.isAutoNav ? '#fff' : item.textColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                                     // Apply darker styling for submitted forms
                   ...(item.isAutoNav && item.isFormSubmitted && {
                     backgroundColor: '#2d5a8b', // Darker blue background
                     border: '1px solid rgba(74, 144, 226, 0.5)', // Slightly more visible border
                   }),
                  position: 'relative', // For checkmark positioning
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0px)'; }}
                onClick={() => {
                  // DEBUG: Log rendering of auto-nav item
                  if (item.isAutoNav) {
                    console.log('🎨 [RENDER_AUTO_NAV_DEBUG] Rendering auto-nav item:', {
                      timestamp: Date.now(),
                      itemId: item.id,
                      itemTitle: item.title,
                      isFormSubmitted: item.isFormSubmitted,
                      willShowCheckmark: item.isFormSubmitted,
                      willApplyOpacity: item.isFormSubmitted
                    });
                  }
                  handleSidebarItemClick(item);
                }}
              >
                <h3 style={{
                  margin: 0,
                  color: item.isAutoNav
                    ? (item.isFormSubmitted ? '#cfd8dc' : '#fff')
                    : item.textColor,
                  fontSize: '18px',
                  fontWeight: '600',
                  flex: 1,
                  textDecoration: item.isAutoNav && item.isFormSubmitted ? 'line-through' : undefined,
                  textDecorationThickness: item.isAutoNav && item.isFormSubmitted ? '2px' : undefined,
                  textDecorationColor: item.isAutoNav && item.isFormSubmitted ? '#607d8b' : undefined,
                  textDecorationSkipInk: 'auto',
                  opacity: item.isAutoNav && item.isFormSubmitted ? 0.85 : 1,
                  transition: 'color 0.2s, text-decoration 0.2s, opacity 0.2s',
                }}>{item.title}</h3>
                {item.isAutoNav && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Green checkmark for submitted forms */}
                    {item.isFormSubmitted && (
                      <>
                        {console.log('✅ [CHECKMARK_DEBUG] Rendering checkmark for item:', {
                          timestamp: Date.now(),
                          itemId: item.id,
                          itemTitle: item.title,
                          isFormSubmitted: item.isFormSubmitted
                        })}
                        <span style={{
                          color: '#4CAF50',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(76, 175, 80, 0.2)',
                          border: '2px solid #4CAF50',
                        }}>
                          ✓
                        </span>
                      </>
                    )}
                    <span style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      minWidth: '20px',
                      textAlign: 'center'
                    }}>{item.sequence}</span>
                  </div>
                )}
              </animated.div>
            );
          })}
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

  // console.log('🎭 Navbar Render Decision:', {
  //   timestamp: Date.now(),
  //   navbarType,
  //   willRenderHamburger: navbarType === 'hamburger',
  //   willRenderNavbar: navbarType !== 'hamburger',
  //   itemCount: items.length,
  //   opacity,
  //   isVisible: opacity > 0
  // });

  // Debug indicator removed

  // Find expanded item from sidebarItems (for modal)
  const expandedItem = useMemo(() => {
    const found = sidebarItems.find(item => item.id === expandedItemId && item.type === 'normal');
    console.log('[MODAL] expandedItem lookup:', { expandedItemId, found });
    return found;
  }, [expandedItemId, sidebarItems]);

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

  // Move modalSpring hook outside of HamburgerModal so it is always called
  const getModalDimensions = (expandedItem: any) => {
    if (!expandedItem) return {
      modalHeight: 0,
      modalTop: 0,
      modalWidth: 0,
      modalLeft: 0,
    };
    let modalHeight: number;
    let modalTop: number;
    if (expandedItem.shrinkToFitContent) {
      modalHeight = Math.min(window.innerHeight * 0.6, 400);
      modalTop = (window.innerHeight - modalHeight) / 2;
    } else {
      modalHeight = window.innerHeight * 0.9;
      modalTop = window.innerHeight * 0.05;
    }
    const modalWidth = Math.min(window.innerWidth * 0.8, 500);
    const modalLeft = (window.innerWidth - modalWidth) / 2;
    return { modalHeight, modalTop, modalWidth, modalLeft };
  };

  const expandedModalItem = modalStack.length > 0 ? modalStack[0].item : null;
  const { modalHeight, modalTop, modalWidth, modalLeft } = getModalDimensions(expandedModalItem);
  const modalSpring = useSpring({
    opacity: expandedModalItem ? 1 : 0,
    transform: expandedModalItem ? 'translateY(0)' : 'translateY(100px)',
    config: { tension: 280, friction: 30 },
    reset: false,
  });

  // Refactor HamburgerModal to accept style as a prop
  const HamburgerModal = ({ expandedItem, onClose, style, modalHeight, modalTop, modalWidth, modalLeft }: { expandedItem: any, onClose: () => void, style: any, modalHeight: number, modalTop: number, modalWidth: number, modalLeft: number }) => {
    // Add logging for modal render
    console.log('[MODAL_RENDER]', { expandedItem });
    if (!expandedItem) return null;

    return (
      <>
        {/* Modal backdrop: clicking this closes the modal */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 2147483646,
          }}
          onClick={onClose}
        />
        <animated.div
          style={{
            position: 'fixed',
            top: modalTop,
            left: modalLeft,
            width: modalWidth,
            height: modalHeight,
            backgroundColor: expandedItem.backgroundColor || 'white',
            borderRadius: 12,
            zIndex: 2147483647,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            cursor: 'default',
            padding: expandedItem.shrinkToFitContent ? '12px' : '8px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            ...style,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              color: expandedItem.textColor || '#333',
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
          {/* Modal content */}
          <div
            className="hamburger-modal-content"
            style={{
              opacity: 1,
              width: '100%',
              height: '100%',
              overflow: 'auto',
              padding: expandedItem.shrinkToFitContent ? '15px 15px 20px 15px' : '10px 10px 16px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: expandedItem.shrinkToFitContent ? '22px' : '16px',
              boxSizing: 'border-box',
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE and Edge
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hide scrollbars for all browsers */}
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
            {expandedItem.showTitleWhenOpened && expandedItem.title && (
              <h2 style={{
                color: expandedItem.textColor || '#000',
                fontSize: '24px',
                fontWeight: 'bold',
                textAlign: 'center',
                margin: 0,
              }}>{expandedItem.title}</h2>
            )}
            {expandedItem.imageUrl && (
              <img
                src={expandedItem.imageUrl}
                alt="Modal content"
                style={{
                  width: '95%',
                  maxHeight: expandedItem.shrinkToFitContent ? `${modalHeight * 0.7}px` : `${modalHeight * 0.92}px`,
                  objectFit: 'contain',
                  borderRadius: '8px',
                  margin: '0 auto',
                  display: 'block',
                  alignSelf: 'center',
                }}
              />
            )}
            {expandedItem.textContent && expandedItem.textContent.split('\n').map((line: string, idx: number) => (
              <div
                key={idx}
                style={{
                  color: expandedItem.textColor || '#333',
                  fontSize: '16px',
                  lineHeight: '1.5',
                  textAlign: 'center',
                  whiteSpace: 'normal',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  hyphens: 'auto',
                }}
              >
                {convertTextToLinksAndElements(line, '#4A9EFF', '#FFD700')}
              </div>
            ))}
          </div>
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
          {modalStack.length > 0 && (
            <HamburgerModal
              expandedItem={modalStack[0].item}
              onClose={() => setModalStack([])}
              style={modalSpring}
              modalHeight={modalHeight}
              modalTop={modalTop}
              modalWidth={modalWidth}
              modalLeft={modalLeft}
            />
          )}
        </>
      ) : (
        renderNavbar()
      )}
    </>
  );
};

export default Navbar; 