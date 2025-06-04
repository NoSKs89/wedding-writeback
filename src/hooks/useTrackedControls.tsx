import React, { useEffect, useRef, useCallback } from 'react';
import { useControls as useLevaControls } from 'leva';
import { useLevaStore, LevaFolderSchema } from '../stores/levaStore';

// Helper function for shallow comparison of two objects
function shallowCompare(obj1: Record<string, any> | undefined, obj2: Record<string, any> | undefined): boolean {
  if (!obj1 && !obj2) return true;
  if (!obj1 || !obj2) return false;
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (!obj2.hasOwnProperty(key) || obj1[key] !== obj2[key]) return false;
  }
  return true;
}

export function useTrackedControls(folderName: string, schema: LevaFolderSchema, options?: object) {
  // console.log(`[useTrackedControls] INIT for folder: "${folderName}"`);

  const registerControls = useLevaStore(state => state.registerControls);
  const updateControlValuesInStore = useLevaStore(state => state.updateControlValues);
  const storeFolderValues = useLevaStore(state => state.controlValues[folderName]);
  const levaStoreRef = useLevaStore(state => state);

  const memoizedSchemaFn = useCallback(() => schema, [JSON.stringify(schema)]);
  
  const [levaValues, levaSet]: [Record<string, any>, (settings: Record<string, any>) => void, any?] = useLevaControls(
    folderName, 
    memoizedSchemaFn as () => any,
    options
  );

  const isRegisteredRef = useRef(false);
  const initialSchemaValuesRef = useRef<Record<string, any> | undefined>(undefined);
  const levaSetRef = useRef(levaSet);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    levaSetRef.current = levaSet;
  }, [levaSet]);

  useEffect(() => {
    if (initialSchemaValuesRef.current === undefined && levaValues && Object.keys(levaValues).length > 0) {
      let hasNonUndefinedValues = false;
      for (const key in levaValues) {
        if (levaValues[key] !== undefined) {
          hasNonUndefinedValues = true;
          break;
        }
      }
      if (hasNonUndefinedValues) {
        initialSchemaValuesRef.current = { ...levaValues };
        // console.log(`[useTrackedControls "${folderName}"] Set initialSchemaValuesRef.current:`, JSON.stringify(initialSchemaValuesRef.current));
      }
    }
  }, [levaValues, folderName]);

  useEffect(() => {
    if (!isRegisteredRef.current && initialSchemaValuesRef.current) {
      // console.log(`[useTrackedControls "${folderName}"] Calling registerControls in LevaStore.`);
      registerControls(folderName, schema, initialSchemaValuesRef.current, levaSetRef.current);
      isRegisteredRef.current = true;
    } else if (!initialSchemaValuesRef.current) {
    }
  }, [folderName, schema, registerControls, initialSchemaValuesRef.current]);

  useEffect(() => {
    if (!isRegisteredRef.current || !initialSchemaValuesRef.current) {
      return;
    }
    const levaDifferentFromStore = !shallowCompare(levaValues, storeFolderValues);

    if (levaDifferentFromStore) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        // console.log(`[useTrackedControls] Leva->Store (debounced): Updating store for ${folderName}.`);
        updateControlValuesInStore(folderName, levaValues);
      }, 300);
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [levaValues, storeFolderValues, folderName, updateControlValuesInStore]);

  // useEffect(() => {
  //   if (!isRegisteredRef.current || !initialSchemaValuesRef.current) {
  //     return;
  //   }
  //   // Only attempt to sync store to Leva if the folderName does NOT start with "element_"
  //   // This is a workaround for the persistent "path" error with dynamically generated nested schemas.
  //   // Temporarily commenting out this entire effect to see if it resolves all path errors.
  //   // if (!folderName.startsWith("element_")) { 
  //   //   if (storeFolderValues && Object.keys(storeFolderValues).length > 0 && !shallowCompare(storeFolderValues, levaValues)) {
  //   //     console.log(`[useTrackedControls "${folderName}"] Store->Leva: Store values differ from Leva. Updating Leva panel.`, 
  //   //       { 
  //   //         storeValues: JSON.stringify(storeFolderValues), 
  //   //         levaCurrentValues: JSON.stringify(levaValues) 
  //   //       }
  //   //     );
  //   //     levaSetRef.current(storeFolderValues);
  //   //   }
  //   // }
  // }, [storeFolderValues, levaValues, folderName, initialSchemaValuesRef.current]); 

  const storeFolderChangedKeys = useLevaStore(state => state.changedKeys[folderName]);

  // Construct the final values, ensuring nested objects like textSpreadConfig are correctly sourced
  let finalValuesToReturn = storeFolderValues || initialSchemaValuesRef.current || {};

  if (folderName.startsWith("element_") && levaValues && schema) {
    // If it's an element control, Leva might be providing flat updates for nested structures.
    // We need to ensure the structure expected by ElementWrapper (e.g., with a textSpreadConfig object)
    // is correctly assembled from the latest Leva values or merged with store values.

    const reconstructedValues: Record<string, any> = {};
    for (const key in schema) {
      const schemaEntry = schema[key];
      if (typeof schemaEntry === 'object' && (schemaEntry as any).type === 'FOLDER' && (schemaEntry as any).schema) {
        // It's a folder like textSpreadConfig
        reconstructedValues[key] = {};
        const subSchema = (schemaEntry as any).schema;
        for (const subKey in subSchema) {
          // Try to get value from Leva's flat path first, e.g., levaValues["textSpreadConfig.letterSpacingAtAnimStart"]
          // Leva's actual keys might be just "letterSpacingAtAnimStart" if the folder is top-level in its own useControls call
          // OR it might be prefixed if the folder is part of a larger schema passed to a single useControls.
          // For useTrackedControls, levaValues are the direct output for THAT folderName.
          // So, if folderName is "element_1_Bride_Name", and schema has "textSpreadConfig" (folder),
          // levaValues *should* have a "textSpreadConfig" object if Leva is handling it as a nested structure.
          // If Leva flattens it in its output (e.g. levaValues["textSpreadConfig.someValue"]), that's an issue.
          
          // Let's assume levaValues for a folder *contains* the folder object if schema indicates a folder
          if (levaValues[key] && typeof levaValues[key] === 'object' && levaValues[key].hasOwnProperty(subKey)) {
            reconstructedValues[key][subKey] = levaValues[key][subKey];
          } else if (storeFolderValues && storeFolderValues[key] && typeof storeFolderValues[key] === 'object' && storeFolderValues[key].hasOwnProperty(subKey)) {
            reconstructedValues[key][subKey] = storeFolderValues[key][subKey];
          } else {
            reconstructedValues[key][subKey] = (subSchema[subKey] as any)?.value; // Default from schema
          }
        }
      } else {
        // It's a top-level control in this folder's schema
        if (levaValues.hasOwnProperty(key)) {
          reconstructedValues[key] = levaValues[key];
        } else if (storeFolderValues && storeFolderValues.hasOwnProperty(key)) {
          reconstructedValues[key] = storeFolderValues[key];
        } else {
          reconstructedValues[key] = (schemaEntry as any)?.value; // Default from schema
        }
      }
    }
    finalValuesToReturn = reconstructedValues;
  }

  return {
    values: finalValuesToReturn,
    store: levaStoreRef,
    schema,
    folderName,
    changed: storeFolderChangedKeys ? Array.from(storeFolderChangedKeys) : [],
    initialSchemaValues: initialSchemaValuesRef.current
  };
} 