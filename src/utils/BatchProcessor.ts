import { Loggers } from '@pekno/simple-discordbot';

/**
 * A utility class for processing items in batches to improve performance
 * and avoid overwhelming external APIs.
 */
export class BatchProcessor<T> {
	private queue: T[] = [];
	private isProcessing: boolean = false;
	private readonly batchSize: number;
	private readonly processingInterval: number;
	private readonly processFn: (items: T[]) => Promise<void>;
	private readonly refillFn: () => T[];
	private readonly logPrefix: string;
	private intervalId: NodeJS.Timeout | null = null;

	/**
	 * Creates a new BatchProcessor
	 * @param batchSize Number of items to process in each batch
	 * @param processingInterval Time in ms between processing batches
	 * @param processFn Function to process a batch of items
	 * @param refillFn Function to refill the queue when empty
	 * @param logPrefix Prefix for log messages
	 */
	constructor(
		batchSize: number,
		processingInterval: number,
		processFn: (items: T[]) => Promise<void>,
		refillFn: () => T[],
		logPrefix: string = 'BatchProcessor'
	) {
		this.batchSize = batchSize;
		this.processingInterval = processingInterval;
		this.processFn = processFn;
		this.refillFn = refillFn;
		this.logPrefix = logPrefix;
	}

	/**
	 * Initializes the queue with items
	 * @param items Initial items to add to the queue
	 */
	public initialize(items: T[]): void {
		this.queue = [...items];
		Loggers.get().info(
			`${this.logPrefix}: Initialized with ${items.length} items`
		);
	}

	/**
	 * Starts the batch processing
	 */
	public start(): void {
		if (this.intervalId) {
			Loggers.get().warn(`${this.logPrefix}: Already running`);
			return;
		}

		Loggers.get().info(`${this.logPrefix}: Starting batch processing`);
		this.intervalId = setInterval(
			() => this.processBatch(),
			this.processingInterval
		);
	}

	/**
	 * Stops the batch processing
	 */
	public stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
			Loggers.get().info(`${this.logPrefix}: Stopped batch processing`);
		}
	}

	/**
	 * Processes a batch of items from the queue
	 */
	private async processBatch(): Promise<void> {
		if (this.isProcessing) {
			return;
		}

		this.isProcessing = true;

		try {
			// Take a batch of items from the queue
			const batch = this.queue.splice(0, this.batchSize);

			if (batch.length === 0) {
				// Refill the queue when empty
				this.queue = this.refillFn();
				this.isProcessing = false;
				return;
			}

			Loggers.get().debug(
				`${this.logPrefix}: Processing batch of ${batch.length} items`
			);

			// Process the batch
			await this.processFn(batch);
		} catch (error) {
			Loggers.get().error(
				`${this.logPrefix}: Error processing batch: ${error}`
			);
		} finally {
			this.isProcessing = false;
		}
	}

	/**
	 * Adds items to the queue
	 * @param items Items to add to the queue
	 */
	public addToQueue(items: T[]): void {
		this.queue.push(...items);
		Loggers.get().debug(
			`${this.logPrefix}: Added ${items.length} items to queue`
		);
	}

	/**
	 * Removes items from the queue
	 * @param predicate Function to determine which items to remove
	 */
	public removeFromQueue(predicate: (item: T) => boolean): void {
		const initialLength = this.queue.length;
		this.queue = this.queue.filter((item) => !predicate(item));
		const removedCount = initialLength - this.queue.length;
		if (removedCount > 0) {
			Loggers.get().debug(
				`${this.logPrefix}: Removed ${removedCount} items from queue`
			);
		}
	}
}
