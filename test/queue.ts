import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import {Queue, ZPromise} from "../src/index.js";

chai.use(chaiAsPromised);


const yes = function makeFulfilledResult<T>(value:T):PromiseFulfilledResult<T> {
	return {status: 'fulfilled', value: value};
};
const no = function makeRejectedResult<T>(reason:T):PromiseRejectedResult {
	return {status: 'rejected', reason: reason};
};

function randomInt() {
	return Math.floor(Math.random() * 100000)
}


describe('Queue', function () {
	it('should throw an error (limit option)', function () {
		assert.throws(function () {
			new Queue({
				limit: -4
			})
		}, /WrongArgument/, 'WrongArgument error');
	});

	it('should throw because fn', function () {
		return assert.throws(function () {
			const q = new Queue();
			// @ts-ignore
			q.enqueue(null, "id")
		}, /fn must be a function/)
	});

	it('should throw an already running', function () {
		return assert.throws(function () {
			const q = new Queue({
				autostart: false
			});
			q.enqueue(function () {
				return ZPromise.wait(10000);
			}, '42');
			q.run();
			q.run();
		}, /Already running/);
	});

	it('should throw an AutoStartMode', function () {
		return assert.throws(function () {
			const q = new Queue({
				autostart: true
			});
			q.run();
		}, /AutoStartMode/);
	});

	it('should take ~300ms with no-autostart queue', async () => {
		const q = new Queue({
			'autostart': false,
			'limit': 4
		});

		function fn(i:number) {
			return new Promise<string>((resolve, reject) => {
				setTimeout(() => {
					if (i % 2) {
						resolve(i + ' ' + 100);
					} else {
						reject(i + ' ' + 100);
					}
				}, 100);
			})
		}

		for (let i = 1; i <= 10; i++) {
			q.enqueue(fn, i);
		}


		const expectedResult = [];
		for (let i = 1; i <= 10; i++) {
			if (i % 2) {
				expectedResult.push(yes(i + ' ' + 100));
			} else {
				expectedResult.push(no(i + ' ' + 100));
			}
		}
		const date = Date.now(),
			res = await q.run()
		;
		if (Date.now() - date > 310) {
			throw new Error('TIMEOUT');
		}
		return assert.deepEqual(res, expectedResult);
	});

	it('should take with this autostart queue 2', async () => {
		const q = new Queue({
			'autostart': true,
			'limit': 4
		});

		function fn(i:number) {
			return new Promise<string>((resolve, reject) => {
				setTimeout(() => {
					if (i % 2) {
						resolve(i + ' ' + 100);
					} else {
						reject(i + ' ' + 100);
					}
				}, 100);
			})
		}

		let promises: Promise<PromiseSettledResult<unknown>>[] = [];
		for (let i = 1; i <= 4; i++) {
			setTimeout(() => {
				promises.push(q.enqueue(fn, i));
			}, i * 100)
		}


		const expectedResult = [];
		for (let i = 1; i <= 4; i++) {
			if (i % 2) {
				expectedResult.push(yes(i + ' ' + 100));
			} else {
				expectedResult.push(no(i + ' ' + 100));
			}
		}

		await ZPromise.wait(400);
		const res = (await Promise.allSettled(promises))
			.map(val => {
				// @ts-ignore
				return val.value ?? val.reason
			})
		;
		return assert.deepEqual(
			res,
			expectedResult
		);
	});

	it('should autostart resolve', function () {
		const q = new Queue({
			'autostart': true,
			limit: 0
		});

		const p = Promise.all([
			q.enqueue(function () {
				return Promise.resolve(42)
			}, 'queue' + randomInt()),
			q.enqueue(function () {
				return Promise.resolve(21)
			}, 'queue' + randomInt()),
		]);

		return assert.eventually.deepEqual(p, [
			yes(42),
			yes(21)
		]);
	});

	it('should autostart resolve (limit: 1)', function () {
		const q = new Queue({
			'autostart': true,
			limit: 1
		});

		const p = Promise.all([
			q.enqueue(function () {
				return Promise.resolve(84)
			}, 'queue' + randomInt()),
			q.enqueue(function () {
				return Promise.resolve(42)
			}, 'queue' + randomInt()),
			q.enqueue(function () {
				return Promise.resolve(21)
			}, 'queue' + randomInt()),
		]);

		return assert.eventually.deepEqual(p, [
			yes(84),
			yes(42),
			yes(21)
		]);
	});

	it('should autostart reject', async () => {
		const q = new Queue({
			'autostart': true
		});

		const p = q.enqueue(function () {
			return Promise.reject(42)
		}, '100ms');

		return assert.deepEqual(await p, no(42));
	});

	it('should not autostart and resolve', function () {
		const q = new Queue({
			'autostart': false,
			'limit': 0
		});


		function fn(i:number) {
			return new Promise<string>(resolve => {
				setTimeout(()=> {
					resolve(i + ' ' + 100);
				}, 100);
			})
		}
		for (let i=1;i<5;i++) {
			q.enqueue(fn, i);
		}
		const p = q.run();

		this.timeout(500);
		const expected = [];
		expected.push(yes(1 + ' ' + 100));
		expected.push(yes(2 + ' ' + 100));
		expected.push(yes(3 + ' ' + 100));
		expected.push(yes(4 + ' ' + 100));
		return assert.eventually.deepEqual(p, expected);
	});

	it('should not autostart and resolve (limit: 2)', function () {
		const q = new Queue({
			'autostart': false,
			'limit': 2
		});


		function fn(i:number) {
			return new Promise<string>(resolve => {
				setTimeout(()=> {
					resolve(i + ' ' + 100);
				}, 100);
			})
		}
		for (let i=1;i<5;i++) {
			q.enqueue(fn, i);
		}
		const p = q.run();

		this.timeout(500);
		const expected = [];
		expected.push(yes(1 + ' ' + 100));
		expected.push(yes(2 + ' ' + 100));
		expected.push(yes(3 + ' ' + 100));
		expected.push(yes(4 + ' ' + 100));
		return assert.eventually.deepEqual(p, expected);
	});

	it('should enqueue function all resolve', function () {
		const fn = Queue.enqueuedFunction(function fn(i) {
			return i + ' ' + 100;
		}, 1);

		const promises = [];
		for (let i=1;i<5;i++) {
			promises.push(fn(i));
		}

		const promise = Promise.allSettled(promises)
			.then(val => val.map(val => {
				// @ts-ignore
				return val.value ?? val.reason
			}))
		;
		return assert.eventually.deepEqual(promise, [
			yes('1 100'),
			yes('2 100'),
			yes('3 100'),
			yes('4 100')
		])
	});

	it('should enqueue function all reject', function () {
		const fn = Queue.enqueuedFunction(function fn(i) {
			throw i + ' ' + 100;
		}, 1);

		const promises = [];
		for (let i=1;i<5;i++) {
			promises.push(fn(i));
		}

		const promise = Promise.allSettled(promises)
			.then(val => val.map(val => {
				// @ts-ignore
				return val.value ?? val.reason
			}))
		;
		return assert.eventually.deepEqual(promise, [
			no('1 100'),
			no('2 100'),
			no('3 100'),
			no('4 100')
		])
	});

	it('should enqueue function mixed results', function () {
		const fn = Queue.enqueuedFunction(function fn(i:number) {
			if (i % 2) {
				return Promise.resolve(i + ' ' + 100);
			} else {
				return Promise.reject(i + ' ' + 100);
			}
		}, 1);

		const promises = [];
		for (let i=1;i<5;i++) {
			promises.push(fn(i));
		}

		const promise = Promise.allSettled(promises)
			.then(val => val.map(val => {
				// @ts-ignore
				return val.value ?? val.reason
			}))
		;
		return assert.eventually.deepEqual(promise, [
			yes('1 100'),
			no('2 100'),
			yes('3 100'),
			no('4 100')
		])
	});

	it('should throw runFunction with incorrect data', function () {
		// @ts-ignore
		const promise = Queue.runFunction(() => {});
		return assert.isRejected(promise, /WrongType "data"/);
	});

	it('should runFunction all resolve', function () {
		const promise = Queue.runFunction(function fn(i) {
			return i + ' ' + 100;
		}, [
			[1],
			[2],
			[3],
			[4]
		], 1);

		return assert.eventually.deepEqual(promise, [
			yes('1 100'),
			yes('2 100'),
			yes('3 100'),
			yes('4 100')
		])
	});

	it('should runFunction with Map and all resolve', function () {
		const data = new Map();
		for (let i=1; i <= 4; i++) {
			data.set(i.toString(), [i]);
		}

		const promise = Queue.runFunction(function fn(i) {
			return i + ' ' + 100;
		}, data, 1);

		return assert.eventually.deepEqual(promise, new Map([
			['1', yes('1 100')],
			['2', yes('2 100')],
			['3', yes('3 100')],
			['4', yes('4 100')]
		]))
	});

	it('should runFunction all reject', function () {
		const promise = Queue.runFunction(function fn(i) {
			return Promise.reject(i + ' ' + 100);
		}, [
			[1],
			[2],
			[3],
			[4]
		], 1);

		return assert.eventually.deepEqual(promise, [
			no('1 100'),
			no('2 100'),
			no('3 100'),
			no('4 100')
		])
	});

	it('should runFunction with Map and all reject', function () {
		const data = new Map();
		for (let i=1; i <= 4; i++) {
			data.set(i.toString(), [i]);
		}

		const promise = Queue.runFunction(function fn(i) {
			return Promise.reject(i + ' ' + 100);
		}, data, 1);

		return assert.eventually.deepEqual(promise, new Map([
			['1', no('1 100')],
			['2', no('2 100')],
			['3', no('3 100')],
			['4', no('4 100')]
		]))
	});

	it('should runFunction mixed results', function () {
		const promise = Queue.runFunction(function fn(i) {
			if (i % 2) {
				return Promise.resolve(i + ' ' + 100);
			} else {
				return Promise.reject(i + ' ' + 100);
			}
		}, [
			[1],
			[2],
			[3],
			[4]
		], 1);

		return assert.eventually.deepEqual(promise, [
			yes('1 100'),
			no('2 100'),
			yes('3 100'),
			no('4 100')
		])
	});

	/*(function () {
	const q = new Queue3({
		// 'autostart': false,
		'limit': 4,
		'onItemBegin' : function (id) {
			console.info('>> ' + id);
		},
		'onItemEnd' : function (id) {
			console.info('<< ' + id);
		}
	});



	function fn(i:number) {
		return new Promise((resolve, reject) => {
			setTimeout(()=> {
				if (i % 2) {
					resolve(i + ' ' + 1000);
				} else {
					reject(i + ' ' + 1000);
				}
			}, 1000);
		})
	}

	for(let i = 1; i <= 10; i++) {
		// q.enqueue(fn, ''+i, i);

		setTimeout(function () {
			const result = q.enqueue(fn, ''+i, i);
			if (result instanceof Promise) {
				const promise = result as Promise<IResult<any, any>>;
				promise
					.then(console.dir)
					.catch(console.error)
				;
			} else {
				console.dir(result)
			}
		}, 250 * i);
	}

	// setTimeout(() => {
	// 	q.run()
	// 		.then(console.dir)
	// 		.catch(console.error)
	// }, 800)
})();*/
});
