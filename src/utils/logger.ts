import { consola } from 'consola'

export const logger = consola

export function setVerbose(verbose: boolean): void {
	logger.level = verbose ? 4 : 3
}
