// TimelineBar.tsx
import * as React from 'react';
import { useDrop, useDrag, DropTargetMonitor, DragSourceMonitor } from 'react-dnd';
import { TimelineMarker } from './ExperienceSetupPage'; // Import the interface

interface TimelineBarProps {
  markers: TimelineMarker[];
  onUpdateMarkerPosition: (markerId: string, newPosition: number) => void;
  length: number; // Visual length of the bar (e.g., in pixels)
  maxElements?: number; 
}

interface DraggableTimelineMarkerProps {
  marker: TimelineMarker;
  barWidth: number;
  onUpdateMarkerPosition: (markerId: string, newPosition: number) => void;
  previewImageUrl?: string;
}

const DRAGGABLE_ITEM_TYPE = 'TIMELINE_MARKER';

const DraggableTimelineMarker: React.FC<DraggableTimelineMarkerProps> = ({ marker, barWidth, onUpdateMarkerPosition, previewImageUrl }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DRAGGABLE_ITEM_TYPE,
    item: { id: marker.id, type: DRAGGABLE_ITEM_TYPE, originalPosition: marker.position },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    end: (item: { id: string; type: string; originalPosition: number }, monitor: DragSourceMonitor<any, { newPositionProportion: number }>) => {
      const dropResult = monitor.getDropResult(); // Type is inferred from DragSourceMonitor now
      if (item && dropResult) {
        onUpdateMarkerPosition(item.id, dropResult.newPositionProportion);
      }
    },
  }), [marker.id, marker.position, barWidth, onUpdateMarkerPosition]);

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
    zIndex: 20 // Ensure markers are above lines and the main timeline bar
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
    zIndex: 21, // Above the marker itself
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
    </div>
  );
};


const TimelineBar: React.FC<TimelineBarProps> = ({ markers, onUpdateMarkerPosition, length, maxElements = 8 }) => {
  const timelineRef = React.useRef<HTMLDivElement | null>(null);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: DRAGGABLE_ITEM_TYPE,
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

  const MAX_LINE_THICKNESS = 10; // pixels, for element 0
  const MIN_LINE_THICKNESS = 2; // pixels, for the highest element ID

  return (
    <div style={{ position: 'relative', padding: '30px 0', minHeight: '60px' }}>
      <div
        ref={(el: HTMLDivElement | null) => {
          (timelineRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          drop(el); // Attach drop target to the bar itself
        }}
        style={{
          width: `${length}px`, // This can be a fixed pixel value or scale with `timelineLength` state
          height: '10px',
          backgroundColor: '#ccc',
          position: 'relative',
          border: '1px solid #999',
          borderRadius: '5px',
          margin: '20px 0',
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
            <div
              key={`line-${group.start.elementId}`}
              style={{
                position: 'absolute',
                left: `${lineStartPx}px`,
                top: '50%', // Center on the timeline bar's midline
                transform: 'translateY(-50%)',
                width: `${lineWidthPx}px`,
                height: `${lineHeight}px`,
                backgroundColor: group.start.color, // Use the element's color
                zIndex: lineZIndex, // Higher zIndex for elements that are visually on top in parallax
                borderRadius: '2px',
              }}
              title={`Element ${group.start.elementId} duration`}
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
            previewImageUrl={marker.type === 'start' ? marker.previewImageUrl : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default TimelineBar; 