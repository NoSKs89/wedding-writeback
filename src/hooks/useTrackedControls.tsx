import { useRef, useState, useEffect } from 'react';
import { useControls as useLevaControls } from 'leva';

// Custom hook to track changed Leva controls
// Keeping it simple for now, will cast where needed.
export function useTrackedControls(folderName: string, schema: any, options?: object) {
  const [values, set] = useLevaControls(folderName, () => schema, options, [schema]);
  const initialValues = useRef(values);
  const [changedKeys, setChangedKeys] = useState(new Set<string>());

  useEffect(() => {
    const newChanged = new Set<string>();
    if (Object.keys(initialValues.current).length === 0 && Object.keys(values).length > 0) {
        initialValues.current = values;
    }
    for (const key in values) {
      if (initialValues.current.hasOwnProperty(key)) {
        if (values[key] !== initialValues.current[key]) {
          newChanged.add(key);
        }
      }
    }
    setChangedKeys(newChanged);
  }, [values]);

  useEffect(() => {
    initialValues.current = values;
  }, [Object.keys(values).join(',')]);

  return { values, changedKeys, set };
} 