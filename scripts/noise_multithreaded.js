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

/**
 * noise_multithreaded.js
 *
 * This script is responsible for the creation and launching of workers
 * used in parallel noise generation.
 */

/**
 * Spawns a number of workers to populate the provided surface with noise.
 *
 * \param[in] surface        Surface to populate.
 * \param[in] noise          String name of the noise algorithm to employ.
 * \param[in] numWorkersSide Number of workers to spawn per surface dimension.
 */
function generateNoiseMultithreaded(surface, noise, params, numWorkersSide, endCallback) {
	
	var image = surface.getRawImageData();

	var widthStep  = image.width / numWorkersSide;
	var heightStep = image.height / numWorkersSide;

	var numWorkers = (numWorkersSide * numWorkersSide);
	var numWorkersComplete = 0;

	for(var x = 0; x < numWorkersSide; ++x) {
		for(var y = 0; y < numWorkersSide; ++y) {

			var worker = new Worker("scripts/noise.js");
			var startX = (x * widthStep);
			var endX   = ((x + 1) * widthStep);
			var startY = (y * heightStep);
			var endY   = ((y + 1) * heightStep);

			worker.postMessage({image: image, noise: noise, noiseParams: params, startX: startX, endX: endX, startY: startY, endY: endY});

			worker.onmessage = function(e) {  
				if(e.data.progress) { 
					NoiseProgressBar.update(e.data.progress);
				} else {
					surface.drawImage(e.data.image, e.data.startX, e.data.endX, e.data.startY, e.data.endY);
					numWorkersComplete++;

					if(numWorkersComplete == numWorkers) {
						endCallback();
					}
				}
			};
		}
	}
}