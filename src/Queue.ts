import {IError, IResult, ISuccess, ZPromise} from './ZPromise';


type onItemBegin_fn<T> = (id:string, data:runItem_data<T>) => void;
type onItemEnd_fn<T> = (id:string, data:IResult<T>) => void;
interface Queue3_AgumentOptions<T> {
	autostart?: boolean
	limit?: number
	onItemBegin?: onItemBegin_fn<T>
	onItemEnd?: onItemEnd_fn<T>
}
interface Queue3_Options<T> {
	autostart: boolean
	limit: number
	onItemBegin: onItemBegin_fn<T>|null
	onItemEnd: onItemEnd_fn<T>|null
}

interface Queue3_enqueueArgumentsOptions<T> {
	limit?: number
	onItemBegin?: onItemBegin_fn<T>
	onItemEnd?: onItemEnd_fn<T>
}

type genericFunction<T> = (...args: any[]) => T;
interface runItem_data<T> {
	fn: genericFunction<T>;
	context: any;
	args: any;
}





class Queue3<T> {
	public queue: Map<string, runItem_data<T>>;
	public limit: number;
	public autostart: boolean;
	public onItemBegin: onItemBegin_fn<T>|null;
	public onItemEnd: onItemEnd_fn<T>|null;
	private _running: boolean;
	private _started: boolean;
	private readonly _promises: Map<string, Promise<IResult<T>>>;
	private readonly _loopPromises: Map<any, Promise<any>>;
	private readonly _result: Map<string, IResult<T>>;
	private readonly _delayedRun: Map<string, ZPromise<IResult<T>>>;



	constructor(opts:Queue3_AgumentOptions<T>={}) {
		const _opts:Queue3_Options<T> = Object.assign({
			'autostart': true,
			'limit': 4,
			'onItemBegin': null,
			'onItemEnd': null
		}, opts);

		this.queue = new Map();

		this.limit = _opts.limit;



		if (typeof this.limit !== 'number' || isNaN(this.limit) || this.limit < 0) {
			throw 'WrongArgument';
		}



		this.autostart = _opts.autostart;
		this.onItemBegin = _opts.onItemBegin;
		this.onItemEnd = _opts.onItemEnd;

		this._running = false;
		this._started = this.autostart === true;

		this._promises = new Map();
		this._loopPromises = new Map();
		this._result = new Map();
		this._delayedRun = new Map();
	}



	private static get _randomString():string {
		return Math.random().toString(36).substring(2)
	}

	static enqueuedFunction<T>(fn:genericFunction<T>, opts:Queue3_enqueueArgumentsOptions<T>={}):(...args:any)=>Promise<IResult<T>> {
		const _opts:Queue3_Options<T> = Object.assign({
			'autostart': true,
			'limit': 4,
			'onItemBegin': null,
			'onItemEnd': null
		}, opts);

		_opts.autostart = true;

		const queue = new Queue3(opts);
		return function(...args:any):Promise<IResult<T>> {
			return queue.enqueue(fn, Queue3._randomString, ...args);
		}
	}





	enqueue(fn:genericFunction<T>, id:string, ...args:any): Promise<IResult<T>> {
		if (typeof id !== 'string') {
			throw 'id must be a string';
		}
		if (typeof fn !== 'function') {
			throw 'fn must be a function';
		}
		if (this.queue.has(id)) {
			throw `"${id}" already exist in the queue`;
		}

		const data = {'context': this, 'fn': fn, 'args': args};
		this.queue.set(id, data);



		const newZPromise = () => {
			const zPromise = new ZPromise<IResult<T>>();
			this._delayedRun.set(id, zPromise);
			return zPromise;
		};



		if (this.autostart === true) {
			if (this._running === true) {
				if (this.limit === 0) {
					const promise:Promise<IResult<T>> = this._runItem(id, data, this.onItemBegin, this.onItemEnd);

					promise
						.then((data:IResult<T>) => {
							if (this.autostart === true){
								this._result.set(id, data);
							}
						})
						.catch(console.error)
					;

					/*
					 * IMPORTANT : We don't add the promise to this._promises or
					 * if the run() is still running, it will generate a endless loop
					 */
					return promise;
				} else if (this.limit > this._loopPromises.size) {
					let zPromise = newZPromise();

					this._loopedNext()
						.catch(console.error)
					;

					return zPromise;
				} else {
					return newZPromise();
				}
			} else {
				let zPromise = newZPromise();

				this.run()
					.catch(console.error)
				;

				return zPromise;
			}
		} else {
			return newZPromise();
		}
	}

	/**
	 * Return undefined if queue is empty or the [key, value] pair
	 */
	shift():Array<any>|undefined {
		const iter = this.queue.entries().next();

		if (iter.done) {
			return undefined;
		} else {
			const item = iter.value;
			this.delete(item[0]);

			return item;
		}
	}

	delete(id:string):boolean {
		return this.queue.delete(id);
	}



	private _runItem(id:string, data:runItem_data<T>, onItemBegin?:onItemBegin_fn<T>|null, onItemEnd?:onItemEnd_fn<T>|null):any {
		const {fn, context, args} = data;

		if (typeof onItemBegin === 'function') {
			try {
				onItemBegin(id, data);
			} catch (e) {
				console.error(e);
			}
		}

		let _onItemEnd:Function|undefined;
		if (typeof onItemEnd === 'function') {
			const context = this;
			_onItemEnd = function (output:any) {
				if (typeof onItemEnd === 'function') {
					try {
						onItemEnd.call(context, id, output, args);
					} catch (e) {
						console.error(e);
					}
				}
			}
		}



		const delayedRun = this._delayedRun.get(id);
		const zPromise:ZPromise<IResult<T>> = delayedRun !== undefined? delayedRun : new ZPromise<IResult<T>>();
		this._delayedRun.delete(id);



		let output:IResult<T> = <ISuccess<T>>{
			status: 'fulfilled',
			value: <T>{}
		};

		let isErrored = false;

		try {
			output.value = fn.apply(context, args);
		} catch (e) {
			(<IResult<T>>output).status = 'rejected';
			delete (<ISuccess<T>>output).value;
			(<IError<any>><unknown>output).reason = e;

			isErrored = true;
		}



		if (isErrored === false && output.value instanceof Promise) {
			output.value
				.then(data => {
					output.status = 'fulfilled';
					(<ISuccess<T>>output).value = data;

					if (_onItemEnd !== undefined) {
						_onItemEnd(output);
					}

					zPromise.resolve(output);
				})
				.catch(err => {
					output.status = 'rejected';
					delete (<ISuccess<T>>output).value;
					(<IError<any>>output).reason = err;

					if (_onItemEnd !== undefined) {
						_onItemEnd(output);
					}

					zPromise.resolve(output)
				})
			;
		} else {
			if (_onItemEnd !== undefined) {
				_onItemEnd(output);
			}

			zPromise.resolve(output);
		}

		return zPromise;
	}

	private _loopedNext():Promise<boolean> {
		const item = this.shift();

		return new Promise<boolean>((resolve, reject) => {
			if (item === undefined) {
				resolve(true);
			} else {
				const [id, data] = item;

				const itemPromise = this._runItem(id, data, this.onItemBegin, this.onItemEnd);


				itemPromise
					.then((data:IError<T>) => {
						if (this.autostart === false) {
							this._result.set(id, data);
						}
					})
					.catch(reject)
					.finally(() => {
						this._loopedNext()
							.then(resolve)
							.catch(resolve)
						;
					})
				;
			}
		})
	}



	async run():Promise<Map<string, IResult<T>>|void> {
		if (this._running === true) {
			throw 'Already running';
		}

		this._running = true;
		this._started = true;

		let promises;



		if(this.limit > 0) {
			for(let i = 1; i <= this.limit && i - 1 < this.queue.size; i++){
				const promise = this._loopedNext();
				this._loopPromises.set(`_${i}`, promise);

				promise
					.catch(console.error)
				;
			}
		} else {
			const iter = this.queue.entries();

			let item = iter.next();

			while (item.done !== true) {
				const [id, data] = item.value,
					promise:Promise<IResult<T>> = this._runItem(id, data, this.onItemBegin, this.onItemEnd)
				;

				promise
					.then((data:IResult<T>) => {
						if (this.autostart === false) {
							this._result.set(id, data);
						}
					})
					.catch(console.error)
				;

				this._loopPromises.set(id, promise);
				this._promises.set(id, promise);
				item = iter.next();
			}
		}



		do {
			promises = await ZPromise.waitAll<any,any>(this._loopPromises);

			promises.forEach((v, id) => {
				this._promises.delete(id);
			});

		} while (this._promises.size > 0);
		this._running = false;



		if (this.autostart === false) {
			return this._result;
		}
	}
}





export { Queue3 };
