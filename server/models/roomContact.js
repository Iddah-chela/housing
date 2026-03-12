import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  property:   { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  buildingId: { type: String, required: true },
  row:        { type: Number, required: true },
  col:        { type: Number, required: true },
  name:       { type: String, default: '' },
  phone:      { type: String, default: '' },
  email:      { type: String, default: '', lowercase: true, trim: true },
}, { timestamps: true })

schema.index({ property: 1, buildingId: 1, row: 1, col: 1 }, { unique: true })

export default mongoose.model('RoomContact', schema)
