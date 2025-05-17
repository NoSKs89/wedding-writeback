import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Make sure to install axios: npm install axios or yarn add axios

const RSVPForm = ({ weddingData, backendUrl }) => {
  const { id: weddingId, isPlated, platedOptions = [] } = weddingData;

  // States for the initial form part (always visible before decision)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState('');

  // States for the "attending" details part
  const [guestCount, setGuestCount] = useState(1);
  const [selectedMeals, setSelectedMeals] = useState({});
  const [singleSelectedMeal, setSingleSelectedMeal] = useState('');
  const [expandedMeal, setExpandedMeal] = useState(null);
  
  const [formError, setFormError] = useState('');
  const [isAttending, setIsAttending] = useState(null); // null, true (attending), false (momentary for not attending)

  // Effect to reset attending-specific details when navigating back or if isPlated/platedOptions change
  useEffect(() => {
    if (isAttending === null || !isAttending) {
        setGuestCount(1); // Reset to default if going back or not attending path
        setSelectedMeals({});
        setSingleSelectedMeal('');
        setExpandedMeal(null);
    }
  }, [isAttending, isPlated]); // isPlated change might affect meal options visibility

  // Effect to reset meal choices if guestCount changes while in the attending view
  useEffect(() => {
    if (isAttending && isPlated) {
        setSelectedMeals({});
        setSingleSelectedMeal('');
    }
  }, [guestCount, isAttending, isPlated]);

  const handleAttendanceChoice = (attendingValue) => {
    setFormError('');
    if (!firstName || !lastName) {
      setFormError('Please enter your first and last name before making a choice.');
      return;
    }
    setIsAttending(attendingValue);

    if (!attendingValue) { // Directly submit if not attending
      handleSubmit(null, false); // Pass event as null, explicitly pass attending status
    }
  };

  const handleGoBack = () => {
    setIsAttending(null);
    setFormError(''); // Clear any errors from the attending details view
    // Names and message remain as they were
  };

  const handleGuestCountChange = (e) => {
    const count = parseInt(e.target.value, 10);
    setGuestCount(count >= 1 ? count : 1);
    setFormError('');
  };

  const handleSingleMealChange = (mealName) => {
    setSingleSelectedMeal(mealName);
    setFormError('');
  };

  const handleMultipleMealQuantityChange = (mealName, quantityStr) => {
    const newQuantity = Math.max(0, parseInt(quantityStr, 10) || 0);
    const otherMealsTotal = Object.entries(selectedMeals).reduce((sum, [key, qty]) => {
        return key === mealName ? sum : sum + (qty || 0);
    }, 0);

    if (otherMealsTotal + newQuantity > guestCount) {
        setFormError(`Exceeded Food For Guest Count of ${guestCount}. You have ${guestCount - otherMealsTotal} selections remaining.`);
        return;
    }
    setSelectedMeals(prev => ({ ...prev, [mealName]: newQuantity }));
    setFormError('');
  };

  const getTotalSelectedMealQuantity = () => {
    if (!isPlated || !isAttending || guestCount <= 0) return 0;
    if (guestCount === 1) return singleSelectedMeal ? 1 : 0;
    return Object.values(selectedMeals).reduce((sum, qty) => sum + (qty || 0), 0);
  };

  const handleSubmit = (e, explicitAttendingStatus) => {
    if (e) e.preventDefault(); // Prevent default if called by form submission event
    setFormError('');

    const currentAttendance = explicitAttendingStatus !== undefined ? explicitAttendingStatus : isAttending;

    if (!firstName || !lastName) { // This should be caught by handleAttendanceChoice for initial step
      setFormError('Please enter your first and last name.');
      return;
    }

    let rsvpPayload;

    if (currentAttendance) { // Attending path
        if (guestCount < 1) {
            setFormError('Guest count must be at least 1 if you are attending.');
            return;
        }
        if (isPlated && platedOptions.length > 0) {
          if (guestCount > 1) {
              const totalSelected = getTotalSelectedMealQuantity();
              if (totalSelected !== guestCount) {
                setFormError(`Please select meals for all ${guestCount} guests. You've selected ${totalSelected}.`);
                return;
              }
          } else if (guestCount === 1 && !singleSelectedMeal) {
              setFormError('Please select your meal choice.');
              return;
          }
        }
        rsvpPayload = {
            weddingId, firstName, lastName, guestCount, attending: true, message,
            mealChoices: isPlated && platedOptions.length > 0 && guestCount > 0
            ? (guestCount === 1 ? singleSelectedMeal : selectedMeals) : 'N/A',
        };
    } else { // Not attending path (called directly from handleAttendanceChoice or if isAttending became false)
        rsvpPayload = { weddingId, firstName, lastName, attending: false, guestCount: 0, message };
    }

    console.log('RSVP Data to be sent to:', backendUrl, rsvpPayload);
    alert('RSVP Submitted (check console for data)!');
    // Reset to the very initial state after any submission
    setFirstName('');
    setLastName('');
    setMessage('');
    setIsAttending(null); // Go back to the initial choice screen
    // Attending specific states are reset by useEffect based on isAttending
  };
  
  const formStyle = {
    background: 'white',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    width: '500px',
    maxWidth: '90%',
    textAlign: 'left',
  };

  const inputGroupStyle = {
    marginBottom: '20px',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    boxSizing: 'border-box',
    fontSize: '1rem',
  };
  
  const nameInputContainerStyle = {
    display: 'flex',
    gap: '10px',
  };

  const mealOptionStyle = {
    padding: '10px',
    border: '1px solid #eee',
    borderRadius: '5px',
    marginBottom: '10px',
    background: '#f9f9f9'
  };

  const mealNameStyle = {
    fontWeight: 'bold',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer'
  };
  
  const mealDescriptionStyle = {
      background: '#fff',
      border: '1px solid #eee',
      padding: '10px',
      marginTop: '5px',
      borderRadius: '4px',
      fontSize: '0.9em'
  };

  const dietaryTagStyle = {
    display: 'inline-block',
    background: '#e0e0e0',
    color: '#333',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '0.8em',
    marginRight: '5px',
    marginTop: '5px'
  };
  
  const initialButtonContainerStyle = {
      display: 'flex',
      justifyContent: 'space-around',
      marginTop: '25px',
      gap: '10px'
  };

  const buttonStyle = {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    flex: 1
  };

  const backButtonStyle = { background: '#777', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.9rem', marginBottom:'15px' };
  const finalSubmitButtonStyle = {...buttonStyle, width: 'auto', flex:'none', paddingLeft: '30px', paddingRight: '30px'};

  if (isAttending === null) {
    // Step 1: Initial form with name, message, and attendance choice
    return (
      <div style={formStyle}>
        <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#333' }}>RSVP</h2>
        <div style={inputGroupStyle}>
          <label htmlFor="firstName" style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Your Name</label>
          <div style={nameInputContainerStyle}>
            <input type="text" id="firstName" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{...inputStyle, flex: 1}} />
            <input type="text" id="lastName" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{...inputStyle, flex: 1}} />
          </div>
        </div>
        <div style={inputGroupStyle}>
          <label htmlFor="message" style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Message to the Couple (Optional)</label>
          <textarea id="message" placeholder="Your message..." value={message} onChange={(e) => setMessage(e.target.value)} rows="3" style={inputStyle} />
        </div>
        {formError && <p style={{color: 'red', textAlign: 'center', marginBottom: '15px'}}>{formError}</p>}
        <p style={{textAlign:'center', marginBottom:'10px', color:'#555'}}>Can you make it?</p>
        <div style={initialButtonContainerStyle}>
          <button type="button" style={{...buttonStyle, background: '#d9534f', color: 'white'}} onClick={() => handleAttendanceChoice(false)}>
            We Can't Make It! 😥
          </button>
          <button type="button" style={{...buttonStyle, background: '#5cb85c', color: 'white'}} onClick={() => handleAttendanceChoice(true)}>
            We can make it! 😄
          </button>
        </div>
      </div>
    );
  } else if (isAttending === true) {
    // Step 2: Attending details form (guest count, meals)
    return (
      <form onSubmit={handleSubmit} style={formStyle}>
        <button type="button" onClick={handleGoBack} style={backButtonStyle}>&larr; Back</button>
        <h2 style={{ textAlign: 'center', marginBottom: '10px', color: '#333' }}>Glad you can make it!</h2>
        <p style={{textAlign:'center', marginBottom:'20px', color:'#555', fontSize:'0.95em'}}>Confirming for: <strong>{firstName} {lastName}</strong></p>
        
        <div style={inputGroupStyle}>
          <label htmlFor="guestCount" style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Number of Guests Attending</label>
          <input type="number" id="guestCount" value={guestCount} onChange={handleGuestCountChange} min="1" style={inputStyle} />
        </div>

        {isPlated && platedOptions.length > 0 && guestCount > 0 && (
          <div style={inputGroupStyle}>
            <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#444', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Meal Selection</h3>
            {platedOptions.map((meal) => (
              <div key={meal.name} style={mealOptionStyle}>
                <div style={mealNameStyle} onClick={() => setExpandedMeal(expandedMeal === meal.name ? null : meal.name)}>
                  <span>{meal.name}</span>
                  <span style={{ fontSize: '0.8em', color: '#777' }}>{expandedMeal === meal.name ? 'Hide Details [-]' : 'Show Details [+]'}</span>
                </div>
                {expandedMeal === meal.name && (
                  <div style={mealDescriptionStyle}>
                    <p>{meal.description}</p>
                    {meal.dietaryTags && meal.dietaryTags.length > 0 && (
                      <div><strong>Dietary Information:</strong> {meal.dietaryTags.map(tag => <span key={tag} style={dietaryTagStyle}>{tag}</span>)}</div>
                    )}
                  </div>
                )}
                {guestCount === 1 ? (
                  <label style={{ display: 'block', marginTop: '8px' }}>
                    <input type="radio" name="singleMealChoice" value={meal.name} checked={singleSelectedMeal === meal.name} onChange={() => handleSingleMealChange(meal.name)} style={{ marginRight: '8px' }} />
                    Select this option
                  </label>
                ) : (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label htmlFor={`meal_${meal.name.replace(/\s+/g, '-')}`} style={{flexShrink: 0}}>Quantity:</label>
                    <input type="number" id={`meal_${meal.name.replace(/\s+/g, '-')}`} value={selectedMeals[meal.name] || 0} onChange={(e) => handleMultipleMealQuantityChange(meal.name, e.target.value)} min="0" style={{ ...inputStyle, width: '70px', padding: '8px' }} />
                  </div>
                )}
              </div>
            ))}
            {guestCount > 1 && <p style={{fontSize: '0.9em', color: '#666', marginTop: '10px'}}>Total selected for party: {getTotalSelectedMealQuantity()} / {guestCount}</p>}
          </div>
        )}
        {formError && <p style={{color: 'red', textAlign: 'center', marginBottom: '15px'}}>{formError}</p>}
        <div style={{textAlign: 'center', marginTop:'25px'}}> 
          <button type="submit" style={{...finalSubmitButtonStyle, background: '#5cb85c', color: 'white'}}>
            Submit RSVP
          </button>
        </div>
      </form>
    );
  }
  // Note: isAttending === false path submits directly, no separate render state needed for it beyond the initial form logic.
  return null; // Should not be reached if logic is correct
};

export default RSVPForm;