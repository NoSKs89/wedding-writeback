import React, { useState, useEffect, FormEvent, ChangeEvent, forwardRef, useImperativeHandle, useRef } from 'react';
import axios from 'axios';
import { useControls, useStoreContext, folder } from 'leva'; // Import Leva's native hooks
import { useSetupMode } from '../contexts/SetupModeContext';
import { formThemes, defaultThemeName, getThemeByName, FormTheme } from '../config/formThemes';
import { googleFontNames, systemFontStack, fontFamilyOptions } from '../config/fontConfig';

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, opacity: number): string => {
  let r = "0", g = "0", b = "0";
  // 3 digits
  if (hex.length === 4) {
    r = "0x" + hex[1] + hex[1];
    g = "0x" + hex[2] + hex[2];
    b = "0x" + hex[3] + hex[3];
  // 6 digits
  } else if (hex.length === 7) {
    r = "0x" + hex[1] + hex[2];
    g = "0x" + hex[3] + hex[4];
    b = "0x" + hex[5] + hex[6];
  }
  return `rgba(${+r},${+g},${+b},${opacity})`;
};

// Interface for individual meal options
interface MealOption {
  name: string;
  description?: string;
  dietaryTags?: string[];
}

// Interface for the weddingData prop
interface WeddingData {
  id: string | number;
  isPlated?: boolean;
  platedOptions?: MealOption[];
  brideName?: string;
  groomName?: string;
  weddingDate?: string;
}

// Interface for the component's props
interface RSVPFormProps {
  weddingData: WeddingData;
  backendUrl: string;
}

// Type for the selectedMeals state
interface SelectedMeals {
  [mealName: string]: number;
}

// --- Leva Schema Definition ---
const initialDefaultTheme = getThemeByName(defaultThemeName);
const initialBorderColorFromTheme = initialDefaultTheme?.borderColor || '#CCCCCC';
const determineInitialFont = (themeFont?: string) => {
  if (themeFont && fontFamilyOptions.includes(themeFont)) return themeFont;
  const googleMatch = googleFontNames.find((gf: string) => themeFont?.includes(gf));
  if (googleMatch) return googleMatch;
  return fontFamilyOptions[0];
};
const initialTextFontFamily = determineInitialFont(initialDefaultTheme?.fontFamily);
const initialButtonFontFamily = determineInitialFont(initialDefaultTheme?.fontFamily);

const RSVPForm = forwardRef<HTMLDivElement, RSVPFormProps>(({ weddingData, backendUrl }, ref) => {
  const { id: weddingId, isPlated = false, platedOptions = [] } = weddingData;
  const { isSetupMode } = useSetupMode();
  
  // --- Leva Controls Integration ---
  // 1. Get the global store instance from the context provided in App.js
  const store = useStoreContext();

  // --- Dummy values to allow compilation ---
  const currentAttendance = 'Attending';
  const rsvpButtonLabel = 'RSVP';
  const rsvpButtonColor = '#007bff';
  const rsvpThankYouMessage = 'Thank you for your RSVP!';
  const sendReminder = false;
  const formThemeName = 'Classic Elegance';
  const formTextFontFamily = 'Arial';
  const buttonTextFontFamily = 'Arial';
  const formBackgroundOpacity = 1;
  const formBorderColor = '#cccccc';
  const formBorderWidth = 1;
  const cantMakeItButtonEmoji = '😥';
  const canMakeItButtonEmoji = '😄';
  const formWidth = 500;
  const formHeight = 460;
  const formPadding = 30;
  const stackThreshold = 400;
  // --- End of dummy values ---

  const internalFormRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => internalFormRef.current as HTMLDivElement);

  // Robust theme selection
  let themeToUse = formThemes.find(t => t.name === formThemeName) || getThemeByName(defaultThemeName) || formThemes[0];
  if (!themeToUse) { // Double check in case getThemeByName also fails
      themeToUse = formThemes[0] || { 
        name: 'EmergencyFallback', 
        backgroundColor: '#ffffff', 
        textColor: '#000000', 
        fontFamily: fontFamilyOptions[0],
        borderColor: '#cccccc',
        buttonBackgroundColor: '#007bff',
        buttonTextColor: '#ffffff'
      };
  }
  const selectedTheme: FormTheme = themeToUse;

  // Calculate responsive padding
  const responsivePaddingBase = Math.min(formWidth * 0.05, formHeight * 0.05);
  const actualPadding = Math.min(responsivePaddingBase, formPadding);

  // Form state
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [guestCount, setGuestCount] = useState<number>(1);
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeals>({});
  const [singleSelectedMeal, setSingleSelectedMeal] = useState<string>('');
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [isAttending, setIsAttending] = useState<boolean | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [finalResponse, setFinalResponse] = useState<any>(null);

  useEffect(() => {
    if (isAttending === null || !isAttending) {
      setGuestCount(1);
      setSelectedMeals({});
      setSingleSelectedMeal('');
      setExpandedMeal(null);
    }
  }, [isAttending]);

  useEffect(() => {
    if (isAttending && isPlated) {
      setSelectedMeals({});
      setSingleSelectedMeal('');
    }
  }, [guestCount, isAttending, isPlated]);

  const handleAttendanceChoice = (attendingValue: boolean) => {
    setFormError('');
    setSubmissionStatus('idle'); // Reset status on new choice

    if (!firstName || !lastName) {
      setFormError('Please enter your first and last name before making a choice.');
      return;
    }

    if (attendingValue) {
      if (isPlated) {
        // Plated meal flow: proceed to the second page for meal/guest details.
        setIsAttending(true);
      } else {
        // Buffet flow: all info is on the first page, so submit directly.
        handleSubmit(null, true);
      }
    } else {
      // Not attending: submit directly.
      handleSubmit(null, false);
    }
  };

  const handleGoBack = () => {
    setIsAttending(null);
    setFormError('');
    setSubmissionStatus('idle'); // Also reset status when going back
  };

  const validateEmail = (emailInput: string): boolean => {
    if (!emailInput) {
      setEmailError('');
      return true;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(emailInput)) {
      setEmailError('');
      return true;
    } else {
      setEmailError('Please enter a valid email address.');
      return false;
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    validateEmail(newEmail);
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

    if (email && !validateEmail(email)) {
      setFormError('Please correct the email address before submitting.');
      return;
    }

    let rsvpPayload: any;

    if (currentAttendance) {
      if (guestCount < 1) {
        setFormError('Guest count must be at least 1 if you are attending.');
        return;
      }
      if (isPlated && platedOptions && platedOptions.length > 0) {
        if (guestCount > 1) {
          const totalSelected = getTotalSelectedMealQuantity();
          if (totalSelected !== guestCount) {
            setFormError(`Please select a meal for all ${guestCount} guests.`);
            return;
          }
          rsvpPayload = { mealChoices: selectedMeals };
        } else {
          if (!singleSelectedMeal) {
            setFormError('Please select your meal choice.');
            return;
          }
          rsvpPayload = { mealChoices: { [singleSelectedMeal]: 1 } };
        }
      }
    }

    setSubmissionStatus('submitting');
    try {
      const fullPayload = {
        weddingId: weddingId,
        firstName,
        lastName,
        email,
        attending: currentAttendance,
        guestCount: currentAttendance ? guestCount : 0,
        message,
        ...rsvpPayload
      };
      const response = await axios.post(backendUrl, fullPayload);
      setFinalResponse(response.data);
      setSubmissionStatus('success');
    } catch (error) {
      setFormError('There was an error submitting your RSVP. Please try again.');
      setSubmissionStatus('error');
    }
  };

  // Styles
  const formStyle: React.CSSProperties = {
    background: hexToRgba(selectedTheme.backgroundColor || '#ffffff', formBackgroundOpacity),
    color: selectedTheme.textColor || '#000000',
    fontFamily: formTextFontFamily,
    border: `${formBorderWidth}px solid ${formBorderColor}`,
    borderRadius: '8px',
    padding: `${actualPadding}px`,
    width: `${formWidth}px`,
    height: `${formHeight}px`,
    maxWidth: '90vw',
    maxHeight: '90vh',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  };

  const contentContainerStyle: React.CSSProperties = {
    flexGrow: 1,
    overflowY: 'auto',
    paddingRight: '15px', // For scrollbar spacing
    marginRight: '-15px', // To hide the scrollbar visually
  };

  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '10px',
    marginBottom: '15px',
    borderRadius: '4px',
    border: `1px solid ${selectedTheme.borderColor || '#ccc'}`,
    background: hexToRgba(selectedTheme.backgroundColor || '#ffffff', 0.8),
    color: selectedTheme.textColor || '#000000',
    fontFamily: formTextFontFamily,
    boxSizing: 'border-box',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 18px',
    border: 'none',
    borderRadius: '5px',
    background: selectedTheme.buttonBackgroundColor || '#007bff',
    color: selectedTheme.buttonTextColor || '#ffffff',
    fontFamily: buttonTextFontFamily,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1em',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
  };

  const backButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#6c757d',
    marginTop: '10px'
  };

  const choiceContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginTop: '20px',
    flexWrap: 'wrap',
  };

  const successMessageStyle: React.CSSProperties = {
    textAlign: 'center',
    animation: 'fadeIn 1s'
  };

  const mealOptionStyle: React.CSSProperties = {
    padding: '10px',
    margin: '5px 0',
    border: `1px solid ${selectedTheme.borderColor || '#eee'}`,
    borderRadius: '5px',
    cursor: 'pointer'
  };

  const dietaryTagStyle: React.CSSProperties = {
    display: 'inline-block',
    background: '#e0e0e0',
    color: '#333',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '0.75em',
    margin: '0 5px 5px 0',
  };
  
  if (submissionStatus === 'success') {
    return (
      <div style={formStyle} ref={internalFormRef}>
        <div style={successMessageStyle}>
          <h3>Thank You, {firstName}!</h3>
          {finalResponse?.attending ? (
            <p>Your RSVP for {finalResponse.guestCount} has been received. We can't wait to see you!</p>
          ) : (
            <p>We've received your RSVP. We'll miss you!</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={formStyle} ref={internalFormRef}>
      <div style={contentContainerStyle}>
        {isAttending === null ? (
          <div>
            <h3 style={{ textAlign: 'center', marginTop: 0 }}>Will you be joining us?</h3>
            <form>
              <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} />
              <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />

              {/* Fields for BUFFET style, shown on page 1 */}
              {!isPlated && (
                <>
                  <label style={{display: 'block', marginBottom: '5px', marginTop: '15px'}}>How many guests in your party?</label>
                  <input type="number" value={guestCount} onChange={handleGuestCountChange} min="1" style={inputStyle} />
                  
                  <label style={{display: 'block', marginBottom: '5px', marginTop: '15px'}}>Email (Optional)</label>
                  <input 
                    type="email" 
                    placeholder="Email (Optional)" 
                    value={email} 
                    onChange={handleEmailChange} 
                    style={{...inputStyle, borderColor: emailError ? 'red' : (selectedTheme.borderColor || '#ccc')}} 
                  />
                  {emailError && <p style={{ color: 'red', fontSize: '0.8em', marginTop: '-10px', marginBottom: '10px' }}>{emailError}</p>}
                </>
              )}

              <textarea placeholder="Leave a message for the couple (optional)" value={message} onChange={(e) => setMessage(e.target.value)} style={{...inputStyle, height: '80px', resize: 'vertical', marginTop: '10px'}} />
            </form>
            {formError && <p style={{ color: 'red', textAlign: 'center' }}>{formError}</p>}
            <div style={choiceContainerStyle}>
              <button style={buttonStyle} onClick={() => handleAttendanceChoice(false)}>{cantMakeItButtonEmoji} Can't Make It</button>
              <button style={buttonStyle} onClick={() => handleAttendanceChoice(true)}>{canMakeItButtonEmoji} Will Attend</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 style={{ textAlign: 'center', marginTop: 0 }}>We're so happy you can make it!</h3>
            
            {/* Fields for PLATED style, shown on page 2 */}
            <label>
              How many guests in your party?
              <span style={{ fontSize: '0.8em', fontWeight: 'normal', marginLeft: '4px' }}>
                (including you)
              </span>
            </label>
            <input type="number" value={guestCount} onChange={handleGuestCountChange} min="1" style={inputStyle} />
            
            <label style={{display: 'block', marginBottom: '5px', marginTop: '15px'}}>Email (Optional)</label>
            <input 
              type="email" 
              placeholder="Email (Optional)" 
              value={email} 
              onChange={handleEmailChange} 
              style={{...inputStyle, borderColor: emailError ? 'red' : (selectedTheme.borderColor || '#ccc')}} 
            />
            {emailError && <p style={{ color: 'red', fontSize: '0.8em', marginTop: '-10px', marginBottom: '10px' }}>{emailError}</p>}

            {isPlated && platedOptions && platedOptions.length > 0 && (
              <div>
                <h4 style={{ marginTop: '20px' }}>Meal Selection</h4>
                {guestCount > 1 ? (
                  <div>
                    <p>Please select meals for your party of {guestCount}.</p>
                    {platedOptions.map(meal => (
                      <div key={meal.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0' }}>
                        <div>
                          <strong>{meal.name}</strong>
                          {meal.description && <p style={{ fontSize: '0.85em', margin: '2px 0 0' }}>{meal.description}</p>}
                          {meal.dietaryTags?.map(tag => <span key={tag} style={dietaryTagStyle}>{tag}</span>)}
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={guestCount}
                          value={selectedMeals[meal.name] || ''}
                          onChange={(e) => handleMultipleMealQuantityChange(meal.name, e.target.value)}
                          style={{ ...inputStyle, width: '60px', marginBottom: 0 }}
                        />
                      </div>
                    ))}
                    <p style={{fontSize: '0.8rem', textAlign: 'right', marginTop: '5px'}}>Total selected: {getTotalSelectedMealQuantity()} / {guestCount}</p>
                  </div>
                ) : (
                  platedOptions.map(meal => (
                    <div
                      key={meal.name}
                      onClick={() => handleSingleMealChange(meal.name)}
                      style={{ ...mealOptionStyle, background: singleSelectedMeal === meal.name ? '#e0f7fa' : 'transparent' }}
                    >
                      <strong>{meal.name}</strong>
                      {meal.description && <p style={{ fontSize: '0.85em', margin: '2px 0 0' }}>{meal.description}</p>}
                      {meal.dietaryTags?.map(tag => <span key={tag} style={dietaryTagStyle}>{tag}</span>)}
                    </div>
                  ))
                )}
              </div>
            )}
            {formError && <p style={{ color: 'red', textAlign: 'center', marginTop: '15px' }}>{formError}</p>}
            <div style={{...choiceContainerStyle, flexDirection: 'column', gap: '10px'}}>
              <button type="submit" style={buttonStyle} disabled={submissionStatus === 'submitting'}>
                {submissionStatus === 'submitting' ? 'Submitting...' : 'Submit RSVP'}
              </button>
              <button type="button" onClick={handleGoBack} style={backButtonStyle}>Go Back</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
});

export default RSVPForm;
