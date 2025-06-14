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
      set(state => {
        if (!state.schemas[folderName]) {
          state.schemas[folderName] = schema;
          state.levaSetters[folderName] = setter;
          state.initialControlValues[folderName] = initialValues;
          state.controlValues[folderName] = initialValues;
          state.changedKeys[folderName] = new Set();
        }
      });
    },

    updateControlValues: (folderName, newValues) => {
      set(state => {
        state.controlValues[folderName] = newValues;
      });
    },

    getSettingsForSave: () => {
      return get().controlValues;
    },

    loadSettingsFromDB: (settings, slotNumber) => {
      console.log(`%c[levaStore] loadSettingsFromDB called for slot ${slotNumber}. Setting isSwitchingSlots: true.`, 'color: orange');
      set({ isSwitchingSlots: true });
    
      setTimeout(() => {
        console.log(`%c[levaStore] setTimeout fired for slot ${slotNumber}. Updating values and setting isSwitchingSlots: false.`, 'color: lightgreen');
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