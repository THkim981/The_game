import { useEffect, useRef } from 'react'
import type { ProfileId, ProfileStats } from '../utils/profileStorage'
import { saveProfileSave, saveProfileStats } from '../utils/profileStorage'
import type { SavedGameState } from '../utils/profileStorage'

type AutoSaveParams = {
  profileId: ProfileId
  intervalMs?: number
  getSaveState: () => SavedGameState
  getStatsPatch: () => Partial<ProfileStats>
}

export function useAutoSaveProfile({ profileId, intervalMs = 1500, getSaveState, getStatsPatch }: AutoSaveParams) {
  const getSaveStateRef = useRef(getSaveState)
  const getStatsPatchRef = useRef(getStatsPatch)

  useEffect(() => {
    getSaveStateRef.current = getSaveState
  }, [getSaveState])

  useEffect(() => {
    getStatsPatchRef.current = getStatsPatch
  }, [getStatsPatch])

  useEffect(() => {
    const id = window.setInterval(() => {
      try {
        void saveProfileSave(profileId, getSaveStateRef.current()).catch(() => {
          // ignore
        })

        void saveProfileStats(profileId, getStatsPatchRef.current()).catch(() => {
          // ignore
        })
      } catch {
        // ignore storage failures
      }
    }, intervalMs)

    return () => window.clearInterval(id)
  }, [profileId, intervalMs])
}
