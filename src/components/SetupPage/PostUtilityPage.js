import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { getApiBaseUrl } from '../../config/apiConfig';

const PostUtilityPage = () => {
  const { weddingId } = useParams();
  const [viewType, setViewType] = useState('desktop');
  const [slotNumber, setSlotNumber] = useState(1);
  const [payloadText, setPayloadText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [responseError, setResponseError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!payloadText.trim()) {
      setResponseError('Please enter a payload');
      return;
    }

    setIsPosting(true);
    setResponseMessage('');
    setResponseError('');

    try {
      // Parse the payload to validate JSON
      let payload;
      try {
        payload = JSON.parse(payloadText);
      } catch (parseError) {
        setResponseError('Invalid JSON format in payload');
        setIsPosting(false);
        return;
      }

      // Ensure slotNumber matches the dropdown selection
      payload.slotNumber = slotNumber;

      const apiUrl = `${getApiBaseUrl()}/weddings/${weddingId}/layoutSettings/${viewType}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const result = await response.json();
      setResponseMessage(`Success: ${result.message || 'Layout settings posted successfully'}`);
      
      // Clear the payload on success
      setPayloadText('');
      
    } catch (error) {
      console.error('Error posting payload:', error);
      setResponseError(`Error: ${error.message}`);
    } finally {
      setIsPosting(false);
    }
  };

  const handleClearAll = () => {
    setPayloadText('');
    setResponseMessage('');
    setResponseError('');
  };

  const examplePayload = {
    "slotNumber": slotNumber,
    "settings": {
      "Overall Controls (Guest)": {
        "showHUD": false,
        "springPreset": "default",
        "colorScheme": "Classic Elegance",
        "overallFontFamily": "Arial, sans-serif",
        "previewingLayoutSlot": slotNumber,
        "saveToLayoutSlot": slotNumber
      },
      "element_1_text_Example_Text": {
        "opacityAtStart": 0,
        "opacityAtMiddle": 1,
        "opacityAtEnd": 1,
        "opacityAnimationCurve": "linear",
        "textColor": "#333333",
        "fontFamily": "Arial, sans-serif",
        "fontSize": 16
      }
    }
  };

  const handleLoadExample = () => {
    setPayloadText(JSON.stringify(examplePayload, null, 2));
  };

  const handleLoadMigrationPayload = async () => {
    try {
      const response = await fetch('/migration_payload.json');
      if (!response.ok) {
        throw new Error(`Failed to load migration payload: ${response.status}`);
      }
      const migrationData = await response.json();
      
      // Wrap the settings in the expected format
      const formattedPayload = {
        slotNumber: slotNumber,
        settings: migrationData.settings
      };
      
      setPayloadText(JSON.stringify(formattedPayload, null, 2));
      setResponseMessage('Migration payload loaded successfully');
      setResponseError('');
    } catch (error) {
      console.error('Error loading migration payload:', error);
      setResponseError(`Error loading migration payload: ${error.message}`);
      setResponseMessage('');
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>Layout Settings POST Utility</h1>
      <p>Wedding ID: <strong>{weddingId}</strong></p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            View Type:
            <select 
              value={viewType} 
              onChange={(e) => setViewType(e.target.value)}
              style={{ 
                marginLeft: '10px', 
                padding: '5px', 
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            >
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Layout Slot Number:
            <select 
              value={slotNumber} 
              onChange={(e) => setSlotNumber(parseInt(e.target.value))}
              style={{ 
                marginLeft: '10px', 
                padding: '5px', 
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            >
              <option value={1}>Slot 1</option>
              <option value={2}>Slot 2</option>
              <option value={3}>Slot 3</option>
              <option value={4}>Slot 4</option>
              <option value={5}>Slot 5</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            JSON Payload:
          </label>
          <div style={{ marginBottom: '10px' }}>
            <button 
              type="button" 
              onClick={handleLoadExample}
              style={{
                padding: '5px 10px',
                fontSize: '12px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Load Example
            </button>
            <button 
              type="button" 
              onClick={handleLoadMigrationPayload}
              style={{
                padding: '5px 10px',
                fontSize: '12px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Load Migration Payload
            </button>
            <button 
              type="button" 
              onClick={handleClearAll}
              style={{
                padding: '5px 10px',
                fontSize: '12px',
                backgroundColor: '#ffebee',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          </div>
          <textarea
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            placeholder="Paste your JSON payload here..."
            style={{
              width: '100%',
              height: '400px',
              padding: '10px',
              fontSize: '12px',
              fontFamily: 'monospace',
              border: '1px solid #ccc',
              borderRadius: '4px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <button
            type="submit"
            disabled={isPosting || !payloadText.trim()}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: isPosting ? '#cccccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isPosting ? 'not-allowed' : 'pointer'
            }}
          >
            {isPosting ? 'Posting...' : 'Submit POST Request'}
          </button>
        </div>
      </form>

      <div style={{ marginTop: '20px' }}>
        <h3>API Endpoint</h3>
        <code style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '10px', 
          display: 'block', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          POST {getApiBaseUrl()}/weddings/{weddingId}/layoutSettings/{viewType}
        </code>
      </div>

      {responseMessage && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          color: '#155724'
        }}>
          <strong>Success:</strong> {responseMessage}
        </div>
      )}

      {responseError && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          color: '#721c24'
        }}>
          <strong>Error:</strong> {responseError}
        </div>
      )}

      <div style={{ marginTop: '30px', fontSize: '12px', color: '#666' }}>
        <h4>Notes:</h4>
        <ul>
          <li>The slotNumber in the payload will be automatically set to match the dropdown selection</li>
          <li>Ensure your JSON is valid before submitting</li>
          <li>Use the new folder naming convention: element_[id]_[type]_[preview]</li>
          <li>Text elements: element_1_text_Brooke_Chris</li>
          <li>Photo elements: element_4_photo_IMG3085</li>
          <li>Component elements: element_6_component_RSVP_Form</li>
        </ul>
      </div>
    </div>
  );
};

export default PostUtilityPage; 