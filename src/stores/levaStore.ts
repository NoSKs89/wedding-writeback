import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import axios from 'axios';
import { getApiBaseUrl } from '../config/apiConfig'; // Import the centralized helper

// Renamed helper function to avoid conflict with zustand/shallow
function shallowCompareObjects(obj1: Record<string, any> | undefined, obj2: Record<string, any> | undefined): boolean {
  if (!obj1 && !obj2) return true; 
  if (!obj1 || !obj2) return false; 

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!obj2.hasOwnProperty(key) || obj1[key] !== obj2[key]) {
      return false;
    }
  }
  return true;
}

export interface LevaControlSchemaItem {
  value: any;
  label?: string;
  [key: string]: any; // For other schema options like min, max, step
}

export interface LevaFolderSchema {
  [key: string]: LevaControlSchemaItem;
}

export interface LevaStoreState {
  controlValues: { [folderName: string]: Record<string, any> };
  initialControlValues: { [folderName: string]: Record<string, any> };
  changedKeys: { [folderName: string]: Set<string> };
  schemas: { [folderName: string]: LevaFolderSchema };
  levaSetters: { [folderName: string]: (values: Record<string, any>) => void }; // To update Leva instances from store

  // Actions
  registerControls: (folderName: string, schema: LevaFolderSchema, initialValuesFromLevaSchema: Record<string, any>, setter: (values: Record<string, any>) => void) => void;
  updateControlValues: (folderName: string, newValues: Record<string, any>) => void;
  getSettingsForSave: () => { [folderName: string]: Record<string, any> };
  loadSettingsFromDB: (settings: { [folderName: string]: Record<string, any> }) => void;
  getDisplayDataForHUD: () => Array<{ folderName: string; key: string; label: string; value: any; isChanged: boolean }>;
  
  // Consolidated load and save functions
  saveSettingsToServer: (weddingId: string, viewType: 'desktop' | 'mobile') => Promise<void>; 
  loadSettingsFromServer: (weddingId: string, viewType: 'desktop' | 'mobile') => Promise<void>;
}

// Explicitly define the type for the store hook if direct create is problematic
// type LevaStoreHook = UseBoundStore<StoreApi<LevaStoreState>>;

// MOVED to src/config/apiConfig.js
// const getApiBaseUrl = () => {
//   const useLocalBackend = process.env.NODE_ENV === 'development'; // Basic check, can be more sophisticated
//   const localApiBaseUrl = 'http://localhost:5000/api';
//   const awsApiBaseUrl = 'https://dzqec1uyx0.execute-api.us-east-1.amazonaws.com/dev/api'; // Replace with your actual deployed URL if different
//   return useLocalBackend ? localApiBaseUrl : awsApiBaseUrl;
// };

export const useLevaStore = createWithEqualityFn<LevaStoreState>()(
  (set, get) => ({
  controlValues: {},
  initialControlValues: {},
  changedKeys: {},
  schemas: {},
  levaSetters: {},

  registerControls: (folderName, schema, initialValuesFromLevaSchema, setter) => set(state => {
    console.log(`[LevaStore] registerControls CALLED for folder: "${folderName}"`);

    // Determine the effective initial values for this folder.
    // If initialControlValues for this folder already exist in the store (e.g., from DB load or previous save), use them as the baseline.
    // Otherwise, this is the first time we're seeing this folder, so use the schema's defaults.
    let effectiveInitialValuesForFolder = state.initialControlValues[folderName];
    if (!effectiveInitialValuesForFolder) {
      effectiveInitialValuesForFolder = { ...initialValuesFromLevaSchema };
    }

    // Determine the effective control (live) values for this folder.
    // If controlValues for this folder already exist (e.g., from DB load or user interaction), use them.
    // Otherwise, initialize them with the effectiveInitialValuesForFolder.
    let effectiveControlValuesForFolder = state.controlValues[folderName];
    if (!effectiveControlValuesForFolder) {
      effectiveControlValuesForFolder = { ...effectiveInitialValuesForFolder };
    }
    
    // `changedKeys` should be preserved as they are currently in the store.
    // They are managed by `loadSettingsFromDB` (cleared on load),
    // `saveSettingsToServer`/`saveMobileSettingsToServer` (cleared on save),
    // and `updateControlValues` (populated on user edit).
    // `registerControls` itself doesn't constitute a user change that should populate `changedKeys`.
    const preservedChangedKeysForFolder = state.changedKeys[folderName] || new Set<string>();

    // If the Leva panel's current mounted values (initialValuesFromLevaSchema)
    // differ from what the store believes the control values should be (effectiveControlValuesForFolder, possibly from DB),
    // then update the Leva panel to reflect the store's state.
    if (!shallowCompareObjects(initialValuesFromLevaSchema, effectiveControlValuesForFolder)) {
      setter(effectiveControlValuesForFolder);
    }
    
    return {
      ...state,
      schemas: { ...state.schemas, [folderName]: schema },
      initialControlValues: { ...state.initialControlValues, [folderName]: effectiveInitialValuesForFolder },
      controlValues: { ...state.controlValues, [folderName]: effectiveControlValuesForFolder },
      changedKeys: { ...state.changedKeys, [folderName]: preservedChangedKeysForFolder },
      levaSetters: { ...state.levaSetters, [folderName]: setter },
    };
  }),

  updateControlValues: (folderName, newValues) => set(state => {
    // console.log(`[LevaStore] updateControlValues for folder: ${folderName} with newValues:`, JSON.stringify(newValues));

    if (!state.initialControlValues[folderName] || !state.controlValues[folderName] || !state.changedKeys[folderName]) {
        // console.warn(`[LevaStore] Attempted to update non-registered or inconsistent folder '${folderName}'. Current state:`, JSON.stringify(state.controlValues));
        return state; 
    }

    const oldFolderValues = state.controlValues[folderName];
    const currentFolderValues = { ...oldFolderValues, ...newValues };
    const newFolderChangedKeys = new Set<string>();

    for (const key in currentFolderValues) {
      if (state.initialControlValues[folderName].hasOwnProperty(key) && 
          currentFolderValues[key] !== state.initialControlValues[folderName][key]) {
        newFolderChangedKeys.add(key);
      }
    }

    let valuesHaveChanged = false;
    if (Object.keys(currentFolderValues).length !== Object.keys(oldFolderValues).length) {
      valuesHaveChanged = true;
    } else {
      for (const key in currentFolderValues) {
        if (currentFolderValues[key] !== oldFolderValues[key]) {
          valuesHaveChanged = true;
          break;
        }
      }
    }

    let changedKeysHaveChanged = false;
    const oldFolderChangedKeys = state.changedKeys[folderName];
    if (newFolderChangedKeys.size !== oldFolderChangedKeys.size) {
      changedKeysHaveChanged = true;
    } else {
      for (const key of Array.from(newFolderChangedKeys)) {
        if (!oldFolderChangedKeys.has(key)) {
          changedKeysHaveChanged = true;
          break;
        }
      }
      if (!changedKeysHaveChanged) {
          for (const key of Array.from(oldFolderChangedKeys)) {
              if(!newFolderChangedKeys.has(key)) {
                  changedKeysHaveChanged = true;
                  break;
              }
          }
      }
    }

    if (!valuesHaveChanged && !changedKeysHaveChanged) {
      // console.log(`[LevaStore] No effective change for folder '${folderName}'. Skipping store update. Old:`, JSON.stringify(oldFolderValues), "New considered:", JSON.stringify(currentFolderValues));
      return state; 
    }
    
    // console.log(`[LevaStore] Effective change for folder '${folderName}'. Updating store. New values:`, JSON.stringify(currentFolderValues), "New changed keys:", Array.from(newFolderChangedKeys));
    return {
      controlValues: { ...state.controlValues, [folderName]: currentFolderValues },
      changedKeys: { ...state.changedKeys, [folderName]: newFolderChangedKeys },
    };
  }),

  getSettingsForSave: () => {
    const state = get();
    // console.log("[LevaStore] getSettingsForSave called. Current controlValues:", JSON.stringify(state.controlValues));
    // We only want to save values that are *different* from the initial schema defaults.
    // However, for simplicity in loading and to ensure all current settings are captured,
    // we might decide to save all `controlValues` as they are.
    // The current implementation of `loadSettingsFromDB` expects the full structure.
    // So, returning all `controlValues` is appropriate here.
    // If we wanted to optimize payload size, we'd compare against initialControlValues
    // and only send the diff, but that complicates loading.
    return JSON.parse(JSON.stringify(state.controlValues)); // Deep clone for safety
  },

  loadSettingsFromDB: (settings) => set(state => {
    console.log('[LevaStore] loadSettingsFromDB CALLED with:', JSON.stringify(settings));
    const newControlValues = { ...state.controlValues };
    const newChangedKeys = { ...state.changedKeys }; // Preserve existing changedKeys by default
    const newInitialControlValues = { ...state.initialControlValues }; // ADDED: To update initial values

    for (const folderName in settings) {
      const folderSettingsFromDB = settings[folderName];
      if (typeof folderSettingsFromDB === 'object' && folderSettingsFromDB !== null) {
        // console.log(`[LevaStore] Processing loaded settings for folder: ${folderName}`);

        // 1. Update controlValues with DB values
        const currentFolderLiveValues = { ...(newControlValues[folderName] || {}), ...folderSettingsFromDB };
        newControlValues[folderName] = currentFolderLiveValues;
        console.log(`[LevaStore loadSettingsFromDB] For "${folderName}", set controlValues to:`, JSON.stringify(currentFolderLiveValues));

        // 2. Update initialControlValues with a deep copy of DB values
        newInitialControlValues[folderName] = JSON.parse(JSON.stringify(folderSettingsFromDB));
        console.log(`[LevaStore loadSettingsFromDB] For "${folderName}", set initialControlValues to:`, JSON.stringify(newInitialControlValues[folderName]));

        // 3. Reset changedKeys for this folder
        newChangedKeys[folderName] = new Set<string>();
        console.log(`[LevaStore loadSettingsFromDB] For "${folderName}", cleared changedKeys.`);

        // 4. If Leva setter exists, update Leva UI
        if (state.levaSetters[folderName]) {
          console.log(`[LevaStore loadSettingsFromDB] Calling Leva setter for "${folderName}" with DB values.`);
          state.levaSetters[folderName](folderSettingsFromDB);
        } else {
          console.warn(`[LevaStore loadSettingsFromDB] No Leva setter found for "${folderName}" during DB load.`);
        }

        // console.log(`[LevaStore] Updated controlValues for ${folderName} from DB:`, JSON.stringify(currentFolderLiveValues));
        // console.log(`[LevaStore] Updated initialControlValues for ${folderName} from DB:`, JSON.stringify(newInitialControlValues[folderName]));
        // console.log(`[LevaStore] Cleared changedKeys for ${folderName}`);

      } else {
         // console.warn(`[LevaStore] Settings for folder '${folderName}' from DB are not an object or are null. Skipping update for this folder.`);
      }
    }

    // console.log('[LevaStore] final newControlValues after loadSettingsFromDB:', JSON.stringify(newControlValues));
    // console.log('[LevaStore] final newInitialControlValues after loadSettingsFromDB:', JSON.stringify(newInitialControlValues));
    // console.log('[LevaStore] final newChangedKeys after loadSettingsFromDB:', Object.keys(newChangedKeys).reduce((acc, key) => { acc[key] = Array.from(newChangedKeys[key]); return acc; }, {} as Record<string, string[]>));
    return {
      controlValues: newControlValues,
      initialControlValues: newInitialControlValues, // Make sure to return the updated initial values
      changedKeys: newChangedKeys,
    };
  }),

  getDisplayDataForHUD: () => {
    const state = get();
    const displayData: Array<{ folderName: string; key: string; label: string; value: any; isChanged: boolean }> = [];
    // console.log("[LevaStore] getDisplayDataForHUD - Current State:", 
    //   "\n  Control Values:", JSON.stringify(state.controlValues),
    //   "\n  Initial Values:", JSON.stringify(state.initialControlValues),
    //   "\n  Changed Keys:", JSON.stringify(Object.fromEntries(Object.entries(state.changedKeys).map(([k, v]) => [k, Array.from(v)])))
    // );

    for (const folderName in state.schemas) {
      const folderSchema = state.schemas[folderName];
      const folderValues = state.controlValues[folderName] || {};
      const folderChangedKeys = state.changedKeys[folderName] || new Set();
      for (const key in folderSchema) {
        displayData.push({
          folderName,
          key,
          label: folderSchema[key].label || key,
          value: folderValues[key],
          isChanged: folderChangedKeys.has(key),
        });
      }
    }
    return displayData;
  },

  saveSettingsToServer: async (weddingId: string, viewType: 'desktop' | 'mobile' = 'desktop') => {
    const settingsToSave = get().getSettingsForSave(); // Get settings BEFORE the async call
    try {
      const apiBase = getApiBaseUrl();
      const endpoint = `${apiBase}/weddings/${weddingId}/layout-settings?view=${viewType}`;
      console.log(`[LevaStore] Saving ${viewType} layout settings for ${weddingId} to ${endpoint}`);
      await axios.post(endpoint, settingsToSave);
      console.log(`[LevaStore] ${viewType} layout settings saved successfully to server.`);

      set(state => {
        const newInitialValues = JSON.parse(JSON.stringify(settingsToSave));
        const newChangedKeys = { ...state.changedKeys };
        for (const folderName in newInitialValues) {
          if (state.schemas.hasOwnProperty(folderName)) {
            newChangedKeys[folderName] = new Set<string>();
          }
        }
        return {
          ...state,
          initialControlValues: newInitialValues,
          changedKeys: newChangedKeys,
        };
      });

    } catch (error) {
      console.error(`[LevaStore] Error saving ${viewType} layout settings to server:`, error);
      throw error;
    }
  },

  loadSettingsFromServer: async (weddingId: string, viewType: 'desktop' | 'mobile' = 'desktop') => {
    try {
      const apiBase = getApiBaseUrl();
      const endpoint = `${apiBase}/weddings/${weddingId}/layout-settings?view=${viewType}`;
      console.log(`[LevaStore] loadSettingsFromServer CALLED for weddingId: "${weddingId}", viewType: "${viewType}"`);
      const response = await axios.get(endpoint);
      // console.log(`[LevaStore] loadSettingsFromServer - raw response.data for "${weddingId}" (${viewType}):`, response.data);
      
      let dataToProcess = response.data;
      if (typeof response.data === 'string') {
        // console.log(`[LevaStore PROD LOG] loadSettingsFromServer (${viewType}) - response.data is a string. Attempting to decode.`);
        try {
          const binaryString = atob(response.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const decodedString = new TextDecoder('utf-8').decode(bytes);
          // console.log(`[LevaStore PROD LOG] loadSettingsFromServer (${viewType}) - decodedString (after TextDecoder):`, decodedString);
          dataToProcess = JSON.parse(decodedString);
          // console.log(`[LevaStore PROD LOG] loadSettingsFromServer (${viewType}) - dataToProcess (after JSON.parse):`, dataToProcess);
        } catch (e) {
          console.error(`[LevaStore PROD LOG] loadSettingsFromServer (${viewType}) - Failed to decode/parse base64. Error:`, e, 'Raw data:', response.data);
          // If it's not JSON, and not an empty object (which can be valid), it might be an error message from server
          // or an empty response that means no settings are stored yet.
          // If it's an error string, it might be better to throw or handle it.
          // For now, if it's not parseable to an object, treat as no settings.
          if (typeof dataToProcess !== 'object' || dataToProcess === null) {
            dataToProcess = {}; 
          }
        }
      }
      
      const loadedSettings = dataToProcess;
      // console.log(`[LevaStore] loadSettingsFromServer - final loadedSettings for "${weddingId}" (${viewType}) before calling loadSettingsFromDB:`, loadedSettings);
      if (loadedSettings && typeof loadedSettings === 'object' && Object.keys(loadedSettings).length > 0) {
        get().loadSettingsFromDB(loadedSettings);
      } else {
        // console.log(`[LevaStore] No ${viewType} layout settings found on server or empty/invalid settings object for "${weddingId}". Processed data:`, loadedSettings);
        // If no settings are found, explicitly reset/clear Leva for the current view context if necessary
        // This might involve calling loadSettingsFromDB with an empty object or a specific reset action.
        // For now, loadSettingsFromDB with an empty object will effectively clear values if schemas are registered.
        get().loadSettingsFromDB({}); 
      }
    } catch (error) {
      console.error(`[LevaStore] Error loading ${viewType} layout settings from server:`, error);
      // It's important to still clear/reset Leva if the load fails, to avoid stale data.
      get().loadSettingsFromDB({}); 
      throw error;
    }
  },
}),
shallow // Default equality function for all subscriptions
); 