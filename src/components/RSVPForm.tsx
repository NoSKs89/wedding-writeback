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
  const { id: weddingId, isPlated = false, platedOptions = [] } = weddingData;
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

  const handleGuestCountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value, 10);
    setGuestCount(count >= 1 ? count : 1);
    setFormError(null);
  };

  const handleSingleMealChange = (mealName: string) => {
    setSingleSelectedMeal(mealName);
    setFormError(null);
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
    setFormError(null);
  };

  const getTotalSelectedMealQuantity = (): number => {
    if (!isPlated || !isAttending || guestCount <= 0) return 0;
    if (guestCount === 1) return singleSelectedMeal ? 1 : 0;
    return Object.values(selectedMeals).reduce((sum, qty) => sum + (qty || 0), 0);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement> | null, explicitAttendingStatus?: boolean) => {
    if (event) event.preventDefault();
    setFormError(null);

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
      setSubmissionStatus('submitted');
    } catch (error) {
      setFormError('There was an error submitting your RSVP. Please try again.');
      setSubmissionStatus('error');
    }
  };

  // Styles using values from Leva controls
  const formStyle: React.CSSProperties = {
    background: hexToRgba(selectedTheme.backgroundColor || '#ffffff', formBackgroundOpacity),
    color: selectedTheme.textColor || '#000000',
    fontFamily: formTextFontFamily,
    border: `${formBorderWidth}px solid ${formBorderColor}`,
    borderRadius: '8px',
    padding: `${formPadding}px`,
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
  
  const renderContent = () => {
    if (submissionStatus === 'submitted') {
      return (
        <div style={successMessageStyle}>
          <h3>Thank You!</h3>
          <p>{isAttending ? "We can't wait to celebrate with you!" : "Your response has been recorded."}</p>
        </div>
      );
    } else if (submissionStatus === 'error') {
      return (
        <div style={successMessageStyle}>
          <h3>Error Submitting RSVP</h3>
          <p>{formError}</p>
          <button onClick={handleGoBack} style={{...buttonStyle, marginTop: '1rem' }}>Try Again</button>
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
                <div style={{textAlign: 'center'}}>
                  <input type="number" value={guestCount} onChange={handleGuestCountChange} min="1" style={{...inputStyle, marginBottom: '1.5rem', textAlign: 'center', width: '80px'}} />
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
          <input type="number" value={guestCount} onChange={handleGuestCountChange} min="1" style={{...inputStyle, marginBottom: '1.5rem', textAlign: 'center', width: '80px'}} />

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
                      <input id={`meal-${meal.name}`} type="number" min="0" max={guestCount} value={selectedMeals[meal.name] || ''} onChange={e => handleMultipleMealQuantityChange(meal.name, e.target.value)} style={{...inputStyle, width: '60px', textAlign: 'center'}} />
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

  return (
    <div ref={internalFormRef} style={formStyle}>
      <div style={contentContainerStyle}>
        {renderContent()}
      </div>
    </div>
  );
});

export default RSVPForm;
