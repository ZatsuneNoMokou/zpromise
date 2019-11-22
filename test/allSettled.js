const chai = require("chai"),
	chaiAsPromised = require("chai-as-promised")
;

const { expect, assert } = chai;
chai.use(chaiAsPromised);

const {ZPromise} = require('../src/ZPromise');

var yes = function makeFulfilledResult(value) {
	return { status: 'fulfilled', value: value };
};
var no = function makeRejectedResult(reason) {
	return { status: 'rejected', reason: reason };
};

describe('ZPromise.allSettled', function () {
	var a = {};
	var b = {};
	var c = {};

	it('should be a function', function () {
		assert.strictEqual(typeof ZPromise.allsettled, 'function')
	});

	it('all fulfilled', function () {
		return expect(
			ZPromise.allSettled([
				ZPromise.resolve(a),
				ZPromise.resolve(b),
				ZPromise.resolve(c)
			])
		).to.eventually.deep.equal([
			yes(a),
			yes(b),
			yes(c)
		]);
	});

	it('all rejected', function () {
		return expect(
			ZPromise.allSettled([
				ZPromise.reject(a),
				ZPromise.reject(b),
				ZPromise.reject(c)
			])
		).to.eventually.deep.equal([
			no(a),
			no(b),
			no(c)
		]);
	});

	it('mixed', function () {
		return expect(
			ZPromise.allSettled([
				a,
				ZPromise.resolve(b),
				ZPromise.reject(c)
			])
		).to.eventually.deep.equal([
			yes(a),
			yes(b),
			no(c)
		]);
	});
});
