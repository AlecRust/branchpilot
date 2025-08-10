import { describe, expect, it } from 'vitest'
import { coerceDirs } from '../../src/core/utils.js'

describe('utils', () => {
	describe('coerceDirs', () => {
		it('returns array from array input', () => {
			expect(coerceDirs(['dir1', 'dir2'])).toEqual(['dir1', 'dir2'])
		})

		it('returns array from string input', () => {
			expect(coerceDirs('single-dir')).toEqual(['single-dir'])
		})

		it('returns empty array for undefined input', () => {
			expect(coerceDirs(undefined)).toEqual([])
		})

		it('returns empty array for null input', () => {
			expect(coerceDirs(null)).toEqual([])
		})

		it('converts non-string array elements to strings', () => {
			expect(coerceDirs([123, true, 'test'])).toEqual(['123', 'true', 'test'])
		})
	})
})
