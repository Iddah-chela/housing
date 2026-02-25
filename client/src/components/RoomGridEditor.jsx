import React, { useState } from 'react'
import { assets } from '../assets/assets.js'
import toast from 'react-hot-toast'

const RoomGridEditor = ({ onClose, roomData, onSave }) => {
    const [gridLayout, setGridLayout] = useState(roomData.gridLayout || {
        rows: 3,
        cols: 4,
        gate: { row: 1, col: 0 },
        rooms: roomData.rooms || []
    })
    
    const [selectedRoom, setSelectedRoom] = useState(null)
    const [editMode, setEditMode] = useState('place') // 'place', 'edit'

    const handleCellClick = (row, col) => {
        if (editMode === 'place') {
            // Check ifgate
            if (row === gridLayout.gate.row && col === gridLayout.gate.col) return
            
            // Check if room already exists
            const existingRoom = gridLayout.rooms.find(r => r.row === row && r.col === col)
            if (existingRoom) {
                setSelectedRoom(existingRoom)
            } else {
                // Add new room
                const newRoom = {
                    id: `room_${Date.now()}`,
                    row,
                    col,
                    number: gridLayout.rooms.length + 1,
                    status: 'vacant',
                    price: 0
                }
                setGridLayout({
                    ...gridLayout,
                    rooms: [...gridLayout.rooms, newRoom]
                })
                setSelectedRoom(newRoom)
            }
        }
    }

    const updateSelectedRoom = (updates) => {
        setGridLayout({
            ...gridLayout,
            rooms: gridLayout.rooms.map(r => 
                r.id === selectedRoom.id ? {...r, ...updates} : r
            )
        })
        setSelectedRoom({...selectedRoom, ...updates})
    }

    const deleteRoom = (roomId) => {
        setGridLayout({
            ...gridLayout,
            rooms: gridLayout.rooms.filter(r => r.id !== roomId)
        })
        setSelectedRoom(null)
        toast.success('Room removed')
    }

    const getRoomAtPosition = (row, col) => {
        return gridLayout.rooms.find(r => r.row === row && r.col === col)
    }

    const isGate = (row, col) => {
        return row === gridLayout.gate.row && col === gridLayout.gate.col
    }

    const handleSave = () => {
        onSave(gridLayout)
        toast.success('Room layout saved!')
        onClose()
    }

    return (
        <div 
            onClick={onClose}
            className='fixed top-0 bottom-0 left-0 right-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4'
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className='bg-white rounded-xl max-w-6xl w-full shadow-2xl max-h-[90vh] overflow-y-auto'
            >
                {/* Header */}
                <div className='sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-t-xl flex justify-between items-center'>
                    <div>
                        <h2 className='text-white text-2xl font-semibold'>Room Layout Editor</h2>
                        <p className='text-white/80 text-sm mt-1'>Click cells to add rooms, manage status and pricing</p>
                    </div>
                    <img 
                        src={assets.closeIcon} 
                        alt="close" 
                        className='h-6 w-6 cursor-pointer invert hover:scale-110 transition-all' 
                        onClick={onClose} 
                    />
                </div>

                <div className='p-6'>
                    <div className='flex gap-6 flex-wrap lg:flex-nowrap'>
                        {/* Grid Area */}
                        <div className='flex-1'>
                            <div className='flex gap-2 mb-4'>
                                <button
                                    onClick={() => setEditMode('place')}
                                    className={`px-4 py-2 rounded-lg transition-all ${editMode === 'place' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                                >
                                    Add/Select Rooms
                                </button>
                            </div>

                            {/* The Grid */}
                            <div className='bg-gray-50 p-6 rounded-lg border-2 border-gray-300'>
                                <div className='inline-block'>
                                    {Array.from({length: gridLayout.rows}).map((_, row) => (
                                        <div key={row} className='flex gap-2 mb-2'>
                                            {Array.from({length: gridLayout.cols}).map((_, col) => {
                                                const room = getRoomAtPosition(row, col)
                                                const isGateCell = isGate(row, col)
                                                
                                                return (
                                                    <div
                                                        key={`${row}-${col}`}
                                                        onClick={() => handleCellClick(row, col)}
                                                        className={`w-24 h-24 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-all
                                                            ${isGateCell ? 'bg-yellow-100 border-yellow-500' : ''}
                                                            ${room && room.status === 'vacant' ? 'bg-green-100 border-green-500 hover:border-green-600' : ''}
                                                            ${room && room.status === 'occupied' ? 'bg-red-100 border-red-500 hover:border-red-600' : ''}
                                                            ${!room && !isGateCell ? 'bg-white border-gray-300 hover:border-indigo-400' : ''}
                                                            ${selectedRoom?.id === room?.id ? 'ring-4 ring-indigo-400' : ''}
                                                        `}
                                                    >
                                                        {isGateCell ? (
                                                            <>
                                                                <div className='text-2xl'>🚪</div>
                                                                <div className='text-xs font-bold'>GATE</div>
                                                            </>
                                                        ) : room ? (
                                                            <>
                                                                <div className='text-sm font-bold'>Room {room.number}</div>
                                                                <div className='text-xs'>{room.status}</div>
                                                                {room.price > 0 && <div className='text-xs'>Ksh {room.price}</div>}
                                                            </>
                                                        ) : (
                                                            <div className='text-xs text-gray-400'>Empty</div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ))}
                                </div>
                                
                                <div className='mt-4 text-sm text-gray-600'>
                                    <p>🚪 Gate entrance | 🟢 Vacant | 🔴 Occupied</p>
                                </div>
                            </div>

                            {/* Grid Controls */}
                            <div className='mt-4 flex gap-2'>
                                <button
                                    onClick={() => setGridLayout({...gridLayout, rows: Math.max(1, gridLayout.rows - 1)})}
                                    className='px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded'
                                >
                                    - Row
                                </button>
                                <button
                                    onClick={() => setGridLayout({...gridLayout, rows: Math.min(6, gridLayout.rows + 1)})}
                                    className='px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded'
                                >
                                    + Row
                                </button>
                                <button
                                    onClick={() => setGridLayout({...gridLayout, cols: Math.max(1, gridLayout.cols - 1)})}
                                    className='px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded'
                                >
                                    - Col
                                </button>
                                <button
                                    onClick={() => setGridLayout({...gridLayout, cols: Math.min(8, gridLayout.cols + 1)})}
                                    className='px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded'
                                >
                                    + Col
                                </button>
                            </div>
                        </div>

                        {/* Room Editor Panel */}
                        <div className='w-full lg:w-80 bg-gray-50 p-4 rounded-lg'>
                            <h3 className='font-semibold text-lg mb-4'>
                                {selectedRoom ? `Edit Room ${selectedRoom.number}` : 'Select a room to edit'}
                            </h3>
                            
                            {selectedRoom ? (
                                <div className='space-y-4'>
                                    <div>
                                        <label className='block text-sm font-medium mb-2'>Room Number</label>
                                        <input
                                            type='number'
                                            value={selectedRoom.number}
                                            onChange={(e) => updateSelectedRoom({number: parseInt(e.target.value)})}
                                            className='w-full px-3 py-2 border rounded-lg'
                                        />
                                    </div>

                                    <div>
                                        <label className='block text-sm font-medium mb-2'>Status</label>
                                        <select
                                            value={selectedRoom.status}
                                            onChange={(e) => updateSelectedRoom({status: e.target.value})}
                                            className='w-full px-3 py-2 border rounded-lg'
                                        >
                                            <option value='vacant'>Vacant</option>
                                            <option value='occupied'>Occupied</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className='block text-sm font-medium mb-2'>Monthly Rent (Ksh)</label>
                                        <input
                                            type='number'
                                            value={selectedRoom.price}
                                            onChange={(e) => updateSelectedRoom({price: parseInt(e.target.value)})}
                                            className='w-full px-3 py-2 border rounded-lg'
                                        />
                                    </div>

                                    <button
                                        onClick={() => deleteRoom(selectedRoom.id)}
                                        className='w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg'
                                    >
                                        Remove Room
                                    </button>
                                </div>
                            ) : (
                                <p className='text-gray-500 text-sm'>Click on the grid or an existing room to edit its details</p>
                            )}

                            {/* Summary */}
                            <div className='mt-6 p-3 bg-white rounded-lg border'>
                                <h4 className='font-semibold mb-2'>Summary</h4>
                                <p className='text-sm'>Total Rooms: {gridLayout.rooms.length}</p>
                                <p className='text-sm'>Vacant: {gridLayout.rooms.filter(r => r.status === 'vacant').length}</p>
                                <p className='text-sm'>Occupied: {gridLayout.rooms.filter(r => r.status === 'occupied').length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className='mt-6 flex justify-end gap-3'>
                        <button
                            onClick={onClose}
                            className='px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className='px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg'
                        >
                            Save Layout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RoomGridEditor
