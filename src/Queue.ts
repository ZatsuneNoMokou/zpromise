import {ZPromise} from './ZPromise.js';
import pLimit, {LimitFunction} from "p-limit";

interface Queue3_Options<T> {
	autostart: boolean
	limit: number
}

export type IGenericFunction<Arguments extends unknown[], T> = (...args: Arguments) => T|Promise<T>;
interface runItem_data<Arguments extends unknown[], T> {
	fn: IGenericFunction<Arguments, T>;
	context: unknown;
	args: Arguments;
}


export class Queue<T> {
	public limit: number;
	public autostart: boolean;

	private _running: boolean = false;
	private readonly _pLimit:LimitFunction;
	private readonly _delayedRun: {
		zPromise: ZPromise<PromiseSettledResult<T>>
		data: runItem_data<unknown[], T>
	}[] = [];


	constructor(opts:Partial<Queue3_Options<T>> = {}) {
		const _opts:Queue3_Options<T> = Object.assign({
			'autostart': true,
			'limit': 4
		}, opts);

		this.limit = _opts.limit;
		if (this.limit === 0) {
			this.limit = Infinity;
		}
		if (typeof <any>this.limit !== 'number' || isNaN(this.limit) || this.limit <= 0) {
			throw 'WrongArgument';
		}

		this.autostart = _opts.autostart;
		this._pLimit = pLimit(this.limit);
	}


	static enqueuedFunction<Arguments extends unknown[], T>(fn:IGenericFunction<Arguments, T>, queueLimit:number = 4):(...args:Arguments) => Promise<PromiseSettledResult<T>> {
		const queue = new Queue<T>({
			autostart: true,
			limit: queueLimit
		});
		return function<T>(...args:Arguments) {
			return queue.enqueue(fn, ...args);
		}
	}


	enqueue<Arguments extends unknown[]>(fn:IGenericFunction<Arguments, T>, ...args:Arguments): Promise<PromiseSettledResult<T>> {
		if (typeof fn !== 'function') {
			throw 'fn must be a function';
		}

		const data:runItem_data<Arguments, T> = {
			'context': this,
			'fn': fn,
			'args': args
		};


		if (this.autostart) {
			return Queue._promiseToSettledResult(this._runItem(data));
		} else {
			const zPromise = new ZPromise<PromiseSettledResult<T>>();
			this._delayedRun.push({
				zPromise,
				data
			});
			return zPromise;
		}
	}

	static async runFunction<Arguments extends unknown[], T>(fn:IGenericFunction<Arguments, T>, data:Arguments[], queueLimit: number):Promise<PromiseSettledResult<T>[]>
	static async runFunction<Arguments extends unknown[], T>(fn:IGenericFunction<Arguments, T>, data:Map<string, Arguments>, queueLimit: number):Promise<Map<string, PromiseSettledResult<T>>>
	static async runFunction<Arguments extends unknown[], T>(
		fn:IGenericFunction<Arguments, T>,
		data:Map<string, Arguments>|Arguments[], queueLimit: number = 4
	):Promise<PromiseSettledResult<T>[] | Map<string, PromiseSettledResult<T>>> {
		if (!Array.isArray(data) && !(<any>data instanceof Map)) {
			throw new Error('WrongType "data"')
		}

		const enqueuedFn = Queue.enqueuedFunction(fn, queueLimit),

			output = Array.isArray(data) ?
				<PromiseSettledResult<T>[]>[]
				:
				new Map<string, PromiseSettledResult<T>>(),

			promises = Array.isArray(data) ?
				<Promise<PromiseSettledResult<T>>[]>[]
				:
				new Map<string, Promise<PromiseSettledResult<T>>>()
		;

		// Enqueue all data without waiting result
		for (let [id, args] of data.entries()) {
			const promise = enqueuedFn(...args);
			if (Array.isArray(promises)) {
				promises.push(promise)
			} else {
				promises.set(id.toString(), promise);
			}
		}

		// Wait now for the result, promise by promise to keep the order
		for (let [id, promise] of promises.entries()) {
			let promiseResult:PromiseSettledResult<T>;
			try {
				promiseResult = await promise;
				/* c8 ignore next 3 */
			} catch (e) {
				throw e;
			}

			if (Array.isArray(output)) {
				output.push(promiseResult);
			} else {
				output.set(id.toString(), promiseResult);
			}
		}

		return output;
	}


	private async _runItem<Argument extends unknown[], T>(data:runItem_data<Argument, T>): Promise<T> {
		return this._pLimit.call(data.context, data.fn, ...data.args);
	}

	private static _promiseToSettledResult<T>(promise:Promise<T>): Promise<PromiseSettledResult<T>> {
		return new Promise<PromiseSettledResult<T>>(resolve => {
			promise
				.then(value => {
					resolve({
						status: "fulfilled",
						value
					});
				})
				.catch(reason => {
					resolve({
						status: "rejected",
						reason
					})
				})
			;
		})
	}

	run():Promise<PromiseSettledResult<T>[]|void> {
		if (this.autostart) {
			throw new Error('AutoStartMode');
		}
		if (this._running) {
			throw new Error('Already running');
		}
		this._running = true;


		const promises : {
			index: number,
			promise: Promise<PromiseSettledResult<T>>,
			zPromise: ZPromise<PromiseSettledResult<T>>
		}[] = [],
			output : PromiseSettledResult<T>[] = []
		;
		for (let [index, {data, zPromise}] of this._delayedRun.entries()) {
			const promise = Queue._promiseToSettledResult(this._runItem(data));
			promises.push({
				index,
				promise,
				zPromise
			});
		}

		return new Promise<PromiseSettledResult<T>[] | void>(async (resolve, reject) => {
			for (let {index, promise, zPromise} of promises) {
				let result:PromiseSettledResult<T>|void;
				try {
					result = await promise;
					output[index] = result;
					zPromise.resolve(result);
					/* c8 ignore next 3 */
				} catch (e) {
					reject(e);
				}
			}
			this._running = false;
			resolve(output);
		});
	}
}
