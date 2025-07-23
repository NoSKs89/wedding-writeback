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
  type: 'empty' | 'photo' | 'text' | 'component' | 'background-image' | 'video' | 'background-video' | 'navbar'; // Temporarily keep 'navbar' for backward compatibility
  content: string | File | React.ComponentType<any> | null | { 
    maxImages?: number;
    disableS3?: boolean;
  } | {
    navbarType: 'bottom' | 'top' | 'hamburger';
    items: Array<{
      id: string;
      title: string;
      textContent: string;
      imageUrl?: string;
      backgroundColor: string;
      textColor: string;
      position: number;
      showTitleWhenOpened: boolean;
      shrinkToFitContent: boolean;
    }>;
  } | 'Bottom Navbar' | 'RSVP Form' | 'Prompt Form' | 'Scrapbook'; // Support legacy component names
  name?: string; // e.g., 'RSVPForm' or uploaded file name
  timelineColor: string; // Unique color for this element's markers
  autoSequence?: number | null; // Auto navigation sequence number (1, 2, 3, etc.) or null if not in auto sequence
  // Z-index is implicitly determined by array order (index 0 is highest)
}

// Define the structure for the experience settings to be saved/loaded
export interface ExperienceSettings {
  elements: ElementConfig[];
  markers: TimelineMarker[];
  timelineLength: number;
  defaultLayoutSlotDesktop: number;
  defaultLayoutSlotMobile: number;
  autoNavigationEnabled: boolean;
}

// Define an interface for the wedding data based on the provided structure
interface WeddingData {
  _id: string;
  brideName?: string;
  groomName?: string;
  eventName?: string; // Added eventName
  weddingDate?: string; // ISO Date string
  introCouple?: string; // Image URL
  introBackground?: string; // Image URL
  // Add other fields as necessary from your data structure
}

const INITIAL_DEFINED_ELEMENT_COUNT = 7; // For the 7 predefined slots
const MAX_DISPLAY_ELEMENTS_INITIAL = 8; // For TimelineBar's visual calculations and initial array sizing if needed for colors.
const INITIAL_TIMELINE_LENGTH = 5000; // Changed to 5000

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

// Helper function to generate initial elements and markers
const generateInitialElementsAndMarkers = (weddingData: WeddingData | null) => {
  if (!weddingData) {
    return { initialElements: [], initialMarkers: [] };
  }

  const initialElementsList: ElementConfig[] = [
    {
      id: 1, type: 'text', content: weddingData.brideName || 'Bride Name',
      name: 'Bride Name', timelineColor: ELEMENT_COLORS[0], autoSequence: null,
    },
    {
      id: 2, type: 'text', content: weddingData.groomName || 'Groom Name',
      name: 'Groom Name', timelineColor: ELEMENT_COLORS[1], autoSequence: null,
    },
    {
      id: 3, type: 'text', content: formatDate(weddingData.weddingDate),
      name: 'Wedding Date', timelineColor: ELEMENT_COLORS[2], autoSequence: null,
    },
    {
      id: 4, type: 'photo', content: weddingData.introCouple || null,
      name: 'Intro Couple Image', timelineColor: ELEMENT_COLORS[3], autoSequence: null,
    },
    {
      id: 5, type: 'background-image', content: weddingData.introBackground || null, // Changed type to 'background-image'
      name: 'Background Scene Image', timelineColor: ELEMENT_COLORS[4], autoSequence: null,
    },
    {
      id: 6, type: 'component', content: 'RSVP Form', name: 'RSVP Form',
      timelineColor: ELEMENT_COLORS[5], autoSequence: null,
    },
    {
      id: 7, type: 'component', content: 'Scrapbook', name: 'Scrapbook',
      timelineColor: ELEMENT_COLORS[6], autoSequence: null,
    },
  ];

  // For scrapbook elements, default content should include maxImages
  initialElementsList.forEach(el => {
    if (el.name === 'Scrapbook' && el.type === 'component') {
      el.content = { maxImages: 15 }; // Default to 15 images
    }
  });

  const initialMarkersList: TimelineMarker[] = [];
  const specificDefaultPositions: {[key: number]: {start: number, end: number}} = {
    1: { start: 0.075, end: 0.500 },
    2: { start: 0.100, end: 0.500 },
    3: { start: 0.150, end: 0.500 },
    4: { start: 0.050, end: 0.600 },
    5: { start: 0.000, end: 0.650 },
    6: { start: 0.650, end: 1.000 },
    7: { start: 0.600, end: 1.000 },
  };

  initialElementsList.forEach(el => {
    if (el.type !== 'empty') {
      let textPreview: string | undefined = undefined;
      let previewIcon: string | undefined = undefined;
      let previewImageUrl: string | undefined = undefined;

      if (el.type === 'text' && typeof el.content === 'string' && el.content.trim()) {
        const fullText = el.content.trim();
        textPreview = fullText.length > 9 ? fullText.substring(0, 9) + '...' : fullText;
      } else if (el.type === 'component') {
        previewIcon = el.name === 'RSVP Form' ? '📅' : el.name === 'Prompt Form' ? '📝' : el.name === 'Scrapbook' ? '📚' : '⚙️';
      } else if (el.type === 'photo' && typeof el.content === 'string') {
        previewImageUrl = el.content;
      } else if (el.type === 'video' && typeof el.content === 'string') { // Added for video preview
        previewImageUrl = el.content; // Videos can show as preview images (thumbnail)
      } else if (el.type === 'background-image' && typeof el.content === 'string') { // Added for background-image preview
        previewImageUrl = el.content;
      } else if (el.type === 'background-video' && typeof el.content === 'string') { // Added for background video preview
        previewImageUrl = el.content; // Background videos can show as preview images (thumbnail)
      }

      const specificDefaults = specificDefaultPositions[el.id];
      const startPos = specificDefaults ? specificDefaults.start
                       : ((el.id - 1) / INITIAL_DEFINED_ELEMENT_COUNT) * 0.8;
      const endPos = specificDefaults ? specificDefaults.end
                     : Math.min(startPos + 0.1, 1);

      initialMarkersList.push({
        id: `element-${el.id}-start`, elementId: el.id, type: 'start',
        position: startPos, color: el.timelineColor,
        textPreview, previewIcon, previewImageUrl
      });
      initialMarkersList.push({
        id: `element-${el.id}-end`, elementId: el.id, type: 'end',
        position: endPos, color: el.timelineColor,
      });
    }
  });

  return { initialElements: initialElementsList, initialMarkers: initialMarkersList };
};

const ExperienceSetupPage: React.FC = () => {
  const { weddingId } = useParams<{ weddingId: string }>();
  const [currentWeddingData, setCurrentWeddingData] = useState<WeddingData | null>(null);
  const [isLoadingWeddingData, setIsLoadingWeddingData] = useState(true);
  const [isLoadingExperienceSettings, setIsLoadingExperienceSettings] = useState(true); // For loading indicator

  const [timelineLength, setTimelineLength] = useState<number>(INITIAL_TIMELINE_LENGTH);
  const [elements, setElements] = useState<ElementConfig[]>([]);
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);
  const [focusedElementId, setFocusedElementId] = useState<number | null>(null); // New state for focused element
  const [defaultLayoutSlotDesktop, setDefaultLayoutSlotDesktop] = useState<number>(1); // CHANGED
  const [defaultLayoutSlotMobile, setDefaultLayoutSlotMobile] = useState<number>(1); // ADDED
  const [autoNavigationEnabled, setAutoNavigationEnabled] = useState<boolean>(false); // Auto Navigation toggle

  // State for mobile and landscape detection
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  // State for save operation
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Centralized modal state
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const [pageTitle, setPageTitle] = useState<string>('Experience Setup');

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

  // Fetch wedding data and then experience settings
  useEffect(() => {
    if (weddingId) {
      const fetchData = async () => {
        setIsLoadingWeddingData(true);
        setIsLoadingExperienceSettings(true);
        let fetchedWeddingData: WeddingData | null = null;

        try {
          const apiBase = getApiBaseUrl();
          const weddingDataResponse = await axios.get<WeddingData>(`${apiBase}/weddings/${weddingId}`);
          fetchedWeddingData = weddingDataResponse.data;
          setCurrentWeddingData(fetchedWeddingData);
        } catch (error) {
          console.error('Error fetching wedding data:', error);
          setIsLoadingWeddingData(false);
          setIsLoadingExperienceSettings(false); // Also stop loading settings if wedding data fails
          return; // Stop if wedding data fails
        }
        setIsLoadingWeddingData(false);

        // Now try to fetch experience settings
        if (fetchedWeddingData) {
          try {
            const apiBase = getApiBaseUrl();
            const settingsResponse = await axios.get<{ data: ExperienceSettings }>(`${apiBase}/weddings/${weddingId}/experience-settings`);
            if (settingsResponse.data && settingsResponse.data.data) {
              const { elements: savedElements, markers: savedMarkers, timelineLength: savedTimelineLength, defaultLayoutSlotDesktop: savedDefaultLayoutSlotDesktop, defaultLayoutSlotMobile: savedDefaultLayoutSlotMobile, autoNavigationEnabled: savedAutoNavigationEnabled } = settingsResponse.data.data;
              
              // Migrate legacy navbar elements to component type
              const migratedElements = savedElements.map(element => {
                if (element.type === 'navbar' && element.name === 'Navbar') {
                  console.log('🔄 Migrating legacy navbar element:', element.id);
                  return {
                    ...element,
                    type: 'component' as const
                  };
                }
                return element;
              });
              
              setElements(migratedElements);
              setMarkers(savedMarkers);
              setTimelineLength(savedTimelineLength);
              setDefaultLayoutSlotDesktop(savedDefaultLayoutSlotDesktop || 1);
              setDefaultLayoutSlotMobile(savedDefaultLayoutSlotMobile || 1);
              setAutoNavigationEnabled(savedAutoNavigationEnabled || false);
              console.log('Successfully loaded experience settings from server.');
            } else {
              // No saved settings, generate initial ones
              const { initialElements, initialMarkers } = generateInitialElementsAndMarkers(fetchedWeddingData);
              setElements(initialElements);
              setMarkers(initialMarkers);
              setTimelineLength(INITIAL_TIMELINE_LENGTH);
              setDefaultLayoutSlotDesktop(1);
              setDefaultLayoutSlotMobile(1);
              setAutoNavigationEnabled(false);
            }
          } catch (error) {
            console.warn('No experience settings found on server, generating defaults.', error);
            // If fetching settings fails (e.g., 404), generate defaults
            const { initialElements, initialMarkers } = generateInitialElementsAndMarkers(fetchedWeddingData);
            setElements(initialElements);
            setMarkers(initialMarkers);
            setTimelineLength(INITIAL_TIMELINE_LENGTH);
            setDefaultLayoutSlotDesktop(1);
            setDefaultLayoutSlotMobile(1);
            setAutoNavigationEnabled(false);
          }
        }
        setIsLoadingExperienceSettings(false);
      };
      fetchData();
    }
  }, [weddingId]);

  // Migration effect to convert legacy navbar elements to component type
  useEffect(() => {
    if (elements.length > 0) {
      const hasLegacyNavbar = elements.some(el => el.type === 'navbar' && el.name === 'Navbar');
      if (hasLegacyNavbar) {
        console.log('🔄 Migrating legacy navbar elements to component type...');
        const migratedElements = elements.map(element => {
          if (element.type === 'navbar' && element.name === 'Navbar') {
            console.log('🔄 Converting element', element.id, 'from navbar to component type');
            return {
              ...element,
              type: 'component' as const
            };
          }
          return element;
        });
        setElements(migratedElements);
      }
    }
  }, [elements.length]); // Only run when elements array length changes

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
        let previewImageUrl: string | undefined = undefined;

        if (el.type === 'text' && typeof el.content === 'string' && el.content.trim()) {
          const fullText = el.content.trim();
          textPreviewContent = fullText.length > 9 ? fullText.substring(0, 9) + '...' : fullText;
        } else if (el.type === 'component') {
          iconPreviewContent = el.name === 'RSVP Form' ? '📅' : el.name === 'Prompt Form' ? '📝' : el.name === 'Scrapbook' ? '📚' : el.name === 'Navbar' ? '🍔' : '⚙️';
        } else if (el.type === 'photo' && typeof el.content === 'string') {
          previewImageUrl = el.content;
        } else if (el.type === 'video' && typeof el.content === 'string') { // Added for video preview
          previewImageUrl = el.content; // Videos can show as preview images (thumbnail)
        } else if (el.type === 'background-image' && typeof el.content === 'string') { // Added for background-image preview
          previewImageUrl = el.content;
        } else if (el.type === 'background-video' && typeof el.content === 'string') { // Added for background video preview
          previewImageUrl = el.content; // Background videos can show as preview images (thumbnail)
        }

        // Default positions based on element ID if markers don't exist
        // Spread out elements a bit initially.
        const defaultBasePosition = ((el.id - 1) / Math.max(INITIAL_DEFINED_ELEMENT_COUNT, elements.length)) * 0.8; // Use total elements or initial count

        if (!startMarker) {
          startMarker = {
            id: `element-${el.id}-start`, elementId: el.id, type: 'start',
            position: defaultBasePosition, // Default start
            color: el.timelineColor,
            previewImageUrl: previewImageUrl,
            textPreview: textPreviewContent,
            previewIcon: iconPreviewContent,
          };
        } else {
          startMarker = {
            ...startMarker,
            previewImageUrl: previewImageUrl,
            textPreview: textPreviewContent,
            previewIcon: iconPreviewContent,
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
                previewIcon = el.name === 'RSVP Form' ? '📅' : el.name === 'Prompt Form' ? '📝' : el.name === 'Scrapbook' ? '📚' : '⚙️';
            } else if (el.type === 'photo' && typeof el.content === 'string') {
                previewImageUrl = el.content;
            } else if (el.type === 'video' && typeof el.content === 'string') { // Added for video preview
                previewImageUrl = el.content;
            } else if (el.type === 'background-image' && typeof el.content === 'string') { // Added for background-image
                previewImageUrl = el.content;
            } else if (el.type === 'background-video' && typeof el.content === 'string') { // Added for background video
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

  const handleReorderElement = useCallback((elementId: number, direction: 'up' | 'down') => {
    setElements(prevElements => {
      const elementIndex = prevElements.findIndex(el => el.id === elementId);
      if (elementIndex === -1) return prevElements;

      const newElements = [...prevElements];
      const targetIndex = direction === 'up' ? elementIndex - 1 : elementIndex + 1;

      if (targetIndex >= 0 && targetIndex < newElements.length) {
        // Simple swap
        [newElements[elementIndex], newElements[targetIndex]] = [newElements[targetIndex], newElements[elementIndex]];
      }
      
      return newElements;
    });
  }, []);

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
      const newElementConfig: ElementConfig = {
        id: newId,
        type: 'empty',
        content: null, // content will be set by onUpdate if type changes to scrapbook
        timelineColor: ELEMENT_COLORS[(newId - 1) % ELEMENT_COLORS.length], 
        name: `Element ${newId}`,
        autoSequence: null
      };
      // Add default markers for the new element - these are simple defaults, not from specificDefaultPositions
      const defaultPos = ((newId - 1) / Math.max(INITIAL_DEFINED_ELEMENT_COUNT, prevElements.length + 1)) * 0.8;
      const startMarkerId = `element-${newId}-start`;
      const endMarkerId = `element-${newId}-end`;

      setMarkers(prevMarkers => [
        ...prevMarkers,
        { id: startMarkerId, elementId: newId, type: 'start', position: defaultPos, color: newElementConfig.timelineColor },
        { id: endMarkerId, elementId: newId, type: 'end', position: Math.min(defaultPos + 0.1, 1), color: newElementConfig.timelineColor }
      ]);
      return [...prevElements, newElementConfig];
    });
  };

  const handleRestoreDefaults = () => {
    if (window.confirm('Are you sure? Reminder that saving the restored defaults will overwrite your current experience.')) {
      if (currentWeddingData) {
        const { initialElements, initialMarkers } = generateInitialElementsAndMarkers(currentWeddingData);
        setElements(initialElements);
        setMarkers(initialMarkers);
        setTimelineLength(INITIAL_TIMELINE_LENGTH); // Set timeline length to new default
        setFocusedElementId(null);
        setDefaultLayoutSlotDesktop(1); // Reset to 1 on defaults restoration
        setDefaultLayoutSlotMobile(1); // Reset to 1 on defaults restoration
      } else {
        // Handle case where currentWeddingData might be null (e.g., if called before data load)
        console.warn('Cannot restore defaults: Wedding data not loaded yet.');
      }
    }
  };

  const handleSaveConfiguration = async () => {
    if (!weddingId) {
      setSaveErrorMessage('Cannot save: Wedding ID is missing.');
      return;
    }
    setIsSaving(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);

    const settingsToSave: ExperienceSettings = {
      elements,
      markers,
      timelineLength,
      defaultLayoutSlotDesktop,
      defaultLayoutSlotMobile,
      autoNavigationEnabled,
    };

    try {
      const apiBase = getApiBaseUrl();
      await axios.post(`${apiBase}/weddings/${weddingId}/experience-settings`, settingsToSave);
      setSaveSuccessMessage('Configuration saved successfully!');
      setTimeout(() => setSaveSuccessMessage(null), 3000); // Clear message after 3 seconds
    } catch (error) {
      console.error('Error saving experience settings:', error);
      setSaveErrorMessage('Failed to save configuration. Please try again.');
      setTimeout(() => setSaveErrorMessage(null), 5000); // Clear message after 5 seconds
    }
    setIsSaving(false);
  };

  if (isLoadingWeddingData || isLoadingExperienceSettings) { // Updated loading check
    return <div style={{textAlign: 'center', padding: '50px', fontSize: '1.2em'}}>Loading Wedding Experience Setup...</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ padding: '0px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1, width: '100%' }}>
        
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '800px', marginTop: '10px', marginBottom: '0px', zIndex: 100 }}> {/* Reduced marginBottom from 20px to 10px */}
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
                {currentWeddingData?.eventName 
                  ? `for ${currentWeddingData.eventName}` 
                  : (weddingId ? `for wedding ID: ${weddingId}` : '')}
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

        <div className="timeline-length-controls" style={{ alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
            <label htmlFor="timelineLength" style={{ marginRight: '10px' }}>Overall Timeline Length (px):</label>
            <input
              type="number"
              id="timelineLength"
              value={timelineLength}
              onChange={(e) => handleTimelineLengthChange(parseInt(e.target.value, 10) || 0)}
              className="timeline-length-input"
              style={{ padding: '5px', width: '80px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                  <label htmlFor="defaultLayoutSlotDesktop">Default Desktop Slot:</label>
                  <select
                  id="defaultLayoutSlotDesktop"
                  value={defaultLayoutSlotDesktop}
                  onChange={(e) => setDefaultLayoutSlotDesktop(Number(e.target.value))}
                  style={{ marginLeft: '10px' }}
                  >
                  {[1, 2, 3, 4, 5].map(slot => (
                      <option key={slot} value={slot}>Slot {slot}</option>
                  ))}
                  </select>
              </div>
              <div>
                  <label htmlFor="defaultLayoutSlotMobile">Default Mobile Slot:</label>
                  <select
                  id="defaultLayoutSlotMobile"
                  value={defaultLayoutSlotMobile}
                  onChange={(e) => setDefaultLayoutSlotMobile(Number(e.target.value))}
                  style={{ marginLeft: '10px' }}
                  >
                  {[1, 2, 3, 4, 5].map(slot => (
                      <option key={slot} value={slot}>Slot {slot}</option>
                  ))}
                  </select>
              </div>
              <div>
                  <label htmlFor="autoNavigationEnabled" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                          type="checkbox"
                          id="autoNavigationEnabled"
                          checked={autoNavigationEnabled}
                          onChange={(e) => setAutoNavigationEnabled(e.target.checked)}
                      />
                      Enable 'Auto' Navigation
                  </label>
              </div>
          </div>
        </div>

        {/* Main content area for Timeline and Element Slots */}
        <div style={{
          display: 'flex',
          flexDirection: 'row', // Always side-by-side columns for timeline and slots
          alignItems: 'flex-start',
          width: '100%',
          marginTop: '12.5px', 
          gap: '2%' // Adjusted gap to be a percentage, or a smaller fixed value
        }}>
          {/* TimelineBar Container (ALWAYS a "mobile-like" vertical bar on the left) */}
          <div style={{ flex: '0 0 25%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}> 
            <h4 style={{textAlign: 'center', marginBottom: '5px'}}>Experience Timeline</h4>
            <hr style={{width: '80%', border: 'none', borderTop: '1px solid #ccc', margin: '0 0 10px 0'}} />
            <TimelineBar
              markers={activeMarkers}
              onUpdateMarkerPosition={handleUpdateMarkerPosition}
              onUpdateElementGroupPosition={handleUpdateElementGroupPosition}
              length={600} // Always a vertical-friendly length
              maxElements={MAX_DISPLAY_ELEMENTS_INITIAL}
              isMobile={true} // Always pass isMobile={true} to TimelineBar to force its vertical mode
            />
          </div>

          {/* Element Slots Container */}
          <div style={{
            display: 'flex',
            flexBasis: '75%', // Taking roughly 65% to account for the 2% gap
            flexGrow: 1, // Allow to grow to fill remaining space if percentages don't sum perfectly
            gap: '10px',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 50px)', // Further increased to allow much more height
            // For the container of element slots, we need to make it a column if it contains a header + the items row/column
            flexDirection: 'column', // Parent is column to stack H4 and then the items container
            ...(isMobile ? { 
              // On mobile, the items container inside is also a column
            } : { 
              // On desktop, the items container inside is a row that wraps
            })
          }}>
            <h4 style={{textAlign: 'center', marginBottom: '5px'}}>Experience Elements</h4>
            <hr style={{width: '95%', border: 'none', borderTop: '1px solid #ccc', margin: '0 0 10px 0'}} />
            
            {/* Save and Restore Buttons - Moved up here for better visibility */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '15px' }}>
              <button
                onClick={handleSaveConfiguration}
                disabled={isSaving}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  color: 'white',
                  backgroundColor: '#007bff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </button>
              <button
                onClick={handleRestoreDefaults}
                disabled={isSaving}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  color: 'white',
                  backgroundColor: '#ffc107',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                Restore Defaults
              </button>
            </div>
            
            {/* Save/Load Status Messages */}
            {(saveSuccessMessage || saveErrorMessage) && (
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                {saveSuccessMessage && <div style={{color: 'green', fontSize: '0.9rem'}}>{saveSuccessMessage}</div>}
                {saveErrorMessage && <div style={{color: 'red', fontSize: '0.9rem'}}>{saveErrorMessage}</div>}
              </div>
            )}
            
            {/* This inner div will now handle the row/column layout for the actual slots */}
            <div style={{
              display: 'flex',
              width: '100%', // Take full width of parent column
              gap: '10px',
              overflowY: 'auto', // Keep scroll on this inner container if needed
              maxHeight: 'calc(100vh - 90px)', // Further increased to allow much more height
               ...(isMobile ? { // Actual Mobile device: single column
                flexDirection: 'column',
                flexWrap: 'nowrap',
              } : { // Actual Desktop device: two columns, wrapping
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
              })
            }}>
              {elements.map((el, index) => {
                const isFocused = el.id === focusedElementId;
                const startMarker = activeMarkers.find(m => m.elementId === el.id && m.type === 'start');
                const endMarker = activeMarkers.find(m => m.elementId === el.id && m.type === 'end');
                return (
                  <div 
                    key={el.id} 
                    data-element-slot-id={el.id}
                    style={!isMobile ? { // Desktop: two-column width
                      width: 'calc(50% - 5px)', // Assumes parent gap: '10px'
                      boxSizing: 'border-box',
                    } : { // Mobile: full width of its column
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
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
                      onReorder={handleReorderElement}
                      isFirst={index === 0}
                      isLast={index === elements.length - 1}
                      autoNavigationEnabled={autoNavigationEnabled}
                    />
                  </div>
                );
              })}
              {/* "Add New Element" Slot */}
              <div
                onClick={handleAddNewElement}
                style={{
                  // Common styles for the "Add New Element" button
                  minHeight: '120px', border: '2px dashed #333333',
                  borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: '10px', /* margin: '5px' REMOVED */
                  color: '#333333', textAlign: 'center', boxSizing: 'border-box',
                  // Conditional width based on actual device type (isMobile state)
                  ...(!isMobile ? { // Desktop: two-column width
                    width: 'calc(50% - 5px)', // Assumes parent gap: '10px'
                  } : { // Mobile: full width of its column
                    width: '100%',
                  })
                }}
                title="Add a new element to the experience"
              >
                <div style={{fontSize: '2em', fontWeight: 'bold'}}>+</div>
                <span style={{marginLeft: '10px', fontSize: '0.9em'}}>Add Element {elements.length + 1}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DndProvider>
  );
};

export default ExperienceSetupPage; 