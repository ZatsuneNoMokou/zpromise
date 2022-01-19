import chai, {assert} from "chai";
import chaiAsPromised from "chai-as-promised";
import {ZPromise} from "../src/ZPromise.js";

const NS_PER_SEC = 1e9;
chai.use(chaiAsPromised);

describe('ZPromise.wait', function () {
	it('should end before timeout', function () {
		const targetTimeMs = 500;

		const p = new Promise((resolve, reject) => {
			const startTime = process.hrtime();

			ZPromise.wait(targetTimeMs)
				.then(() => {
					let duration = process.hrtime(startTime);
					duration = duration[0] + duration[1] / NS_PER_SEC;
					resolve(duration);
				})
				.catch(reject)
			;
		});

		this.timeout(1000);
		return assert.eventually.isBelow(p, targetTimeMs / 1000 + 100)
	});
});
