import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import {ZPromise} from "../src/ZPromise.js";

chai.use(chaiAsPromised);



const yes = function makeFulfilledResult<T>(value:T) {
	return { status: 'fulfilled', value: value };
};
const no = function makeRejectedResult<T>(reason:T) {
	return { status: 'rejected', reason: reason };
};


describe('ZPromise.waitAll', function () {
	const a = {a:Math.random()},
		b = {b:Math.random()},
		c = {c:Math.random()}
	;

	it('all fulfilled', function () {
		const map = new Map();
		map.set('lorem', Promise.resolve(a));
		map.set(true, Promise.resolve(b));
		map.set(new Date(1000000000000), Promise.resolve(c));



		const expectedOutput = new Map();
		expectedOutput.set('lorem', yes(a));
		expectedOutput.set(true, yes(b));
		expectedOutput.set(new Date(1000000000000), yes(c));
		return assert.eventually.deepEqual(
			ZPromise.waitAll(map),
			expectedOutput
		);
	});

	it('all rejected', async function () {
		const map = new Map();
		map.set('lorem', Promise.reject(a));
		map.set(true, Promise.reject(b));
		map.set(new Date(1000000000000), Promise.reject(c));


		const expectedOutput = new Map();
		expectedOutput.set('lorem', no(a));
		expectedOutput.set(true, no(b));
		expectedOutput.set(new Date(1000000000000), no(c));
		return assert.deepEqual(
			await ZPromise.waitAll(map),
			expectedOutput
		);
	});

	it('mixed', function () {
		const map = new Map();
		map.set('lorem', a);
		map.set(true, Promise.resolve(b));
		map.set(new Date(), Promise.reject(c));



		const expectedOutput = new Map();
		expectedOutput.set('lorem', yes(a));
		expectedOutput.set(true, yes(b));
		expectedOutput.set(new Date(), no(c));
		return assert.eventually.deepEqual(
			ZPromise.allSettled([
				a,
				ZPromise.resolve(b),
				ZPromise.reject(c)
			]),
			[
				yes(a),
				yes(b),
				no(c)
			]
		);
	});
});
