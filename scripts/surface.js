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
 * surface.js
 *
 * This script contains the Surface class definition which is a wrapper
 * around the HTML5 canvas object.
 */

/**
 * \class Surface
 * \brief Canvas wrapper for simple image rendering.
 */
class Surface {
    constructor() {
        this.width     = 2000;
        this.height    = 1000;
        this.canvas    = document.getElementById("surface");
        this.context   = this.canvas.getContext("2d");
        this.imageData = this.context.createImageData(this.width, this.height);
    }

    clear(r, g, b) {
        this.context.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
        this.context.fillRect(0, 0, this.width, this.height);
    }

    resize(width, height) {
        if((this.width != width) || (this.height != height)) {
            this.width         = width;
            this.height        = height;
            this.canvas.width  = width;
            this.canvas.height = height;
            this.imageData     = this.context.createImageData(width, height);

            $("#surface").attr("width", width);
            $("#surface").attr("height", height);
        }
    }

    getImageData() {
        return this.imageData;
    }

    drawImage(data) {
        this.context.putImageData(data, 0, 0);
    }

    drawImage(data, startX, endX, startY, endY) {
        this.context.putImageData(data, 0, 0, startX, startY, (endX - startX), (endY - startY));
    }
}