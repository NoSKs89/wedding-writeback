import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import axios from 'axios';
import { getApiBaseUrl } from '../config/apiConfig'; // Import the centralized helper

// ADDED: Call enableMapSet to allow Immer to handle Map and Set structures
enableMapSet();

// Type for Leva's folder() return structure (approximated)
// interface LevaFolderInput { // This was LevaFolderObject.schema's type
//   [key: string]: any; 
// }

// Represents a standard control item in a Leva schema
export interface LevaControlSchemaItem {
  value: any;
  label?: string;
  options?: any[] | Record<string, any>; // For select
  min?: number;
  max?: number;
  step?: number;
  rows?: number; // For textarea-like string inputs
  [key: string]: any; // Catch-all for other properties
}

// Represents a folder item in a Leva schema, mimicking Leva's FolderInput
export interface LevaSchemaFolder { // Renamed from LevaFolderObject
  type: 'FOLDER'; // Crucial: Literal type 'FOLDER'
  schema: LevaFolderSchema; // Recursive definition for the folder's content
  settings?: { collapsed?: boolean; render?: (get: any) => boolean; [key: string]: any; };
}

// Represents a Leva schema, which is an object where keys are control/folder names
// and values are their definitions.
export interface LevaFolderSchema {
  [key: string]: LevaControlSchemaItem | LevaSchemaFolder; // Uses updated types
}


// Renamed helper function to avoid conflict with zustand/shallow
function shallowCompareObjects(obj1: Record<string, any> | undefined, obj2: Record<string, any> | undefined): boolean {
  if (!obj1 || !obj2) return obj1 === obj2;
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  return true;
}

// --- ADDED HELPER FUNCTION: deepMerge ---
function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] });
        else (output as Record<string, any>)[key] = deepMerge(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

// --- ADDED HELPER FUNCTION: unNestFolders ---
function unNestFolders(
  nestedData: Record<string, any>,
  schema: LevaFolderSchema | undefined
): Record<string, any> {
  if (!schema || !nestedData) {
    return nestedData || {};
  }

  const flatResult: Record<string, any> = {};

  for (const key in nestedData) {
    const schemaEntry = schema[key];
    const value = nestedData[key];

    if (
      schemaEntry &&
      typeof schemaEntry === 'object' &&
      (schemaEntry as LevaSchemaFolder).type === 'FOLDER' && // Check for Leva folder structure
      isObject(value)
    ) {
      // It's a folder, recursively un-nest its contents
      const subSchema = (schemaEntry as LevaSchemaFolder).schema;
      const unNestedSubFolder = unNestFolders(value, subSchema);
      for (const subKey in unNestedSubFolder) {
        flatResult[subKey] = unNestedSubFolder[subKey];
      }
    } else {
      // Not a folder or no schema entry, keep the value as is
      flatResult[key] = value;
    }
  }
  return flatResult;
}

// --- ADDED HELPER FUNCTION ---
function transformFlatToNested(
  flatData: Record<string, any>,
  schema: LevaFolderSchema | undefined // schema can be undefined if not yet registered
): Record<string, any> {
  if (!schema || !flatData) {
    return flatData || {};
  }

  const nestedResult: Record<string, any> = {};
  const flatDataCopy = { ...flatData }; // Work on a copy

  // First, populate top-level keys that are not folders
  for (const schemaKey in schema) {
    const schemaEntry = schema[schemaKey];
    if (
      !(
        schemaEntry &&
        typeof schemaEntry === 'object' &&
        (schemaEntry as LevaSchemaFolder).type === 'FOLDER'
      ) && 
      flatDataCopy.hasOwnProperty(schemaKey)
    ) {
      nestedResult[schemaKey] = flatDataCopy[schemaKey];
      delete flatDataCopy[schemaKey]; 
    } else if (
        !(
        schemaEntry &&
        typeof schemaEntry === 'object' &&
        (schemaEntry as LevaSchemaFolder).type === 'FOLDER'
      )
    ) {
         if (schemaEntry && typeof schemaEntry === 'object' && !('type' in schemaEntry && schemaEntry.type === 'FOLDER') && 'value' in schemaEntry) {
            nestedResult[schemaKey] = (schemaEntry as LevaControlSchemaItem).value;
        }
    }
  }

  // Then, process folders
  for (const schemaKey in schema) {
    const schemaEntry = schema[schemaKey];

    if (
      schemaEntry &&
      typeof schemaEntry === 'object' &&
      (schemaEntry as LevaSchemaFolder).type === 'FOLDER' && 
      (schemaEntry as LevaSchemaFolder).schema 
    ) {
      const subSchema = (schemaEntry as LevaSchemaFolder).schema;
      const subFolderData = transformFlatToNested(flatDataCopy, subSchema);
      nestedResult[schemaKey] = subFolderData;

      for (const subKey in subSchema) {
        if (flatDataCopy.hasOwnProperty(subKey)) {
          delete flatDataCopy[subKey];
        }
      }
    }
  }
  return nestedResult;
}

// Corrected and simplified helper function to flatten data for Leva's setter
function flattenDataForLevaSetter(
  data: Record<string, any>,
  schema: LevaFolderSchema, // The schema for the current level of data
  keyPrefix: string = ''    // The prefix for keys at the current level of recursion
): Record<string, any> {
  const flattened: Record<string, any> = {};
  for (const key in data) {
    if (!data.hasOwnProperty(key)) continue;

    const schemaEntry = schema[key]; // Schema definition for the current key
    const value = data[key];    // Value for the current key

    if (
      schemaEntry &&
      typeof schemaEntry === 'object' &&
      (schemaEntry as LevaSchemaFolder).type === 'FOLDER' &&
      (schemaEntry as LevaSchemaFolder).schema &&
      isObject(value) // Ensure the data for the folder is an object
    ) {
      // It's a folder. Recursively flatten its contents.
      // The new prefix for items inside this folder will be the current prefix + this folder's key + '.'
      const newPrefixForSubItems = keyPrefix ? `${keyPrefix}${key}.` : `${key}.`;
      Object.assign(
        flattened,
        flattenDataForLevaSetter(value, (schemaEntry as LevaSchemaFolder).schema, newPrefixForSubItems)
      );
    } else {
      // It's a simple control (not a folder).
      // Prepend the current keyPrefix to this control's key.
      flattened[`${keyPrefix}${key}`] = value;
    }
  }
  return flattened;
}

// REMOVED OLD LevaControlSchemaItem (now defined at top)
// REMOVED OLD LevaFolderSchema (now defined at top)
// REMOVED OLD LevaFolderObject (now LevaSchemaFolder, defined at top)

export interface LevaStoreState {
  rawDbSettings: { [folderName: string]: Record<string, any> }; 
  controlValues: { [folderName: string]: Record<string, any> };
  initialControlValues: { [folderName: string]: Record<string, any> };
  changedKeys: { [folderName: string]: Set<string> };
  schemas: { [folderName: string]: LevaFolderSchema }; // Uses new LevaFolderSchema
  levaSetters: { [folderName: string]: (values: Record<string, any>) => void }; 

  // Actions
  registerControls: (folderName: string, schema: LevaFolderSchema, initialValuesFromLevaSchema: Record<string, any>, setter: (values: Record<string, any>) => void) => void;
  updateControlValues: (folderName: string, newValues: Record<string, any>) => void;
  getSettingsForSave: () => { [folderName: string]: Record<string, any> };
  loadSettingsFromDB: (settings: { [folderName: string]: Record<string, any> }) => void;
  getDisplayDataForHUD: () => Array<{ folderName: string; key: string; label: string; value: any; isChanged: boolean }>;
  
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

const flattenObject = (obj: Record<string, any>, prefix = '', result: Record<string, any> = {}): Record<string, any> => {
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      const schemaItemCandidate = obj[key];
      // Updated check for LevaControlSchemaItem-like structure
      if (typeof schemaItemCandidate.value !== 'undefined' && (typeof schemaItemCandidate.label !== 'undefined' || Object.keys(schemaItemCandidate).length === 1)) {
         result[prefix + key] = schemaItemCandidate.value; 
      } else {
        // Check if it's a LevaSchemaFolder-like structure before recursing
        // This part is tricky; flattenObject's purpose is to get to raw values.
        // If schemaItemCandidate is a nested object of values (like a folder's content in controlValues), recurse.
        // If it's a schema definition itself, we'd take 'value'.
        // Since this `obj` comes from controlValues, it should be data, not schema.
        flattenObject(obj[key], prefix + key + '.', result);
      }
    } else {
      result[prefix + key] = obj[key];
    }
  }
  return result;
};

export const useLevaStore = create<LevaStoreState>()(
  immer((set, get) => ({
    rawDbSettings: {}, 
    controlValues: {},
    initialControlValues: {},
    changedKeys: {},
    schemas: {},
    levaSetters: {},

    registerControls: (folderName, schema, initialValuesFromLevaSchema, setter) => {
      console.log(`[LevaStore] registerControls CALLED for folder: "${folderName}"`);
      set((state) => {
        state.schemas[folderName] = schema;
        state.levaSetters[folderName] = setter;

        let finalValuesForStore = { ...initialValuesFromLevaSchema }; 

        const rawFolderSettingsFromDB = state.rawDbSettings[folderName];

        if (rawFolderSettingsFromDB) {
          console.log(`[LevaStore registerControls - "${folderName}"] Found raw DB settings. Transforming and merging.`);
          const transformedDbSettings = transformFlatToNested(rawFolderSettingsFromDB, schema);
          console.log(`[LevaStore registerControls - "${folderName}"] Transformed DB settings:`, JSON.parse(JSON.stringify(transformedDbSettings)));
          
          finalValuesForStore = deepMerge(initialValuesFromLevaSchema, transformedDbSettings);
           console.log(`[LevaStore registerControls - "${folderName}"] Merged with Leva defaults (DB takes precedence):`, JSON.parse(JSON.stringify(finalValuesForStore)));
        } else {
          console.log(`[LevaStore registerControls - "${folderName}"] No raw DB settings found. Using Leva schema defaults.`);
        }
        
        state.controlValues[folderName] = { ...finalValuesForStore };
        state.initialControlValues[folderName] = { ...finalValuesForStore }; 
        state.changedKeys[folderName] = new Set<string>(); 

        if (setter) {
          if (folderName.startsWith("element_")) {
            // For element-specific controls, only set top-level properties to Leva's UI initially.
            // The nested folder data is in our store and used by the app.
            const topLevelDataForLeva: Record<string, any> = {};
            for (const key in finalValuesForStore) {
              if (finalValuesForStore.hasOwnProperty(key) && typeof finalValuesForStore[key] !== 'object') {
                topLevelDataForLeva[key] = finalValuesForStore[key];
              }
            }
            // Also explicitly add the folder key itself, but with its original (potentially schema default) nested structure if Leva needs the key present.
            // Or, if Leva creates the folder UI from schema, we only need to set top-level flat values it can handle.
            // Let's try setting only recognized top-level flat values.
            // We will NOT include the 'fadeInAnimationConfig' key or its flattened children here for the setter.
            
            // Create a truly flat object for Leva's setter, containing only non-object properties from finalValuesForStore
            const minimalFlatDataForLeva: Record<string, any> = {};
            Object.keys(finalValuesForStore).forEach(key => {
              if (typeof finalValuesForStore[key] !== 'object' || finalValuesForStore[key] === null) {
                minimalFlatDataForLeva[key] = finalValuesForStore[key];
              }
            });

            console.log(`[LevaStore registerControls - "${folderName}"] Syncing ONLY TOP-LEVEL store values to Leva panel:`, JSON.parse(JSON.stringify(minimalFlatDataForLeva)));
            if (Object.keys(minimalFlatDataForLeva).length > 0) {
                setTimeout(() => { 
                  setter(minimalFlatDataForLeva);
                }, 0);
            } else {
                console.log(`[LevaStore registerControls - "${folderName}"] No top-level values to set for element control, or finalValuesForStore was empty.`);
            }
          } else {
            // For non-element folders, proceed with setting Leva's UI using flattened data.
            const dataForLeva = flattenDataForLevaSetter(finalValuesForStore, schema);
            console.log(`[LevaStore registerControls - "${folderName}"] Syncing store to Leva panel. Flattened data for Leva:`, JSON.parse(JSON.stringify(dataForLeva)));
            setTimeout(() => { 
              setter(dataForLeva);
            }, 0);
          }
        } else {
            console.warn(`[LevaStore registerControls - "${folderName}"] Leva setter not provided during registration.`);
        }
      });
    },

    updateControlValues: (folderName, newValues) => {
      set((state) => {
        if (!state.controlValues[folderName]) {
          console.warn(`[LevaStore updateControlValues] Folder "${folderName}" not found in controlValues. Initializing.`);
          state.controlValues[folderName] = {}; 
        }
        if (!state.initialControlValues[folderName]) {
          console.warn(`[LevaStore updateControlValues] Folder "${folderName}" not found in initialControlValues. This should not happen if registration is correct.`);
          const schema = state.schemas[folderName];
          let schemaDefaults: Record<string, any> = {}; 
          if (schema) {
            Object.keys(schema).forEach(key => {
              const schemaEntry = schema[key]; 
              // Updated type check for LevaControlSchemaItem
              if (schemaEntry && typeof schemaEntry === 'object' && 'value' in schemaEntry && (schemaEntry as any).type !== 'FOLDER') {
                schemaDefaults[key] = (schemaEntry as LevaControlSchemaItem).value;
              }
            });
          }
          state.initialControlValues[folderName] = schemaDefaults;
        }
        if (!state.changedKeys[folderName]) {
          state.changedKeys[folderName] = new Set<string>();
        }

        state.controlValues[folderName] = deepMerge(state.controlValues[folderName] || {}, newValues);

        const flatCurrent = flattenObject(state.controlValues[folderName]);
        const flatInitial = flattenObject(state.initialControlValues[folderName]);
        
        Object.keys(flatCurrent).forEach(key => {
          if (flatCurrent[key] !== flatInitial[key]) {
            state.changedKeys[folderName].add(key);
          } else {
            state.changedKeys[folderName].delete(key);
          }
        });
         console.log(`[LevaStore updateControlValues - "${folderName}"] Values updated:`, JSON.parse(JSON.stringify(state.controlValues[folderName])), `Changed keys: ${Array.from(state.changedKeys[folderName])}`);
      });
    },

    getSettingsForSave: () => {
      const state = get();
      const settingsToSave: { [folderName: string]: Record<string, any> } = {};
      for (const folderName in state.controlValues) {
        const schema = state.schemas[folderName]; 
        settingsToSave[folderName] = unNestFolders(state.controlValues[folderName], schema);
      }
      console.log('[LevaStore getSettingsForSave] Settings prepared for saving (flattened):', settingsToSave);
      return settingsToSave;
    },

    loadSettingsFromDB: (settings) => {
      console.log('[LevaStore] loadSettingsFromDB CALLED with:', settings);
      set((state) => {
        const newRawDbSettings: { [folderName: string]: Record<string, any> } = {};
        for (const oldFolderName in settings) {
          // Attempt to parse old folder name to generate new simplified name
          // This logic needs to be robust enough to handle various old naming patterns
          // and match the new simplified naming convention used in GuestExperience.jsx
          let newFolderName = oldFolderName;
          const match = oldFolderName.match(/^Element\s(\d+)\s\(([^)]+)\)$/);
          const componentMatch = oldFolderName.match(/^(Overall Controls \(Guest\)|Dynamic Background Gradient|RSVP Form Style|Scrapbook Layout \(Guest\))$/);

          if (match && match[1] && match[2]) {
            const id = match[1];
            const nameOrType = match[2];
            // Replicate the simplification logic from GuestExperience.jsx
            // This is a simplified assumption; GuestExperience might have more complex logic
            // if element.type was used when name wasn't present.
            // For now, assume name was always present in the old complex key if it had parentheses.
            const simplifiedNameOrType = nameOrType.replace(/\s+/g, '_');
            newFolderName = `element_${id}_${simplifiedNameOrType}`;
          } else if (componentMatch) {
            // For known, static folder names, keep them as is (or simplify if needed)
            // For now, assume these names don't need to change or are already simple enough
            newFolderName = oldFolderName; // Or apply a specific simplification if their registration also changed
          } else {
            // Fallback for any other folder names not matching the patterns
            // This might include new controls or ones that don't follow the element pattern
            console.warn(`[LevaStore loadSettingsFromDB] Unrecognized folder name pattern: "${oldFolderName}". Using as is or consider specific transformation.`);
            // newFolderName = oldFolderName; // Or apply a default simplification
          }
          newRawDbSettings[newFolderName] = settings[oldFolderName];
        }
        state.rawDbSettings = newRawDbSettings;
        console.log('[LevaStore loadSettingsFromDB] Raw DB settings stored (with potentially transformed keys):', JSON.parse(JSON.stringify(state.rawDbSettings)));

        Object.keys(state.schemas).forEach(folderName => {
          const schema = state.schemas[folderName];
          const setter = state.levaSetters[folderName];
          const rawFolderSettingsFromDB = state.rawDbSettings[folderName];

          if (schema && setter && rawFolderSettingsFromDB) {
            console.log(`[LevaStore loadSettingsFromDB - PostProcessing] Re-applying settings for already registered folder: "${folderName}"`);
            
            const initialValuesFromLevaSchema: Record<string, any> = {};
            Object.entries(schema).forEach(([key, schemaEntryUntyped]) => {
                const schemaEntry = schemaEntryUntyped as LevaControlSchemaItem | LevaSchemaFolder; // Keep this cast for clarity of intent
                // Updated type check for LevaControlSchemaItem vs LevaSchemaFolder
                if (typeof schemaEntry === 'object' && schemaEntry !== null && 'value' in schemaEntry && (schemaEntry as any).type !== 'FOLDER') {
                    initialValuesFromLevaSchema[key] = (schemaEntry as LevaControlSchemaItem).value;
                } else if (typeof schemaEntry === 'object' && schemaEntry !== null && (schemaEntry as any).type === 'FOLDER' && 'schema' in schemaEntry) {
                    const subSchema = (schemaEntry as LevaSchemaFolder).schema; // Safe to cast here
                    const subDefaults: Record<string, any> = {};
                    Object.entries(subSchema).forEach(([subKey, subSchemaEntryUntypedFromSub]) => {
                        const subSchemaEntry = subSchemaEntryUntypedFromSub as LevaControlSchemaItem | LevaSchemaFolder;
                        if (typeof subSchemaEntry === 'object' && subSchemaEntry !== null && 'value' in subSchemaEntry && (subSchemaEntry as any).type !== 'FOLDER') {
                            subDefaults[subKey] = (subSchemaEntry as LevaControlSchemaItem).value;
                        }
                    });
                    initialValuesFromLevaSchema[key] = subDefaults;
                }
            });

            const transformedDbSettings = transformFlatToNested(rawFolderSettingsFromDB, schema);
            const finalValuesForStore = deepMerge(initialValuesFromLevaSchema, transformedDbSettings);

            state.controlValues[folderName] = { ...finalValuesForStore };
            state.initialControlValues[folderName] = { ...finalValuesForStore };
            state.changedKeys[folderName] = new Set<string>();
            
            if (folderName.startsWith("element_")) {
              console.log(`[LevaStore loadSettingsFromDB - PostProcessing "${folderName}"] Skipping Leva setter call for element-specific control as app uses store values directly.`);
              // No setter call for element_ folders in post-processing either for consistency
            } else {
              // For non-element folders, proceed with setting Leva's UI.
              const dataForLevaPostProcessing = flattenDataForLevaSetter(finalValuesForStore, schema);
              console.log(`[LevaStore loadSettingsFromDB - PostProcessing "${folderName}"] Calling Leva setter with re-processed DB values (flattened):`, JSON.parse(JSON.stringify(dataForLevaPostProcessing)));
              setTimeout(() => { 
                setter(dataForLevaPostProcessing);
              }, 0);
            }
          } else {
             if (!rawFolderSettingsFromDB) {
                // console.log(`[LevaStore loadSettingsFromDB - PostProcessing] No raw DB settings for already registered folder: "${folderName}". Skipping re-application.`);
             }
             // if (!schema || !setter) console.log(`[LevaStore loadSettingsFromDB - PostProcessing] Schema or setter missing for "${folderName}". Skipping re-application.`);
          }
        });
      });
    },

    getDisplayDataForHUD: () => {
      const state = get();
      const displayData = [];
      for (const folderName in state.controlValues) {
        const schema = state.schemas[folderName];
        const flatCurrentValues = flattenObject(state.controlValues[folderName]);
        const flatInitialValues = flattenObject(state.initialControlValues[folderName]);

        for (const key in flatCurrentValues) {
          let label = key;
          const keyParts = key.split('.');
          let currentSchemaLevel: LevaFolderSchema | LevaControlSchemaItem | LevaSchemaFolder | undefined = schema; 
          for (let i = 0; i < keyParts.length; i++) {
            const part = keyParts[i];
            if (currentSchemaLevel && typeof currentSchemaLevel === 'object' && part in currentSchemaLevel) {
              currentSchemaLevel = (currentSchemaLevel as Record<string, LevaControlSchemaItem | LevaSchemaFolder>)[part]; 
              // Updated type check for LevaControlSchemaItem vs LevaSchemaFolder
              if (i === keyParts.length - 1 && typeof currentSchemaLevel === 'object' && currentSchemaLevel !== null && 'label' in currentSchemaLevel && (currentSchemaLevel as any).type !== 'FOLDER') {
                label = (currentSchemaLevel as LevaControlSchemaItem).label || label;
              } else if (typeof currentSchemaLevel === 'object' && currentSchemaLevel !== null && (currentSchemaLevel as any).type === 'FOLDER' && 'schema' in currentSchemaLevel){
                if (i < keyParts.length -1) {
                    currentSchemaLevel = (currentSchemaLevel as LevaSchemaFolder).schema; // Safe to cast here
                } 
              }
            } else {
              break; 
            }
          }
          
          const value = flatCurrentValues[key];
          const isChanged = state.changedKeys[folderName]?.has(key) || flatCurrentValues[key] !== flatInitialValues[key];
          displayData.push({ folderName, key, label, value, isChanged });
        }
      }
      return displayData;
    },

    saveSettingsToServer: async (weddingId: string, viewType: 'desktop' | 'mobile') => {
      const settings = get().getSettingsForSave(); 
      const apiBase = getApiBaseUrl();
      const endpoint = `${apiBase}/weddings/${weddingId}/experience-settings/${viewType}`;
      try {
        console.log(`[LevaStore saveSettingsToServer] Saving to ${endpoint}:`, settings);
        await axios.post(endpoint, { settings }); 
        console.log('[LevaStore saveSettingsToServer] Settings saved successfully.');
        set(state => {
          Object.keys(state.changedKeys).forEach(folderName => {
            state.changedKeys[folderName] = new Set<string>();
          });
          Object.keys(state.controlValues).forEach(folderName => {
            state.initialControlValues[folderName] = JSON.parse(JSON.stringify(state.controlValues[folderName])); 
          });
        });

      } catch (error) {
        console.error('[LevaStore saveSettingsToServer] Error saving settings:', error);
        throw error; 
      }
    },

    loadSettingsFromServer: async (weddingId: string, viewType: 'desktop' | 'mobile') => {
      const apiBase = getApiBaseUrl();
      const endpoint = `${apiBase}/weddings/${weddingId}/experience-settings/${viewType}`;
      try {
        console.log(`[LevaStore loadSettingsFromServer] Loading from ${endpoint}`);
        const response = await axios.get(endpoint);
        if (response.data && response.data.settings) {
          console.log('[LevaStore loadSettingsFromServer] Settings loaded:', response.data.settings);
          get().loadSettingsFromDB(response.data.settings);
        } else {
          console.log('[LevaStore loadSettingsFromServer] No settings found on server or unexpected format.');
           set(state => { state.rawDbSettings = {}; });
        }
      } catch (error) {
        // @ts-ignore
        if (error.response && error.response.status === 404) {
          console.log('[LevaStore loadSettingsFromServer] No settings found on server (404). Clearing raw DB settings.');
           set(state => { state.rawDbSettings = {}; }); 
        } else {
          console.error('[LevaStore loadSettingsFromServer] Error loading settings:', error);
          throw error; 
        }
      }
    },
  }))
); 