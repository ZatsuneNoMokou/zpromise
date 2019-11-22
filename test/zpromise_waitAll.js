const chai = require("chai"),
	chaiAsPromised = require("chai-as-promised")
;

const { expect } = chai;
chai.use(chaiAsPromised);

const {ZPromise} = require('../src/ZPromise');

var yes = function makeFulfilledResult(value) {
	return { status: 'fulfilled', value: value };
};
var no = function makeRejectedResult(reason) {
	return { status: 'rejected', reason: reason };
};

describe('ZPromise.waitAll', function () {
	var a = {a:Math.random()};
	var b = {b:Math.random()};
	var c = {c:Math.random()};

	it('all fulfilled', function () {
		const map = new Map();
		map.set('lorem', Promise.resolve(a));
		map.set(true, Promise.resolve(b));
		map.set(new Date(), Promise.resolve(c));



		const expectedOutput = new Map();
		expectedOutput.set('lorem', yes(a));
		expectedOutput.set(true, yes(b));
		expectedOutput.set(new Date(), yes(c));
		return expect(
			ZPromise.waitAll(map)
		).to.eventually.deep.equal(expectedOutput);
	});

	it('all rejected', function () {
		const map = new Map();
		map.set('lorem', Promise.reject(a));
		map.set(true, Promise.reject(b));
		map.set(new Date(), Promise.reject(c));


		const expectedOutput = new Map();
		expectedOutput.set('lorem', no(a));
		expectedOutput.set(true, no(b));
		expectedOutput.set(new Date(), no(c));
		return expect(
			ZPromise.waitAll(map)
		).to.eventually.deep.equal(expectedOutput);
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