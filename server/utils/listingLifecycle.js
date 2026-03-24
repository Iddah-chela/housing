const hasRoomGridData = (property) =>
  Array.isArray(property?.buildings) && property.buildings.some(
    (building) => Array.isArray(building.grid) && building.grid.some(
      (row) => Array.isArray(row) && row.some((cell) => cell?.type === 'room')
    )
  );

const hasRentPricing = (property) => {
  if (Number(property?.listedRentMin || 0) > 0) return true;
  if (Number(property?.listedRentMax || 0) > 0) return true;
  return Array.isArray(property?.buildings) && property.buildings.some(
    (building) => Array.isArray(building.grid) && building.grid.some(
      (row) => Array.isArray(row) && row.some((cell) => Number(cell?.pricePerMonth || 0) > 0)
    )
  );
};

export const evaluateListingReadiness = (property) => {
  const hasRoomGrid = hasRoomGridData(property);
  const hasUnitCount = Number(property?.totalRooms || 0) > 0 || Number(property?.declaredUnits || 0) > 0;
  const hasPricing = hasRentPricing(property);
  const hasContact = !!String(property?.whatsappNumber || property?.contact || property?.claimPhone || '').trim();
  const hasOwnerLabel = !!String(property?.landlordName || '').trim();

  const checklist = {
    hasRoomGrid,
    hasUnitCount,
    hasPricing,
    hasContact,
    hasOwnerLabel,
  };

  const missing = [];
  if (!hasRoomGrid) missing.push('Add room/unit grid');
  if (!hasUnitCount) missing.push('Add total units or room grid');
  if (!hasPricing) missing.push('Set rent pricing');
  if (!hasContact) missing.push('Set landlord contact/WhatsApp');
  if (!hasOwnerLabel) missing.push('Set landlord display name');

  return {
    checklist,
    missing,
    readyForLive: missing.length === 0,
  };
};

export const normalizeListingActionability = (listingTier) => {
  if (listingTier === 'live') return 'full_transaction';
  return 'info_only';
};

export const applyAutoListingLifecycle = (property) => {
  const { checklist, missing, readyForLive } = evaluateListingReadiness(property);

  const isClaimVerified = String(property?.claimStatus || '').toLowerCase() === 'verified';
  const isClaimed = !!property?.isClaimed;
  const canAutoPromoteClaimedListing = isClaimed && isClaimVerified && readyForLive;

  if (canAutoPromoteClaimedListing) {
    property.listingTier = 'live';
    property.listingState = 'active';
    property.lastConfirmedAt = new Date();
  } else if (property?.isClaimed || property?.claimStatus === 'verified' || property?.claimStatus === 'pending') {
    if (property.listingTier !== 'live') {
      property.listingTier = 'claimed';
    }
  } else if (!property.listingTier) {
    property.listingTier = 'directory';
  }

  property.actionability = normalizeListingActionability(property.listingTier);

  return {
    checklist,
    missing,
    readyForLive,
    listingTier: property.listingTier,
    actionability: property.actionability,
  };
};
