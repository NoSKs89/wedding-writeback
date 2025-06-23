import React, { useState, useEffect, FormEvent, ChangeEvent, forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import axios from 'axios';
import { useControls, folder } from 'leva';
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
  id?: string | number;
  customId?: string;
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
  elementName?: string;
  styleControlsFromProp?: any;
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

export const rsvpFormControlsSchema = {
  formThemeName: { value: defaultThemeName, options: formThemes.map(theme => theme.name), label: 'Form Theme' },
  formTextFontFamily: { value: initialTextFontFamily, options: fontFamilyOptions, label: 'Text Font' },
  buttonTextFontFamily: { value: initialButtonFontFamily, options: fontFamilyOptions, label: 'Button Font' },
  useThemeButtonColors: { value: true, label: 'Use Theme Button Colors' },
  cantMakeItColor: { value: '#D32F2F', label: "Can't Make It Color", render: (get: (path: string) => any) => !get('RSVP Form Style.useThemeButtonColors') },
  canMakeItColor: { value: '#4CAF50', label: 'Will Attend Color', render: (get: (path: string) => any) => !get('RSVP Form Style.useThemeButtonColors') },
  formBackgroundOpacity: { value: 1, min: 0, max: 1, step: 0.01, label: 'Background Opacity' },
  formBorderColor: { value: initialBorderColorFromTheme, label: 'Border Color' },
  formBorderWidth: { value: 1, min: 0, max: 10, step: 1, label: 'Border Width (px)' },
  formWidth: { value: 500, min: 300, max: 1200, step: 10, label: 'Form Width (px)' },
  formHeight: { value: 460, min: 400, max: 1000, step: 10, label: 'Form Height (px)' },
  formPadding: { value: 30, min: 10, max: 50, step: 1, label: 'Padding (px)' },
  stackThreshold: { value: 400, min: 200, max: 600, step: 10, label: 'Stacking Width (px)'},
  cantMakeItButtonEmoji: { value: '😥', label: "Can't Make It Emoji"},
  canMakeItButtonEmoji: { value: '😄', label: "Can Make It Emoji"},
};

const RSVPForm = forwardRef<HTMLDivElement, RSVPFormProps>(({ weddingData, backendUrl, elementName = 'RSVP Form', styleControlsFromProp = {} }, ref) => {
  const { customId: weddingId, isPlated = false, platedOptions = [] } = weddingData;
  const { isSetupMode } = useSetupMode();
  
  // ADDED: Create a default set of values from the schema
  const defaultStyleValues = useMemo(() => Object.entries(rsvpFormControlsSchema).reduce((acc: any, [key, val]: [string, any]) => {
    acc[key] = val.value;
    return acc;
  }, {}), []);
  
  // ADDED: The component will now get its values from props, merged with defaults.
  const {
    formThemeName,
    formTextFontFamily,
    buttonTextFontFamily,
    useThemeButtonColors,
    cantMakeItColor,
    canMakeItColor,
    formBackgroundOpacity,
    formBorderColor,
    formBorderWidth,
    cantMakeItButtonEmoji,
    canMakeItButtonEmoji,
    formWidth,
    formHeight,
    formPadding,
    stackThreshold
  } = useMemo(() => ({
    ...defaultStyleValues,
    ...styleControlsFromProp,
  }), [defaultStyleValues, styleControlsFromProp]);

  const internalFormRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => internalFormRef.current as HTMLDivElement);

  const selectedTheme: FormTheme = useMemo(() => {
    const theme = formThemes.find(t => t.name === formThemeName) || getThemeByName(defaultThemeName);
    return theme || formThemes[0] || { 
      name: 'EmergencyFallback', 
      backgroundColor: '#ffffff', 
      textColor: '#000000', 
      fontFamily: fontFamilyOptions[0],
      borderColor: '#cccccc',
      buttonBackgroundColor: '#007bff',
      buttonTextColor: '#ffffff'
    };
  }, [formThemeName]);

  const cantMakeItButtonStyle = {
    backgroundColor: useThemeButtonColors ? selectedTheme.buttonBackgroundColor : cantMakeItColor,
    color: useThemeButtonColors ? selectedTheme.buttonTextColor : '#ffffff',
  };

  const canMakeItButtonStyle = {
    backgroundColor: useThemeButtonColors ? selectedTheme.buttonBackgroundColor : canMakeItColor,
    color: useThemeButtonColors ? selectedTheme.buttonTextColor : '#ffffff',
  };

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
  const [formError, setFormError] = useState<string | null>(null);
  const [isAttending, setIsAttending] = useState<boolean | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const [finalResponse, setFinalResponse] = useState<any>(null);
  const [isClosed, setIsClosed] = useState(false);

  const h2Style: React.CSSProperties = {
    fontSize: '1.2rem',
    fontWeight: 500,
    color: selectedTheme.textColor,
    fontFamily: formTextFontFamily,
  };

  const h3Style: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 500,
    color: selectedTheme.textColor,
    fontFamily: formTextFontFamily,
  };

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
    setFormError(null);
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
    setFormError(null);
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

  const handleGuestCountChange = (newCount: number) => {
    const count = Math.max(1, newCount);
    setGuestCount(count);
    setFormError(null);
  };

  const handleSingleMealChange = (mealName: string) => {
    setSingleSelectedMeal(mealName);
    setFormError(null);
  };

  const handleMultipleMealQuantityChange = (mealName: string, newQuantity: number) => {
    const otherMealsTotal = Object.entries(selectedMeals).reduce((sum, [key, qty]) => {
      return key === mealName ? sum : sum + (qty || 0);
    }, 0);

    const validatedQuantity = Math.max(0, newQuantity);

    if (otherMealsTotal + validatedQuantity > guestCount) {
      setFormError(`Exceeded Food For Guest Count of ${guestCount}. You have ${guestCount - otherMealsTotal} selections remaining.`);
      // Allow setting quantity up to the remaining limit
      const maxAllowed = guestCount - otherMealsTotal;
      setSelectedMeals(prev => ({ ...prev, [mealName]: maxAllowed }));
      return;
    }
    setSelectedMeals(prev => ({ ...prev, [mealName]: validatedQuantity }));
    setFormError(null);
  };

  const getTotalSelectedMealQuantity = (): number => {
    if (!isPlated || !isAttending || guestCount <= 0) return 0;
    if (guestCount === 1) return singleSelectedMeal ? 1 : 0;
    return Object.values(selectedMeals).reduce((sum, qty) => sum + (qty || 0), 0);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement> | null, explicitAttendingStatus?: boolean) => {
    if (event) {
      event.preventDefault();
    }

    if (submissionStatus === 'submitting') return;
    setSubmissionStatus('submitting');
    setFormError(null);

    // Determine attending status from explicit parameter or component state
    const attending = explicitAttendingStatus !== undefined ? explicitAttendingStatus : isAttending;
    
    // Validate email if provided
    if (email && !validateEmail(email)) {
      setFormError("Please correct the email address before submitting.");
      setSubmissionStatus('error');
      return;
    }

    // Validate meal selections if attending plated dinner
    if (attending && isPlated && guestCount > 1) {
      if (getTotalSelectedMealQuantity() !== guestCount) {
        setFormError(`Please select meals for all ${guestCount} guests.`);
        setSubmissionStatus('error');
        return;
      }
    } else if (attending && isPlated && guestCount === 1) {
      if (!singleSelectedMeal) {
        setFormError("Please select your meal.");
        setSubmissionStatus('error');
        return;
      }
    }

    let mealDetails: any = null;
    if (attending && isPlated) {
      if (guestCount > 1) {
        mealDetails = selectedMeals;
      } else {
        mealDetails = { [singleSelectedMeal]: 1 };
      }
    }

    const payload = {
      weddingId,
      firstName,
      lastName,
      email,
      attending: attending,
      guestCount: attending ? guestCount : 0,
      message: attending ? message : `Sorry to miss it! - ${message}`,
      mealChoices: mealDetails,
      isPlated,
      platedOptions,
    };

    try {
      const response = await axios.post(backendUrl, payload);
      setFinalResponse(response.data);
      setSubmissionStatus('submitted');
    } catch (err: any) {
      console.error("Error submitting RSVP:", err);
      const errorMessage = err.response?.data?.message || 'There was an error submitting your RSVP. Please try again.';
      setFormError(errorMessage);
      setSubmissionStatus('error');
    }
  };

  // Styles using values from Leva controls
  const formContainerStyle: React.CSSProperties = {
    backgroundColor: hexToRgba(selectedTheme.backgroundColor, formBackgroundOpacity),
    color: selectedTheme.textColor,
    border: `${formBorderWidth}px solid ${formBorderColor}`,
    padding: `${formPadding}px`,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    boxSizing: 'border-box',
    width: `${formWidth}px`,
    maxWidth: '100%',
    fontFamily: formTextFontFamily,
    transition: 'height 0.4s ease-in-out',
    height: (submissionStatus === 'submitted' || submissionStatus === 'error') ? 'auto' : `${formHeight}px`,
  };

  const contentContainerStyle: React.CSSProperties = {
    flexGrow: 1,
    overflowY: 'auto',
    paddingRight: '15px',
    marginRight: '-15px',
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
  
  const stepperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  };

  const stepperButtonStyle: React.CSSProperties = {
    padding: '0.5rem',
    width: '40px',
    height: '40px',
    border: `1px solid ${selectedTheme.borderColor || '#ccc'}`,
    borderRadius: '50%',
    background: 'transparent',
    color: selectedTheme.textColor,
    fontSize: '1.2rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const stepperInputStyle: React.CSSProperties = {
    ...inputStyle,
    width: '60px',
    textAlign: 'center',
    marginBottom: '0',
    // Remove spinner arrows for browsers that might still show them
    MozAppearance: 'textfield',
    WebkitAppearance: 'none',
    appearance: 'none',
  };

  const renderContent = () => {
    if (submissionStatus === 'submitted') {
      const attendingMessage = finalResponse.isAttending ? "We're so excited to celebrate with you!" : "You'll be missed!";
      return (
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <button 
            onClick={() => setIsClosed(true)}
            style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: selectedTheme.textColor }}
          >
            &times;
          </button>
          <h2 style={{...h2Style}}>Thank You, {finalResponse.firstName}!</h2>
          <p style={{color: selectedTheme.textColor, fontFamily: formTextFontFamily}}>{attendingMessage}</p>
          {/* Optional: Show summary of what was submitted */}
        </div>
      );
    } else if (submissionStatus === 'error') {
      return (
        <div style={{ textAlign: 'center', position: 'relative' }}>
           <button 
            onClick={() => setIsClosed(true)}
            style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: selectedTheme.textColor }}
          >
            &times;
          </button>
          <h2 style={{...h2Style}}>Error Submitting RSVP</h2>
          <p style={{ color: 'red' }}>{formError}</p>
          <button onClick={() => setSubmissionStatus('idle')} style={{...buttonStyle, marginTop: '1rem'}}>Try Again</button>
        </div>
      );
    }

    if (isAttending === null) {
      // The initial form view
      return (
        <form onSubmit={(e) => handleSubmit(e, true)}>
          <h2 style={{...h2Style, textAlign: 'center', marginBottom: '1.5rem'}}>Will you be joining us?</h2>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" required style={{ ...inputStyle, width: '50%' }} />
            <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name" required style={{ ...inputStyle, width: '50%' }} />
          </div>
          <input type="email" value={email} onChange={handleEmailChange} placeholder="Email (Optional)" style={{ ...inputStyle, marginBottom: '1rem' }} />
          {emailError && <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>{emailError}</p>}

          {!isPlated && (
            <>
              <div style={{marginTop: '1.5rem'}}>
                <h2 style={{...h2Style, marginBottom: '0rem', textAlign: 'center'}}>How many guests in your party?</h2>
                <p style={{fontSize: '0.8rem', opacity: 0.7, margin: '0 0 1rem 0', textAlign: 'center'}}>(Including yourself)</p>
                <div style={{...stepperStyle, marginBottom: '1.5rem'}}>
                  <button type="button" onClick={() => handleGuestCountChange(guestCount - 1)} style={stepperButtonStyle}>-</button>
                  <input type="number" value={guestCount} onChange={e => handleGuestCountChange(parseInt(e.target.value, 10))} min="1" style={stepperInputStyle} />
                  <button type="button" onClick={() => handleGuestCountChange(guestCount + 1)} style={stepperButtonStyle}>+</button>
                </div>
              </div>
              <div>
                <h2 style={{...h2Style, marginBottom: '0.5rem', textAlign: 'center'}}>Send a message to the couple!</h2>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Your message here..." style={{...inputStyle, height: '80px', marginBottom: '1.5rem'}} />
              </div>
            </>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '1.5rem', gap: '1rem' }}>
            <button type="button" onClick={() => handleSubmit(null, false)} style={{...buttonStyle, ...cantMakeItButtonStyle}}>
              <span role="img" aria-label="sad face">{cantMakeItButtonEmoji}</span> Can't Make It
            </button>
            <button type={isPlated ? 'button' : 'submit'} onClick={isPlated ? () => handleAttendanceChoice(true) : undefined} style={{...buttonStyle, ...canMakeItButtonStyle}}>
              <span role="img" aria-label="happy face">{canMakeItButtonEmoji}</span> Will Attend
            </button>
          </div>
          {formError && <p style={{ color: 'red', textAlign: 'center', marginTop: '1rem' }}>{formError}</p>}
        </form>
      );
    }

    if (isAttending === true) {
      // The second page of the form, for plated meals
      return (
        <form onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
          <h2 style={{...h2Style, marginBottom: '0rem'}}>How many guests in your party?</h2>
          <p style={{fontSize: '0.8rem', opacity: 0.7, margin: '0 0 1rem 0'}}>(Including yourself)</p>
          <div style={{...stepperStyle, marginBottom: '1.5rem'}}>
            <button type="button" onClick={() => handleGuestCountChange(guestCount - 1)} style={stepperButtonStyle}>-</button>
            <input type="number" value={guestCount} onChange={e => handleGuestCountChange(parseInt(e.target.value, 10))} min="1" style={stepperInputStyle} />
            <button type="button" onClick={() => handleGuestCountChange(guestCount + 1)} style={stepperButtonStyle}>+</button>
          </div>

          {isPlated && platedOptions.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{...h3Style, marginBottom: '1rem'}}>Please select your meal choice(s):</h3>
              {guestCount === 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                  {platedOptions.map(meal => (
                    <label key={meal.name} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input type="radio" name="singleMeal" value={meal.name} checked={singleSelectedMeal === meal.name} onChange={() => handleSingleMealChange(meal.name)} style={{ marginRight: '10px' }} />
                      {meal.name}
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {platedOptions.map(meal => (
                    <div key={meal.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label htmlFor={`meal-${meal.name}`}>{meal.name}</label>
                      <div style={stepperStyle}>
                        <button type="button" onClick={() => handleMultipleMealQuantityChange(meal.name, (selectedMeals[meal.name] || 0) - 1)} style={{...stepperButtonStyle, height: '35px', width: '35px', fontSize: '1rem'}}>-</button>
                        <input id={`meal-${meal.name}`} type="number" min="0" max={guestCount} value={selectedMeals[meal.name] || ''} onChange={e => handleMultipleMealQuantityChange(meal.name, parseInt(e.target.value, 10))} style={{...stepperInputStyle, width: '50px'}} />
                        <button type="button" onClick={() => handleMultipleMealQuantityChange(meal.name, (selectedMeals[meal.name] || 0) + 1)} style={{...stepperButtonStyle, height: '35px', width: '35px', fontSize: '1rem'}}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <h2 style={{...h2Style, marginBottom: '0.5rem'}}>Send a message to the couple!</h2>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Your message here..." style={{...inputStyle, height: '80px', marginBottom: '1.5rem'}} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <button type="button" onClick={handleGoBack} style={{...buttonStyle, backgroundColor: '#757575'}}>Back</button>
            <button type="submit" style={buttonStyle} disabled={submissionStatus === 'submitting'}>
              {submissionStatus === 'submitting' ? 'Submitting...' : 'Submit RSVP'}
            </button>
          </div>
          {formError && <p style={{ color: 'red', textAlign: 'center', marginTop: '1rem' }}>{formError}</p>}
        </form>
      );
    }

    // This case should ideally not be reached if submissionStatus handles the final states.
    // It's a fallback.
    return <div>Thank you for your response.</div>;
  };

  if (isClosed) {
    return null; // Hide the entire component if closed
  }
  
  return (
    <div ref={internalFormRef} style={formContainerStyle}>
      <div style={contentContainerStyle}>
        {renderContent()}
      </div>
    </div>
  );
});

export default RSVPForm;
