export interface ElementConfig {
  id: number;
  name: string;
  type: 'text' | 'photo' | 'background-image' | 'component' | 'empty';
  content: any;
  timelineColor: string;
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
} 