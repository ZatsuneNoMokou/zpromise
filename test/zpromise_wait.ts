import chai, {assert} from "chai";
import chaiAsPromised from "chai-as-promised";
import {ZPromise} from "../src/ZPromise.js";

const NS_PER_SEC = 1e9;
chai.use(chaiAsPromised);

describe('ZPromise.wait', function () {
	it('should end before timeout', async function () {
		const targetTimeMs = 500;

		const p = new Promise<number>((resolve, reject) => {
			const startTime = process.hrtime();

			ZPromise.wait(targetTimeMs)
				.then(() => {
					const duration = process.hrtime(startTime);
					resolve(duration[0] + duration[1] / NS_PER_SEC);
				})
				.catch(reject)
			;
		});

		return assert.isBelow(await p, targetTimeMs / 1000 + 100)
	});
});
