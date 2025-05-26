// ExperienceSetupPage.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import TimelineBar from './TimelineBar'; // Component for the timeline
import ElementSlot from './ElementSlot'; // Component for each element configuration
import { DndProvider } from 'react-dnd'; // For drag and drop of timeline markers
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Parallax, ParallaxLayer, IParallax } from '@react-spring/parallax';

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

const INITIAL_ELEMENT_COUNT = 8;
const INITIAL_TIMELINE_LENGTH = 1000; // Arbitrary unit for timeline length (e.g., pixels or virtual units)
// Updated color palette based on user's new list
const ELEMENT_COLORS = [
  '#FFFFFF', // Pure White (Element 1)
  '#FFF176', // Light Yellow (Element 2)
  '#FFB74D', // Light Orange (Element 3)
  '#EF5350', // Coral Red (Element 4)
  '#AB47BC', // Deep Magenta (Element 5)
  '#5C6BC0', // Royal Blue (Element 6)
  '#00897B', // Deep Teal (Element 7)
  '#000000'  // Pure Black (Element 8)
];

const ExperienceSetupPage: React.FC = () => {
  const [timelineLength, setTimelineLength] = useState<number>(INITIAL_TIMELINE_LENGTH);
  const [elements, setElements] = useState<ElementConfig[]>(
    Array.from({ length: INITIAL_ELEMENT_COUNT }, (_, i) => ({
      id: i + 1, // Changed to 1-based ID
      type: 'empty',
      content: null,
      timelineColor: ELEMENT_COLORS[i % ELEMENT_COLORS.length], // Keep 0-based for color array
    }))
  );
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);
  const [markerHistory, setMarkerHistory] = useState<TimelineMarker[][]>([[]]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(0);
  const [focusedElementId, setFocusedElementId] = useState<number | null>(null); // New state for focused element

  // --- Memoized Timeline Markers ---
  // This recalculates markers whenever elements or their configured content change.
  const activeMarkers = useMemo(() => {
    const newMarkers: TimelineMarker[] = [];
    elements.forEach((el, index) => {
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

        if (!startMarker) {
          const defaultStartPosition = ((el.id -1) / INITIAL_ELEMENT_COUNT) * 0.8;
          startMarker = {
            id: `element-${el.id}-start`,
            elementId: el.id,
            type: 'start',
            position: defaultStartPosition,
            color: el.timelineColor,
            previewImageUrl: el.type === 'photo' && typeof el.content === 'string' ? el.content : undefined,
            textPreview: textPreviewContent,
            previewIcon: iconPreviewContent,
          };
        } else {
          // Update existing start marker's previews if necessary
          startMarker = {
            ...startMarker,
            previewImageUrl: el.type === 'photo' && typeof el.content === 'string' ? el.content : undefined,
            textPreview: textPreviewContent,
            previewIcon: iconPreviewContent,
          };
        }

        if (!endMarker) {
          const defaultEndPosition = startMarker.position + 0.1; // Example: 10% duration
          endMarker = {
            id: `element-${el.id}-end`,
            elementId: el.id,
            type: 'end',
            position: Math.min(defaultEndPosition, 1), // Ensure it doesn't exceed 100%
            color: el.timelineColor,
          };
        }
        newMarkers.push(startMarker, endMarker);
      }
    });
    // If you want to persist marker positions outside this memo, update the main `markers` state here.
    // For this example, `activeMarkers` is derived. For saving, you'd update `setMarkers`.
    return newMarkers;
  }, [elements, markers]); // `markers` dependency allows manual updates to persist

  // --- CRUD for Timeline Markers & Length ---

  const handleUpdateMarkerPosition = useCallback((markerId: string, newPosition: number) => {
    setMarkers(prevMarkers =>
      prevMarkers.map(marker =>
        marker.id === markerId ? { ...marker, position: Math.max(0, Math.min(1, newPosition)) } : marker
      )
    );
    // Potentially update the main `markers` state if you want to persist these positions
    // For now, `activeMarkers` will reflect this change if `markers` is a dependency.
    // To make it truly persistent and not just derived:
    setMarkers(prev => {
        const updated = prev.map(m => m.id === markerId ? {...m, position: newPosition} : m);
        // Ensure start is not after end and vice-versa
        const changedMarker = updated.find(m => m.id === markerId);
        if (changedMarker) {
            const pairType = changedMarker.type === 'start' ? 'end' : 'start';
            const pairMarker = updated.find(m => m.elementId === changedMarker.elementId && m.type === pairType);
            if (pairMarker) {
                if (changedMarker.type === 'start' && newPosition > pairMarker.position) {
                    pairMarker.position = newPosition; // or some other logic
                } else if (changedMarker.type === 'end' && newPosition < pairMarker.position) {
                    pairMarker.position = newPosition; // or some other logic
                }
            }
        }
        return updated;
    });
  }, []);

  const handleAddOrUpdateElementMarker = useCallback((elementId: number, type: 'start' | 'end', position: number) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const markerId = `element-${elementId}-${type}`;
    setMarkers(prevMarkers => {
      const existingMarkerIndex = prevMarkers.findIndex(m => m.id === markerId);
      if (existingMarkerIndex > -1) {
        const updatedMarkers = [...prevMarkers];
        updatedMarkers[existingMarkerIndex] = { ...updatedMarkers[existingMarkerIndex], position };
        return updatedMarkers;
      } else {
        return [
          ...prevMarkers,
          { id: markerId, elementId, type, position, color: element.timelineColor },
        ];
      }
    });
  }, [elements]);


  const handleRemoveElementMarkers = useCallback((elementId: number) => {
    setMarkers(prevMarkers => prevMarkers.filter(marker => marker.elementId !== elementId));
  }, []);

  const handleTimelineLengthChange = useCallback((newLength: number) => {
    const oldLength = timelineLength;
    const ratio = newLength / oldLength;

    setMarkers(prevMarkers =>
      prevMarkers.map(marker => ({
        ...marker,
        position: marker.position, // Position is relative (0-1), so it scales with the bar's visual length
      }))
    );
    setTimelineLength(newLength);
  }, [timelineLength]);

  const handleUpdateElementGroupPosition = useCallback((elementId: number, newStartProportion: number, newEndPosition: number) => {
    setMarkers(prevMarkers =>
      prevMarkers.map(marker => {
        if (marker.elementId === elementId) {
          if (marker.type === 'start') {
            return { ...marker, position: newStartProportion };
          }
          if (marker.type === 'end') {
            return { ...marker, position: newEndPosition };
          }
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
            const existingStart = activeMarkers.find(m => m.elementId === id && m.type === 'start');
            const existingEnd = activeMarkers.find(m => m.elementId === id && m.type === 'end');

            if (!existingStart) {
              const defaultStartPos = ((id - 1) / elements.length) * 0.5;
              handleAddOrUpdateElementMarker(id, 'start', defaultStartPos);
            }
            if (!existingEnd) {
                const startPos = existingStart?.position || ((id - 1) / elements.length) * 0.5;
              handleAddOrUpdateElementMarker(id, 'end', Math.min(startPos + 0.1, 1));
            }
          } else if (newConfig.type === 'empty') {
            handleRemoveElementMarkers(id);
            // When an element is emptied, ensure its start marker's previews are cleared
            setMarkers(prevMarkers =>
                prevMarkers.map(m =>
                    (m.elementId === id && m.type === 'start') ? { ...m, previewImageUrl: undefined, textPreview: undefined, previewIcon: undefined } : m
                )
            );
          }
          return updatedEl;
        }
        return el;
      })
    );

    // After elements state is set, update the markers state for previews
    setMarkers(prevMarkers => prevMarkers.map(m => {
        if (m.elementId === id && m.type === 'start') {
            let previewImageUrl: string | undefined = undefined;
            let textPreview: string | undefined = undefined;
            let previewIcon: string | undefined = undefined;

            if (newConfig.type === 'photo' && typeof newConfig.content === 'string') {
                previewImageUrl = newConfig.content;
            } else if (newConfig.type === 'text' && typeof newConfig.content === 'string' && newConfig.content.trim()) {
                const fullText = newConfig.content.trim();
                textPreview = fullText.length > 9 ? fullText.substring(0, 9) + '...' : fullText;
            } else if (newConfig.type === 'component') {
                previewIcon = 'settings'; // Generic icon name
            }
            return { ...m, previewImageUrl, textPreview, previewIcon };
        }
        return m;
    }));

  }, [activeMarkers, elements.length, handleAddOrUpdateElementMarker, handleRemoveElementMarkers]);

  const updateMarkersAndManageHistory = (newMarkersState: TimelineMarker[]) => {
    // ... existing code ...
  };

  const handleRedo = useCallback(() => {
    if (currentHistoryIndex < markerHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      console.log(`[Redo] currentHistoryIndex: ${currentHistoryIndex}, newIndex: ${newIndex}`);
      console.log('[Redo] Restoring to state:', JSON.parse(JSON.stringify(markerHistory[newIndex])));
      setMarkers(markerHistory[newIndex]);
      setCurrentHistoryIndex(newIndex);
    }
  }, [currentHistoryIndex, markerHistory]);

  const handleElementFocus = useCallback((elementId: number) => {
    setFocusedElementId(elementId); // Always set this element as focused.
  }, []);

  const handleMarkerPositionChangeFromInput = useCallback((elementId: number, type: 'start' | 'end', newPositionPercent: number) => {
    // Find the marker id
    const markerIdToUpdate = `element-${elementId}-${type}`;
    // Call the existing handler that also manages history
    handleUpdateMarkerPosition(markerIdToUpdate, newPositionPercent);
  }, [handleUpdateMarkerPosition]);

  // --- Z-index Visualization ---
  // Lower index in `elements` array means higher z-index.
  // We can depict this via brightness/opacity of the element slots.
  const getElementSlotStyle = (element: ElementConfig): React.CSSProperties => {
    const maxBrightness = 1;
    const minBrightness = 0.6; // Adjust as needed
    // Higher z-index (lower array index / lower element.id for 1-based) = brighter
    const brightness = maxBrightness - ((element.id - 1) / (INITIAL_ELEMENT_COUNT -1)) * (maxBrightness - minBrightness);
    
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


  // --- Parallax Configuration (derived from state) ---
  const parallaxPages = useMemo(() => {
    // Convert timelineLength and marker positions to parallax pages/offsets
    // This is a simplified example. You'll need to map your timeline units to parallax pages.
    // The react-spring/parallax `offset` is the start of the page (0 for first, 1 for second, etc.)
    // `speed` can be used for parallax depth, `factor` for how many "pages" the layer spans.

    let totalPages = timelineLength / 500; // Example: 500 units = 1 page

    return elements.map((el, index) => {
      if (el.type === 'empty') return null;

      const startMarker = activeMarkers.find(m => m.elementId === el.id && m.type === 'start');
      const endMarker = activeMarkers.find(m => m.elementId === el.id && m.type === 'end');

      if (!startMarker || !endMarker) return null;

      const offset = startMarker.position * totalPages;
      const endPosition = endMarker.position * totalPages;
      const factor = Math.max(0.1, endPosition - offset); // How many pages this element spans

      // Higher z-index (lower array index) should appear on top.
      // In react-spring/parallax, layer order determines z-index by default.
      // You can also use the `sticky` prop for more complex layering.
      return {
        id: el.id,
        offset,
        factor,
        speed: 0.5 + (index * 0.1), // Example speed, adjust for desired parallax effect
        content: el.content,
        type: el.type,
        name: el.name,
        zIndex: INITIAL_ELEMENT_COUNT - index, // Explicit z-index for clarity if needed elsewhere
      };
    }).filter(Boolean);
  }, [elements, activeMarkers, timelineLength]);

  useEffect(() => {
    // Initialize elements with default timeline colors and random start/end positions
    setElements(
      Array.from({ length: INITIAL_ELEMENT_COUNT }, (_, i) => ({
        id: i + 1, // 1-based ID
        type: 'empty',
        content: null,
        timelineColor: ELEMENT_COLORS[i % ELEMENT_COLORS.length],
      }))
    );

    // Initialize markers (example)
    const initialMarkers: TimelineMarker[] = [];
    ELEMENT_COLORS.forEach((color, index) => {
      const elementId = index + 1;
      // For initial markers, textPreview will be undefined as elements start empty
      initialMarkers.push({
        id: `element-${elementId}-start`,
        elementId: elementId,
        type: 'start',
        position: Math.random() * 0.3, // Random start position (0 to 0.3)
        color: color,
        // previewImageUrl: undefined // Initially no preview
        // textPreview: undefined // Initially no preview
      });
      initialMarkers.push({
        id: `element-${elementId}-end`,
        elementId: elementId,
        type: 'end',
        position: Math.random() * 0.3 + 0.4, // Random end position (0.4 to 0.7)
        color: color,
      });
    });
    setMarkers(initialMarkers);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (focusedElementId !== null) {
        const target = event.target as HTMLElement;
        // Find the DOM element of the currently focused slot
        const focusedSlotElement = document.querySelector(`[data-element-slot-id="${focusedElementId}"]`);

        // If the click target is not the focused slot itself and not a descendant of the focused slot
        if (focusedSlotElement && !focusedSlotElement.contains(target)) {
          setFocusedElementId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [focusedElementId]); // Re-run if focusedElementId changes to attach/detach with correct state

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 className="experience-setup-title">Experience Setup</h2>

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

        <TimelineBar
          markers={activeMarkers}
          onUpdateMarkerPosition={handleUpdateMarkerPosition}
          onUpdateElementGroupPosition={handleUpdateElementGroupPosition}
          length={timelineLength} // Visual length of the bar
          maxElements={INITIAL_ELEMENT_COUNT} // Pass maxElements for calculations in TimelineBar
        />

        {/* Element Slots */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '20px', width: '100%' }}>
          {elements.map((el) => {
            const isFocused = el.id === focusedElementId;
            let startMarkerPos: number | undefined = undefined;
            let endMarkerPos: number | undefined = undefined;

            if (isFocused && el.type !== 'empty') {
              const startMarker = activeMarkers.find(m => m.elementId === el.id && m.type === 'start');
              const endMarker = activeMarkers.find(m => m.elementId === el.id && m.type === 'end');
              startMarkerPos = startMarker?.position;
              endMarkerPos = endMarker?.position;
            }

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
                  startPositionPercent={startMarkerPos}
                  endPositionPercent={endMarkerPos}
                  onMarkerPositionChangeFromInput={handleMarkerPositionChangeFromInput}
                />
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        <div style={{ marginTop: '30px', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => console.log('Save Configuration clicked. Current state:', { elements, timelineLength })}
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

        {/* Preview Area (Optional) */}
        {/* <div style={{ marginTop: '40px', height: '500px', border: '1px solid #ccc', overflow: 'hidden' }}>
          <h4>Parallax Preview (Conceptual)</h4>
          <Parallax pages={timelineLength / 500} style={{ height: '100%', backgroundColor: '#f0f0f0' }}>
            {parallaxPages.map(p => {
              if (!p) return null;
              return (
                <ParallaxLayer
                  key={`preview-${p.id}`}
                  offset={p.offset}
                  speed={p.speed}
                  factor={p.factor}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // zIndex: p.zIndex // react-spring/parallax handles order by default
                  }}
                >
                  <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.8)', border: `2px solid ${elements[p.id].timelineColor}`}}>
                    {p.type === 'photo' && typeof p.content === 'string' && <img src={p.content} alt={`Element ${p.id}`} style={{ maxWidth: '100px', maxHeight: '100px' }} />}
                    {p.type === 'text' && typeof p.content === 'string' && <p>{p.content}</p>}
                    {p.type === 'component' && p.name === 'RSVPForm' && <div>Custom Component: RSVPForm</div>}
                    {p.type === 'component' && typeof p.content === 'function' && React.createElement(p.content)}
                  </div>
                </ParallaxLayer>
              )
            })}
          </Parallax>
        </div> */}
      </div>
    </DndProvider>
  );
};

export default ExperienceSetupPage; 