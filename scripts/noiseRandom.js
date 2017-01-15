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
 * \class NoiseRandom
 * \brief Generates an image populated by the specified PRNG algorithm.
 */
class NoiseRandom extends Noise {
    constructor(prng) {
        super();

        this.type = "Random";
        this.prng = CreateRandom(prng);
    }

    setSeed(value) {
        super.setSeed(value);
        this.prng.setSeed(value);
    }

    generateGrayScale(imageData) {
        super.generateGrayScale(imageData);
        
        for(var x = 0; x < this.width; ++x) {
            for(var y = 0; y < this.height; ++y) {
                var color = this.prng.next(0, 255);
                this.setPixel(imageData, x, y, color, color, color, 255);
            }
        }
    }

    generateColor(imageData) {
        super.generateColor(imageData);

        for(var x = 0; x < this.width; ++x) {
            for(var y = 0; y < this.height; ++y) {

                var r = this.prng.next(0, 255);
                var g = this.prng.next(0, 255);
                var b = this.prng.next(0, 255);

                this.setPixel(imageData, x, y, r, g, b, 255);
            }
        }
    }
}