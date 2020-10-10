import {PromiseResult as IResult, PromiseResolution as ISuccess, PromiseRejection as IError} from "promise.allsettled";
import allSettled from "promise.allsettled";


type resolveValue<T> = T | PromiseLike<T>;
type resolveFn<T> = (value?: resolveValue<T>) => void;

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

		if (__resolve === null) {
			throw 'Internal resolve is null'
		}

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

	static async waitAll<K, V>(promises: Map<K, Promise<V>>): Promise<Map<K, IResult<V, any>>> {
		const keys: K[] = [], values: Promise<V>[] = [];
		for (let [key, value] of promises) {
			keys.push(key);
			values.push(value);
		}

		const result = await allSettled(values),
			output: Map<K, IResult<V, any>> = new Map()
		;

		result.forEach((value, index) => {
			output.set(keys[index], value);
		});

		return output;
	}
}


export {
	ZPromise,
	IResult,
	ISuccess,
	IError
}
export default ZPromise;
