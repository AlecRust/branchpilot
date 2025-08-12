export class Logger {
	constructor(private isVerbose: boolean) {}

	always(message: string): void {
		console.log(message)
	}

	verbose(message: string): void {
		if (this.isVerbose) {
			console.log(message)
		}
	}

	info(message: string): void {
		console.log(message)
	}

	warn(message: string): void {
		console.log(message)
	}

	success(message: string): void {
		console.log(message)
	}

	error(message: string): void {
		console.log(message)
	}
}
