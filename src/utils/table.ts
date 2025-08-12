import Table from 'cli-table3'

/**
 * Creates a borderless table
 */
export function createBorderlessTable(head: string[]): Table.Table {
	return new Table({
		head,
		chars: {
			top: '',
			'top-mid': '',
			'top-left': '',
			'top-right': '',
			bottom: '',
			'bottom-mid': '',
			'bottom-left': '',
			'bottom-right': '',
			left: '',
			'left-mid': '',
			mid: '',
			'mid-mid': '',
			right: '',
			'right-mid': '',
			middle: ' ',
		},
	})
}
