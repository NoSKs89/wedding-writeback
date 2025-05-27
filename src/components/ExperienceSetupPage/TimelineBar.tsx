// TimelineBar.tsx
import * as React from 'react';
import { useDrop, useDrag, DropTargetMonitor, DragSourceMonitor } from 'react-dnd';
import { TimelineMarker } from './ExperienceSetupPage'; // Import the interface

interface TimelineBarProps {
  markers: TimelineMarker[];
  onUpdateMarkerPosition: (markerId: string, newPosition: number) => void;
  onUpdateElementGroupPosition: (elementId: number, newStartProportion: number, newEndPosition: number) => void;
  length: number; // Visual length (horizontal) or height (vertical) of the bar
  maxElements?: number;
  isMobile?: boolean; // Added for mobile layout adjustments
}

interface DraggableTimelineMarkerProps {
  marker: TimelineMarker;
  barSize: number; // Represents width for desktop, height for mobile
  onUpdateMarkerPosition: (markerId: string, newPosition: number) => void;
  timelineRef: React.RefObject<HTMLDivElement>;
  previewOffsetLevel?: number;
  isMobile?: boolean; // Added
}

export const DRAGGABLE_TIMELINE_MARKER_TYPE = 'TIMELINE_MARKER';

const DraggableTimelineMarker: React.FC<DraggableTimelineMarkerProps> = ({ marker, barSize, onUpdateMarkerPosition, timelineRef, previewOffsetLevel = 0, isMobile }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DRAGGABLE_TIMELINE_MARKER_TYPE,
    item: { id: marker.id, type: DRAGGABLE_TIMELINE_MARKER_TYPE, originalPosition: marker.position },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    end: (item: { id: string; type: string; originalPosition: number }, monitor: DragSourceMonitor) => {
      const clientOffset = monitor.getSourceClientOffset();
      const timelineElement = timelineRef.current;

      if (item && clientOffset && timelineElement) {
        let positionInBar;
        let newPositionProportion;

        if (isMobile) {
          positionInBar = clientOffset.y - timelineElement.getBoundingClientRect().top;
          newPositionProportion = positionInBar / timelineElement.getBoundingClientRect().height;
        } else {
          positionInBar = clientOffset.x - timelineElement.getBoundingClientRect().left;
          newPositionProportion = positionInBar / timelineElement.getBoundingClientRect().width;
        }
        newPositionProportion = Math.max(0, Math.min(1, newPositionProportion));
        onUpdateMarkerPosition(item.id, newPositionProportion);
      }
    },
  }), [marker.id, marker.position, barSize, onUpdateMarkerPosition, timelineRef, isMobile]);

  const positionAlongAxis = marker.position * barSize;

  const markerBaseSize = 12;
  const PREVIEW_STACK_OFFSET = 20; 
  // For mobile, previews might be to the side, not stacked "above" in the Y-axis.
  // This offset logic might need more significant changes for vertical mobile.
  // For now, let's assume previews are still "above" the marker's point relative to the bar's main axis.
  const dynamicOffsetForPreview = markerBaseSize + 12 + (previewOffsetLevel * PREVIEW_STACK_OFFSET);

  const commonMarkerStyle: React.CSSProperties = {
    position: 'absolute',
    width: '0',
    height: '0',
    cursor: 'grab',
    opacity: isDragging ? 0.5 : 1,
    zIndex: 100,
    ...(isMobile ? {
      // Vertical layout: markers point left/right from a vertical bar
      // This requires rethinking the border triangle logic entirely.
      // For now, let's keep original triangle orientation and adjust positioning
      // Start markers on the left, end markers on the right of the vertical bar.
      // This is a placeholder for more complex marker re-orientation for vertical.
      top: `${positionAlongAxis}px`,
      transform: 'translateY(-50%)', 
      borderTop: `${markerBaseSize / 2}px solid transparent`,
      borderBottom: `${markerBaseSize / 2}px solid transparent`,
    } : {
      left: `${positionAlongAxis}px`,
      transform: 'translateX(-50%)',
      borderLeft: `${markerBaseSize / 2}px solid transparent`,
      borderRight: `${markerBaseSize / 2}px solid transparent`,
    })
  };

  const startMarkerStyle: React.CSSProperties = {
    ...commonMarkerStyle,
    ...(isMobile ? {
      left: '10px', // Positioned to the left of the vertical bar line
      borderRight: `${markerBaseSize}px solid ${marker.color}`, // Points right, towards the bar
    } : {
      top: '10px',
      borderBottom: `${markerBaseSize}px solid ${marker.color}`, // Points upwards
    })
  };

  const endMarkerStyle: React.CSSProperties = {
    ...commonMarkerStyle,
    ...(isMobile ? {
      right: '10px', // Positioned to the right of the vertical bar line
      borderLeft: `${markerBaseSize}px solid ${marker.color}`, // Points left, towards the bar
    } : {
      bottom: '10px',
      borderTop: `${markerBaseSize}px solid ${marker.color}`, // Points downwards
    })
  };
  
  const previewBaseStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 101,
    backgroundColor: 'white',
  };

  const previewImageStyle: React.CSSProperties = {
    ...previewBaseStyle,
    width: '20px',
    height: '20px',
    objectFit: 'cover',
    border: '1px solid #ccc',
    borderRadius: '3px',
    ...(isMobile ? {
      top: '50%',
      left: `${markerBaseSize + 5 + (previewOffsetLevel * PREVIEW_STACK_OFFSET)}px`, // To the right of start marker
      transform: 'translateY(-50%)',
    } : {
      top: `${dynamicOffsetForPreview}px`,
      left: '50%',
      transform: 'translateX(-50%)',
    })
  };

  const textPreviewStyle: React.CSSProperties = {
    ...previewBaseStyle,
    padding: '1px 3px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    fontSize: '9px',
    borderRadius: '2px',
    whiteSpace: 'nowrap',
    ...(isMobile ? {
      top: '50%',
      left: `${markerBaseSize + 5 + (previewOffsetLevel * PREVIEW_STACK_OFFSET)}px`, // To the right of start marker
      transform: 'translateY(-50%)',
    } : {
      top: `${dynamicOffsetForPreview}px`,
      left: '50%',
      transform: 'translateX(-50%)',
    })
  };

  const iconPreviewStyle: React.CSSProperties = {
    ...previewBaseStyle,
    fontSize: '14px',
    ...(isMobile ? {
      top: '50%',
      left: `${markerBaseSize + 5 + (previewOffsetLevel * PREVIEW_STACK_OFFSET)}px`, // To the right of start marker
      transform: 'translateY(-50%)',
    } : {
      top: `${dynamicOffsetForPreview -2}px`,
      left: '50%',
      transform: 'translateX(-50%)',
    })
  };

  return (
    <div
      ref={drag}
      style={marker.type === 'start' ? startMarkerStyle : endMarkerStyle}
      title={`Element ${marker.elementId} - ${marker.type}`}
    >
      {marker.type === 'start' && marker.previewImageUrl && (
        <img src={marker.previewImageUrl} alt={`Preview Elem ${marker.elementId}`} style={previewImageStyle} />
      )}
      {marker.type === 'start' && marker.textPreview && !marker.previewImageUrl && !marker.previewIcon && (
        <div style={textPreviewStyle}>{marker.textPreview}</div>
      )}
      {marker.type === 'start' && marker.previewIcon && !marker.previewImageUrl && !marker.textPreview && (
        // Using a gear emoji for 'settings' icon placeholder
        <div style={iconPreviewStyle}>{marker.previewIcon === 'settings' ? '⚙️' : '❓'}</div>
      )}
    </div>
  );
};

export const DRAGGABLE_ELEMENT_LINE_TYPE = 'ELEMENT_LINE';

// Define an interface for the drag item for lines
interface ElementLineDragItem {
  id: string;
  elementId: number;
  type: typeof DRAGGABLE_ELEMENT_LINE_TYPE;
  originalStartProportion: number;
  originalEndProportion: number;
  originalDuration: number;
}

interface DraggableElementLineProps {
  elementId: number;
  startMarker: TimelineMarker;
  endMarker: TimelineMarker;
  lineThickness: number; // Renamed from lineHeight for clarity in vertical
  lineZIndex: number;
  barSize: number; // Represents width for desktop, height for mobile
  timelineRef: React.RefObject<HTMLDivElement>;
  onUpdateElementGroupPosition: (elementId: number, newStartProportion: number, newEndPosition: number) => void;
  isMobile?: boolean; // Added
}

const DraggableElementLine: React.FC<DraggableElementLineProps> = ({ elementId, startMarker, endMarker, lineThickness, lineZIndex, barSize, timelineRef, onUpdateElementGroupPosition, isMobile }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DRAGGABLE_ELEMENT_LINE_TYPE,
    item: {
      id: `line-${elementId}`,
      elementId,
      type: DRAGGABLE_ELEMENT_LINE_TYPE,
      originalStartProportion: startMarker.position,
      originalEndProportion: endMarker.position,
      originalDuration: endMarker.position - startMarker.position,
    } as ElementLineDragItem,
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    end: (item: ElementLineDragItem, monitor: DragSourceMonitor) => {
      const clientOffset = monitor.getSourceClientOffset();
      const initialClientOffset = monitor.getInitialClientOffset();
      const timelineElement = timelineRef.current;

      if (!item || !clientOffset || !initialClientOffset || !timelineElement) return;

      let dragDeltaPx;
      let dragDeltaProportion;

      if (isMobile) {
        dragDeltaPx = clientOffset.y - initialClientOffset.y;
        dragDeltaProportion = dragDeltaPx / timelineElement.getBoundingClientRect().height;
      } else {
        dragDeltaPx = clientOffset.x - initialClientOffset.x;
        dragDeltaProportion = dragDeltaPx / timelineElement.getBoundingClientRect().width;
      }
      
      let newStartProportion = item.originalStartProportion + dragDeltaProportion;
      let newEndProportion = item.originalEndProportion + dragDeltaProportion;

      if (newStartProportion < 0) {
        newStartProportion = 0;
        newEndProportion = item.originalDuration;
      }
      if (newEndProportion > 1) {
        newEndProportion = 1;
        newStartProportion = 1 - item.originalDuration;
      }
      if (newStartProportion < 0) {
        newStartProportion = 0;
        newEndProportion = Math.min(1, item.originalDuration);
      }

      onUpdateElementGroupPosition(item.elementId, newStartProportion, newEndProportion);
    },
  }), [elementId, startMarker.position, endMarker.position, barSize, timelineRef, onUpdateElementGroupPosition, isMobile]);

  const lineStartPx = startMarker.position * barSize;
  const lineLengthPx = Math.max(0, (endMarker.position * barSize) - lineStartPx);

  if (lineLengthPx <= 0) return null;

  return (
    <div
      ref={drag}
      style={{
        position: 'absolute',
        backgroundColor: startMarker.color,
        zIndex: lineZIndex,
        borderRadius: '2px',
        cursor: 'grab',
        opacity: isDragging ? 0.7 : 1,
        ...(isMobile ? {
          top: `${lineStartPx}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          height: `${lineLengthPx}px`,
          width: `${lineThickness}px`,
        } : {
          left: `${lineStartPx}px`,
          top: '50%',
          transform: 'translateY(-50%)',
          width: `${lineLengthPx}px`,
          height: `${lineThickness}px`,
        })
      }}
      title={`Drag Element ${elementId} Segment`}
    />
  );
};

const TimelineBar: React.FC<TimelineBarProps> = ({ markers, onUpdateMarkerPosition, onUpdateElementGroupPosition, length, maxElements = 8, isMobile }) => {
  const timelineRef = React.useRef<HTMLDivElement | null>(null);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: DRAGGABLE_TIMELINE_MARKER_TYPE,
    drop: (item: { id: string; type: string; originalPosition: number }, monitor: DropTargetMonitor) => {
      const offset = monitor.getClientOffset();
      if (offset && timelineRef.current) {
        const barRect = timelineRef.current.getBoundingClientRect();
        const positionInBar = offset.x - barRect.left;
        // Calculate the new position as a proportion (0 to 1)
        const newPositionProportion = Math.max(0, Math.min(1, positionInBar / barRect.width));
        // This drop target provides the new position if needed,
        // but the individual marker's `end` drag function is more precise for updating.
        return { newPositionProportion };
      }
      return undefined;
    },
    collect: (monitor: DropTargetMonitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [length, onUpdateMarkerPosition]);

  // Group markers by elementId to draw lines between them
  const elementMarkerGroups = React.useMemo(() => {
    const groups: { [key: number]: { start?: TimelineMarker; end?: TimelineMarker } } = {};
    markers.forEach(marker => {
      if (!groups[marker.elementId]) {
        groups[marker.elementId] = {};
      }
      if (marker.type === 'start') {
        groups[marker.elementId].start = marker;
      } else {
        groups[marker.elementId].end = marker;
      }
    });
    return Object.values(groups).filter(group => group.start && group.end);
  }, [markers]);

  const MAX_LINE_THICKNESS = 20; // pixels, for element 0 (doubled)
  const MIN_LINE_THICKNESS = 4; // pixels, for the highest element ID (doubled)

  // --- Preview Overlap Management ---
  const processedMarkers = React.useMemo(() => {
    const startMarkers = markers
      .filter(m => m.type === 'start' && (m.previewImageUrl || m.textPreview || m.previewIcon))
      .sort((a, b) => a.position - b.position);

    const PREVIEW_WIDTH_PROPORTION_THRESHOLD = isMobile ? 0.05 : 0.035; // Wider threshold for vertical previews
    const markersWithOffsets = new Map<string, number>(); // Store { markerId: offsetLevel }

    for (let i = 0; i < startMarkers.length; i++) {
      let offsetLevel = 0;
      for (let j = 0; j < i; j++) {
        // Check if startMarkers[i] overlaps with startMarkers[j]
        // and if startMarkers[j] already has an assigned offset that matches the current trial offsetLevel
        if (
          Math.abs(startMarkers[i].position - startMarkers[j].position) < PREVIEW_WIDTH_PROPORTION_THRESHOLD &&
          markersWithOffsets.get(startMarkers[j].id) === offsetLevel
        ) {
          offsetLevel++; // Increment offset for startMarkers[i] and restart inner loop
          j = -1; // Restart checks with the new offsetLevel
        }
      }
      markersWithOffsets.set(startMarkers[i].id, offsetLevel);
    }

    return markers.map(marker => ({
      ...marker,
      previewOffsetLevel: markersWithOffsets.get(marker.id) ?? 0,
    }));
  }, [markers, isMobile]);
  // --- End Preview Overlap Management ---

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center', // Center items for horizontal, stretch for vertical might be better
      justifyContent: 'center',
      padding: isMobile ? '0 30px' : '30px 0', // Adjust padding for mobile
      minHeight: isMobile ? `${length}px` : '60px', // Use length for minHeight on mobile
      minWidth: isMobile ? '60px' : 'auto', // Minimum width for vertical bar
      flexDirection: isMobile ? 'column' : 'row', // Stack START/BAR/FINISH vertically on mobile
    }}>
      <div style={{ 
        fontSize: '0.8em', 
        color: '#555', 
        ...(isMobile ? { marginBottom: '10px' } : { marginRight: '10px' }) 
      }}>
        START
      </div>
      <div
        ref={(el: HTMLDivElement | null) => {
          (timelineRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          drop(el);
        }}
        style={{
          ...(isMobile ? {
            height: `${length}px`, // length is height on mobile
            width: '20px',         // Fixed width for vertical bar
          } : {
            width: `${length}px`,  // length is width on desktop
            height: '20px',        // Fixed height for horizontal bar
          }),
          backgroundColor: '#ccc',
          position: 'relative',
          border: '1px solid #999',
          borderRadius: '5px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        }}
      >
        {/* Render Lines for element durations */}
        {elementMarkerGroups.map(group => {
          if (!group.start || !group.end) return null;

          const lineStartPx = group.start.position * length;
          const lineEndPx = group.end.position * length;
          const lineLengthPx = Math.max(0, lineEndPx - lineStartPx);

          // Ensure start is before end, otherwise don't render or render differently
          if (lineLengthPx <= 0) return null;

          // Calculate thickness based on elementId (higher id = thicker for timeline representation)
          // Element ID 0 (highest parallax Z) should be MIN_LINE_THICKNESS on the timeline bar.
          // Element ID (maxElements - 1) (lowest parallax Z) should be MAX_LINE_THICKNESS on the timeline bar.
          const thicknessRange = MAX_LINE_THICKNESS - MIN_LINE_THICKNESS;
          const thicknessStep = maxElements > 1 ? thicknessRange / (maxElements - 1) : 0;
          // Higher elementId = closer to MAX_LINE_THICKNESS. Adjust for 1-based ID.
          let lineVisualThickness = MIN_LINE_THICKNESS + ((group.start.elementId - 1) * thicknessStep);
          lineVisualThickness = Math.max(MIN_LINE_THICKNESS, Math.min(MAX_LINE_THICKNESS, lineVisualThickness));
          const lineZIndex = maxElements - (group.start.elementId - 1); // Adjust for 1-based ID

          return (
            <DraggableElementLine
              key={`line-${group.start.elementId}`}
              elementId={group.start.elementId}
              startMarker={group.start}
              endMarker={group.end}
              lineThickness={lineVisualThickness} // Pass calculated thickness
              lineZIndex={lineZIndex}
              barSize={length} // Pass main axis dimension (length or height)
              timelineRef={timelineRef}
              onUpdateElementGroupPosition={onUpdateElementGroupPosition}
              isMobile={isMobile} // Pass isMobile
            />
          );
        })}

        {/* Render Markers (should be on top of lines) */}
        {processedMarkers.map((marker) => (
          <DraggableTimelineMarker
            key={marker.id}
            marker={marker}
            barSize={length} // Pass main axis dimension
            onUpdateMarkerPosition={onUpdateMarkerPosition}
            timelineRef={timelineRef}
            previewOffsetLevel={marker.previewOffsetLevel}
            isMobile={isMobile} // Pass isMobile
          />
        ))}
      </div>
      <div style={{ 
        fontSize: '0.8em', 
        color: '#555', 
        ...(isMobile ? { marginTop: '10px' } : { marginLeft: '10px' }) 
      }}>
        FINISH
      </div>
    </div>
  );
};

export default TimelineBar; 