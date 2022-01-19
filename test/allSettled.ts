import chai, { expect, assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import {ZPromise} from "../src/ZPromise.js";

chai.use(chaiAsPromised);


var yes = function makeFulfilledResult<T>(value:T) {
	return { status: 'fulfilled', value: value };
};
var no = function makeRejectedResult<T>(reason:T) {
	return { status: 'rejected', reason: reason };
};

describe('ZPromise.allSettled', function () {
	var a:null = null;
	var b = {z: "value"};
	var c = true;

	it('should be a function', function () {
		assert.strictEqual(typeof ZPromise.allSettled, 'function')
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
