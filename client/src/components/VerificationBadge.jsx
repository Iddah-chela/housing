import React, { useState } from 'react';

const VerificationBadge = ({ type, isVerified, className = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const badgeInfo = {
    lister: {
      label: 'Verified Lister',
      tooltip: 'This owner has verified their phone number and government ID'
    },
    house: {
      label: 'Verified House',
      tooltip: 'This property has been verified with real photos and confirmed location'
    }
  };

  if (!isVerified) return null;

  const info = badgeInfo[type];

  return (
    <div className="relative inline-block">
      <div
        className={`flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium cursor-help ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span>✓</span>
        <span>{info.label}</span>
        <span className="text-blue-600">ⓘ</span>
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 z-10">
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <p>{info.tooltip}</p>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationBadge;
