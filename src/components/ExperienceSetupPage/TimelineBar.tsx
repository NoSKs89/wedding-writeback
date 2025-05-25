// TimelineBar.tsx
import * as React from 'react';
import { useDrop, useDrag, DropTargetMonitor, DragSourceMonitor } from 'react-dnd';
import { TimelineMarker } from './ExperienceSetupPage'; // Import the interface

interface TimelineBarProps {
  markers: TimelineMarker[];
  onUpdateMarkerPosition: (markerId: string, newPosition: number) => void;
  length: number; // Visual length of the bar (e.g., in pixels)
}

interface DraggableMarkerProps {
  marker: TimelineMarker;
  barWidth: number;
  onUpdateMarkerPosition: (markerId: string, newPosition: number) => void;
}

const DRAGGABLE_ITEM_TYPE = 'TIMELINE_MARKER';

const DraggableTimelineMarker: React.FC<DraggableMarkerProps> = ({ marker, barWidth, onUpdateMarkerPosition }) => {
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

  return (
    <div
      ref={(node) => drag(node)}
      style={{
        position: 'absolute',
        left: `${leftPosition}px`,
        top: marker.type === 'start' ? '-15px' : '5px', // Position above/below the bar center line
        width: '10px',
        height: '20px',
        backgroundColor: marker.color,
        border: '1px solid black',
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        transform: 'translateX(-50%)', // Center the marker
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        color: 'white',
        writingMode: marker.type === 'start' ? 'vertical-rl' : 'vertical-lr', // Orient text if needed
        zIndex: 10 // Ensure markers are above the bar
      }}
      title={`Element ${marker.elementId} ${marker.type}`}
    >
      {/* {marker.type === 'start' ? 'S' : 'E'} */}
    </div>
  );
};


const TimelineBar: React.FC<TimelineBarProps> = ({ markers, onUpdateMarkerPosition, length }) => {
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
        {/* Render Markers */}
        {markers.map((marker) => (
          <DraggableTimelineMarker
            key={marker.id}
            marker={marker}
            barWidth={length}
            onUpdateMarkerPosition={onUpdateMarkerPosition}
          />
        ))}
      </div>
    </div>
  );
};

export default TimelineBar; 