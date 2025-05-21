import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import axios from 'axios'; // Make sure to install axios: npm install axios or yarn add axios
import { useTrackedControls } from '../hooks/useTrackedControls'; // Import useTrackedControls
import { LevaFolderSchema } from '../stores/levaStore'; // Import LevaFolderSchema for typing

// Interface for individual meal options
interface MealOption {
  name: string;
  description?: string;
  dietaryTags?: string[];
  // Add other properties if meal objects have them
}

// Interface for the weddingData prop
interface WeddingData {
  id: string | number; // Assuming id is present and is a string or number
  isPlated?: boolean;
  platedOptions?: MealOption[];
  brideName?: string; // Optional, as not directly used in RSVPForm logic but good practice
  groomName?: string; // Optional
  weddingDate?: string; // Optional
  // Add any other properties from your actual weddingData structure
}

// Interface for the component's props
interface RSVPFormProps {
  weddingData: WeddingData;
  backendUrl: string;
}

// Type for the selectedMeals state (mapping meal names to quantities)
interface SelectedMeals {
  [mealName: string]: number;
}

// Leva controls schema for RSVP Form
const rsvpFormControlsSchema: LevaFolderSchema = {
  formWidth: { value: 500, min: 300, max: 1200, step: 10, label: 'Form Width (px)' },
  formHeight: { value: 700, min: 400, max: 1000, step: 10, label: 'Form Height (px)' },
  formPadding: { value: 30, min: 10, max: 50, step: 1, label: 'Padding (px)' },
  stackThreshold: { value: 400, min: 200, max: 600, step: 10, label: 'Stacking Width (px)'}
};

const RSVPForm: React.FC<RSVPFormProps> = ({ weddingData, backendUrl }) => {
  const { id: weddingId, isPlated = false, platedOptions = [] } = weddingData;

  // Leva controls now use useTrackedControls, which connects to the Zustand store
  const { values: rsvpStyleControls } = useTrackedControls("RSVP Form Style", rsvpFormControlsSchema);
  // Destructure after getting values to ensure they are defined if rsvpStyleControls is initially undefined by the store hook
  const { formWidth = 500, formHeight = 700, formPadding = 30, stackThreshold = 400 } = rsvpStyleControls || {};

  // Calculate responsive padding
  const responsivePaddingBase = Math.min(formWidth * 0.05, formHeight * 0.05);
  const actualPadding = Math.min(responsivePaddingBase, formPadding);

  // States for the initial form part
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  // States for the "attending" details part
  const [guestCount, setGuestCount] = useState<number>(1);
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeals>({});
  const [singleSelectedMeal, setSingleSelectedMeal] = useState<string>('');
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  
  const [formError, setFormError] = useState<string>('');
  const [isAttending, setIsAttending] = useState<boolean | null>(null);
  // const [showDetailsForm, setShowDetailsForm] = useState<boolean>(false); // This state was in a previous version, but not in the JS provided
  // const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle'); // Likewise
  // const [finalResponse, setFinalResponse] = useState<any>(null); // Likewise

  useEffect(() => {
    if (isAttending === null || !isAttending) {
        setGuestCount(1);
        setSelectedMeals({});
        setSingleSelectedMeal('');
        setExpandedMeal(null);
    }
  }, [isAttending]); // Removed isPlated from deps as it doesn't directly reset these fields here

  useEffect(() => {
    // Reset meal choices if guestCount changes while in the attending view and meals are plated
    if (isAttending && isPlated) {
        setSelectedMeals({});
        setSingleSelectedMeal('');
        // setExpandedMeal(null); // Optionally reset expanded view too
    }
  }, [guestCount, isAttending, isPlated]);

  const handleAttendanceChoice = (attendingValue: boolean) => {
    setFormError('');
    if (!firstName || !lastName) {
      setFormError('Please enter your first and last name before making a choice.');
      return;
    }
    setIsAttending(attendingValue);

    if (!attendingValue) {
      // Type assertion for event as null, since handleSubmit expects FormEvent or null
      handleSubmit(null as unknown as FormEvent<HTMLFormElement>, false);
    }
  };

  const handleGoBack = () => {
    setIsAttending(null);
    setFormError('');
  };

  const handleGuestCountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value, 10);
    setGuestCount(count >= 1 ? count : 1);
    setFormError('');
  };

  const handleSingleMealChange = (mealName: string) => {
    setSingleSelectedMeal(mealName);
    setFormError('');
  };

  const handleMultipleMealQuantityChange = (mealName: string, quantityStr: string) => {
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

  const getTotalSelectedMealQuantity = (): number => {
    if (!isPlated || !isAttending || guestCount <= 0) return 0;
    if (guestCount === 1) return singleSelectedMeal ? 1 : 0;
    return Object.values(selectedMeals).reduce((sum, qty) => sum + (qty || 0), 0);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement> | null, explicitAttendingStatus?: boolean) => {
    if (event) event.preventDefault();
    setFormError('');

    const currentAttendance = explicitAttendingStatus !== undefined ? explicitAttendingStatus : isAttending;

    if (!firstName || !lastName) {
      setFormError('Please enter your first and last name.');
      return;
    }

    let rsvpPayload: any; // Define a more specific type for this if possible

    if (currentAttendance) {
        if (guestCount < 1) {
            setFormError('Guest count must be at least 1 if you are attending.');
            return;
        }
        if (isPlated && platedOptions && platedOptions.length > 0) {
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
            weddingId,
            firstName,
            lastName,
            guestCount,
            attending: true,
            message,
            mealChoices: isPlated && platedOptions && platedOptions.length > 0 && guestCount > 0
                         ? (guestCount === 1 ? singleSelectedMeal : selectedMeals)
                         : 'N/A',
        };
    } else {
        rsvpPayload = { weddingId, firstName, lastName, attending: false, guestCount: 0, message };
    }

    console.log('RSVP Data to be sent to:', backendUrl, rsvpPayload);
    try {
      // Example: await axios.post(backendUrl, rsvpPayload);
      alert('RSVP Submitted (Simulated - check console for data)!');
      // Reset to the very initial state after any submission
      setFirstName('');
      setLastName('');
      setMessage('');
      setIsAttending(null);
      // Attending specific states are reset by useEffect based on isAttending changing to null
    } catch (error) {
      console.error('RSVP Submission Error:', error);
      setFormError('There was an error submitting your RSVP. Please try again.');
      // Potentially set submissionStatus to 'error' if using that state
    }
  };
  
  // Inline styles (can be moved to CSS Modules or a separate CSS file if preferred)
  const formStyle: React.CSSProperties = {
    background: 'white',
    padding: `${actualPadding}px`,
    borderRadius: '10px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    width: `${formWidth}px`,
    height: `${formHeight}px`,
    overflowY: 'auto',
    boxSizing: 'border-box',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
  };

  const inputGroupStyle: React.CSSProperties = {
    marginBottom: '20px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    boxSizing: 'border-box',
    fontSize: '1rem',
  };
  
  const nameInputContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    flexDirection: formWidth < stackThreshold ? 'column' : 'row',
  };

  const mealOptionStyle: React.CSSProperties = {
    padding: '10px',
    border: '1px solid #eee',
    borderRadius: '5px',
    marginBottom: '10px',
    background: '#f9f9f9'
  };

  const mealNameStyle: React.CSSProperties = {
    fontWeight: 'bold',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer'
  };
  
  const mealDescriptionStyle: React.CSSProperties = {
      background: '#fff',
      border: '1px solid #eee',
      padding: '10px',
      marginTop: '5px',
      borderRadius: '4px',
      fontSize: '0.9em'
  };

  const dietaryTagStyle: React.CSSProperties = {
    display: 'inline-block',
    background: '#e0e0e0',
    color: '#333',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '0.8em',
    marginRight: '5px',
    marginTop: '5px'
  };
  
  const initialButtonContainerStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'space-around',
      marginTop: '25px',
      gap: '10px',
      flexDirection: formWidth < stackThreshold ? 'column' : 'row',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    flex: 1
  };

  const backButtonStyle: React.CSSProperties = { background: '#777', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.9rem', marginBottom:'15px' };
  const finalSubmitButtonStyle: React.CSSProperties = {...buttonStyle, width: 'auto', flex:'none' as 'none', paddingLeft: '30px', paddingRight: '30px'};

  if (isAttending === null) {
    return (
      <div style={formStyle}>
        <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#333' }}>RSVP</h2>
        <div style={inputGroupStyle}>
          <label htmlFor="firstName" style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Your Name</label>
          <div style={nameInputContainerStyle}>
            <input type="text" id="firstName" placeholder="First Name" value={firstName} onChange={(e: ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)} style={{...inputStyle, flex: 1}} />
            <input type="text" id="lastName" placeholder="Last Name" value={lastName} onChange={(e: ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)} style={{...inputStyle, flex: 1}} />
          </div>
        </div>
        <div style={inputGroupStyle}>
          <label htmlFor="message" style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Message to the Couple (Optional)</label>
          <textarea id="message" placeholder="Your message..." value={message} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)} rows={3} style={inputStyle} />
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
    return (
      <form onSubmit={handleSubmit} style={formStyle}>
        <button type="button" onClick={handleGoBack} style={backButtonStyle}>&larr; Back</button>
        <h2 style={{ textAlign: 'center', marginBottom: '10px', color: '#333' }}>Glad you can make it!</h2>
        <p style={{textAlign:'center', marginBottom:'20px', color:'#555', fontSize:'0.95em'}}>Confirming for: <strong>{firstName} {lastName}</strong></p>
        
        <div style={inputGroupStyle}>
          <label htmlFor="guestCount" style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Number of Guests Attending</label>
          <input type="number" id="guestCount" value={guestCount} onChange={handleGuestCountChange} min={1} style={inputStyle} />
        </div>

        {isPlated && platedOptions && platedOptions.length > 0 && guestCount > 0 && (
          <div style={inputGroupStyle}>
            <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#444', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Meal Selection</h3>
            {platedOptions.map((meal) => (
              <div key={meal.name} style={mealOptionStyle}>
                <div style={mealNameStyle} onClick={() => setExpandedMeal(expandedMeal === meal.name ? null : meal.name)}>
                  <span>{meal.name}</span>
                  <span style={{ fontSize: '0.8em', color: '#777' }}>{expandedMeal === meal.name ? 'Hide Details [-]' : 'Show Details [+]'}</span>
                </div>
                {expandedMeal === meal.name && meal.description && (
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
                    <input type="number" id={`meal_${meal.name.replace(/\s+/g, '-')}`} value={selectedMeals[meal.name] || '0'} onChange={(e: ChangeEvent<HTMLInputElement>) => handleMultipleMealQuantityChange(meal.name, e.target.value)} min={0} style={{ ...inputStyle, width: '70px', padding: '8px' }} />
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
  return <></>; // Return an empty fragment instead of null as a fallback
};

export default RSVPForm; 