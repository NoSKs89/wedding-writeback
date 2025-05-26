// TimelineBar.tsx
import * as React from 'react';
import { useDrop, useDrag, DropTargetMonitor, DragSourceMonitor } from 'react-dnd';
import { TimelineMarker } from './ExperienceSetupPage'; // Import the interface

interface TimelineBarProps {
  markers: TimelineMarker[];
  onUpdateMarkerPosition: (markerId: string, newPosition: number) => void;
  onUpdateElementGroupPosition: (elementId: number, newStartProportion: number, newEndPosition: number) => void;
  length: number; // Visual length of the bar (e.g., in pixels)
  maxElements?: number; 
}

interface DraggableTimelineMarkerProps {
  marker: TimelineMarker;
  barWidth: number;
  onUpdateMarkerPosition: (markerId: string, newPosition: number) => void;
  timelineRef: React.RefObject<HTMLDivElement>;
}

export const DRAGGABLE_TIMELINE_MARKER_TYPE = 'TIMELINE_MARKER';

const DraggableTimelineMarker: React.FC<DraggableTimelineMarkerProps> = ({ marker, barWidth, onUpdateMarkerPosition, timelineRef }) => {
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
        const barRect = timelineElement.getBoundingClientRect();
        const positionInBar = clientOffset.x - barRect.left;
        let newPositionProportion = positionInBar / barRect.width;
        newPositionProportion = Math.max(0, Math.min(1, newPositionProportion));

        onUpdateMarkerPosition(item.id, newPositionProportion);
      }
    },
  }), [marker.id, marker.position, barWidth, onUpdateMarkerPosition, timelineRef]);

  const leftPosition = marker.position * barWidth;

  // Style for triangle markers using CSS borders
  const markerBaseSize = 12; // pixels
  const commonMarkerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${leftPosition}px`,
    width: '0',
    height: '0',
    borderLeft: `${markerBaseSize / 2}px solid transparent`,
    borderRight: `${markerBaseSize / 2}px solid transparent`,
    cursor: 'grab',
    opacity: isDragging ? 0.5 : 1,
    transform: 'translateX(-50%)', // Center the marker horizontally
    zIndex: 100 // Ensure markers are well above lines
  };

  const startMarkerStyle: React.CSSProperties = {
    ...commonMarkerStyle,
    bottom: '10px', // Position point towards the bar (from above)
    borderTop: `${markerBaseSize}px solid ${marker.color}`, // Pointy end is now at the bottom, created by borderTop
  };

  const endMarkerStyle: React.CSSProperties = {
    ...commonMarkerStyle,
    top: '10px', // Position point towards the bar (from below)
    borderBottom: `${markerBaseSize}px solid ${marker.color}`, // Pointy end is now at the top, created by borderBottom
  };

  // Style for the preview image
  const previewImageStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: `${markerBaseSize + 12}px`, // Position above the start marker's point
    left: '50%',
    transform: 'translateX(-50%)',
    width: '20px', // Small preview size
    height: '20px',
    objectFit: 'cover',
    border: '1px solid #ccc',
    borderRadius: '3px',
    zIndex: 101, // Above the marker itself
    backgroundColor: 'white', // Added for better visibility if image is transparent
  };

  // Style for the text preview
  const textPreviewStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: `${markerBaseSize + 12}px`, // Position above the start marker's point
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '1px 3px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    fontSize: '9px',
    borderRadius: '2px',
    whiteSpace: 'nowrap',
    zIndex: 101, // Above the marker itself
  };

  // Style for the icon preview
  const iconPreviewStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: `${markerBaseSize + 10}px`, // Adjusted position slightly
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '14px', // Larger size for an icon/emoji
    zIndex: 101, // Above the marker itself
    // No background, relying on icon/emoji visual
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
  lineHeight: number;
  lineZIndex: number;
  barWidth: number;
  timelineRef: React.RefObject<HTMLDivElement>;
  onUpdateElementGroupPosition: (elementId: number, newStartProportion: number, newEndPosition: number) => void;
}

const DraggableElementLine: React.FC<DraggableElementLineProps> = ({ elementId, startMarker, endMarker, lineHeight, lineZIndex, barWidth, timelineRef, onUpdateElementGroupPosition }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DRAGGABLE_ELEMENT_LINE_TYPE,
    item: {
      id: `line-${elementId}`,
      elementId,
      type: DRAGGABLE_ELEMENT_LINE_TYPE,
      originalStartProportion: startMarker.position,
      originalEndProportion: endMarker.position,
      originalDuration: endMarker.position - startMarker.position,
    } as ElementLineDragItem, // Explicitly cast item to our defined type
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    end: (item: ElementLineDragItem, monitor: DragSourceMonitor) => { // Use the specific item type here
      const clientOffset = monitor.getSourceClientOffset(); // Cursor position at drop
      const initialClientOffset = monitor.getInitialClientOffset(); // Cursor position at drag start
      const timelineElement = timelineRef.current;

      if (!item || !clientOffset || !initialClientOffset || !timelineElement) return;

      const barRect = timelineElement.getBoundingClientRect();
      const dragDeltaPx = clientOffset.x - initialClientOffset.x;
      const dragDeltaProportion = dragDeltaPx / barRect.width;

      let newStartProportion = item.originalStartProportion + dragDeltaProportion;
      let newEndProportion = item.originalEndProportion + dragDeltaProportion;

      // Clamp and maintain duration if hitting boundaries
      if (newStartProportion < 0) {
        newStartProportion = 0;
        newEndProportion = item.originalDuration;
      }
      if (newEndProportion > 1) {
        newEndProportion = 1;
        newStartProportion = 1 - item.originalDuration;
      }
      // Ensure start is not negative after adjustment (can happen if duration is very long)
      if (newStartProportion < 0) {
        newStartProportion = 0;
        newEndProportion = Math.min(1, item.originalDuration); // Also ensure end is not > 1
      }

      onUpdateElementGroupPosition(item.elementId, newStartProportion, newEndProportion);
    },
  }), [elementId, startMarker.position, endMarker.position, barWidth, timelineRef, onUpdateElementGroupPosition]);

  const lineStartPx = startMarker.position * barWidth;
  const lineWidthPx = Math.max(0, (endMarker.position * barWidth) - lineStartPx);

  if (lineWidthPx <= 0) return null;

  return (
    <div
      ref={drag}
      style={{
        position: 'absolute',
        left: `${lineStartPx}px`,
        top: '50%',
        transform: 'translateY(-50%)',
        width: `${lineWidthPx}px`,
        height: `${lineHeight}px`,
        backgroundColor: startMarker.color,
        zIndex: lineZIndex,
        borderRadius: '2px',
        cursor: 'grab',
        opacity: isDragging ? 0.7 : 1,
      }}
      title={`Drag Element ${elementId} Segment`}
    />
  );
};

const TimelineBar: React.FC<TimelineBarProps> = ({ markers, onUpdateMarkerPosition, onUpdateElementGroupPosition, length, maxElements = 8 }) => {
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

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center', // Center the START-BAR-FINISH assembly
      padding: '30px 0', // Keep vertical padding
      minHeight: '60px', // Keep minHeight
      // width is now determined by flex items
    }}>
      <div style={{ fontSize: '0.8em', color: '#555', marginRight: '10px' }}>
        START
      </div>
      <div
        ref={(el: HTMLDivElement | null) => {
          (timelineRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          drop(el); // Attach drop target to the bar itself
        }}
        style={{
          width: `${length}px`,
          height: '20px',
          backgroundColor: '#ccc',
          position: 'relative', // For markers and lines within
          border: '1px solid #999',
          borderRadius: '5px',
          // Removed margin: '20px 0' as flex handles alignment
        }}
      >
        {/* Render Lines for element durations */}
        {elementMarkerGroups.map(group => {
          if (!group.start || !group.end) return null;

          const lineStartPx = group.start.position * length;
          const lineEndPx = group.end.position * length;
          const lineWidthPx = Math.max(0, lineEndPx - lineStartPx);

          // Ensure start is before end, otherwise don't render or render differently
          if (lineWidthPx <= 0) return null;

          // Calculate thickness based on elementId (higher id = thicker for timeline representation)
          // Element ID 0 (highest parallax Z) should be MIN_LINE_THICKNESS on the timeline bar.
          // Element ID (maxElements - 1) (lowest parallax Z) should be MAX_LINE_THICKNESS on the timeline bar.
          const thicknessRange = MAX_LINE_THICKNESS - MIN_LINE_THICKNESS;
          const thicknessStep = maxElements > 1 ? thicknessRange / (maxElements - 1) : 0;
          // Higher elementId = closer to MAX_LINE_THICKNESS. Adjust for 1-based ID.
          let lineHeight = MIN_LINE_THICKNESS + ((group.start.elementId - 1) * thicknessStep);
          lineHeight = Math.max(MIN_LINE_THICKNESS, Math.min(MAX_LINE_THICKNESS, lineHeight));

          // Z-index for VISUAL stacking on the timeline bar ITSELF:
          // Let's assign z-index from 1 to maxElements.
          // Element 1 (highest actual parallax Z) gets zIndex = maxElements on timeline bar.
          // Element maxElements (lowest actual parallax Z) gets zIndex = 1 on timeline bar.
          const lineZIndex = maxElements - (group.start.elementId - 1); // Adjust for 1-based ID

          return (
            <DraggableElementLine
              key={`line-${group.start.elementId}`}
              elementId={group.start.elementId}
              startMarker={group.start}
              endMarker={group.end}
              lineHeight={lineHeight}
              lineZIndex={lineZIndex}
              barWidth={length}
              timelineRef={timelineRef}
              onUpdateElementGroupPosition={onUpdateElementGroupPosition}
            />
          );
        })}

        {/* Render Markers (should be on top of lines) */}
        {markers.map((marker) => (
          <DraggableTimelineMarker
            key={marker.id}
            marker={marker}
            barWidth={length}
            onUpdateMarkerPosition={onUpdateMarkerPosition}
            timelineRef={timelineRef}
          />
        ))}
      </div>
      <div style={{ fontSize: '0.8em', color: '#555', marginLeft: '10px' }}>
        FINISH
      </div>
    </div>
  );
};

export default TimelineBar; 