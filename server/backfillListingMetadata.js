import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Property from './models/property.js';

dotenv.config();

const inferTier = (property) => {
  const hasRooms = Array.isArray(property.buildings) && property.buildings.some(
    (building) => Array.isArray(building.grid) && building.grid.some(
      (row) => Array.isArray(row) && row.some((cell) => cell.type === 'room')
    )
  );

  if (property.listingTier) return property.listingTier;
  return hasRooms ? 'live' : 'directory';
};

const inferVacancy = (property, tier) => {
  if (property.vacancyStatus) return property.vacancyStatus;
  if (tier !== 'live') return 'unknown';

  const vacantRooms = Number(property.vacantRooms || 0);
  if (vacantRooms > 3) return 'available';
  if (vacantRooms > 0) return 'limited';
  return 'full';
};

const inferActionability = (tier) => {
  if (tier === 'directory') return 'info_only';
  if (tier === 'claimed') return 'inquiry_only';
  return 'full_transaction';
};

const inferListingState = (property) => {
  if (property.listingState) return property.listingState;
  if (property.isExpired) return 'archived';
  if (property.needsRefresh) return 'stale';
  return 'active';
};

const run = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI missing in environment');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 60000,
    });

    const properties = await Property.find({});

    let updated = 0;
    for (const property of properties) {
      const tier = inferTier(property);
      const vacancy = inferVacancy(property, tier);
      const actionability = inferActionability(tier);
      const listingState = inferListingState(property);
      const hasImages = Array.isArray(property.images) && property.images.length > 0;
      const hasRoomLevelData = Array.isArray(property.buildings) && property.buildings.some(
        (building) => Array.isArray(building.grid) && building.grid.some(
          (row) => Array.isArray(row) && row.some((cell) => cell.type === 'room')
        )
      );

      property.listingTier = tier;
      property.vacancyStatus = vacancy;
      property.actionability = actionability;
      property.listingState = listingState;
      property.hasImages = hasImages;
      property.hasRoomLevelData = hasRoomLevelData;

      await property.save();
      updated += 1;
    }

    console.log(`Backfill complete. Updated ${updated} properties.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error.message);
    console.error(error.stack);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect errors
    }
    process.exit(1);
  }
};

run();
