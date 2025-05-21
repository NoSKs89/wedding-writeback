import { create, StoreApi, UseBoundStore } from 'zustand';
import axios from 'axios';
import { getApiBaseUrl } from '../config/apiConfig'; // Import the centralized helper

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
  registerControls: (folderName: string, schema: LevaFolderSchema, initialValues: Record<string, any>, setter: (values: Record<string, any>) => void) => void;
  updateControlValues: (folderName: string, newValues: Record<string, any>) => void;
  getSettingsForSave: () => { [folderName: string]: Record<string, any> };
  loadSettingsFromDB: (settings: { [folderName: string]: Record<string, any> }) => void;
  getDisplayDataForHUD: () => Array<{ folderName: string; key: string; label: string; value: any; isChanged: boolean }>;
  saveSettingsToServer: (weddingId: string) => Promise<void>;
  loadSettingsFromServer: (weddingId: string) => Promise<void>;
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

export const useLevaStore = create<LevaStoreState>()((set, get) => ({
  controlValues: {},
  initialControlValues: {},
  changedKeys: {},
  schemas: {},
  levaSetters: {},

  registerControls: (folderName, schema, initialValues, setter) => set(state => {
    console.log(`[LevaStore] registerControls for folder: ${folderName}`, { schema, initialValues: JSON.stringify(initialValues) });

    const existingControlValues = state.controlValues[folderName];
    const existingInitialValues = state.initialControlValues[folderName];

    let controlValuesChanged = true;
    if (existingControlValues && initialValues) {
      const keys1 = Object.keys(existingControlValues);
      const keys2 = Object.keys(initialValues);
      if (keys1.length === keys2.length) {
        controlValuesChanged = keys1.some(key => existingControlValues[key] !== initialValues[key]);
      } else {
        controlValuesChanged = true; // Different number of keys
      }
    } else if (!existingControlValues && !initialValues) {
      controlValuesChanged = false; // Both null/undefined
    }
    
    // Also check initialControlValues to be thorough, though typically they align with controlValues on registration
    let initialValuesStoreChanged = true;
    if (existingInitialValues && initialValues) {
      const keys1 = Object.keys(existingInitialValues);
      const keys2 = Object.keys(initialValues);
      if (keys1.length === keys2.length) {
        initialValuesStoreChanged = keys1.some(key => existingInitialValues[key] !== initialValues[key]);
      } else {
        initialValuesStoreChanged = true;
      }
    } else if (!existingInitialValues && !initialValues) {
      initialValuesStoreChanged = false;
    }

    const schemaChanged = state.schemas[folderName] !== schema; // Simple reference check for schema, assumes schema objects are stable if identical
    const setterChanged = state.levaSetters[folderName] !== setter;

    if (!controlValuesChanged && !initialValuesStoreChanged && !schemaChanged && !setterChanged && state.changedKeys[folderName]) {
      console.log(`[LevaStore] No change in registration data for ${folderName}. Skipping state update.`);
      return state; // No actual change to essential registration parts
    }

    console.log(`[LevaStore] Proceeding with registration update for ${folderName}. Changes detected: controlValuesChanged: ${controlValuesChanged}, initialValuesStoreChanged: ${initialValuesStoreChanged}, schemaChanged: ${schemaChanged}, setterChanged: ${setterChanged}`);

    const newSchemas = schemaChanged ? { ...state.schemas, [folderName]: schema } : state.schemas;
    const newInitialValues = initialValuesStoreChanged || !state.initialControlValues[folderName] 
      ? { ...state.initialControlValues, [folderName]: { ...initialValues } } 
      : state.initialControlValues;
    const newControlValues = controlValuesChanged || !state.controlValues[folderName]
      ? { ...state.controlValues, [folderName]: { ...initialValues } } 
      : state.controlValues;
    const newChangedKeys = state.changedKeys[folderName] ? state.changedKeys : { ...state.changedKeys, [folderName]: new Set<string>() }; // Ensure it exists
    const newLevaSetters = setterChanged ? { ...state.levaSetters, [folderName]: setter } : state.levaSetters;
    
    console.log(`[LevaStore] State AFTER registration for ${folderName}:`, { newControlValues: JSON.stringify(newControlValues), newInitialValues: JSON.stringify(newInitialValues) });
    return {
      schemas: newSchemas,
      initialControlValues: newInitialValues,
      controlValues: newControlValues,
      changedKeys: newChangedKeys,
      levaSetters: newLevaSetters,
    };
  }),

  updateControlValues: (folderName, newValues) => set(state => {
    console.log(`[LevaStore] updateControlValues for folder: ${folderName} with newValues:`, JSON.stringify(newValues));

    if (!state.initialControlValues[folderName] || !state.controlValues[folderName] || !state.changedKeys[folderName]) {
        console.warn(`[LevaStore] Attempted to update non-registered or inconsistent folder '${folderName}'. Current state:`, JSON.stringify(state.controlValues));
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
      console.log(`[LevaStore] No effective change for folder '${folderName}'. Skipping store update. Old:`, JSON.stringify(oldFolderValues), "New considered:", JSON.stringify(currentFolderValues));
      return state; 
    }
    
    console.log(`[LevaStore] Effective change for folder '${folderName}'. Updating store. New values:`, JSON.stringify(currentFolderValues), "New changed keys:", Array.from(newFolderChangedKeys));
    return {
      controlValues: { ...state.controlValues, [folderName]: currentFolderValues },
      changedKeys: { ...state.changedKeys, [folderName]: newFolderChangedKeys },
    };
  }),

  getSettingsForSave: () => {
    const settings: { [folderName: string]: Record<string, any> } = {};
    const currentControlValues = get().controlValues;
    for (const folder in currentControlValues) {
      settings[folder] = { ...currentControlValues[folder] };
    }
    return settings;
  },

  loadSettingsFromDB: (settings) => set(state => {
    const newControlValues = { ...state.controlValues };
    const newChangedKeys = { ...state.changedKeys };
    const settersToCall: Array<{ setter: (values: Record<string, any>) => void; valuesToSet: Record<string, any>}> = [];

    for (const folderName in settings) {
      if (state.schemas[folderName]) { // Only load for registered folders
        const folderSettings = settings[folderName];
        newControlValues[folderName] = { ...state.initialControlValues[folderName] }; // Start from initial defaults
        const currentFolderChangedKeys = new Set<string>();

        const valuesForLevaInstance: Record<string, any> = {};
        for (const key in folderSettings) {
          if (state.schemas[folderName].hasOwnProperty(key)) {
            newControlValues[folderName][key] = folderSettings[key];
            valuesForLevaInstance[key] = folderSettings[key]; // Collect values to set in Leva
            if (folderSettings[key] !== state.initialControlValues[folderName][key]) {
              currentFolderChangedKeys.add(key);
            }
          }
        }
        newChangedKeys[folderName] = currentFolderChangedKeys;
        if (state.levaSetters[folderName] && Object.keys(valuesForLevaInstance).length > 0) {
          settersToCall.push({ setter: state.levaSetters[folderName], valuesToSet: valuesForLevaInstance });
        }
      }
    }
    setTimeout(() => {
        settersToCall.forEach(s => s.setter(s.valuesToSet));
    }, 0);

    return {
      controlValues: newControlValues,
      changedKeys: newChangedKeys,
    };
  }),

  getDisplayDataForHUD: () => {
    const displayData: Array<{ folderName: string; key: string; label: string; value: any; isChanged: boolean }> = [];
    const { controlValues, schemas, changedKeys } = get();
    for (const folderName in schemas) {
      const folderSchema = schemas[folderName];
      const folderValues = controlValues[folderName] || {};
      const folderChangedKeys = changedKeys[folderName] || new Set();
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

  saveSettingsToServer: async (weddingId: string) => {
    const apiBase = getApiBaseUrl();
    const settingsToSave = get().getSettingsForSave();
    try {
      console.log(`[LevaStore] Saving layout settings for ${weddingId} to ${apiBase}/weddings/${weddingId}/layout-settings`, settingsToSave);
      const response = await axios.post(`${apiBase}/weddings/${weddingId}/layout-settings`, settingsToSave);
      console.log('[LevaStore] Layout settings saved successfully:', response.data);
      // Optionally, clear changedKeys or give user feedback
      // set(state => ({ changedKeys: {} })); // Example: Reset all changed keys after save
    } catch (error) {
      console.error('[LevaStore] Error saving layout settings to server:', error);
      // Rethrow or handle error (e.g., show a notification to the user)
      throw error;
    }
  },

  loadSettingsFromServer: async (weddingId: string) => {
    const apiBase = getApiBaseUrl();
    try {
      console.log(`[LevaStore] Loading layout settings for ${weddingId} from ${apiBase}/weddings/${weddingId}/layout-settings`);
      const response = await axios.get(`${apiBase}/weddings/${weddingId}/layout-settings`);
      const loadedSettings = response.data;
      if (loadedSettings && typeof loadedSettings === 'object' && Object.keys(loadedSettings).length > 0) {
        console.log('[LevaStore] Layout settings loaded from server:', loadedSettings);
        get().loadSettingsFromDB(loadedSettings);
      } else {
        console.log('[LevaStore] No layout settings found on server or empty settings object for', weddingId);
        // Optionally, reset to defaults or do nothing if no settings are found
        // get().loadSettingsFromDB({}); // Example: Load empty to reset to initial/schema defaults
      }
    } catch (error) {
      console.error('[LevaStore] Error loading layout settings from server:', error);
      // Rethrow or handle error
      throw error;
    }
  },
})); 