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
 * 
 */
function triggerNoiseWorkers(surface, image, noise, params, numWorkersSide, widthStep, heightStep, endCallback) {

    var numWorkersComplete = 0;

    for(var x = 0; x < numWorkersSide; ++x) {
        for(var y = 0; y < numWorkersSide; ++y) {

            var worker = new Worker("scripts/noise.js");
            var startX = (x * widthStep);
            var endX   = ((x + 1) * widthStep);
            var startY = (y * heightStep);
            var endY   = ((y + 1) * heightStep);

            worker.postMessage({isRaw: false, image: image, noise: noise, noiseParams: params, width: image.width, height: image.height, startX: startX, endX: endX, startY: startY, endY: endY});

            worker.onmessage = function(e) {  
                if(e.data.progress) { 
                    NoiseProgressBar.update(e.data.progress);
                } else {
                    surface.drawImageRect(e.data.image, e.data.startX, e.data.endX, e.data.startY, e.data.endY);
                    numWorkersComplete++;

                    if(numWorkersComplete == (numWorkersSide * numWorkersSide)) {
                        surface.updateRawImageData();
                        endCallback();
                    }
                }
            };
        }
    }
}

/**
 * 
 */
function putRawData(sourceRaw, destRaw, width, startX, endX, startY, endY) {
    var index = 0;

    for(var x = startX; x < endX; ++x) {
        for(var y = startY; y < endY; ++y) {
            index = (y * width) + x;
            destRaw[index] = sourceRaw[index];
        }
    }
}

/**
 * 
 */
function triggerNormalizedWorkers(surface, image, noise, params, numWorkersSide, width, height, widthStep, heightStep, endCallback) {

    var length  = width * height;
    var rawData = new Array(length);

    var numWorkersComplete = 0;

    var min = Infinity;
    var max = -Infinity;

    for(var x = 0; x < numWorkersSide; ++x) {
        for(var y = 0; y < numWorkersSide; ++y) {

            var worker = new Worker("scripts/noise.js");
            var startX = (x * widthStep);
            var endX   = ((x + 1) * widthStep);
            var startY = (y * heightStep);
            var endY   = ((y + 1) * heightStep);

            worker.postMessage({ isRaw: true, rawData: rawData, noise: noise, noiseParams: params, width: width, height: height, startX: startX, endX: endX, startY: startY, endY: endY});

            worker.onmessage = function(e) {
                if(e.data.progress) {
                    NoiseProgressBar.update(e.data.progress);
                } else {

                    putRawData(e.data.rawData, rawData, width, e.data.startX, e.data.endX, e.data.startY, e.data.endY);
                    numWorkersComplete++;

                    if(numWorkersComplete == (numWorkersSide * numWorkersSide)) {

                        NoiseProgressBar.setTitle("Normalizing Data ...");

                        var normWorker = new Worker("scripts/noise_normalization.js");

                        normWorker.postMessage({ raw: rawData, image: image });

                        normWorker.onmessage = function(e) {
                            surface.drawImage(e.data.image);
                            surface.updateRawImageData();

                            endCallback();
                        };
                    }
                }
            };
        }
    }
}

/**
 * Spawns a number of workers to populate the provided surface with noise.
 *
 * \param[in] surface        Surface to populate.
 * \param[in] noise          String name of the noise algorithm to employ.
 * \param[in] normalized     If true, the resulting noise will be normalized prior to submitting to the surface.
 * \param[in] params         Parameter string used in noise construction.
 * \param[in] numWorkersSide Number of workers to spawn per surface dimension.
 * \param[in] endCallback    Callback function used to signal the end of noise generation.
 */
function generateNoiseMultithreaded(surface, noise, normalized, params, numWorkersSide, endCallback) {
    
    var image = surface.getRawImageData();

    const widthStep  = image.width / numWorkersSide;
    const heightStep = image.height / numWorkersSide;

    const numWorkers = (numWorkersSide * numWorkersSide);
    
    if(normalized) {
        triggerNormalizedWorkers(surface, image, noise, params, numWorkersSide, image.width, image.height, widthStep, heightStep, endCallback);
    } else {
        triggerNoiseWorkers(surface, image, noise, params, numWorkersSide, widthStep, heightStep, endCallback);
    }
}

/**
 * 
 */
function applyPaletteMultithreaded(surface, numWorkersSide, endCallback) {
    
    var numWorkersComplete = 0;

    var srcImage  = surface.getRawImageData();
    var destImage = surface.context.createImageData(srcImage);
    var palette   = surface.getPalette();
    
    const paletteDescr = palette.descriptor;

    const widthStep  = srcImage.width / numWorkersSide;
    const heightStep = srcImage.height / numWorkersSide;

    const numWorkers = (numWorkersSide * numWorkersSide);

    for(var x = 0; x < numWorkersSide; ++x) {
        for(var y = 0; y < numWorkersSide; ++y) {
            var worker = new Worker("scripts/surface.js");
            var startX = (x * widthStep);
            var endX   = ((x + 1) * widthStep);
            var startY = (y * heightStep);
            var endY   = ((y + 1) * heightStep);

            worker.postMessage({ srcImage: srcImage, destImage: destImage, paletteDescr: paletteDescr, startX: startX, endX: endX, startY: startY, endY: endY });
        
            worker.onmessage = function(e) {
                if(e.data.progress) {
                    NoiseProgressBar.update(e.data.progress);
                } else {
                    surface.drawImageRect(e.data.image, e.data.startX, e.data.endX, e.data.startY, e.data.endY);
                    numWorkersComplete++;

                    if(numWorkersComplete == numWorkers) {
                        endCallback();
                    }
                }
            };
        }
    }
}