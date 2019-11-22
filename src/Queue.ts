import { ZPromise, IResult, ISuccess, IError } from './ZPromise';



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
	private readonly _delayedRun: Map<string, (itemPromise:Promise<IResult<T>>)=>void>;



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



	static enqueuedFunction<T>(fn:Function, opts:Queue3_enqueueArgumentsOptions<T>={}):(...args:any)=>void {
		const _opts:Queue3_Options<T> = Object.assign({
			'autostart': true,
			'limit': 4,
			'onItemBegin': null,
			'onItemEnd': null
		}, opts);

		_opts.autostart = true;

		const queue = new Queue3(opts);
		return function (...args:any) {
			queue.enqueue.apply(queue, [fn, new Date().toISOString()].concat(args));
		}
	}





	enqueue(fn:genericFunction<T>, id:string, ...args:any) {
		if (typeof id !== 'string') {
			throw 'id must be a string';
		}

		const data = {'context': this, 'fn': fn, 'args': args};
		this.queue.set(id, data);

		let delayedRun:''|'_loopedNext'|'run'|null = null;
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

					this._promises.set(id, promise);
					return promise;
				} else if (this.limit !== this._promises.size) {
					delayedRun = '_loopedNext';
				}
			} else if(this._started === true) {
				delayedRun = 'run';
			}
		} else {
			delayedRun = '';
		}

		if (delayedRun !== null) {
			const itemPromise = new Promise<IResult<T>>(resolve => {
				const returnResult = (result: Promise<IResult<T>>) => {
					result.then( data => {
						resolve(data);
					});

					this._delayedRun.delete(id);
				};

				this._delayedRun.set(id, returnResult);
			});

			// noinspection FallThroughInSwitchStatementJS
			switch (delayedRun) {
				case 'run':
					this.run()
						.catch(console.error)
					;
				case '_loopedNext':
					this._loopedNext()
						.catch(console.error)
					;
					break;
				case '':
					break;
				default:
					throw 'UnkownType';
			}

			return itemPromise;
		}

		return this;
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



		return new Promise<IResult<T>>(resolve => {
			let output:IResult<T> = <ISuccess<T>>{
				status: 'fulfilled',
				value: <T>{}
			};

			let isErrored = false;

			try {
				output.value = fn.apply(context, args);
			} catch (e) {
				isErrored = true;
				console.error(e);
			}
			(<IResult<T>>output).status = isErrored === false? 'fulfilled' : 'rejected';



			if (isErrored === false && output.value instanceof Promise) {
				output.value
					.then(data => {
						output.status = 'fulfilled';
						(<ISuccess<T>>output).value = data;

						if (_onItemEnd !== undefined) {
							_onItemEnd(output);
						}

						resolve(output);
					})
					.catch(err => {
						output.status = 'rejected';
						delete (<ISuccess<T>>output).value;
						(<IError<any>>output).reason = err;

						if (_onItemEnd !== undefined) {
							_onItemEnd(output);
						}

						resolve(output)
					})
				;
			} else {
				if (_onItemEnd !== undefined) {
					_onItemEnd(output);
				}

				resolve(output);
			}
		})
	}

	private _loopedNext():Promise<boolean> {
		const item = this.shift();

		return new Promise<boolean>(resolve => {
			if (item === undefined) {
				resolve(true);
			} else {
				const [id, data] = item;

				const itemPromise = this._runItem(id, data, this.onItemBegin, this.onItemEnd);

				if (this._delayedRun.has(id)) {
					const fn = this._delayedRun.get(id);
					if (typeof fn === 'function') {
						fn(itemPromise);
					}
				}

				itemPromise
					.then((data:IError<T>) => {
						if (this.autostart === false) {
							this._result.set(id, data);
						}
					})
					.catch((err:any) => {
						if (this.autostart === false) {
							this._result.set(id, {
								status: 'rejected',
								reason: err
							});
						}
					})
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
			const next = () => {
				const item = this.shift();

				return new Promise(resolve => {
					if (item === undefined) {
						resolve(false);
					} else {
						const [id, data] = item;

						this._runItem(id, data, this.onItemBegin, this.onItemEnd)
							.then((data:IResult<T>) => {
								if (this.autostart === false) {
									this._result.set(id, data);
								}
							})
							.catch((err:any) => {
								if (this.autostart === false) {
									this._result.set(id, {
										status: 'rejected',
										reason: err
									});
								}
							})
							.finally(() => {
								next()
									.then(resolve)
									.catch(resolve)
								;
							})
						;
					}
				})
			};

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
			try {
				promises = await ZPromise.waitAll<any,any>(this._loopPromises);
			} catch (e) {
				throw e;
			}

			for (let id in promises) {
				if (promises.hasOwnProperty(id)) {
					this._promises.delete(id);
				}
			}

		} while (this._promises.size > 0);
		this._running = false;



		if (this.autostart === false) {
			return this._result;
		}
	}
}





export { Queue3 };