import { useRef, useEffect } from 'react';
import { useControls as useLevaControls } from 'leva';
import { useLevaStore, LevaFolderSchema } from '../stores/levaStore';
import React from 'react';

// Helper to shallow compare two objects
function shallowCompare(obj1: Record<string, any> | undefined, obj2: Record<string, any> | undefined): boolean {
  if (obj1 === undefined && obj2 === undefined) return true;
  if (obj1 === undefined || obj2 === undefined) return false;
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  return true;
}

// Custom hook to track changed Leva controls
// Keeping it simple for now, will cast where needed.
export function useTrackedControls(folderName: string, schema: LevaFolderSchema, options?: object) {
  console.log(`[useTrackedControls] Hook called for folder: ${folderName}`);

  const registerControls = useLevaStore(state => state.registerControls);
  const updateControlValues = useLevaStore(state => state.updateControlValues);
  const storeFolderValues = useLevaStore(state => state.controlValues[folderName]); // Get current values from store

  const memoizedSchemaFn = React.useCallback(() => schema, [schema]);
  const [levaValues, levaSet] = useLevaControls(folderName, memoizedSchemaFn, options, [folderName]);

  const isRegisteredRef = useRef(false);
  // prevLevaValuesRef is no longer the primary source for comparison against current levaValues for store updates.
  // We will now compare levaValues directly against storeFolderValues.
  // However, it's still useful for the registration logic to pass the *initial* levaValues.
  const initialLevaValuesRef = useRef<Record<string, any> | undefined>(undefined);


  // Effect for Registration
  useEffect(() => {
    console.log(`[useTrackedControls] Registration effect for ${folderName} - isRegistered: ${isRegisteredRef.current}`);
    if (!isRegisteredRef.current) {
      // Capture the very first levaValues for registration
      initialLevaValuesRef.current = { ...levaValues }; 
      console.log(`[useTrackedControls] REGISTERING ${folderName} with initial Leva values:`, JSON.stringify(initialLevaValuesRef.current));
      registerControls(folderName, schema, initialLevaValuesRef.current, levaSet);
      isRegisteredRef.current = true;
      console.log(`[useTrackedControls] ${folderName} REGISTRATION COMPLETE.`);
    }
  }, [folderName, schema, levaSet, registerControls, levaValues]); // levaValues included here to get initial values for registration

  // Effect for Updating store from Leva changes
  useEffect(() => {
    console.log(`[useTrackedControls] Update effect for ${folderName} - isRegistered: ${isRegisteredRef.current}`);
    if (!isRegisteredRef.current) {
      console.log(`[useTrackedControls] Update effect for ${folderName} - SKIPPING (not registered yet)`);
      return;
    }

    // Compare current levaValues with the values already in the Zustand store for this folder
    const storeValuesForFolder = useLevaStore.getState().controlValues[folderName];
    const areLevaValuesDifferentFromStore = !shallowCompare(storeValuesForFolder, levaValues);
    
    console.log(`[useTrackedControls] Update effect for ${folderName}. Leva: ${JSON.stringify(levaValues)}, Store: ${JSON.stringify(storeValuesForFolder)}, Different?: ${areLevaValuesDifferentFromStore}`);

    if (areLevaValuesDifferentFromStore) {
      console.log(`[useTrackedControls] Leva values for ${folderName} are different from store. Updating store.`);
      updateControlValues(folderName, levaValues);
    } else {
      console.log(`[useTrackedControls] Leva values for ${folderName} are SAME as store. Skipping store update.`);
    }
    // The main dependency driving this effect is levaValues.
    // We also include folderName and updateControlValues for completeness, though they should be stable.
  }, [levaValues, folderName, updateControlValues]);


  const storeFolderChangedKeys = useLevaStore(state => state.changedKeys[folderName]);
  return {
    values: storeFolderValues || {}, // Return values from the store
    changedKeys: storeFolderChangedKeys || new Set<string>(),
    set: levaSet,
  };
} 