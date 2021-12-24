import chai, {assert} from "chai";
import chaiAsPromised from "chai-as-promised";
import {ZPromise} from "../src/ZPromise.js";

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
