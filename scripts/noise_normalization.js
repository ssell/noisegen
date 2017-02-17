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
 * noise_normalization.js
 *
 * This script contains functionality to normalize raw noise data and
 * convert it into an image. Intended to be run via a worker.
 */

/**
 * 
 */
function rawToImage(raw, image) {
    for(var imgPos = 0, rawPos = 0; imgPos < image.data.length; imgPos += 4, ++rawPos) {
        image.data[imgPos + 0] = raw[rawPos];
        image.data[imgPos + 1] = raw[rawPos];
        image.data[imgPos + 2] = raw[rawPos];
        image.data[imgPos + 3] = 255;
    }
}

/**
 * 
 */
function normalizeData(raw) {

    var min = Infinity;
    var max = -Infinity;

    var pos = raw.length;

    while(pos--) {
        if(min > raw[pos]) {
            min = raw[pos];
        }

        if(max < raw[pos]) {
            max = raw[pos];
        }
    }

    const range = (max - min);
    const rangeReciprocal = (1 / range);

    pos = raw.length;

    while(pos--) {
        raw[pos] = ((raw[pos] - min) * rangeReciprocal) * 255;
    }
}

self.onmessage = function(e) {
    var data = e.data;

    if(data) {
        var raw   = data.raw;
        var image = data.image;

        normalizeData(raw);
        rawToImage(raw, image);

        postMessage({ image: image });
    }
}