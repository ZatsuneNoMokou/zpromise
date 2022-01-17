import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import {Queue, ZPromise} from "../src/index.js";

chai.use(chaiAsPromised);


const yes = function makeFulfilledResult(value) {
	return {status: 'fulfilled', value: value};
};
const no = function makeRejectedResult(reason) {
	return {status: 'rejected', reason: reason};
};

function sleep(ms) {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	})
}

const randomInt = function () {
	return Math.floor(Math.random() * 100000)
};


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

		function fn(i) {
			return new Promise((resolve, reject) => {
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

		function fn(i) {
			return new Promise((resolve, reject) => {
				setTimeout(() => {
					if (i % 2) {
						resolve(i + ' ' + 100);
					} else {
						reject(i + ' ' + 100);
					}
				}, 100);
			})
		}

		let promises = [];
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

		let error;
		try {
			await p;
		} catch (e) {
			error = e;
		}

		return assert.deepEqual(error, no(42));
	});

	it('should not autostart and resolve', function () {
		const q = new Queue({
			'autostart': false,
			'limit': 0
		});


		function fn(i) {
			return new Promise(resolve => {
				setTimeout(()=> {
					resolve(i + ' ' + 100);
				}, 100);
			})
		}
		for (let i=1;i<5;i++) {
			q.enqueue(fn, ''+i, i);
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


		function fn(i) {
			return new Promise(resolve => {
				setTimeout(()=> {
					resolve(i + ' ' + 100);
				}, 100);
			})
		}
		for (let i=1;i<5;i++) {
			q.enqueue(fn, ''+i, i);
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
		const fn = Queue.enqueuedFunction(function fn(i) {
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
