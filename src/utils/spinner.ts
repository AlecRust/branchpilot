import ora from 'ora'

export async function withSpinner<T>(fn: () => Promise<T>, text: string, verbose = false): Promise<T> {
	if (verbose) {
		return await fn()
	}

	const spinner = ora(text).start()

	try {
		const result = await fn()
		spinner.stop()
		return result
	} catch (error) {
		spinner.fail()
		throw error
	}
}
