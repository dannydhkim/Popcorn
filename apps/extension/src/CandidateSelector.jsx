import React, { useState } from 'react';

const CandidateSelector = ({ candidates, onConfirm, onCancel }) => {
  const [selectedId, setSelectedId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  const handleCandidateClick = (candidate) => {
    if (confirmingId === candidate.id) {
      // Already confirming this one, collapse it
      setConfirmingId(null);
    } else {
      // Show confirmation for this candidate
      setConfirmingId(candidate.id);
      setSelectedId(candidate.id);
    }
  };

  const handleConfirm = (candidate) => {
    onConfirm(candidate);
    setConfirmingId(null);
    setSelectedId(null);
  };

  const handleReject = () => {
    setConfirmingId(null);
    setSelectedId(null);
  };

  if (!candidates || candidates.length === 0) {
    return (
      <div className="candidate-selector empty">
        <p>No matches found. Try searching manually.</p>
        {onCancel && (
          <button onClick={onCancel} className="cancel-button">
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="candidate-selector">
      <div className="candidate-header">
        <h3>Select the correct title:</h3>
        {onCancel && (
          <button onClick={onCancel} className="close-button" aria-label="Close">
            ×
          </button>
        )}
      </div>
      <div className="candidate-list">
        {candidates.map((candidate) => {
          const isConfirming = confirmingId === candidate.id;
          return (
            <div
              key={`${candidate.mediaType}-${candidate.id}`}
              className={`candidate-row ${isConfirming ? 'confirming' : ''}`}
            >
              <button
                className="candidate-button"
                onClick={() => handleCandidateClick(candidate)}
              >
                {candidate.posterUrl && (
                  <img
                    src={candidate.posterUrl}
                    alt={candidate.title}
                    className="candidate-poster"
                  />
                )}
                <div className="candidate-info">
                  <div className="candidate-title">{candidate.title}</div>
                  <div className="candidate-meta">
                    {candidate.year && <span className="candidate-year">{candidate.year}</span>}
                    {candidate.mediaType && (
                      <span className="candidate-type">
                        {candidate.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                      </span>
                    )}
                    {candidate.network && (
                      <span className="candidate-network">{candidate.network}</span>
                    )}
                    {candidate.studio && (
                      <span className="candidate-studio">{candidate.studio}</span>
                    )}
                  </div>
                </div>
              </button>
              {isConfirming && (
                <div className="confirmation-actions">
                  <button
                    className="confirm-button"
                    onClick={() => handleConfirm(candidate)}
                    aria-label="Confirm"
                    title="Confirm this match"
                  >
                    ✓
                  </button>
                  <button
                    className="reject-button"
                    onClick={handleReject}
                    aria-label="Cancel"
                    title="Cancel"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CandidateSelector;
