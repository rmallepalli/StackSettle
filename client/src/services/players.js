import api from '../utils/api.js'

export const getPlayers  = (search) => api.get('/players', { params: { search } }).then(r => r.data)
export const getPlayer   = (id)     => api.get(`/players/${id}`).then(r => r.data)
export const createPlayer = (data)  => api.post('/players', data).then(r => r.data)
export const updatePlayer = (id, data) => api.put(`/players/${id}`, data).then(r => r.data)
export const deletePlayer = (id)    => api.delete(`/players/${id}`).then(r => r.data)
