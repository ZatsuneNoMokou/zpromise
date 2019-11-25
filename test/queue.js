const chai = require('chai'),
	chaiAsPromised = require("chai-as-promised"),
	{ZPromise, Queue3} = require('../src/index')
;

const { assert } = chai;
chai.use(chaiAsPromised);



var yes = function makeFulfilledResult(value) {
	return { status: 'fulfilled', value: value };
};
var no = function makeRejectedResult(reason) {
	return { status: 'rejected', reason: reason };
};

var wrapForMap = function(promise, expectedValue) {
	return [new Promise((resolve, reject) => {
		promise
			.then(data => {
				resolve(Array.from(data.entries()))
			})
			.catch(reject)
		;
	}), Array.from(expectedValue.entries())];
};

var randomInt = function() {
	return Math.floor(Math.random() * 100000)
};



describe('Queue', function () {
	it('should throw an error (limit option)', function () {
		assert.throws(function () {
			new Queue3({
				limit: -4
			})
		}, /WrongArgument/, 'WrongArgument error');
	});

	it('should throw because id', function () {
		return assert.throws(function () {
			const q = new Queue3();
			q.enqueue()
		}, /id must be a string/)
	});

	it('should throw because fn', function () {
		return assert.throws(function () {
			const q = new Queue3();
			q.enqueue(null, "id")
		}, /fn must be a function/)
	});

	it('should call onItemBegin', function () {
		let _resolve;
		let queue = new Queue3({
			'autostart': true,
			'onItemBegin': function (id, data) {
				_resolve([...arguments]);
			}
		});

		const queueFn = function () {
			return Promise.resolve(42)
		};

		const p = new Promise(resolve => {
			_resolve = resolve;

			queue.enqueue(queueFn, 'queue.onItemBegin');
		});



		return assert.eventually.deepEqual(p, [
			'queue.onItemBegin',
			{
				'args': [],
				'context': queue,
				'fn': queueFn
			}
		]);
	});

	it('should call onItemEnd', function () {
		let _resolve;
		let queue = new Queue3({
			'autostart': true,
			'onItemEnd': function (id, data) {
				_resolve([...arguments]);
			}
		});

		const queueFn = function () {
			return Promise.resolve(42)
		};

		const p = new Promise(resolve => {
			_resolve = resolve;

			queue.enqueue(queueFn, 'queue.onItemEnd');
		});



		return assert.eventually.deepEqual(p, [
			'queue.onItemEnd',
			yes(42),
			[]
		]);
	});

	it('should throw an already running', function () {
		const q = new Queue3();
		q.enqueue(function () {
			return ZPromise.wait(10000);
		}, '42');
		const p = q.run();

		return assert.isRejected(p, 'Already running');
	});

	it('should resolve with onItemBegin error', function () {
		const q = new Queue3({
			'autostart': false,
			'limit': 4,
			'onItemBegin': function () {
				throw 'MyError'
			}
		});

		q.enqueue(function () {
			return Promise.resolve(42)
		}, 'queue.onItemBeginError');


		const p = q.run();
		const expectedResult = new Map();
		expectedResult.set("queue.onItemBeginError", yes(42));
		return assert.eventually.deepEqual(
			...wrapForMap(
				p,
				expectedResult
			)
		);
	});

	it('should resolve with onItemEnd error', function () {
		const q = new Queue3({
			'autostart': false,
			'limit': 4,
			'onItemEnd': function () {
				throw 'MyError'
			}
		});

		q.enqueue(function () {
			return Promise.resolve(42)
		}, 'queue.onItemEndError');


		const p = q.run();
		const expectedResult = new Map();
		expectedResult.set("queue.onItemEndError", yes(42));
		return assert.eventually.deepEqual(
			...wrapForMap(
				p,
				expectedResult
			)
		);
	});

	it('should take ~300ms with this autostart queue', function () {
		const q = new Queue3({
			'autostart': false,
			'limit': 4
		});

		function fn(i) {
			return new Promise((resolve, reject) => {
				setTimeout(()=> {
					if (i % 2) {
						resolve(i + ' ' + 100);
					} else {
						reject(i + ' ' + 100);
					}
				}, 100);
			})
		}

		for(let i = 1; i <= 10; i++) {
			q.enqueue(fn, ''+i, i);
		}





		var p = new Promise((resolve, reject) => {
			q.run()
				.then(resolve)
				.catch(reject)
		});

		const expectedResult = new Map();
		for(let i = 1; i <= 10; i++) {
			if (i % 2) {
				expectedResult.set(''+i, yes(i + ' ' + 100));
			} else {
				expectedResult.set(''+i, no(i + ' ' + 100));
			}
		}
		this.timeout(3100);
		return assert.eventually.deepEqual(p, expectedResult);
	});

	it('should autostart resolve', function () {
		const q = new Queue3({
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
		const q = new Queue3({
			'autostart': true,
			limit: 1
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

	it('should autostart reject', function () {
		const q = new Queue3({
			'autostart': true
		});

		const p = q.enqueue(function () {
			return Promise.reject(42)
		}, '100ms');

		return assert.eventually.deepEqual(p, no(42));
	});

	it('should not autostart and resolve', function () {
		const q = new Queue3({
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
		const expectedMap = new Map();
		expectedMap.set(''+1, yes(1 + ' ' + 100));
		expectedMap.set(''+2, yes(2 + ' ' + 100));
		expectedMap.set(''+3, yes(3 + ' ' + 100));
		expectedMap.set(''+4, yes(4 + ' ' + 100));
		return assert.eventually.deepEqual(p, expectedMap);
	});

	it('should not autostart and resolve (limit: 2)', function () {
		const q = new Queue3({
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
		const expectedMap = new Map();
		expectedMap.set(''+1, yes(1 + ' ' + 100));
		expectedMap.set(''+2, yes(2 + ' ' + 100));
		expectedMap.set(''+3, yes(3 + ' ' + 100));
		expectedMap.set(''+4, yes(4 + ' ' + 100));
		return assert.eventually.deepEqual(p, expectedMap);
	});

	it('should enqueue function all resolve', function () {
		const fn = Queue3.enqueuedFunction(function fn(i) {
			return i + ' ' + 100;
		}, {
			limit: 1
		});

		const promises = [];
		for (let i=1;i<5;i++) {
			promises.push(fn(i));
		}

		const promise = Promise.all(promises);
		return assert.eventually.deepEqual(promise, [
			yes('1 100'),
			yes('2 100'),
			yes('3 100'),
			yes('4 100')
		])
	});

	it('should enqueue function all reject', function () {
		const fn = Queue3.enqueuedFunction(function fn(i) {
			throw i + ' ' + 100;
		}, {
			limit: 1
		});

		const promises = [];
		for (let i=1;i<5;i++) {
			promises.push(fn(i));
		}

		const promise = Promise.all(promises);
		return assert.eventually.deepEqual(promise, [
			no('1 100'),
			no('2 100'),
			no('3 100'),
			no('4 100')
		])
	});

	it('should enqueue function mixed results', function () {
		const fn = Queue3.enqueuedFunction(function fn(i) {
			if (i % 2) {
				return Promise.resolve(i + ' ' + 100);
			} else {
				return Promise.reject(i + ' ' + 100);
			}
		}, {
			limit: 1
		});

		const promises = [];
		for (let i=1;i<5;i++) {
			promises.push(fn(i));
		}

		const promise = Promise.all(promises);
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
