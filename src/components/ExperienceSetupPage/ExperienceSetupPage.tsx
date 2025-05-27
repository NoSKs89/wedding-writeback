// ExperienceSetupPage.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import TimelineBar from './TimelineBar'; // Component for the timeline
import ElementSlot from './ElementSlot'; // Component for each element configuration
import { DndProvider } from 'react-dnd'; // For drag and drop of timeline markers
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTransition, animated, config, useSpring, useSpringRef } from '@react-spring/web'; // Added useSpring, useSpringRef
import FAQModalContainer from './FAQModalContainer'; // Import the FAQ component
import { useParams } from 'react-router-dom'; // Added
import axios from 'axios'; // Added
import { getApiBaseUrl } from '../../config/apiConfig'; // Added - Assuming this path is correct


// --- Interfaces ---

export interface TimelineMarker {
  id: string; // Unique ID for the marker (e.g., `element-${elementId}-start`)
  elementId: number; // Now 1-8
  type: 'start' | 'end';
  position: number; // Percentage (0 to 1) or absolute value along the timeline
  color: string;
  previewImageUrl?: string; // Optional: for photo elements on start markers
  textPreview?: string; // Optional: for text elements on start markers
  previewIcon?: string; // Optional: for component elements on start markers (e.g., 'floppy-disk')
}

export interface ElementConfig {
  id: number; // Now 1-8
  type: 'empty' | 'photo' | 'text' | 'component';
  content: string | File | React.ComponentType<any> | null; // URL for photo, text content, or component type
  name?: string; // e.g., 'RSVPForm' or uploaded file name
  timelineColor: string; // Unique color for this element's markers
  // Z-index is implicitly determined by array order (index 0 is highest)
}

// Define an interface for the wedding data based on the provided structure
interface WeddingData {
  _id: string;
  brideName?: string;
  groomName?: string;
  weddingDate?: string; // ISO Date string
  introCouple?: string; // Image URL
  introBackground?: string; // Image URL
  // Add other fields as necessary from your data structure
}

const INITIAL_DEFINED_ELEMENT_COUNT = 7; // For the 7 predefined slots
const MAX_DISPLAY_ELEMENTS_INITIAL = 8; // For TimelineBar's visual calculations and initial array sizing if needed for colors.
const INITIAL_TIMELINE_LENGTH = 1000;

// Updated color palette based on user's new list
const ELEMENT_COLORS = [
  '#FFFFFF', // Pure White (Element 1)
  '#FFF176', // Light Yellow (Element 2)
  '#FFB74D', // Light Orange (Element 3)
  '#EF5350', // Coral Red (Element 4)
  '#AB47BC', // Deep Magenta (Element 5)
  '#5C6BC0', // Royal Blue (Element 6)
  '#00897B', // Deep Teal (Element 7)
  '#78909C'  // Added an 8th color for the 8th default slot if created before fetching
];

// Helper to format date as MMMM DD, YYYY
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Date Not Set';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Invalid Date";
  }
};

const ExperienceSetupPage: React.FC = () => {
  const { weddingId } = useParams<{ weddingId: string }>();
  const [currentWeddingData, setCurrentWeddingData] = useState<WeddingData | null>(null);
  const [isLoadingWeddingData, setIsLoadingWeddingData] = useState(true);

  const [timelineLength, setTimelineLength] = useState<number>(INITIAL_TIMELINE_LENGTH);
  const [elements, setElements] = useState<ElementConfig[]>([]);
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);
  const [focusedElementId, setFocusedElementId] = useState<number | null>(null); // New state for focused element

  // Centralized modal state
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // State for mobile and landscape detection
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkDeviceOrientation = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Basic landscape check (width > height)
      // More sophisticated checks might be needed if it impacts spring animations heavily
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkDeviceOrientation(); // Initial check
    window.addEventListener('resize', checkDeviceOrientation);
    return () => window.removeEventListener('resize', checkDeviceOrientation);
  }, []);

  // Fetch wedding data
  useEffect(() => {
    if (weddingId) {
      const fetchWeddingData = async () => {
        setIsLoadingWeddingData(true);
        try {
          const apiBase = getApiBaseUrl();
          const response = await axios.get<WeddingData>(`${apiBase}/weddings/${weddingId}`);
          setCurrentWeddingData(response.data);
        } catch (error) {
          console.error('Error fetching wedding data:', error);
          // Handle error (e.g., set an error state, show a notification)
        }
        setIsLoadingWeddingData(false);
      };
      fetchWeddingData();
    }
  }, [weddingId]);

  // Initialize elements once wedding data is fetched
  useEffect(() => {
    if (currentWeddingData) {
      const initialElements: ElementConfig[] = [
        {
          id: 1, type: 'text', content: currentWeddingData.brideName || 'Bride Name',
          name: 'Bride Name', timelineColor: ELEMENT_COLORS[0],
        },
        {
          id: 2, type: 'text', content: currentWeddingData.groomName || 'Groom Name',
          name: 'Groom Name', timelineColor: ELEMENT_COLORS[1],
        },
        {
          id: 3, type: 'text', content: formatDate(currentWeddingData.weddingDate),
          name: 'Wedding Date', timelineColor: ELEMENT_COLORS[2],
        },
        {
          id: 4, type: 'photo', content: currentWeddingData.introCouple || null,
          name: 'Intro Couple Image', timelineColor: ELEMENT_COLORS[3],
        },
        {
          id: 5, type: 'photo', content: currentWeddingData.introBackground || null,
          name: 'Intro Background Image', timelineColor: ELEMENT_COLORS[4],
        },
        {
          id: 6, type: 'component', content: 'RSVP Form', name: 'RSVP Form',
          timelineColor: ELEMENT_COLORS[5],
        },
        {
          id: 7, type: 'component', content: 'Scrapbook', name: 'Scrapbook',
          timelineColor: ELEMENT_COLORS[6],
        },
      ];
      setElements(initialElements);
    }
  }, [currentWeddingData]);

  // --- Memoized Timeline Markers ---
  // This recalculates markers whenever elements or their configured content change.
  const activeMarkers = useMemo(() => {
    const newMarkers: TimelineMarker[] = [];
    elements.forEach((el) => { // el.id is 1-based
      let startMarker = markers.find(m => m.elementId === el.id && m.type === 'start');
      let endMarker = markers.find(m => m.elementId === el.id && m.type === 'end');

      if (el.type !== 'empty') {
        let textPreviewContent: string | undefined = undefined;
        let iconPreviewContent: string | undefined = undefined;

        if (el.type === 'text' && typeof el.content === 'string' && el.content.trim()) {
          const fullText = el.content.trim();
          textPreviewContent = fullText.length > 9 ? fullText.substring(0, 9) + '...' : fullText;
        } else if (el.type === 'component') {
          iconPreviewContent = 'settings'; // Using a generic icon name for now
        }

        // Default positions based on element ID if markers don't exist
        // Spread out elements a bit initially.
        const defaultBasePosition = ((el.id - 1) / Math.max(INITIAL_DEFINED_ELEMENT_COUNT, elements.length)) * 0.8; // Use total elements or initial count

        if (!startMarker) {
          startMarker = {
            id: `element-${el.id}-start`, elementId: el.id, type: 'start',
            position: defaultBasePosition, // Default start
            color: el.timelineColor,
            previewImageUrl: el.type === 'photo' && typeof el.content === 'string' ? el.content : undefined,
            textPreview: textPreviewContent, previewIcon: iconPreviewContent,
          };
        } else {
          startMarker = {
            ...startMarker,
            previewImageUrl: el.type === 'photo' && typeof el.content === 'string' ? el.content : undefined,
            textPreview: textPreviewContent, previewIcon: iconPreviewContent,
          };
        }

        if (!endMarker) {
          endMarker = {
            id: `element-${el.id}-end`, elementId: el.id, type: 'end',
            position: Math.min(startMarker.position + 0.1, 1), // Default duration
            color: el.timelineColor,
          };
        }
        newMarkers.push(startMarker, endMarker);
      }
    });
    // To persist these derived markers if they are new (e.g. default creation)
    // This logic can be complex. For now, let's assume `setMarkers` is called elsewhere appropriately.
    // If `markers` state itself is not updated with these defaults, dragging might behave unexpectedly.
    // A good place to ensure markers exist is when elements are initialized or added.
    // Let's try to update the main markers state if new default markers were created.
    if (newMarkers.length > markers.length && newMarkers.some(nm => !markers.find(m => m.id === nm.id))) {
        // This is a simplification; robust diffing might be needed.
        // Or, ensure markers are added explicitly when elements are.
        // For now, let markers state be managed by handlers like handleUpdateMarkerPosition etc.
        // The memo is primarily for deriving what *should* be displayed.
    }
    return newMarkers;
  }, [elements, markers]);

  // Ensure markers are created/updated when elements are set initially or changed.
  useEffect(() => {
    const newMarkerSet: TimelineMarker[] = [];

    const specificDefaultPositions: {[key: number]: {start: number, end: number}} = {
      1: { start: 0.075, end: 0.500 }, // Bride Name
      2: { start: 0.100, end: 0.500 }, // Groom Name
      3: { start: 0.150, end: 0.500 }, // Wedding Date
      4: { start: 0.050, end: 0.600 }, // Intro Couple Image
      5: { start: 0.000, end: 0.650 }, // Intro Background Image
      6: { start: 0.650, end: 1.000 }, // RSVP Form
      7: { start: 0.600, end: 1.000 }, // Scrapbook
    };

    elements.forEach(el => {
        if (el.type !== 'empty') {
            let startNeedsUpdate = false;
            let endNeedsUpdate = false;

            let existingStart = markers.find(m => m.elementId === el.id && m.type === 'start');
            let existingEnd = markers.find(m => m.elementId === el.id && m.type === 'end');

            let textPreview: string | undefined = undefined;
            let previewIcon: string | undefined = undefined;
            let previewImageUrl: string | undefined = undefined;

            if (el.type === 'text' && typeof el.content === 'string' && el.content.trim()) {
                const fullText = el.content.trim();
                textPreview = fullText.length > 9 ? fullText.substring(0, 9) + '...' : fullText;
            } else if (el.type === 'component') {
                previewIcon = el.name === 'RSVP Form' ? '📅' : el.name === 'Scrapbook' ? '📚' : '⚙️';
            } else if (el.type === 'photo' && typeof el.content === 'string') {
                previewImageUrl = el.content;
            }

            if (!existingStart) {
                const specificDefaults = specificDefaultPositions[el.id];
                const defaultPos = specificDefaults ? specificDefaults.start 
                                   : ((el.id - 1) / Math.max(INITIAL_DEFINED_ELEMENT_COUNT, elements.length)) * 0.8;
                existingStart = {
                    id: `element-${el.id}-start`, elementId: el.id, type: 'start',
                    position: defaultPos, color: el.timelineColor,
                    textPreview, previewIcon, previewImageUrl
                };
                startNeedsUpdate = true;
            } else if (existingStart.textPreview !== textPreview || existingStart.previewIcon !== previewIcon || existingStart.previewImageUrl !== previewImageUrl) {
                existingStart = { ...existingStart, textPreview, previewIcon, previewImageUrl };
                startNeedsUpdate = true;
            }


            if (!existingEnd) {
                const specificDefaults = specificDefaultPositions[el.id];
                const defaultEndPos = specificDefaults ? specificDefaults.end 
                                    : Math.min(existingStart.position + 0.1, 1);
                existingEnd = {
                    id: `element-${el.id}-end`, elementId: el.id, type: 'end',
                    position: defaultEndPos, color: el.timelineColor,
                };
                endNeedsUpdate = true;
            }
            
            newMarkerSet.push(existingStart, existingEnd);
        }
    });
    // Only update if there are actual changes to avoid infinite loops
    // This basic check might not be enough for all cases.
    if (JSON.stringify(newMarkerSet) !== JSON.stringify(markers.filter(m => elements.find(e => e.id === m.elementId && e.type !== 'empty')))) {
       setMarkers(newMarkerSet);
    }
  }, [elements]); // Removed `markers` from dependency array to prevent potential loops with the simple JSON.stringify check

  // --- CRUD for Timeline Markers & Length ---

  const handleUpdateMarkerPosition = useCallback((markerId: string, newPosition: number) => {
    setMarkers(prevMarkers =>
      prevMarkers.map(marker =>
        marker.id === markerId ? { ...marker, position: Math.max(0, Math.min(1, newPosition)) } : marker
      )
    );
  }, []);

  const handleAddOrUpdateElementMarker = useCallback((elementId: number, type: 'start' | 'end', position: number) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const markerId = `element-${elementId}-${type}`;
    setMarkers(prevMarkers => {
      const existingMarkerIndex = prevMarkers.findIndex(m => m.id === markerId);
      let updatedMarkers;
      if (existingMarkerIndex > -1) {
        updatedMarkers = [...prevMarkers];
        updatedMarkers[existingMarkerIndex] = { ...updatedMarkers[existingMarkerIndex], position };
      } else {
        updatedMarkers = [
          ...prevMarkers,
          { id: markerId, elementId, type, position, color: element.timelineColor },
        ];
      }
      // Ensure start is not after end and vice-versa
      const changedMarker = updatedMarkers.find(m => m.id === markerId);
      if (changedMarker) {
          const pairType = changedMarker.type === 'start' ? 'end' : 'start';
          const pairMarkerIndex = updatedMarkers.findIndex(m => m.elementId === changedMarker.elementId && m.type === pairType);
          if (pairMarkerIndex > -1) {
            const pairMarker = updatedMarkers[pairMarkerIndex];
              if (changedMarker.type === 'start' && position > pairMarker.position) {
                  updatedMarkers[pairMarkerIndex] = {...pairMarker, position: position};
              } else if (changedMarker.type === 'end' && position < pairMarker.position) {
                  updatedMarkers[pairMarkerIndex] = {...pairMarker, position: position};
              }
          }
      }
      return updatedMarkers;
    });
  }, [elements]);


  const handleRemoveElementMarkers = useCallback((elementId: number) => {
    setMarkers(prevMarkers => prevMarkers.filter(marker => marker.elementId !== elementId));
  }, []);

  const handleTimelineLengthChange = useCallback((newLength: number) => {
    setTimelineLength(newLength);
  }, []);

  const handleUpdateElementGroupPosition = useCallback((elementId: number, newStartProportion: number, newEndPosition: number) => {
    setMarkers(prevMarkers =>
      prevMarkers.map(marker => {
        if (marker.elementId === elementId) {
          if (marker.type === 'start') return { ...marker, position: newStartProportion };
          if (marker.type === 'end') return { ...marker, position: newEndPosition };
        }
        return marker;
      })
    );
  }, []);

  // --- Element Configuration ---

  const handleElementUpdate = useCallback((id: number, newConfig: Partial<Omit<ElementConfig, 'id' | 'timelineColor'>>) => {
    setElements(prevElements =>
      prevElements.map(el => {
        if (el.id === id) {
          const wasEmpty = el.type === 'empty';
          const isNowNotEmpty = newConfig.type && newConfig.type !== 'empty';
          const updatedEl = { ...el, ...newConfig };

          if (wasEmpty && isNowNotEmpty) {
            // Default positions when an empty element becomes active
            const defaultStartPos = ((id -1) / Math.max(INITIAL_DEFINED_ELEMENT_COUNT, elements.length)) * 0.5;
            handleAddOrUpdateElementMarker(id, 'start', defaultStartPos);
            handleAddOrUpdateElementMarker(id, 'end', Math.min(defaultStartPos + 0.1, 1));
          } else if (newConfig.type === 'empty') {
            handleRemoveElementMarkers(id);
          }
          return updatedEl;
        }
        return el;
      })
    );
  }, [elements.length, handleAddOrUpdateElementMarker, handleRemoveElementMarkers]);

  const handleElementFocus = useCallback((elementId: number) => {
    setFocusedElementId(elementId);
  }, []);

  const handleMarkerPositionChangeFromInput = useCallback((elementId: number, type: 'start' | 'end', newPositionPercent: number) => {
    const markerIdToUpdate = `element-${elementId}-${type}`;
    handleUpdateMarkerPosition(markerIdToUpdate, newPositionPercent);
  }, [handleUpdateMarkerPosition]);

  // --- Z-index Visualization ---
  // Lower index in `elements` array means higher z-index.
  // We can depict this via brightness/opacity of the element slots.
  const getElementSlotStyle = (element: ElementConfig): React.CSSProperties => {
    const maxBrightness = 1;
    const minBrightness = 0.6; // Adjust as needed
    // Higher z-index (lower array index / lower element.id for 1-based) = brighter
    const brightness = maxBrightness - ((element.id - 1) / (INITIAL_DEFINED_ELEMENT_COUNT -1)) * (maxBrightness - minBrightness);
    
    let borderStyle = `3px solid ${element.timelineColor}`;
    if (element.timelineColor === '#FFFFFF') {
      borderStyle = `3px solid #DDDDDD`; // Light grey border for white slot
    }

    return {
      // Example: Adjust opacity or a background color brightness
      // backgroundColor: `rgba(200, 200, 250, ${brightness})`, // Or use HSL for brightness
      filter: `brightness(${brightness * 100}%)`,
      border: borderStyle, // Use the conditional border style
      // marginBottom: '10px', // Remove margin for horizontal stacking
      // padding: '10px', // ElementSlot will handle its own padding
      borderRadius: '8px',
      // Add flex properties for horizontal stacking
      margin: '5px', // Add some margin between slots
      minWidth: '200px', // Ensure slots have a minimum width
      flex: '0 0 auto', // Prevent shrinking, allow growing based on content if needed
    };
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeModal && e.target === e.currentTarget) setActiveModal(null);
  };

  const handleAddNewElement = () => {
    setElements(prevElements => {
      const newId = prevElements.length > 0 ? Math.max(...prevElements.map(el => el.id)) + 1 : 1;
      const newElement: ElementConfig = {
        id: newId,
        type: 'empty',
        content: null,
        timelineColor: ELEMENT_COLORS[(newId - 1) % ELEMENT_COLORS.length], // Cycle through colors
        name: `Element ${newId}`
      };
      // Add markers for the new element
      const defaultPos = ((newId - 1) / Math.max(INITIAL_DEFINED_ELEMENT_COUNT, prevElements.length + 1)) * 0.8;
      const startMarkerId = `element-${newId}-start`;
      const endMarkerId = `element-${newId}-end`;

      setMarkers(prevMarkers => [
        ...prevMarkers,
        { id: startMarkerId, elementId: newId, type: 'start', position: defaultPos, color: newElement.timelineColor },
        { id: endMarkerId, elementId: newId, type: 'end', position: Math.min(defaultPos + 0.1, 1), color: newElement.timelineColor }
      ]);
      return [...prevElements, newElement];
    });
  };

  if (isLoadingWeddingData) {
    return <div style={{textAlign: 'center', padding: '50px', fontSize: '1.2em'}}>Loading Wedding Experience Setup...</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ padding: '0px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', backgroundColor: '#E9ecce' }}>
        
        {/* Backdrop for Modals */}
        {activeModal && (
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999, // Should be below modal content (FAQModalContainer uses 1000 when open)
            }}
            onClick={handleBackdropClick}
          />
        )}

        {/* Page Header with Modal Trigger Buttons/Containers */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '800px', marginBottom: '20px', zIndex: 100 }}> {/* Added zIndex and maxWidth */}
            {/* FAQModalContainer will position itself absolutely. It handles its own click to open. */}
            <FAQModalContainer
              activeModal={activeModal}
              setActiveModal={setActiveModal}
              isMobile={isMobile}
              isLandscape={isLandscape}
              // Add any specific props for positioning if FAQModalContainer supports it,
              // or wrap it in a div if you need to constrain its 'button' position.
              // For now, relying on its internal absolute positioning relative to a positioned ancestor or viewport.
            />
            <div style={{ flexGrow: 1, textAlign: 'center', margin: '0 10px' }}>
              <h1 className="experience-setup-main-title" style={{ margin: '0 0 5px 0' }}>
                Experience Setup
              </h1>
              <h3 className="experience-setup-event-name" style={{ margin: '0' }}>
                {currentWeddingData?.brideName && currentWeddingData?.groomName ? `for ${currentWeddingData.brideName} & ${currentWeddingData.groomName}` : weddingId ? `for ${weddingId}`: ''}
              </h3>
            </div>
            {/* Placeholder for a second modal button/container on the right */}
            <button 
              onClick={() => setActiveModal('helpModal')} 
              style={{ padding: '10px 15px', cursor: 'pointer', display: 'none' /* Changed from visibility: hidden */ }}
            >
              Open Help
            </button>
        </div>

        <div className="timeline-length-controls" style={{ alignItems: 'center' }}>
          <label htmlFor="timelineLength" className="timeline-length-label">Overall Timeline Length:</label>
          <input
            type="number"
            id="timelineLength"
            value={timelineLength}
            onChange={(e) => handleTimelineLengthChange(parseInt(e.target.value, 10) || 0)}
            className="timeline-length-input"
          />
          <span className="timeline-length-units">units</span>
        </div>

        {/* Main content area for Timeline and Element Slots */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          width: '100%',
          marginTop: '20px',
          gap: isMobile ? '40px' : '0px' // Increased gap for mobile row layout
        }}>
          {/* TimelineBar Container (Left column on mobile) */}
          <div style={isMobile ? { flex: '0 0 100px', display: 'flex', justifyContent: 'flex-start' /* Align to left */ } : { width: '100%' }}>
            <TimelineBar
              markers={activeMarkers}
              onUpdateMarkerPosition={handleUpdateMarkerPosition}
              onUpdateElementGroupPosition={handleUpdateElementGroupPosition}
              length={isMobile ? 600 : timelineLength} // Example: fixed length for vertical mobile, or adjust based on available height
              maxElements={MAX_DISPLAY_ELEMENTS_INITIAL}
              isMobile={isMobile} // Pass isMobile prop
            />
          </div>

          {/* Element Slots Container (Right column on mobile or full width below timeline on desktop) */}
          <div style={{
            display: 'flex',
            flexWrap: isMobile ? 'nowrap' : 'wrap', // No wrap for mobile to stack vertically
            flexDirection: isMobile ? 'column' : 'row', // Stack vertically on mobile
            justifyContent: isMobile ? 'flex-start' : 'center',
            gap: '10px',
            flexGrow: 1, // Allow this to take remaining space on mobile
            overflowY: isMobile ? 'auto' : 'visible', // Allow scrolling for element slots on mobile
            maxHeight: isMobile ? 'calc(100vh - 150px)' : 'none', // Example max height for mobile scroll
          }}>
            {elements.map((el) => {
              const isFocused = el.id === focusedElementId;
              const startMarker = activeMarkers.find(m => m.elementId === el.id && m.type === 'start');
              const endMarker = activeMarkers.find(m => m.elementId === el.id && m.type === 'end');
              return (
                <div 
                  key={el.id} 
                  data-element-slot-id={el.id} // Add a data attribute to the wrapper
                >
                  <ElementSlot
                    element={el}
                    onUpdate={(newConfig) => handleElementUpdate(el.id, newConfig)}
                    onRemove={() => handleElementUpdate(el.id, { type: 'empty', content: null, name: undefined })}
                    isFocused={isFocused}
                    onFocus={handleElementFocus}
                    startPositionPercent={startMarker?.position}
                    endPositionPercent={endMarker?.position}
                    onMarkerPositionChangeFromInput={handleMarkerPositionChangeFromInput}
                  />
                </div>
              );
            })}
            {/* "Add New Element" Slot */}
            <div
              onClick={handleAddNewElement}
              style={{
                width: '200px', minHeight: '120px', border: '2px dashed #333333', // Always black/dark-grey dashed border
                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: '10px', margin: '5px',
                color: '#333333', // Always black/dark-grey text color
                textAlign: 'center',
                boxSizing: 'border-box'
              }}
              title="Add a new element to the experience"
            >
              <div style={{fontSize: '2em', fontWeight: 'bold'}}>+</div>
              <span style={{marginLeft: '10px', fontSize: '0.9em'}}>Add Element {elements.length + 1}</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ marginTop: '30px', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => console.log('Save Configuration clicked. Current state:', { elements, markers, timelineLength })}
            style={{
              padding: '10px 20px',
              fontSize: '1rem',
              color: 'white',
              backgroundColor: '#007bff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Save Configuration
          </button>
        </div>

        {/* Debug Button to log marker positions */}
        <div style={{ marginTop: '10px', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => {
              console.log("--- Current Element Positions ---");
              const elementsData: { [key: number]: { name?: string, start?: number, end?: number, type?: string } } = {};
              elements.forEach(el => {
                if (el.type !== 'empty') {
                  elementsData[el.id] = { name: el.name, type: el.type };
                }
              });
              activeMarkers.forEach(marker => {
                if (elementsData[marker.elementId]) {
                  if (marker.type === 'start') {
                    elementsData[marker.elementId].start = marker.position;
                  } else if (marker.type === 'end') {
                    elementsData[marker.elementId].end = marker.position;
                  }
                }
              });
              Object.entries(elementsData).forEach(([id, data]) => {
                console.log(
                  `Element ID: ${id}, Name: ${data.name || 'N/A'}, Type: ${data.type}, Start: ${data.start?.toFixed(3) || 'N/A'}, End: ${data.end?.toFixed(3) || 'N/A'}`
                );
              });
              console.log("---------------------------------");
            }}
            style={{
              padding: '8px 15px', fontSize: '0.9rem', color: 'white',
              backgroundColor: '#6c757d', border: 'none', borderRadius: '5px',
              cursor: 'pointer', marginLeft: '10px' 
            }}
          >
            Log Element Positions
          </button>
        </div>

      </div>
    </DndProvider>
  );
};

export default ExperienceSetupPage; 