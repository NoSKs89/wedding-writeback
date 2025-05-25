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

  // Styles for the select dropdown
  const selectContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
  };

  const selectStyle: React.CSSProperties = {
    appearance: 'none', // Remove default browser styling
    backgroundColor: '#f0f0f0',
    border: '1px solid #ccc',
    padding: '6px 30px 6px 10px', // Increased right padding (30px) for text, left padding (10px)
    borderRadius: '4px',
    fontSize: '0.85rem', // Slightly smaller font
    cursor: 'pointer',
    minWidth: '120px', // Reduced min-width
    maxWidth: '160px', // Reduced max-width
    backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center', // Keep arrow a bit from the edge
    backgroundSize: '8px', // Adjusted arrow size
    color: '#333',
    outline: 'none',
  };

  const recommendedTextStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: '#777',
    fontStyle: 'italic',
    marginTop: '5px',
  };

  let recommendedText = null;
  if (element.id === 1) {
    recommendedText = "Recommended: Intro Text";
  } else if (element.id === 2) {
    recommendedText = "Recommended: Intro Picture";
  } else if (element.id === 8) {
    recommendedText = "Recommended: Image Background";
  }

  return (
    <div style={{ borderLeft: `5px solid ${element.timelineColor}`, paddingLeft: '10px', minHeight: '100px' }}>
      <h5>Element Slot {element.id}</h5> {/* Removed Z-Index Priority Text */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
        <label style={{fontSize: '0.9rem'}}>Type:</label>
        <div style={selectContainerStyle}>
          <select value={element.type} onChange={handleTypeChange} style={selectStyle}>
            <option value="empty"> - inactive - </option> {/* Changed default text */}
            <option value="photo">Photo</option>
            <option value="text">Text</option>
            <option value="component">Component (e.g., RSVPForm)</option>
          </select>
        </div>
        {element.type !== 'empty' && (
            <button onClick={handleRemoveContent} style={{marginLeft: 'auto', color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem'}}>Clear</button>
        )}
      </div>

      {recommendedText && <p style={recommendedTextStyle}>{recommendedText}</p>}

      {element.type === 'empty' && <p style={{color: '#888'}}>Placeholder: Pick Element {element.id}</p>}

      {element.type === 'photo' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '10px' }}>
          {filePreview && 
            <img 
              src={filePreview} 
              alt={element.name || "Preview"} 
              style={{ 
                maxWidth: '80px', 
                maxHeight: '80px', 
                objectFit: 'cover',
                border: '1px solid #ddd', 
                borderRadius: '4px' 
              }} 
            />
          }
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handlePhotoUpload} 
              style={{ 
                fontSize: '0.8rem', 
                maxWidth: '150px' /* Ensure input doesn't overflow */ 
              }}
            />
            {element.name && !filePreview && element.content && /* Show name if preview not there but content is (e.g. existing image) */
              <p style={{fontSize: '0.8em', color: '#555', margin: '0'}}>File: {element.name}</p>
            }
             {filePreview && element.name && /* Show name if preview is also there */
              <p style={{fontSize: '0.8em', color: '#555', margin: '0'}}>File: {element.name}</p>
            }
          </div>
        </div>
      )}

      {element.type === 'text' && (
        <div>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Enter your text"
            rows={3}
            style={{width: '90%', marginBottom: '5px', padding: '5px', border: '1px solid #ccc', borderRadius: '3px'}}
          />
          <button onClick={handleTextSubmit} style={{padding: '5px 10px', fontSize: '0.8rem'}}>Submit Text</button>
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