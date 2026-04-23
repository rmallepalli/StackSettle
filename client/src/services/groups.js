import api from '../utils/api.js'

export const getGroups      = ()           => api.get('/groups').then(r => r.data)
export const getGroup       = (id)         => api.get(`/groups/${id}`).then(r => r.data)
export const createGroup    = (data)       => api.post('/groups', data).then(r => r.data)
export const updateGroup    = (id, data)   => api.put(`/groups/${id}`, data).then(r => r.data)
export const deleteGroup    = (id)         => api.delete(`/groups/${id}`).then(r => r.data)

export const getGroupMembers   = (groupId)           => api.get(`/groups/${groupId}/members`).then(r => r.data)
export const addGroupMember    = (groupId, data)     => api.post(`/groups/${groupId}/members`, data).then(r => r.data)
export const removeGroupMember = (groupId, playerId) => api.delete(`/groups/${groupId}/members/${playerId}`).then(r => r.data)
