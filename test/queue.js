const chai = require('chai'),
	chaiAsPromised = require("chai-as-promised"),
	{Queue3} = require('../src/Queue')
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
	it('should take ~3s', function () {
		const q = new Queue3({
			'autostart': false,
			'limit': 4
		});

		function fn(i) {
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
				expectedResult.set(''+i, yes(i + ' ' + 1000));
			} else {
				expectedResult.set(''+i, no(i + ' ' + 1000));
			}
		}
		this.timeout(3100);
		return assert.eventually.deepEqual(p, expectedResult);
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
