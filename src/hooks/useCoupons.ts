import { useCallback, useEffect, useState } from 'react'

import { formatNumber } from '../utils/number'

type CouponRewards = {
  prestige?: number
}

type CouponDefinition = {
  description: string
} & CouponRewards

// 쿠폰 설정 - 대소문자 포함 무작위 문자 (10자)
const VALID_COUPONS: Record<string, CouponDefinition> = {
  GmK7pQxR2z: { prestige: 2e4, description: 'Prestige 20000 지급' },
}

type UseCouponsParams = {
  profileId: string
  grantResources: (payload: CouponRewards) => void
}

export function useCoupons({ profileId, grantResources }: UseCouponsParams) {
  const [usedCoupons, setUsedCoupons] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`used_coupons_${profileId}`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(`used_coupons_${profileId}`, JSON.stringify([...usedCoupons]))
    } catch {
      // ignore
    }
  }, [usedCoupons, profileId])

  const applyCoupon = useCallback(
    (code: string): { success: boolean; message: string } => {
      const trimmedCode = code.trim()

      if (!trimmedCode) {
        return { success: false, message: '쿠폰 코드를 입력하세요' }
      }

      if (usedCoupons.has(trimmedCode)) {
        return { success: false, message: '이미 사용한 쿠폰입니다' }
      }

      const couponData = VALID_COUPONS[trimmedCode]
      if (!couponData) {
        return { success: false, message: '유효하지 않은 쿠폰 코드입니다' }
      }

      grantResources({ prestige: couponData.prestige })
      setUsedCoupons((prev) => new Set([...prev, trimmedCode]))

      return {
        success: true,
        message: `🎉 ${couponData.description}\nPrestige +${formatNumber(couponData.prestige ?? 0)}`,
      }
    },
    [grantResources, usedCoupons],
  )

  return { applyCoupon }
}
