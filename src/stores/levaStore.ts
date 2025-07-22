import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { useCreateStore } from 'leva';
import axios from 'axios';
import { getApiBaseUrl } from '../config/apiConfig';

type LevaStore = ReturnType<typeof useCreateStore>;

enableMapSet();

export type LevaFolderSchema = any;

export interface LevaStoreState {
  rawDbSettings: { [folderName: string]: Record<string, any> };
  controlValues: { [folderName: string]: Record<string, any> };
  initialControlValues: { [folderName: string]: Record<string, any> };
  changedKeys: { [folderName: string]: Set<string> };
  schemas: { [folderName: string]: LevaFolderSchema };
  levaSetters: { [folderName: string]: (values: Record<string, any>) => void };
  currentPreviewingSlot: number;
  isSwitchingSlots: boolean;
  isLoading: boolean;
  error: string | null;
  levaStore: LevaStore | null;
  initializeLevaStore: (store: LevaStore) => void;
  registerControls: (folderName: string, schema: LevaFolderSchema, initialValues: Record<string, any>, setter: (values: Record<string, any>) => void) => void;
  updateControlValues: (folderName: string, newValues: Record<string, any>) => void;
  getSettingsForSave: () => { [folderName: string]: Record<string, any> };
  loadSettingsFromDB: (settings: { [folderName: string]: Record<string, any> }, slotNumber?: number) => void;
  loadSettingsFromServer: (weddingId: string, viewType: 'desktop' | 'mobile', slotNumber: number) => Promise<void>;
  saveSettingsToServer: (weddingId: string, viewType: 'desktop' | 'mobile', slotNumber: number, settings: { [folderName: string]: Record<string, any> }) => Promise<void>;
  switchPreviewingSlot: (weddingId: string, viewType: 'desktop' | 'mobile', newSlotNumber: number) => Promise<void>;
}

export const useLevaStore = create<LevaStoreState>()(
  immer((set, get) => ({
    rawDbSettings: {},
    controlValues: {},
    initialControlValues: {},
    changedKeys: {},
    schemas: {},
    levaSetters: {},
    currentPreviewingSlot: 1,
    isSwitchingSlots: true,
    isLoading: false,
    error: null,
    levaStore: null,

    initializeLevaStore: (storeInstance) => {
      set(state => { state.levaStore = storeInstance; });
    },

    registerControls: (folderName, schema, initialValues, setter) => {
      console.log(`🔧 LevaStore: registerControls called for ${folderName}`, {
        timestamp: Date.now(),
        initialValues,
        hasExistingSchema: !!get().schemas[folderName],
        hasExistingControlValues: !!get().controlValues[folderName],
        existingControlValues: get().controlValues[folderName]
      });
      
      set(state => {
        if (!state.schemas[folderName]) {
          console.log(`📝 LevaStore: First-time registration for ${folderName} with initial values:`, initialValues);
          state.schemas[folderName] = schema;
          state.levaSetters[folderName] = setter;
          state.initialControlValues[folderName] = initialValues;
          state.controlValues[folderName] = initialValues;
          state.changedKeys[folderName] = new Set();
        } else {
          console.log(`♻️ LevaStore: Re-registration for ${folderName}, keeping existing values:`, state.controlValues[folderName]);
          // Update setter but keep existing values
          state.levaSetters[folderName] = setter;
        }
      });

      // Check if we have saved values that should override the initial values
      const currentState = get();
      const savedValues = currentState.rawDbSettings[folderName];
      if (savedValues && Object.keys(savedValues).length > 0) {
        console.log(`🎯 LevaStore: Found saved values for ${folderName}, applying immediately:`, savedValues);
        setter(savedValues);
        set(state => {
          state.controlValues[folderName] = savedValues;
        });
      }
    },

    updateControlValues: (folderName, newValues) => {
      // console.log(`🔄 LevaStore: updateControlValues called for ${folderName}`, {
      //   timestamp: Date.now(),
      //   newValues,
      //   previousValues: get().controlValues[folderName]
      // });
      set(state => {
        state.controlValues = {
          ...state.controlValues,
          [folderName]: newValues
        };
      });
    },

    getSettingsForSave: () => {
      return get().controlValues;
    },

    loadSettingsFromDB: (settings, slotNumber) => {
      // console.log(`🔄 LevaStore: loadSettingsFromDB called for slot ${slotNumber}. Setting isSwitchingSlots: true.`, {
      //   timestamp: Date.now(),
      //   settingsCount: Object.keys(settings).length,
      //   settingsPreview: Object.fromEntries(Object.entries(settings).slice(0, 2)),
      //   currentControlValues: Object.keys(get().controlValues)
      // });
      set({ isSwitchingSlots: true });
    
      setTimeout(() => {
        console.log(`⚡ LevaStore: setTimeout fired for slot ${slotNumber}. Updating values and setting isSwitchingSlots: false.`, {
          timestamp: Date.now(),
          settingsToApply: settings
        });
        
        // DEBUG: Check if buttonColor is missing from saved settings
        Object.keys(settings).forEach(folderName => {
          if (folderName.includes('Bottom_Navba')) {
            console.log(`🔍 LevaStore: Bottom Navbar settings analysis`, {
              timestamp: Date.now(),
              folderName,
              hasButtonColor: 'buttonColor' in (settings[folderName] || {}),
              buttonColorValue: settings[folderName]?.buttonColor,
              settingsKeys: Object.keys(settings[folderName] || {}),
              fullSettings: settings[folderName]
            });
          }
        });
        
        const currentState = get();
        
        // Apply settings using existing setters
        Object.entries(settings).forEach(([folderName, folderSettings]) => {
          const setter = currentState.levaSetters[folderName];
          if (setter && folderSettings) {
            console.log(`🎯 LevaStore: Applying loaded settings to ${folderName}:`, folderSettings);
            setter(folderSettings);
          } else {
            console.log(`⏳ LevaStore: No setter available yet for ${folderName}, will apply when registered`);
          }
        });
        
        set(state => {
          if (slotNumber) {
            state.currentPreviewingSlot = slotNumber;
          }
    
          state.controlValues = settings;
          state.initialControlValues = settings;
          state.rawDbSettings = settings;
    
          Object.keys(state.changedKeys).forEach(folderName => {
            state.changedKeys[folderName].clear();
          });
    
          state.isSwitchingSlots = false;
        });
      }, 0);
    },

    loadSettingsFromServer: async (weddingId, viewType, slotNumber) => {
      console.log(`%c[levaStore] loadSettingsFromServer called for slot ${slotNumber}`, 'color: cyan');
      set({ isLoading: true, error: null });
      const apiBase = getApiBaseUrl();
      try {
        const response = await axios.get(`${apiBase}/weddings/${weddingId}/layoutSettings/${viewType}`, {
          params: { slotNumber }
        });
        
        // LOG ARROW COLOR FROM SERVER RESPONSE
        console.log(`[ARROW_COLOR_DEBUG] 🌐 Server response for slot ${slotNumber}:`, {
          hasSettings: !!response.data.settings,
          settingsKeys: response.data.settings ? Object.keys(response.data.settings) : 'none',
          overallControls: response.data.settings?.['Overall Controls (Guest)'],
          arrowBackgroundColor: response.data.settings?.['Overall Controls (Guest)']?.arrowBackgroundColor,
          fullResponse: response.data,
          timestamp: Date.now()
        });
        
        if (response.data.settings && Object.keys(response.data.settings).length > 0) {
          get().loadSettingsFromDB(response.data.settings, slotNumber);
        } else {
          console.log(`%c[levaStore] Slot ${slotNumber} is empty. Loading empty settings.`, 'color: yellow');
          get().loadSettingsFromDB({}, slotNumber);
        }
        set({ isLoading: false });
      } catch (error: any) {
        console.error(`Error loading settings for slot ${slotNumber}:`, error);
        get().loadSettingsFromDB({}, slotNumber);
        set({ isLoading: false, error: error.message || 'Failed to fetch layout.' });
      }
    },

    saveSettingsToServer: async (weddingId, viewType, slotNumber, settingsToSave) => {
      const apiBase = getApiBaseUrl();
      try {
        await axios.post(`${apiBase}/weddings/${weddingId}/layoutSettings/${viewType}`, {
          slotNumber,
          settings: settingsToSave
        });
      } catch (error: any) {
        console.error(`Error saving settings for slot ${slotNumber}:`, error);
        throw error;
      }
    },

    switchPreviewingSlot: async (weddingId, viewType, newSlotNumber) => {
      await get().loadSettingsFromServer(weddingId, viewType, newSlotNumber);
    },
  }))
);