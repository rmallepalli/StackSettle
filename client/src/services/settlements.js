import api from '../utils/api.js'

export const getSettlements = (params) => api.get('/settlements', { params }).then(r => r.data)

export const calculateSettlement = (params) =>
  api.post('/settlements/calculate', params).then(r => r.data)

export const saveSettlement = (data) =>
  api.post('/settlements', data).then(r => r.data)

export const getPlayerStats = (params) =>
  api.get('/reports/player-stats', { params }).then(r => r.data)
