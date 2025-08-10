export function coerceDirs(d: unknown): string[] {
	if (Array.isArray(d)) return d.map(String)
	if (typeof d === 'string') return [d]
	return []
}
