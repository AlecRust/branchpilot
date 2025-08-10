import { DateTime, IANAZone } from 'luxon'

const validTimezoneCache = new Map<string, boolean>()

export function isValidTimezone(zone: string): boolean {
	const cached = validTimezoneCache.get(zone)
	if (cached !== undefined) {
		return cached
	}

	const ianaZone = IANAZone.create(zone)
	const isValid = ianaZone.isValid
	validTimezoneCache.set(zone, isValid)
	return isValid
}

export function getSystemTimezone(): string {
	return DateTime.local().zoneName ?? 'UTC'
}
