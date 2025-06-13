import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useControls } from 'leva';
import { useLevaStore, LevaFolderSchema } from '../stores/levaStore';
import { useDebounce } from 'use-debounce';

// Helper function for deep comparison of two objects
function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  return true;
}

export function useTrackedControls(folderName: string, schema: LevaFolderSchema, options?: object) {
  const registerControls = useLevaStore(state => state.registerControls);
  const updateControlValuesInStore = useLevaStore(state => state.updateControlValues);
  const storeFolderValues = useLevaStore(state => state.controlValues[folderName]);
  const levaStoreRef = useLevaStore(state => state);

  // Using JSON.stringify here can still be risky if key order changes.
  // A more robust solution might involve a deep-hashing function if schemas become dynamic.
  const memoizedSchemaFn = useCallback(() => schema, [JSON.stringify(schema)]);
  
  const [levaValues, levaSet] = useControls(
    folderName, 
    memoizedSchemaFn as () => any,
    options
  );

  const [debouncedLevaValues] = useDebounce(levaValues, 500);
  const isMounted = useRef(false);

  // Keep a stable reference to levaSet to use in effects without causing re-runs.
  const levaSetRef = useRef(levaSet);
  useEffect(() => {
    levaSetRef.current = levaSet;
  }, [levaSet]);

  useEffect(() => {
    // Sync from Store -> Leva UI
    // Run only when store values change. Using deepEqual is more reliable.
    if (storeFolderValues && !deepEqual(storeFolderValues, levaValues)) {
      levaSetRef.current(storeFolderValues);
    }
    // Dependency array is now stable and only depends on the data.
  }, [storeFolderValues, levaValues]);

  useEffect(() => {
    // Sync from Leva UI -> Store (debounced)
    // The isMounted ref correctly prevents this on the initial render.
    if (isMounted.current) {
      // Use a reliable deepEqual to prevent echo updates.
      if (!deepEqual(debouncedLevaValues, storeFolderValues)) {
        updateControlValuesInStore(folderName, debouncedLevaValues);
      }
    } else {
      isMounted.current = true;
    }
    // This effect should only depend on the debounced values and the store values for comparison.
  }, [debouncedLevaValues, storeFolderValues, folderName, updateControlValuesInStore]);

  const initialSchemaValuesRef = useRef<Record<string, any> | undefined>(undefined);

  useEffect(() => {
    if (initialSchemaValuesRef.current === undefined && levaValues && Object.keys(levaValues).length > 0) {
      // Check for any non-undefined value to ensure Leva has initialized.
      if (Object.values(levaValues).some(v => v !== undefined)) {
        initialSchemaValuesRef.current = { ...levaValues };
      }
    }
  }, [levaValues]);

  // This effect for registration should only run once after initial values are captured.
  useEffect(() => {
    if (initialSchemaValuesRef.current) {
      // Pass the stable levaSetRef.current instead of the raw levaSet function.
      registerControls(folderName, schema, initialSchemaValuesRef.current, levaSetRef.current);
    }
    // Using a simple stringified dependency is okay for registration as it should be stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderName, registerControls, initialSchemaValuesRef.current, JSON.stringify(schema)]);

  // Memoize the final returned values to prevent unnecessary re-renders downstream.
  const finalValuesToReturn = useMemo(() => {
    // If there are no values in the store yet, use the initial default values from Leva.
    const baseValues = storeFolderValues || initialSchemaValuesRef.current || {};
    
    // The reconstruction logic seems specific to `element_` folders.
    // Keep it, but ensure it's memoized.
    if (folderName.startsWith("element_") && schema) {
      const reconstructedValues: Record<string, any> = {};
      for (const key in schema) {
        // This logic merges values from Leva, the store, and schema defaults.
        // It's complex but now memoized.
        reconstructedValues[key] = levaValues[key] ?? storeFolderValues?.[key] ?? (schema[key] as any)?.value;
      }
      return reconstructedValues;
    }
    
    return baseValues;
  }, [folderName, levaValues, schema, storeFolderValues]);

  const storeFolderChangedKeys = useLevaStore(state => state.changedKeys[folderName]);

  return {
    values: finalValuesToReturn,
    store: levaStoreRef,
    schema,
    folderName,
    changed: storeFolderChangedKeys ? Array.from(storeFolderChangedKeys) : [],
    initialSchemaValues: initialSchemaValuesRef.current
  };
} 