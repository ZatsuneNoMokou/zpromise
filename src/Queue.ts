import {ZPromise} from './ZPromise.js';
import pLimit, {LimitFunction} from "p-limit";

interface Queue3_Options<T> {
	autostart: boolean
	limit: number
}

export type IGenericFunction<T> = (...args: any[]) => T|Promise<T>;
interface runItem_data<T> {
	fn: IGenericFunction<T>;
	context: any;
	args: any;
}


export class Queue<T> {
	public limit: number;
	public autostart: boolean;

	private _running: boolean = false;
	private readonly _pLimit:LimitFunction;
	private readonly _delayedRun: {
		zPromise: ZPromise<PromiseSettledResult<T>>
		data: runItem_data<T>
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


	static enqueuedFunction<T>(fn:IGenericFunction<T>, queueLimit:number = 4):(...args:any) => Promise<PromiseSettledResult<T>> {
		const queue = new Queue<T>({
			autostart: true,
			limit: queueLimit
		});
		return function<T>(...args:any) {
			return queue.enqueue(fn, ...args);
		}
	}


	enqueue(fn:IGenericFunction<T>, ...args:any): Promise<PromiseSettledResult<T>> {
		if (typeof fn !== 'function') {
			throw 'fn must be a function';
		}

		const data:runItem_data<T> = {
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

	private async _runItem<T>(data:runItem_data<T>): Promise<T> {
		return this._pLimit.call(data.context, data.fn, ...data.args);
	}

	private static _promiseToSettledResult<T>(promise:Promise<T>): Promise<PromiseSettledResult<T>> {
		return new Promise<PromiseSettledResult<T>>((resolve, reject) => {
			promise
				.then(value => {
					resolve({
						status: "fulfilled",
						value
					});
				})
				.catch(reason => {
					reject({
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


		const promises : Promise<PromiseSettledResult<T>>[] = [],
			output : PromiseSettledResult<T>[] = []
		;
		for (let [index, {data, zPromise}] of this._delayedRun.entries()) {
			Queue._promiseToSettledResult(this._runItem(data))
				.then(value => {
					zPromise.resolve(value);
					output[index] = value;
				})
				.catch(reason => {
					zPromise.reject(reason);
					output[index] = reason;
				})
			;

			promises.push(zPromise);
		}

		return new Promise<PromiseSettledResult<T>[] | void>(async resolve => {
			for (let promise of promises) {
				try {
					await promise;
				} catch (_) {}
			}
			this._running = false;
			resolve(output);
		});
	}
}
