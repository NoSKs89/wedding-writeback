import React, { useState } from 'react';
import axios from 'axios'; // Make sure to install axios: npm install axios or yarn add axios

const RSVPForm = ({ weddingId, backendUrl }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    numberOfGuests: 1, // Default to 1
    message: '',
    attendanceStatus: '',
  });
  const [isAttending, setIsAttending] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [submissionMessage, setSubmissionMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'number' ? parseInt(value, 10) : value,
    }));
  };

  const handleAttendanceChoice = (attending) => {
    setIsAttending(attending);
    setFormData(prevData => ({
      ...prevData,
      attendanceStatus: attending ? 'attending' : 'not_attending',
      numberOfGuests: attending ? (prevData.numberOfGuests > 0 ? prevData.numberOfGuests : 1) : 0,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.attendanceStatus === '') {
      alert('Please select if you can make it or not.');
      return;
    }
    setSubmissionStatus('sending');
    try {
      const payload = { ...formData, weddingId };
      const response = await axios.post(backendUrl || '/api/rsvp', payload); // Ensure your backendUrl is correct
      setSubmissionStatus('success');
      setSubmissionMessage('Thank you! Your RSVP has been submitted.');
      // console.log('RSVP submitted:', response.data);
    } catch (error) {
      console.error('Error submitting RSVP:', error.response ? error.response.data : error.message);
      setSubmissionStatus('error');
      setSubmissionMessage(error.response?.data?.message || 'Sorry, there was an error. Please try again.');
    }
  };

  const formBaseStyle = {
    width: '330px',
    maxWidth: '90vw',
    padding: '25px 30px',
    background: 'rgba(250, 250, 250, 0.97)', // Slightly more opaque
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    borderRadius: '12px',
    textAlign: 'left',
    transition: 'transform 0.3s ease-out, opacity 0.3s ease-out', // For potential future animations
  };

  if (submissionStatus === 'success') {
    return (
      <div style={{ ...formBaseStyle, textAlign: 'center', padding: '40px 20px' }}>
        <h3 style={{ marginTop: 0, color: '#28a745' }}>Thank You!</h3>
        <p style={{ color: '#333', fontSize: '1rem' }}>{submissionMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={formBaseStyle} className="rsvp-form">
      <h3 style={{ textAlign: 'center', marginTop: 0, marginBottom: '20px', color: '#333' }}>RSVP</h3>
      
      {(isAttending === null) && (
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '25px' }}>
          <button type="button" onClick={() => handleAttendanceChoice(true)} className="rsvp-button attending">
            We can make it! 😄
          </button>
          <button type="button" onClick={() => handleAttendanceChoice(false)} className="rsvp-button not-attending">
            We Can't Make It! 😥
          </button>
        </div>
      )}

      {(isAttending !== null) && (
        <>
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#555' }}>
                You selected: <strong style={{color: formData.attendanceStatus === 'attending' ? '#28a745' : '#dc3545'}}>{formData.attendanceStatus === 'attending' ? "We can make it!" : "We can't make it."}</strong>
            </p>
            <button type="button" onClick={() => { setIsAttending(null); setFormData(fd => ({...fd, attendanceStatus: ''})); }} className="rsvp-change-choice-button">
                Change choice
            </button>
          </div>
          
          <div className="form-group">
            <label htmlFor="firstName">First Name:</label>
            <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Last Name:</label>
            <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
          </div>

          {isAttending && (
            <div className="form-group">
              <label htmlFor="numberOfGuests">Number of Guests Attending:</label>
              <input type="number" id="numberOfGuests" name="numberOfGuests" value={formData.numberOfGuests} onChange={handleChange} min="1" required />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="message">Message (Optional):</label>
            <textarea id="message" name="message" value={formData.message} onChange={handleChange} rows="3" />
          </div>

          <button type="submit" disabled={submissionStatus === 'sending'} className="rsvp-submit-button">
            {submissionStatus === 'sending' ? 'Submitting...' : 'Submit RSVP'}
          </button>
          {submissionStatus === 'error' && <p style={{color: 'red', marginTop: '10px', textAlign: 'center', fontSize: '0.9rem'}}>{submissionMessage}</p>}
        </>
      )}
    </form>
  );
};

export default RSVPForm;