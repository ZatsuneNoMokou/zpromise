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

	it('should throw an already running', function () {
		const q = new Queue3();
		q.enqueue(function () {
			return ZPromise.wait(10000);
		}, '42');
		const p = q.run();

		return assert.isRejected(p, 'Already running');
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
			'autostart': true
		});

		const p = q.enqueue(function () {
			return Promise.resolve(42)
		}, '100ms');

		return assert.eventually.deepEqual(p, yes(42));
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
