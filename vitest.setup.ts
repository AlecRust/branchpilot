import { consola } from 'consola'
import { beforeAll, beforeEach, vi } from 'vitest'

beforeAll(() => {
	consola.wrapAll()
})

beforeEach(() => {
	consola.mockTypes(() => vi.fn())
})
