type resolveValue<T> = T | PromiseLike<T>;
type resolveFn<T> = (value: resolveValue<T>) => void;

type rejectValue<T> = any;
type rejectFn<T> = (reason?: rejectValue<T>) => void;

type executor<T> = (resolve: resolveFn<T>, reject: rejectFn<T>) => void;

class ZPromise<T> extends Promise<T> {
	private readonly __resolve: resolveFn<T>;
	private readonly __reject: rejectFn<T>;

	constructor(executor?: executor<T>) {
		let __resolve : resolveFn<T>|null = null,
			__reject : rejectFn<T>|null = null
		;

		super((resolve: resolveFn<T>, reject: rejectFn<T>) => {
			__resolve = resolve;
			__reject = reject;

			if (executor != undefined) {
				return executor(resolve, reject);
			}
		});

		/* c8 ignore next 3 */
		if (__resolve === null) {
			throw 'Internal resolve is null'
		}

		/* c8 ignore next 3 */
		if (__reject === null) {
			throw 'Internal reject is null'
		}

		this.__resolve = __resolve;
		this.__reject = __reject;
	}

	resolve(value: resolveValue<T>) {
		this.__resolve(value);
	}

	reject(value: rejectValue<T>) {
		this.__reject(value);
	}

	/**
	 *
	 * @param ms Time in milliseconds
	 */
	static wait(ms:number):ZPromise<void> {
		return new ZPromise<void>(resolve => {
			setTimeout(resolve, ms);
		})
	}

	static async waitAll<K, V>(promises: Map<K, Promise<V>>): Promise<Map<K, PromiseSettledResult<V>>> {
		const keys: K[] = [], values: Promise<V>[] = [];
		for (let [key, value] of promises) {
			keys.push(key);
			values.push(value);
		}

		const result = await Promise.allSettled(values),
			output: Map<K, PromiseSettledResult<V>> = new Map()
		;

		result.forEach((value, index) => {
			output.set(keys[index], value);
		});

		return output;
	}
}


export {
	ZPromise
}
export default ZPromise;
