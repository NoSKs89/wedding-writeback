export interface ElementConfig {
  id: number;
  name: string;
  type: 'text' | 'photo' | 'background-image' | 'component' | 'empty' | 'video' | 'background-video' | 'navbar'; // Temporarily keep 'navbar' for backward compatibility
  content: any;
  timelineColor: string;
  autoSequence?: number | null; // Auto navigation sequence number (1, 2, 3, etc.) or null if not in auto sequence
}

export interface TimelineMarker {
  elementId: number;
  type: 'start' | 'end';
  position: number;
}

export interface ExperienceSettings {
  timelineLength: number;
  elements: ElementConfig[];
  markers: TimelineMarker[];
  defaultLayoutSlotMobile?: number;
  defaultLayoutSlotDesktop?: number;
  autoNavigationEnabled?: boolean;
} 