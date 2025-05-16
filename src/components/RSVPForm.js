import React, { useState } from 'react';
import axios from 'axios';

const RSVPForm = ({ weddingId, backendUrl }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    numberOfGuests: 0,
    message: '',
    attendanceStatus: '', // 'attending' or 'not_attending'
    // guestEmail: '', // Optional: if you want to collect guest's email
  });
  const [isAttending, setIsAttending] = useState(null); // null, true, or false
  const [submissionStatus, setSubmissionStatus] = useState(null); // null, 'success', 'error'
  const [submissionMessage, setSubmissionMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAttendanceChoice = (attending) => {
    setIsAttending(attending);
    setFormData(prevData => ({
      ...prevData,
      attendanceStatus: attending ? 'attending' : 'not_attending',
      numberOfGuests: attending ? prevData.numberOfGuests || 1 : 0, // Default to 1 if attending, 0 if not
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.attendanceStatus) {
        alert('Please select if you can make it or not.');
        return;
    }
    setSubmissionStatus('sending');
    try {
      const payload = { ...formData, weddingId }; // Include weddingId if your backend needs it
      // Replace with your actual backend endpoint
      const response = await axios.post(backendUrl || '/api/rsvp', payload);
      setSubmissionStatus('success');
      setSubmissionMessage('Thank you! Your RSVP has been submitted.');
      // console.log('RSVP submitted:', response.data);
      // Optionally reset form:
      // setFormData({ firstName: '', lastName: '', numberOfGuests: 0, message: '', attendanceStatus: '' });
      // setIsAttending(null);
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      setSubmissionStatus('error');
      setSubmissionMessage('Sorry, there was an error submitting your RSVP. Please try again.');
    }
  };

  const formStyle = {
    position: 'fixed',
    top: '50px', // Adjust as needed
    right: '20px', // Adjust as needed
    width: '300px',
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.9)',
    boxShadow: '0 0 15px rgba(0,0,0,0.2)',
    borderRadius: '8px',
    zIndex: 1000, // Ensure it's above other content
    // Basic responsiveness (you'll want more robust solution with media queries)
    '@media (maxWidth: 600px)': {
        width: '90%',
        right: '5%',
        left: '5%',
        top: '20px',
    }
  };

  if (submissionStatus === 'success') {
    return (
        <div style={formStyle}>
            <h3>Thank You!</h3>
            <p>{submissionMessage}</p>
        </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle} className="rsvp-form">
      <h3>RSVP</h3>
      {!isAttending && isAttending !== false && (
        <div style={{ marginBottom: '15px' }}>
          <button 
            type="button" 
            onClick={() => handleAttendanceChoice(true)} 
            style={{ backgroundColor: 'green', color: 'white', marginRight: '10px', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            We can make it! 😄
          </button>
          <button 
            type="button" 
            onClick={() => handleAttendanceChoice(false)} 
            style={{ backgroundColor: 'red', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            We Can't Make It! 😥
          </button>
        </div>
      )}

      {(isAttending || isAttending === false) && (
        <>
            <p>You selected: <strong>{formData.attendanceStatus === 'attending' ? "We can make it!" : "We can't make it."}</strong></p>
            <button type="button" onClick={() => { setIsAttending(null); setFormData(fd => ({...fd, attendanceStatus: ''})); }} style={{fontSize: '0.8em', marginBottom: '10px'}}>Change choice</button>
            
            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="firstName">First Name:</label>
                <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required style={{width: '100%', padding: '8px', boxSizing: 'border-box'}} />
            </div>
            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="lastName">Last Name:</label>
                <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required style={{width: '100%', padding: '8px', boxSizing: 'border-box'}}/>
            </div>

            {isAttending && (
                <div style={{ marginBottom: '10px' }}>
                <label htmlFor="numberOfGuests">Number of Guests Attending:</label>
                <input type="number" id="numberOfGuests" name="numberOfGuests" value={formData.numberOfGuests} onChange={handleChange} min="1" required style={{width: '100%', padding: '8px', boxSizing: 'border-box'}}/>
                </div>
            )}

            <div style={{ marginBottom: '15px' }}>
                <label htmlFor="message">Message (Optional):</label>
                <textarea id="message" name="message" value={formData.message} onChange={handleChange} rows="3" style={{width: '100%', padding: '8px', boxSizing: 'border-box'}}/>
            </div>

            <button type="submit" disabled={submissionStatus === 'sending'} style={{ backgroundColor: '#007bff', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                {submissionStatus === 'sending' ? 'Submitting...' : 'Submit RSVP'}
            </button>
            {submissionStatus === 'error' && <p style={{color: 'red', marginTop: '10px'}}>{submissionMessage}</p>}
        </>
      )}
    </form>
  );
};

export default RSVPForm; 