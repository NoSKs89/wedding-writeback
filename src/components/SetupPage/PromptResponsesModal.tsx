import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiBaseUrl } from '../../config/apiConfig';

interface PromptQuestion {
  id: string;
  question: string;
  placeholder?: string;
  maxLength: number;
  required: boolean;
  position: number;
}

interface PromptResponse {
  responseId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  responses: Record<string, string>;
  isAnonymous: boolean;
  submittedAt: string;
}

interface PromptResponsesData {
  responses: PromptResponse[];
  questions: PromptQuestion[];
  totalResponses: number;
}

interface PromptResponsesModalProps {
  isOpen: boolean;
  onClose: () => void;
  weddingId: string;
}

const PromptResponsesModal: React.FC<PromptResponsesModalProps> = ({ isOpen, onClose, weddingId }) => {
  const [data, setData] = useState<PromptResponsesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'user' | 'prompt'>('user');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Load prompt responses when modal opens
  useEffect(() => {
    if (isOpen && weddingId) {
      loadPromptResponses();
    }
  }, [isOpen, weddingId]);

  const loadPromptResponses = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const apiBase = getApiBaseUrl();
      const response = await axios.get(`${apiBase}/weddings/${weddingId}/prompt-responses`);
      
      if (response.data && response.data.success) {
        setData(response.data.data);
      } else {
        setError('Failed to load prompt responses');
      }
    } catch (err: any) {
      console.error('Error loading prompt responses:', err);
      setError(err.response?.data?.message || 'Failed to load prompt responses');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getUserDisplayName = (response: PromptResponse) => {
    if (response.isAnonymous) {
      return 'Anonymous User';
    }
    return `${response.firstName} ${response.lastName}`;
  };

  const getUserEmail = (response: PromptResponse) => {
    if (response.isAnonymous || !response.email) {
      return '';
    }
    return response.email;
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Prompt Form Responses</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            ×
          </button>
        </div>

        {/* View Mode Toggle */}
        <div style={{
          padding: '15px 20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          gap: '10px',
        }}>
          <button
            onClick={() => setViewMode('user')}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: viewMode === 'user' ? '#007bff' : 'white',
              color: viewMode === 'user' ? 'white' : '#333',
              cursor: 'pointer',
            }}
          >
            View By User
          </button>
          <button
            onClick={() => setViewMode('prompt')}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: viewMode === 'prompt' ? '#007bff' : 'white',
              color: viewMode === 'prompt' ? 'white' : '#333',
              cursor: 'pointer',
            }}
          >
            View By Prompt
          </button>
          {data && (
            <div style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.9rem',
              color: '#666',
            }}>
              Total Responses: {data.totalResponses}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
        }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              Loading responses...
            </div>
          )}

          {error && (
            <div style={{
              padding: '20px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          {data && !isLoading && !error && (
            <>
              {data.responses.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#666',
                }}>
                  No responses yet.
                </div>
              ) : (
                <>
                  {viewMode === 'user' && (
                    <div>
                      {data.responses.map((response) => (
                        <div
                          key={response.responseId}
                          style={{
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            marginBottom: '10px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            onClick={() => toggleExpanded(response.responseId)}
                            style={{
                              padding: '15px',
                              backgroundColor: '#f8f9fa',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 'bold' }}>
                                {getUserDisplayName(response)}
                              </div>
                              {getUserEmail(response) && (
                                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                  {getUserEmail(response)}
                                </div>
                              )}
                              <div style={{ fontSize: '0.8rem', color: '#999' }}>
                                Submitted: {formatDate(response.submittedAt)}
                              </div>
                            </div>
                            <div style={{ fontSize: '1.2rem' }}>
                              {expandedItems.has(response.responseId) ? '−' : '+'}
                            </div>
                          </div>
                          
                          {expandedItems.has(response.responseId) && (
                            <div style={{ padding: '15px' }}>
                              {data.questions.map((question) => (
                                <div key={question.id} style={{ marginBottom: '15px' }}>
                                  <div style={{
                                    fontWeight: 'bold',
                                    marginBottom: '5px',
                                    color: '#333',
                                  }}>
                                    {question.question}
                                  </div>
                                  <div style={{
                                    padding: '10px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '4px',
                                    border: '1px solid #eee',
                                  }}>
                                    {response.responses[question.id] || (
                                      <em style={{ color: '#999' }}>No response</em>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {viewMode === 'prompt' && (
                    <div>
                      {data.questions.map((question) => (
                        <div
                          key={question.id}
                          style={{
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            marginBottom: '10px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            onClick={() => toggleExpanded(question.id)}
                            style={{
                              padding: '15px',
                              backgroundColor: '#f8f9fa',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 'bold' }}>
                                {question.question}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#999' }}>
                                {data.responses.filter(r => r.responses[question.id]).length} responses
                              </div>
                            </div>
                            <div style={{ fontSize: '1.2rem' }}>
                              {expandedItems.has(question.id) ? '−' : '+'}
                            </div>
                          </div>
                          
                          {expandedItems.has(question.id) && (
                            <div style={{ padding: '15px' }}>
                              {data.responses
                                .filter(response => response.responses[question.id])
                                .map((response) => (
                                  <div key={response.responseId} style={{ marginBottom: '15px' }}>
                                    <div style={{
                                      padding: '10px',
                                      backgroundColor: '#f8f9fa',
                                      borderRadius: '4px',
                                      border: '1px solid #eee',
                                    }}>
                                      <div style={{ marginBottom: '8px' }}>
                                        {response.responses[question.id]}
                                      </div>
                                      <div style={{
                                        fontSize: '0.8rem',
                                        color: '#666',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                      }}>
                                        <span>{getUserDisplayName(response)} {getUserEmail(response) && `(${getUserEmail(response)})`}</span>
                                        <span>{formatDate(response.submittedAt)}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              {data.responses.filter(r => r.responses[question.id]).length === 0 && (
                                <div style={{ color: '#999', fontStyle: 'italic' }}>
                                  No responses for this question yet.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptResponsesModal; 