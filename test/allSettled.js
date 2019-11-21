const expect = require('expect.js');
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

	it('should have a ZPromise.allSettled', function () {
		expect(typeof ZPromise.allsettled).to.be('function')
	});

	it('all fulfilled', function () {
		ZPromise.allSettled([
			ZPromise.resolve(a),
			ZPromise.resolve(b),
			ZPromise.resolve(c)
		]).then(function (results) {
			expect(results).to.be([
				yes(a),
				yes(b),
				yes(c)
			]);
		});
	});

	it('all rejected', function () {
		ZPromise.allSettled([
			ZPromise.reject(a),
			ZPromise.reject(b),
			ZPromise.reject(c)
		]).then(function (results) {
			expect(results).to.be([
				no(a),
				no(b),
				no(c)
			]);
		});
	});

	it('mixed', function () {
		ZPromise.allSettled([
			a,
			ZPromise.resolve(b),
			ZPromise.reject(c)
		]).then(function (results) {
			expect(results).toBe([
				yes(a),
				yes(b),
				no(c)
			]);
		});
	});
});