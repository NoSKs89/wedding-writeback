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
    memoizedSchemaFn, 
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
    const levaChangedFromInitial = !shallowCompare(levaValues, initialSchemaValuesRef.current);
    const levaDifferentFromStore = !shallowCompare(levaValues, storeFolderValues);

    if (levaChangedFromInitial && levaDifferentFromStore) {
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

  useEffect(() => {
    if (!isRegisteredRef.current || !initialSchemaValuesRef.current) {
      return;
    }
    if (storeFolderValues && Object.keys(storeFolderValues).length > 0 && !shallowCompare(storeFolderValues, levaValues)) {
      // console.log(`[useTrackedControls "${folderName}"] Store->Leva: Store values differ from Leva. Updating Leva panel.`, 
      //   { 
      //     storeValues: JSON.stringify(storeFolderValues), 
      //     levaCurrentValues: JSON.stringify(levaValues) 
      //   }
      // );
      levaSetRef.current(storeFolderValues);
    }
  }, [storeFolderValues, folderName, initialSchemaValuesRef.current]);

  const storeFolderChangedKeys = useLevaStore(state => state.changedKeys[folderName]);

  return {
    values: storeFolderValues || initialSchemaValuesRef.current || {},
    store: levaStoreRef,
    schema,
    folderName,
    changed: storeFolderChangedKeys ? Array.from(storeFolderChangedKeys) : [],
    initialSchemaValues: initialSchemaValuesRef.current
  };
} 