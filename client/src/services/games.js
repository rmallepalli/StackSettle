import api from '../utils/api.js'

// Games
export const getGames  = (filters) => api.get('/games', { params: filters }).then(r => r.data)
export const getGame   = (id)      => api.get(`/games/${id}`).then(r => r.data)
export const createGame = (data)   => api.post('/games', data).then(r => r.data)
export const updateGame = (id, data) => api.put(`/games/${id}`, data).then(r => r.data)
export const finalizeGame = (id)   => api.patch(`/games/${id}/finalize`).then(r => r.data)
export const deleteGame  = (id)    => api.delete(`/games/${id}`).then(r => r.data)

// Players within a game
export const addPlayerToGame = (gameId, data) =>
  api.post(`/games/${gameId}/players`, data).then(r => r.data)
export const removePlayerFromGame = (gameId, playerId) =>
  api.delete(`/games/${gameId}/players/${playerId}`).then(r => r.data)
export const updatePlayerResult = (gameId, playerId, data) =>
  api.patch(`/games/${gameId}/players/${playerId}`, data).then(r => r.data)
export const bulkUpdateStacks = (gameId, stacks) =>
  api.patch(`/games/${gameId}/stacks`, { stacks }).then(r => r.data)

// Transactions within a game
export const getTransactions = (gameId) =>
  api.get(`/games/${gameId}/transactions`).then(r => r.data)
export const addTransaction = (gameId, data) =>
  api.post(`/games/${gameId}/transactions`, data).then(r => r.data)
export const deleteTransaction = (txId) =>
  api.delete(`/transactions/${txId}`).then(r => r.data)
