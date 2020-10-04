require = require("esm")(module);
const chai = require('chai'),
	chaiAsPromised = require("chai-as-promised"),
	{ZPromise} = require('../src/ZPromise')
;

const assert = chai.assert;
chai.use(chaiAsPromised);

describe('ZPromise.resolve', function () {
	it('should resolve', function () {
		const zPromise = new ZPromise(resolve => {
			setTimeout(() => {
				resolve(null)
			}, 20000);
		});
		zPromise.resolve(42);

		return assert.eventually.strictEqual(zPromise, 42);
	});
});

describe('ZPromise.reject', function () {
	it('should reject', function () {
		const zPromise = new ZPromise(resolve => {
			setTimeout(() => {
				resolve(null)
			}, 20000);
		});
		zPromise.reject('42');

		return assert.isRejected(zPromise, /^42$/);
	});
});
