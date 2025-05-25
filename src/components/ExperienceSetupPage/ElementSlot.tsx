import React, { useState, useCallback, ChangeEvent } from 'react';
import { ElementConfig } from './ExperienceSetupPage'; // Import the interface
// import RSVPForm from './RSVPForm'; // Example existing component

// If you have RSVPForm.tsx, ensure it's a default export or named export
// For this example, let's assume it's a simple placeholder:
const RSVPFormPlaceholder: React.FC = () => <div style={{border: '1px dashed blue', padding: '10px'}}>RSVP Form Component</div>;


interface ElementSlotProps {
  element: ElementConfig;
  onUpdate: (newConfig: Partial<Omit<ElementConfig, 'id' | 'timelineColor'>>) => void;
  onRemove: () => void; // To set element back to 'empty'
}

const ElementSlot: React.FC<ElementSlotProps> = ({ element, onUpdate, onRemove }) => {
  const [textContent, setTextContent] = useState<string>(element.type === 'text' && typeof element.content === 'string' ? element.content : '');
  const [selectedFile, setSelectedFile] = useState<File | null>(element.type === 'photo' && element.content instanceof File ? element.content : null);
  const [filePreview, setFilePreview] = useState<string | null>(element.type === 'photo' && typeof element.content === 'string' ? element.content : null);

  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as ElementConfig['type'];
    setTextContent('');
    setSelectedFile(null);
    setFilePreview(null);

    if (newType === 'empty') {
        onRemove(); // This will also handle removing markers
    } else if (newType === 'component') {
        // For simplicity, let's assume one specific component for now or a selector
        onUpdate({ type: newType, content: RSVPFormPlaceholder, name: 'RSVPForm' });
    }
    else {
        onUpdate({ type: newType, content: null, name: undefined }); // Clear content for text/photo initially
    }
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
        onUpdate({ type: 'photo', content: reader.result as string, name: file.name }); // Store Data URL or upload and store URL
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextSubmit = () => {
    if (textContent.trim()) {
      onUpdate({ type: 'text', content: textContent, name: `Text: ${textContent.substring(0,15)}...` });
    }
  };

  const handleRemoveContent = () => {
    onRemove(); // This calls the onUpdate with 'empty' type from the parent
    setTextContent('');
    setSelectedFile(null);
    setFilePreview(null);
  };

  return (
    <div style={{ borderLeft: `5px solid ${element.timelineColor}`, paddingLeft: '10px', minHeight: '100px' }}>
      <h5>Element Slot {element.id} (Z-Index Priority: {element.id === 0 ? 'Highest' : element.id})</h5>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
        <label>Type:</label>
        <select value={element.type} onChange={handleTypeChange}>
          <option value="empty">Pick Element {element.id}</option>
          <option value="photo">Photo</option>
          <option value="text">Text</option>
          <option value="component">Component (e.g., RSVPForm)</option>
        </select>
        {element.type !== 'empty' && (
            <button onClick={handleRemoveContent} style={{marginLeft: 'auto', color: 'red'}}>Clear</button>
        )}
      </div>

      {element.type === 'empty' && <p style={{color: '#888'}}>Placeholder: Pick Element {element.id}</p>}

      {element.type === 'photo' && (
        <div>
          <input type="file" accept="image/*" onChange={handlePhotoUpload} />
          {filePreview && <img src={filePreview} alt={element.name || "Preview"} style={{ maxWidth: '100px', maxHeight: '100px', marginTop: '10px' }} />}
          {element.name && <p style={{fontSize: '0.8em', color: '#555'}}>File: {element.name}</p>}
        </div>
      )}

      {element.type === 'text' && (
        <div>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Enter your text"
            rows={3}
            style={{width: '90%', marginBottom: '5px'}}
          />
          <button onClick={handleTextSubmit}>Submit Text</button>
          {element.content && typeof element.content === 'string' && <p style={{fontSize: '0.8em', color: '#555'}}>Saved: {element.content.substring(0,50)}...</p>}
        </div>
      )}

      {element.type === 'component' && element.name === 'RSVPForm' && (
        <div>
          <p>Component: <strong>RSVPForm</strong></p>
          {/* Render a static representation or props config for the component */}
          <RSVPFormPlaceholder />
        </div>
      )}
       {element.type === 'component' && typeof element.content === 'function' && (
         <div>
            <p>Component: <strong>{element.name || 'Custom Component'}</strong></p>
            {React.createElement(element.content as React.ComponentType<any>)}
         </div>
       )}
    </div>
  );
};

export default ElementSlot; 