import { createContext, useContext, useState } from 'react'

const GroupContext = createContext(null)

export function GroupProvider({ children }) {
  const [activeGroup, setActiveGroup] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ss_active_group')) || null
    } catch { return null }
  })

  const selectGroup = (group) => {
    localStorage.setItem('ss_active_group', JSON.stringify(group))
    setActiveGroup(group)
  }

  const clearGroup = () => {
    localStorage.removeItem('ss_active_group')
    setActiveGroup(null)
  }

  return (
    <GroupContext.Provider value={{ activeGroup, selectGroup, clearGroup }}>
      {children}
    </GroupContext.Provider>
  )
}

export function useGroup() {
  return useContext(GroupContext)
}
