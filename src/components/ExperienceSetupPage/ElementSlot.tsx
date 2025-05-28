import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import { ElementConfig } from './ExperienceSetupPage'; // Import the interface
// No need to import RSVPForm or ScrapbookBackground here if not rendering them directly
// import RSVPForm from '../../RSVPForm';
// import ScrapbookBackground from '../../ScrapbookBackground.js';

// Remove RSVPFormPlaceholder if not used
// const RSVPFormPlaceholder: React.FC = () => <div style={{border: '1px dashed blue', padding: '10px'}}>RSVP Form Component</div>;


interface ElementSlotProps {
  element: ElementConfig;
  onUpdate: (newConfig: Partial<Omit<ElementConfig, 'id' | 'timelineColor'>>) => void;
  onRemove: () => void; // To set element back to 'empty'
  isFocused: boolean; // New prop
  onFocus: (elementId: number) => void; // New prop
  startPositionPercent?: number; // New prop, percentage 0-1
  endPositionPercent?: number; // New prop, percentage 0-1
  onMarkerPositionChangeFromInput: (elementId: number, type: 'start' | 'end', newPosition: number) => void; // New prop
}

const ElementSlot: React.FC<ElementSlotProps> = ({
  element,
  onUpdate,
  onRemove,
  isFocused,
  onFocus,
  startPositionPercent,
  endPositionPercent,
  onMarkerPositionChangeFromInput
}) => {
  const [textContent, setTextContent] = useState<string>(element.type === 'text' && typeof element.content === 'string' ? element.content : '');
  const [selectedFile, setSelectedFile] = useState<File | null>(element.type === 'photo' && element.content instanceof File ? element.content : null);
  const [filePreview, setFilePreview] = useState<string | null>(element.type === 'photo' && typeof element.content === 'string' ? element.content : null);

  // Local state for input values, initialized from props
  const [startInput, setStartInput] = useState<string>((startPositionPercent !== undefined ? startPositionPercent * 100 : 0).toFixed(1));
  const [endInput, setEndInput] = useState<string>((endPositionPercent !== undefined ? endPositionPercent * 100 : 0).toFixed(1));

  useEffect(() => {
    setStartInput((startPositionPercent !== undefined ? startPositionPercent * 100 : 0).toFixed(1));
  }, [startPositionPercent]);

  useEffect(() => {
    setEndInput((endPositionPercent !== undefined ? endPositionPercent * 100 : 0).toFixed(1));
  }, [endPositionPercent]);

  const handleSlotClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent click from bubbling to document listener
    onFocus(element.id);
  };

  const handlePositionInputChange = (type: 'start' | 'end', value: string) => {
    const numericValue = parseFloat(value);
    if (type === 'start') {
      setStartInput(value);
      if (!isNaN(numericValue)) {
        onMarkerPositionChangeFromInput(element.id, 'start', numericValue / 100);
      }
    } else {
      setEndInput(value);
      if (!isNaN(numericValue)) {
        onMarkerPositionChangeFromInput(element.id, 'end', numericValue / 100);
      }
    }
  };

  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newTypeValue = e.target.value;
    setTextContent('');
    setSelectedFile(null);
    setFilePreview(null);

    if (newTypeValue === 'empty') {
        onRemove();
    } else if (newTypeValue === 'component-rsvp') {
        onUpdate({ type: 'component', content: 'RSVP Form', name: 'RSVP Form' });
    } else if (newTypeValue === 'component-scrapbook') {
        onUpdate({ type: 'component', content: 'Scrapbook', name: 'Scrapbook' });
    } else if (newTypeValue === 'photo' || newTypeValue === 'text') {
        onUpdate({ type: newTypeValue as 'photo' | 'text', content: null, name: undefined });
    } else {
        onUpdate({ type: 'empty', content: null, name: undefined });
    }
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
        onUpdate({ type: 'photo', content: reader.result as string, name: file.name });
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
    onRemove();
    setTextContent('');
    setSelectedFile(null);
    setFilePreview(null);
  };

  const baseStyle: React.CSSProperties = {
    padding: '17px',
    paddingRight: '20px',
    minHeight: '120px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'box-shadow 0.3s ease, border-top 0.3s ease, border-right 0.3s ease, border-bottom 0.3s ease, border-left 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    // Explicit borders for unfocused state
    borderTop: '1px solid #e0e0e0',
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
    borderLeft: `5px solid ${element.timelineColor === '#FFFFFF' ? '#DDDDDD' : element.timelineColor}`,
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  };

  const focusedStyleObj: React.CSSProperties = {
    boxShadow: '0 6px 12px rgba(0,0,0,0.25)',
    // Explicit, thicker borders for focused state
    borderTop: `2px solid ${element.timelineColor === '#FFFFFF' ? '#007bff' : element.timelineColor }`,
    borderRight: `2px solid ${element.timelineColor === '#FFFFFF' ? '#007bff' : element.timelineColor }`,
    borderBottom: `2px solid ${element.timelineColor === '#FFFFFF' ? '#007bff' : element.timelineColor }`,
    borderLeft: `2px solid ${element.timelineColor === '#FFFFFF' ? '#007bff' : element.timelineColor }`,
  };
  
  const focusedStyle: React.CSSProperties = isFocused ? focusedStyleObj : {};

  // Styles for the input controls
  const inputControlStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
    alignItems: 'center'
  };

  const numberInputStyle: React.CSSProperties = {
    width: '70px',
    padding: '5px',
    textAlign: 'right',
    border: '1px solid #ccc',
    borderRadius: '4px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    color: '#555'
  }

  const selectContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
  };

  const selectStyle: React.CSSProperties = {
    appearance: 'none',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ccc',
    padding: '6px 30px 6px 10px',
    borderRadius: '4px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    minWidth: '120px',
    maxWidth: '160px',
    backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    backgroundSize: '8px',
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
    recommendedText = "Recommended: Bride Name";
  } else if (element.id === 2) {
    recommendedText = "Recommended: Groom Name";
  } else if (element.id === 3) {
    recommendedText = "Recommended: Wedding Date";
  } else if (element.id === 4) {
    recommendedText = "Recommended: Transparent Couple Intro Image";
  } else if (element.id === 5) {
    recommendedText = "Recommended: Background Scene Image";
  } else if (element.id === 6) {
    recommendedText = "Recommended: RSVP Form";
  } else if (element.id === 7) {
    recommendedText = "Recommended: Image Scrapbook";
  }

  let dropdownValue: string = element.type;
  if (element.type === 'component') {
    if (element.name === 'RSVP Form') {
      dropdownValue = 'component-rsvp';
    } else if (element.name === 'Scrapbook') {
      dropdownValue = 'component-scrapbook';
    } else {
      dropdownValue = 'empty';
    }
  }

  return (
    <div 
      style={{ ...baseStyle, ...focusedStyle }} 
      onClick={handleSlotClick} 
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div> {/* Content wrapper div for flex layout */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h5 style={{ margin: 0, fontSize: '1.1em' }}>Element Slot {element.id}</h5>
          {element.type !== 'empty' && (
            <button onClick={(e) => { e.stopPropagation(); handleRemoveContent(); }} style={{marginLeft: 'auto', color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem'}}>Clear</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{fontSize: '0.9rem'}}>Type:</label>
          <div style={selectContainerStyle}>
            <select value={dropdownValue} onChange={handleTypeChange} style={selectStyle}>
              <option value="empty"> - inactive - </option>
              <option value="photo">Photo</option>
              <option value="text">Text</option>
              <option value={"component-rsvp" as string}>RSVP Form</option>
              <option value={"component-scrapbook" as string}>Scrapbook</option>
            </select>
          </div>
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
                  maxWidth: '150px' 
                }}
              />
              {element.name && !filePreview && element.content && 
                <p style={{fontSize: '0.8em', color: '#555', margin: '0'}}>File: {element.name}</p>
              }
               {filePreview && element.name && 
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

        {element.type === 'component' && element.name && (
          <div>
            <p style={{fontSize: '0.9em', color: '#333'}}>Selected Component: <strong>{element.name}</strong></p>
          </div>
        )}
      </div>

      {isFocused && element.type !== 'empty' && (
        <div style={inputControlStyle}>
          <div style={{flex: 1}}>
            <label htmlFor={`start-pos-${element.id}`} style={labelStyle}>Start (%):</label>
            <input
              type="number"
              id={`start-pos-${element.id}`}
              value={startInput}
              onChange={(e) => handlePositionInputChange('start', e.target.value)}
              step="0.1" // User requested 0.1 step
              min="0"
              max="100"
              style={numberInputStyle}
            />
          </div>
          <div style={{flex: 1}}>
            <label htmlFor={`end-pos-${element.id}`} style={labelStyle}>End (%):</label>
            <input
              type="number"
              id={`end-pos-${element.id}`}
              value={endInput}
              onChange={(e) => handlePositionInputChange('end', e.target.value)}
              step="0.1" // User requested 0.1 step
              min="0"
              max="100"
              style={numberInputStyle}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ElementSlot; 