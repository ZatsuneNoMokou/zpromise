// https://yarnpkg.com/fr/package/promise.allsettled
import allSettled from 'promise.allsettled';


type resolveValue<T> = T | PromiseLike<T>;
type resolveFn<T> = (value?: resolveValue<T>) => void;

type rejectValue<T> = any;
type rejectFn<T> = (reason?: rejectValue<T>) => void;

type executor<T> = (resolve: resolveFn<T>, reject: rejectFn<T>) => void;

class ZPromise<T> extends Promise<T> {
	private readonly __resolve: resolveFn<T>;
	private readonly __reject: rejectFn<T>;

	constructor(executor: executor<T>) {
		let __resolve : resolveFn<T>|null = null,
			__reject : rejectFn<T>|null = null
		;

		super((resolve: resolveFn<T>, reject: rejectFn<T>) => {
			__resolve = resolve;
			__reject = reject;
			return executor(resolve, reject);
		});

		if (__resolve === null) {
			throw 'Internal resolve is null'
		} else {
			this.__resolve = __resolve;
		}

		if (__reject === null) {
			throw 'Internal reject is null'
		} else {
			this.__reject = __reject;
		}
	}

	resolve(value: resolveValue<T>) {
		this.__resolve(value);
	}

	reject(value: rejectValue<T>) {
		this.__reject(value);
	}

	static get allsettled() {
		return allSettled;
	}
}


export {
	ZPromise
}
export default ZPromise;
