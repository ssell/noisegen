/**
 * Copyright 2017 Steven T Sell (ssell@vertexfragment.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class Performance {
	constructor(numExpected) { 
		this.numExpected = numExpected;
		this.numTracked  = 0;
		this.startTime   = performance.now();
		this.elapsed     = 0;
	}

	track() {
		this.numTracked++;

		if(this.numTracked == this.numExpected) {
			this.elapsed = (performance.now() - this.startTime);
			console.log("Total Elapsed: " + this.elapsed + " ms");
		}
	}
}

/**
 * Spawns a number of workers to populate the provided surface with noise.
 *
 * \param[in] surface        Surface to populate.
 * \param[in] noise          String name of the noise algorithm to employ.
 * \param[in] numWorkersSide Number of workers to spawn per surface dimension.
 */
function generateNoiseMultithreaded(surface, noise, params, numWorkersSide) {

	var image = surface.getImageData();

	var widthStep  = image.width / numWorkersSide;
	var heightStep = image.height / numWorkersSide;

	var perf = new Performance((numWorkersSide * numWorkersSide));

	for(var x = 0; x < numWorkersSide; ++x) {
		for(var y = 0; y < numWorkersSide; ++y) {

			var worker = new Worker("scripts/noise.js");
			var startX = (x * widthStep);
			var endX   = ((x + 1) * widthStep);
			var startY = (y * heightStep);
			var endY   = ((y + 1) * heightStep);

			worker.postMessage({image: image, noise: noise, noiseParams: params, startX: startX, endX: endX, startY: startY, endY: endY});

			worker.onmessage = function(e) {  
				surface.drawImage(e.data.image, e.data.startX, e.data.endX, e.data.startY, e.data.endY);
				perf.track();
			};
		}
	}
}