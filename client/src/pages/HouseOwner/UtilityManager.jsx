import React, { useEffect, useState, useCallback } from 'react'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'
import { Zap, Droplets, Bell, CheckCircle, AlertCircle, Clock, Settings, ChevronDown, ChevronRight } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const statusColor = {
  paid:    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  partial: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  unpaid:  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
}

const UtilityManager = ({ initialProperties } = {}) => {
  const { axios, getToken } = useAppContext()

  // --- property selection ---
  const [properties, setProperties] = useState(initialProperties || [])
  const [selectedProperty, setSelectedProperty] = useState(initialProperties?.[0] || null)
  const [loadingProps, setLoadingProps] = useState(!initialProperties)

  // --- month/year/type filter ---
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [typeFilter, setTypeFilter] = useState('electricity') // 'electricity' | 'water'

  // --- utility entries ---
  const [entries, setEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(false)

  // --- settings panel ---
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState({
    waterPaidBy: 'tenant',
    electricityPaidBy: 'tenant',
    electricityRatePerUnit: '',
    waterRatePerUnit: '',
    reminderNote: ''
  })
  const [savingSettings, setSavingSettings] = useState(false)

  // --- record form ---
  const [recordForm, setRecordForm] = useState(null) // { buildingId, row, col, roomLabel }
  const [recordData, setRecordData] = useState({ previousReading: '', currentReading: '', amountDue: '', amountPaid: '', note: '', applyToAll: false })
  const [saving, setSaving] = useState(false)

  // --- reminders ---
  const [sendingReminder, setSendingReminder] = useState(null) // key string
  // --- room contacts (manual tenants) ---
  const [roomContacts, setRoomContacts] = useState({}) // { 'buildingId-row-col': contact }
  const [inviteRoom, setInviteRoom]     = useState(null) // { buildingId, row, col, roomLabel, notSignedUp, existingContact }
  const [inviteForm, setInviteForm]     = useState({ name: '', phone: '', email: '' })
  const [savingContact, setSavingContact] = useState(false)

  // -- load properties --------------------------------------------------
  useEffect(() => {
    if (initialProperties) return // already provided by parent
    const load = async () => {
      try {
        const token = await getToken()
        const { data } = await axios.get('/api/properties/owner/my-properties', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const props = data?.properties || []
        setProperties(props)
        if (props.length > 0) setSelectedProperty(props[0])
      } catch { toast.error('Failed to load properties') }
      finally { setLoadingProps(false) }
    }
    load()
  }, [])

  // -- sync settings when property changes -----------------------------
  useEffect(() => {
    if (!selectedProperty) return
    const s = selectedProperty.utilitySettings || {}
    setSettings({
      waterPaidBy:             s.waterPaidBy || 'tenant',
      electricityPaidBy:       s.electricityPaidBy || 'tenant',
      electricityRatePerUnit:  s.electricityRatePerUnit ?? '',
      waterRatePerUnit:        s.waterRatePerUnit ?? '',
      reminderNote:            s.reminderNote || ''
    })
  }, [selectedProperty])

  // -- load contacts when property changes -----------------------------
  const fetchContacts = useCallback(async () => {
    if (!selectedProperty) return
    try {
      const token = await getToken()
      const { data } = await axios.get(`/api/utility/room-contacts/${selectedProperty._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        const map = {}
        data.contacts.forEach(c => { map[`${c.buildingId}-${c.row}-${c.col}`] = c })
        setRoomContacts(map)
      }
    } catch { /* non-critical */ }
  }, [selectedProperty])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  // -- load entries -----------------------------------------------------
  const fetchEntries = useCallback(async () => {
    if (!selectedProperty) return
    setLoadingEntries(true)
    try {
      const token = await getToken()
      const { data } = await axios.get(
        `/api/utility/${selectedProperty._id}?month=${month}&year=${year}&type=${typeFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setEntries(data.entries || [])
    } catch { toast.error('Failed to load utility records') }
    finally { setLoadingEntries(false) }
  }, [selectedProperty, month, year, typeFilter])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // -- save settings ----------------------------------------------------
  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      const token = await getToken()
      const { data } = await axios.post('/api/utility/settings', {
        propertyId: selectedProperty._id,
        ...settings,
        electricityRatePerUnit: settings.electricityRatePerUnit !== '' ? Number(settings.electricityRatePerUnit) : null,
        waterRatePerUnit:       settings.waterRatePerUnit !== '' ? Number(settings.waterRatePerUnit) : null,
      }, { headers: { Authorization: `Bearer ${token}` } })
      if (data.success) {
        toast.success('Settings saved')
        setShowSettings(false)
        // update local copy
        setSelectedProperty(prev => ({ ...prev, utilitySettings: data.utilitySettings }))
        setProperties(prev => prev.map(p => p._id === selectedProperty._id ? { ...p, utilitySettings: data.utilitySettings } : p))
      } else {
        toast.error(data.message)
      }
    } catch { toast.error('Failed to save settings') }
    finally { setSavingSettings(false) }
  }

  // -- open record modal ------------------------------------------------
  const openRecord = (buildingId, buildingName, row, col, roomNumber) => {
    const existing = entries.find(e => e.buildingId === buildingId && e.row === row && e.col === col)
    setRecordData({
      previousReading: existing?.previousReading ?? '',
      currentReading:  existing?.currentReading ?? '',
      amountDue:       existing?.amountDue ?? '',
      amountPaid:      existing?.amountPaid ?? '',
      note:            existing?.note ?? '',
      applyToAll:      false
    })
    setRecordForm({ buildingId, buildingName, row, col, roomLabel: `${buildingName} - Room ${roomNumber}` })
  }

  // -- save record ------------------------------------------------------
  const saveRecord = async () => {
    setSaving(true)
    try {
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }
      const basePayload = {
        propertyId: selectedProperty._id,
        type: typeFilter,
        month, year,
        amountDue:  recordData.amountDue  !== '' ? Number(recordData.amountDue)  : undefined,
        amountPaid: recordData.amountPaid !== '' ? Number(recordData.amountPaid) : undefined,
        note:       recordData.note
      }
      if (recordData.applyToAll) {
        const allRooms = []
        for (const b of selectedProperty.buildings || []) {
          for (let ri = 0; ri < (b.grid || []).length; ri++) {
            for (let ci = 0; ci < b.grid[ri].length; ci++) {
              if (b.grid[ri][ci].type === 'room') allRooms.push({ buildingId: b.id, row: ri, col: ci })
            }
          }
        }
        await Promise.all(allRooms.map(r =>
          axios.post('/api/utility/record', { ...basePayload, ...r }, { headers })
        ))
        toast.success(`Applied to all ${allRooms.length} rooms`)
      } else {
        const { data } = await axios.post('/api/utility/record', {
          ...basePayload,
          buildingId: recordForm.buildingId,
          row: recordForm.row,
          col: recordForm.col,
          previousReading: recordData.previousReading !== '' ? Number(recordData.previousReading) : undefined,
          currentReading:  recordData.currentReading  !== '' ? Number(recordData.currentReading)  : undefined,
        }, { headers })
        if (!data.success) { toast.error(data.message); return }
        toast.success('Record saved')
      }
      setRecordForm(null)
      fetchEntries()
    } catch { toast.error('Failed to save record') }
    finally { setSaving(false) }
  }

  // -- mark paid --------------------------------------------------------
  const markPaid = async (buildingId, row, col) => {
    try {
      const token = await getToken()
      const { data } = await axios.post('/api/utility/mark-paid', {
        propertyId: selectedProperty._id, buildingId, row, col,
        type: typeFilter, month, year
      }, { headers: { Authorization: `Bearer ${token}` } })
      if (data.success) { toast.success('Marked as paid'); fetchEntries() }
      else toast.error(data.message)
    } catch { toast.error('Failed to mark paid') }
  }

  // -- send reminder ----------------------------------------------------
  const sendReminder = async (buildingId, row, col, roomLabel) => {
    const key = `${buildingId}-${row}-${col}`
    setSendingReminder(key)
    try {
      const token = await getToken()
      const { data } = await axios.post('/api/utility/remind', {
        propertyId: selectedProperty._id, buildingId, row, col,
        type: typeFilter, month, year
      }, { headers: { Authorization: `Bearer ${token}` } })
      if (data.success) {
        toast.success(`Reminder sent to ${roomLabel}`)
      } else if (data.noTenant) {
        // No tenant linked - open invite panel
        setInviteRoom({ buildingId, row, col, roomLabel, notSignedUp: data.notSignedUp })
        const existing = data.contact || roomContacts[key] || {}
        setInviteForm({ name: existing.name || '', phone: existing.phone || '', email: existing.email || '' })
      } else {
        toast.error(data.message)
      }
    } catch { toast.error('Failed to send reminder') }
    finally { setSendingReminder(null) }
  }

  // -- save room contact ------------------------------------------------
  const saveContact = async () => {
    if (!inviteRoom) return
    setSavingContact(true)
    try {
      const token = await getToken()
      const { data } = await axios.post('/api/utility/room-contact', {
        propertyId: selectedProperty._id,
        buildingId: inviteRoom.buildingId,
        row: inviteRoom.row,
        col: inviteRoom.col,
        name:  inviteForm.name.trim(),
        phone: inviteForm.phone.trim(),
        email: inviteForm.email.trim()
      }, { headers: { Authorization: `Bearer ${token}` } })
      if (data.success) {
        const key = `${inviteRoom.buildingId}-${inviteRoom.row}-${inviteRoom.col}`
        setRoomContacts(prev => ({ ...prev, [key]: data.contact }))
        toast.success('Tenant contact saved - share the app link with them!')
        setInviteRoom(null)
      } else {
        toast.error(data.message)
      }
    } catch { toast.error('Failed to save contact') }
    finally { setSavingContact(false) }
  }

  // -- helpers -----------------------------------------------------------
  const entryFor = (buildingId, row, col) =>
    entries.find(e => e.buildingId === buildingId && e.row === row && e.col === col)

  const isTenantPays = typeFilter === 'electricity'
    ? settings.electricityPaidBy === 'tenant'
    : settings.waterPaidBy === 'tenant'

  const ratePerUnit = typeFilter === 'electricity'
    ? settings.electricityRatePerUnit
    : settings.waterRatePerUnit

  // -- summary stats -----------------------------------------------------
  const unpaidCount   = entries.filter(e => e.status === 'unpaid').length
  const partialCount  = entries.filter(e => e.status === 'partial').length
  const paidCount     = entries.filter(e => e.status === 'paid').length
  const totalOutstanding = entries.reduce((sum, e) => sum + Math.max(0, (e.amountDue || 0) - (e.amountPaid || 0)), 0)

  if (loadingProps) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600'></div>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className='text-center py-16 text-gray-400'>
        <Zap className='w-10 h-10 mx-auto mb-3 opacity-40' />
        <p>{initialProperties ? 'No managed properties to track utilities for.' : 'No properties found. Add a listing first.'}</p>
      </div>
    )
  }

  return (
    <div className='max-w-5xl'>

      {/* -- Header ----------------------------------------------- */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Utility Manager</h1>
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-0.5'>Track electricity & water bills per room. Send payment reminders.</p>
        </div>
        <button
          onClick={() => setShowSettings(s => !s)}
          className='flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
        >
          <Settings className='w-4 h-4' />
          Billing Settings
          {showSettings ? <ChevronDown className='w-3.5 h-3.5' /> : <ChevronRight className='w-3.5 h-3.5' />}
        </button>
      </div>

      {/* -- Settings Panel --------------------------------------- */}
      {showSettings && (
        <div className='mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl'>
          <h3 className='font-semibold text-indigo-900 dark:text-indigo-200 mb-3 text-sm'>Billing Settings for {selectedProperty?.name}</h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3'>
            <div>
              <label className='text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1'>Water paid by</label>
              <select value={settings.waterPaidBy} onChange={e => setSettings(s => ({ ...s, waterPaidBy: e.target.value }))}
                className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500'>
                <option value='tenant'>Tenant pays</option>
                <option value='owner'>Owner pays (included in rent)</option>
              </select>
            </div>
            <div>
              <label className='text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1'>Electricity paid by</label>
              <select value={settings.electricityPaidBy} onChange={e => setSettings(s => ({ ...s, electricityPaidBy: e.target.value }))}
                className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500'>
                <option value='tenant'>Tenant pays (tokens/prepay or metered)</option>
                <option value='owner'>Owner pays (included in rent)</option>
              </select>
            </div>
            <div>
              <label className='text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1'>Electricity rate (Ksh/unit, optional)</label>
              <input type='number' min='0' step='0.01' placeholder='e.g. 25'
                value={settings.electricityRatePerUnit}
                onChange={e => setSettings(s => ({ ...s, electricityRatePerUnit: e.target.value }))}
                className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
            </div>
            <div>
              <label className='text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1'>Water rate (Ksh/unit, optional)</label>
              <input type='number' min='0' step='0.01' placeholder='e.g. 80'
                value={settings.waterRatePerUnit}
                onChange={e => setSettings(s => ({ ...s, waterRatePerUnit: e.target.value }))}
                className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
            </div>
            <div className='sm:col-span-2'>
              <label className='text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1'>Custom reminder message (added to all reminders)</label>
              <input type='text' placeholder='e.g. Failure to pay by 5th will cause compound water disconnection.'
                value={settings.reminderNote}
                onChange={e => setSettings(s => ({ ...s, reminderNote: e.target.value }))}
                className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
            </div>
          </div>
          <div className='flex justify-end gap-2'>
            <button onClick={() => setShowSettings(false)} className='px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'>Cancel</button>
            <button onClick={saveSettings} disabled={savingSettings}
              className='px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm rounded-lg font-medium transition-colors'>
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* -- Filters row ------------------------------------------ */}
      <div className='flex flex-wrap gap-3 mb-5 items-end'>
        {/* Property */}
        <div>
          <label className='text-xs text-gray-500 dark:text-gray-400 block mb-1'>Property</label>
          <select
            value={selectedProperty?._id || ''}
            onChange={e => setSelectedProperty(properties.find(p => p._id === e.target.value))}
            className='border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500'
          >
            {properties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>

        {/* Utility type */}
        <div className='flex gap-0.5 rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden'>
          {[['electricity', <Zap className='w-3.5 h-3.5' />, 'Electricity'], ['water', <Droplets className='w-3.5 h-3.5' />, 'Water']].map(([val, icon, label]) => (
            <button key={val} onClick={() => setTypeFilter(val)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${typeFilter === val ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Month */}
        <div>
          <label className='text-xs text-gray-500 dark:text-gray-400 block mb-1'>Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className='border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500'>
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>

        {/* Year */}
        <div>
          <label className='text-xs text-gray-500 dark:text-gray-400 block mb-1'>Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className='border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500'>
            {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* -- Billing setting notice -------------------------------- */}
      <div className={`mb-4 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
        isTenantPays
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
          : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
      }`}>
        {typeFilter === 'electricity' ? <Zap className='w-3.5 h-3.5' /> : <Droplets className='w-3.5 h-3.5' />}
        {isTenantPays
          ? `Tenants are responsible for their own ${typeFilter} payments.${ratePerUnit ? ` Rate: Ksh ${ratePerUnit}/unit.` : ''}`
          : `${typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)} is included in rent - no charges to track per tenant.`
        }
        <button onClick={() => setShowSettings(true)} className='ml-auto underline opacity-70 hover:opacity-100'>Change</button>
      </div>

      {/* -- Summary Stats ----------------------------------------- */}
      {entries.length > 0 && (
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5'>
          {[
            { label: 'Unpaid', value: unpaidCount, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
            { label: 'Partial', value: partialCount, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
            { label: 'Paid', value: paidCount, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Outstanding', value: `Ksh ${totalOutstanding.toLocaleString()}`, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-lg p-3 text-center`}>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* -- Room Grid per building -------------------------------- */}
      {loadingEntries ? (
        <div className='flex items-center justify-center h-32'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600'></div>
        </div>
      ) : selectedProperty?.buildings?.length === 0 ? (
        <div className='text-center py-12 text-gray-400'>No buildings added to this property yet.</div>
      ) : (
        <div className='space-y-6'>
          {(selectedProperty?.buildings || []).map(building => {
            let roomCounter = 0
            return (
              <div key={building.id} className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden'>
                <div className='px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700'>
                  <h3 className='font-semibold text-gray-800 dark:text-gray-200 text-sm'>{building.name}</h3>
                </div>
                <div className='divide-y divide-gray-100 dark:divide-gray-700'>
                  {(building.grid || []).map((rowArr, rowIdx) =>
                    rowArr.map((cell, colIdx) => {
                      if (cell.type !== 'room') return null
                      roomCounter++
                      const roomNum = roomCounter
                      const entry = entryFor(building.id, rowIdx, colIdx)
                      const status = entry?.status || null
                      const outstanding = entry ? Math.max(0, (entry.amountDue || 0) - (entry.amountPaid || 0)) : 0
                      const key = `${building.id}-${rowIdx}-${colIdx}`

                      return (
                        <div key={key} className='px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3'>
                          {/* Room info */}
                          <div className='flex-1 min-w-0 flex items-start gap-3'>
                            <div className='w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0'>
                              <span className='text-xs font-bold text-indigo-600 dark:text-indigo-400'>R{roomNum}</span>
                            </div>
                            <div className='min-w-0'>
                              <p className='text-sm font-medium text-gray-800 dark:text-gray-200'>
                                Room {roomNum}
                                <span className='ml-1.5 text-xs text-gray-400 font-normal'>{cell.roomType}</span>
                              </p>
                              {entry ? (
                                <div className='flex items-center gap-2 mt-0.5 flex-wrap'>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[status]}`}>
                                    {status === 'paid' && <CheckCircle className='w-3 h-3' />}
                                    {status === 'unpaid' && <AlertCircle className='w-3 h-3' />}
                                    {status === 'partial' && <Clock className='w-3 h-3' />}
                                    {status}
                                  </span>
                                  {entry.amountDue > 0 && (
                                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                                      Ksh {(entry.amountPaid || 0).toLocaleString()} / {entry.amountDue.toLocaleString()}
                                    </span>
                                  )}
                                  {entry.unitsUsed != null && (
                                    <span className='text-xs text-gray-400'>{entry.unitsUsed} units</span>
                                  )}
                                  {entry.note && (
                                    <span className='text-xs italic text-gray-400 truncate max-w-[160px]'>"{entry.note}"</span>
                                  )}
                                </div>
                              ) : (
                                <p className='text-xs text-gray-400 mt-0.5'>No record for {MONTHS[month - 1]} {year}</p>
                              )}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className='flex items-center gap-1.5 flex-shrink-0 flex-wrap'>
                            <button
                              onClick={() => openRecord(building.id, building.name, rowIdx, colIdx, roomNum)}
                              className='px-2.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors'
                            >
                              {entry ? 'Edit' : '+ Record'}
                            </button>

                            {entry && status !== 'paid' && (
                              <button
                                onClick={() => markPaid(building.id, rowIdx, colIdx)}
                                className='px-2.5 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors'
                              >
                                Mark Paid
                              </button>
                            )}

                            {isTenantPays && entry && status !== 'paid' && (() => {
                              const hasContact = !!roomContacts[key]
                              return (
                                <button
                                  onClick={() => sendReminder(building.id, rowIdx, colIdx, `Room ${roomNum}`)}
                                  disabled={sendingReminder === key}
                                  className='px-2.5 py-1.5 text-xs border border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-1'
                                  title={hasContact ? 'Contact saved - click to remind' : 'Click to remind or save tenant contact'}
                                >
                                  <Bell className='w-3 h-3' />
                                  {sendingReminder === key ? 'Sending...' : 'Remind'}
                                  {hasContact && <span className='w-1.5 h-1.5 rounded-full bg-orange-400 ml-0.5' title='Contact saved' />}
                                </button>
                              )
                            })()}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* -- Record / Edit Modal ----------------------------------- */}
      {recordForm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4' onClick={() => setRecordForm(null)}>
          <div className='bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm p-5 shadow-2xl' onClick={e => e.stopPropagation()}>
            <h3 className='font-bold text-gray-900 dark:text-white mb-1'>
              {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)} - {recordForm.roomLabel}
            </h3>
            <p className='text-xs text-gray-400 mb-4'>{MONTHS[month - 1]} {year}</p>

            <div className='space-y-3'>
              {!recordData.applyToAll && (
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <label className='text-xs text-gray-500 block mb-1'>Previous Reading</label>
                  <input type='number' min='0' placeholder='e.g. 1500'
                    value={recordData.previousReading}
                    onChange={e => setRecordData(d => ({ ...d, previousReading: e.target.value }))}
                    className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
                </div>
                <div>
                  <label className='text-xs text-gray-500 block mb-1'>Current Reading</label>
                  <input type='number' min='0' placeholder='e.g. 1550'
                    value={recordData.currentReading}
                    onChange={e => {
                      const cur = e.target.value
                      const prev = parseFloat(recordData.previousReading)
                      const curNum = parseFloat(cur)
                      let newAmountDue = recordData.amountDue
                      if (!isNaN(prev) && !isNaN(curNum) && ratePerUnit) {
                        newAmountDue = String(Math.max(0, curNum - prev) * parseFloat(ratePerUnit))
                      }
                      setRecordData(d => ({ ...d, currentReading: cur, amountDue: newAmountDue }))
                    }}
                    className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
                </div>
              </div>
              )}

              {!recordData.applyToAll && recordData.previousReading !== '' && recordData.currentReading !== '' && (
                <p className='text-xs text-indigo-600 dark:text-indigo-400'>
                  Units used: {Math.max(0, parseFloat(recordData.currentReading || 0) - parseFloat(recordData.previousReading || 0))}
                  {ratePerUnit ? ` x Ksh ${ratePerUnit} = Ksh ${Math.max(0, parseFloat(recordData.currentReading || 0) - parseFloat(recordData.previousReading || 0)) * parseFloat(ratePerUnit)}` : ''}
                </p>
              )}

              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <label className='text-xs text-gray-500 block mb-1'>Amount Due (Ksh)</label>
                  <input type='number' min='0' placeholder='0'
                    value={recordData.amountDue}
                    onChange={e => setRecordData(d => ({ ...d, amountDue: e.target.value }))}
                    className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
                </div>
                <div>
                  <label className='text-xs text-gray-500 block mb-1'>Amount Paid (Ksh)</label>
                  <input type='number' min='0' placeholder='0'
                    value={recordData.amountPaid}
                    onChange={e => setRecordData(d => ({ ...d, amountPaid: e.target.value }))}
                    className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
                </div>
              </div>

              <div>
                <label className='text-xs text-gray-500 block mb-1'>Note (optional)</label>
                <input type='text' placeholder='e.g. Meter faulty this month, estimated reading'
                  value={recordData.note}
                  onChange={e => setRecordData(d => ({ ...d, note: e.target.value }))}
                  className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
              </div>

              <label className='flex items-center gap-2 cursor-pointer pt-1'>
                <input type='checkbox'
                  checked={recordData.applyToAll}
                  onChange={e => setRecordData(d => ({ ...d, applyToAll: e.target.checked }))}
                  className='rounded accent-indigo-600' />
                <span className='text-xs text-gray-500 dark:text-gray-400'>Apply same amount to <strong>all rooms</strong> this month</span>
              </label>
            </div>

            <div className='flex gap-2 mt-4'>
              <button onClick={() => setRecordForm(null)} className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'>
                Cancel
              </button>
              <button onClick={saveRecord} disabled={saving} className='flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm rounded-lg font-medium transition-colors'>
                {saving ? 'Saving...' : recordData.applyToAll ? 'Apply to All Rooms' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/*  Invite Tenant Modal  */}
      {inviteRoom && (() => {
        const waMsg = `Hi ${inviteForm.name || 'there'}, your ${typeFilter} bill at ${selectedProperty?.name || 'your property'} needs to be settled. You can also track bills on PataKeja at patakejaa.co.ke - free to use!`
        const waPhone = inviteForm.phone ? inviteForm.phone.replace(/\s+/g, '').replace(/^\+/, '').replace(/^0/, '254') : ''
        const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}` : `https://wa.me/?text=${encodeURIComponent(waMsg)}`
        return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4' onClick={() => setInviteRoom(null)}>
          <div className='bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden' onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className='bg-orange-50 dark:bg-orange-900/20 px-5 py-4 border-b border-orange-100 dark:border-orange-800'>
              <p className='font-bold text-gray-900 dark:text-white'>{inviteRoom.roomLabel}  No tenant linked</p>
              {inviteRoom.notSignedUp
                ? <p className='text-xs text-orange-700 dark:text-orange-300 mt-0.5'>Contact saved but tenant hasn't signed up yet.</p>
                : <p className='text-xs text-orange-600 dark:text-orange-400 mt-0.5'>Send a WhatsApp message now, or save their contact for automatic reminders.</p>
              }
            </div>

            {/* Form */}
            <div className='px-5 py-4 space-y-3'>
              <div>
                <label className='text-xs text-gray-500 block mb-1'>Tenant name (optional)</label>
                <input type='text' placeholder='e.g. John Kamau'
                  value={inviteForm.name}
                  onChange={e => setInviteForm(d => ({ ...d, name: e.target.value }))}
                  className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
              </div>
              <div>
                <label className='text-xs text-gray-500 block mb-1'>Phone <span className='text-gray-400'>(enter to send directly to them)</span></label>
                <input type='tel' placeholder='e.g. 0712 345 678'
                  value={inviteForm.phone}
                  onChange={e => setInviteForm(d => ({ ...d, phone: e.target.value }))}
                  className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
              </div>
              <div>
                <label className='text-xs text-gray-500 block mb-1'>Email <span className='text-gray-400'>(optional  for automatic reminders)</span></label>
                <input type='email' placeholder='e.g. john@gmail.com'
                  value={inviteForm.email}
                  onChange={e => setInviteForm(d => ({ ...d, email: e.target.value }))}
                  className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
              </div>
              <div className='bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-xs text-gray-500 dark:text-gray-400 italic'>
                "{waMsg}"
              </div>
            </div>

            <div className='px-5 pb-5 space-y-2'>
              <a href={waUrl} target='_blank' rel='noopener noreferrer'
                className='flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium transition-colors'>
                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'><path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z'/><path d='M12 0C5.373 0 0 5.373 0 12c0 2.125.553 4.122 1.523 5.854L0 24l6.29-1.498A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.6a9.548 9.548 0 01-4.87-1.336l-.35-.207-3.628.864.924-3.545-.228-.364A9.558 9.558 0 012.4 12c0-5.295 4.305-9.6 9.6-9.6s9.6 4.305 9.6 9.6-4.305 9.6-9.6 9.6z'/></svg>
                {waPhone ? 'Send via WhatsApp' : 'Open WhatsApp (pick contact)'}
              </a>
              <div className='flex gap-2'>
                <button onClick={() => setInviteRoom(null)}
                  className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'>
                  Skip
                </button>
                <button onClick={saveContact} disabled={savingContact || (!inviteForm.phone && !inviteForm.email)}
                  className='flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors'
                  title='Save email to auto-send future reminders'>
                  {savingContact ? 'Saving' : 'Save contact'}
                </button>
              </div>
            </div>
          </div>
        </div>
        )
      })()}

    </div>
  )
}

export default UtilityManager
