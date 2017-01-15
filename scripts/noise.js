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
 * \class Noise
 * \brief Parent class of all noise implementations.
 */
class Noise {
    constructor() {
        this.type   = "Unknown";
        this.seed   = 0;
        this.gray   = true;
        this.width  = 0;           // Width of the active image data (in pixels)
        this.height = 0;           // Height of the active image data (in pixels)
        this.length = 0;           // Total length of the active image data (in bytes [4 bytes per pixel])
    }

    setSeed(value) {
        this.seed = value;
    }

    length() {
        this.length = (this.width * this.height * 4);
    }

    indexToXY(index, x, y) {
        var pixIndex = index / 4;

        y = (pixIndex / this.width);
        x = (pixIndex % this.width);
    }

    xyToIndex(x, y) {
        return (((y * this.width) + x) * 4);
    }

    setPixel(imageData, x, y, r, g, b, a) {
        var index = this.xyToIndex(x, y);

        imageData.data[index + 0] = r;
        imageData.data[index + 1] = g;
        imageData.data[index + 2] = b;
        imageData.data[index + 3] = a;
    }

    generateGrayScale(imageData) {
        
    }

    generateColor(imageData) {

    }

    generate(imageData) {
        if(imageData) {
            this.width  = imageData.width;
            this.height = imageData.height;
            this.length = (this.width * this.height * 4);

            if(this.gray) {
                this.generateGrayScale(imageData);
            } else {
                this.generateColor(imageData);
            }
        }
    }
}