export class Container {
	private static instances: Map<string, any> = new Map();

	static register<T>(instance: T): void {
		const key = (instance as object).constructor.name;
		this.instances.set(key, instance);
	}

	static get<T>(type: new (...args: any[]) => T): T {
		const key = type.name;
		const instance = this.instances.get(key);
		if (!instance) {
			throw new Error(`No instance registered for key: ${key}`);
		}
		return instance as T;
	}
}
