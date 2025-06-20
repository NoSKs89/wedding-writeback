import React, { useEffect, useMemo } from 'react';
import { useControls } from 'leva';
import { useLevaStore } from '../../stores/levaStore';
import { rsvpFormControlsSchema } from '../RSVPForm';
import { scrapbookLayoutControlsSchema } from './InteractiveScrapbook';

interface ControlWrapperProps {
  layoutSettingsFromPreview?: any;
}

export const RsvpControlWrapper: React.FC<ControlWrapperProps> = ({ layoutSettingsFromPreview }) => {
  const folderName = 'RSVP Form Style';
  const getInitialValues = useLevaStore(state => state.controlValues[folderName]);
  const updateControlValuesInStore = useLevaStore(state => state.updateControlValues);

  const controlsSchema = useMemo(() => {
    const schema = rsvpFormControlsSchema;
    const initialValues = getInitialValues || {};
    const schemaWithValues = Object.keys(schema).reduce((acc, key) => {
        const a = schema as any;
        const b = initialValues as any;
        acc[key] = { ...a[key], value: b[key] ?? a[key].value };
        return acc;
    }, {} as { [key: string]: any });
    return schemaWithValues;
  }, [getInitialValues]);

  const levaValues = useControls(folderName, controlsSchema, { collapsed: true }, [controlsSchema]);
  
  const values = layoutSettingsFromPreview ? layoutSettingsFromPreview[folderName] || {} : levaValues;

  useEffect(() => {
    if (!layoutSettingsFromPreview) {
      updateControlValuesInStore(folderName, values);
    }
  }, [values, folderName, updateControlValuesInStore, layoutSettingsFromPreview]);

  return null; // This component only renders controls in the Leva panel
};

export const ScrapbookControlWrapper: React.FC<ControlWrapperProps> = ({ layoutSettingsFromPreview }) => {
  const folderName = 'Scrapbook Layout (Guest)';
  const getInitialValues = useLevaStore(state => state.controlValues[folderName]);
  const updateControlValuesInStore = useLevaStore(state => state.updateControlValues);

  const controlsSchema = useMemo(() => {
    const schema = scrapbookLayoutControlsSchema;
    const initialValues = getInitialValues || {};
    const schemaWithValues = Object.keys(schema).reduce((acc, key) => {
        const a = schema as any;
        const b = initialValues as any;
        acc[key] = { ...a[key], value: b[key] ?? a[key].value };
        return acc;
    }, {} as { [key: string]: any });
    return schemaWithValues;
  }, [getInitialValues]);

  const levaValues = useControls(folderName, controlsSchema, { collapsed: true }, [controlsSchema]);
  
  const values = layoutSettingsFromPreview ? layoutSettingsFromPreview[folderName] || {} : levaValues;

  useEffect(() => {
    if (!layoutSettingsFromPreview) {
      updateControlValuesInStore(folderName, values);
    }
  }, [values, folderName, updateControlValuesInStore, layoutSettingsFromPreview]);

  return null; // This component only renders controls in the Leva panel
}; 