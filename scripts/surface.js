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


//------------------------------------------------------------------------------------------
// Palette
//------------------------------------------------------------------------------------------


class PaletteSegment {
    constructor(descriptor) {
        const split = descriptor.split(",");

        this.start = parseInt(split[0]);
        this.r     = parseInt(split[1]);
        this.g     = parseInt(split[2]);
        this.b     = parseInt(split[3]);
        this.mode  = split[4];
    }

    toStr() {
        return "start = " + this.start + " | (" + this.r + "," + this.g + ", " + this.b + ")";
    }
}


/**
 * \class Palette
 */
class Palette {
    constructor() {
        this.descriptor = null;
        this.segments = [];
    }

    /**
     * Builds the palette from a descriptor.
     * 
     * This descriptor is expected as an array of strings formatted as:
     * 
     *     "start,r,g,b,mode"
     * 
     * Where:
     * 
     *     start: integer [0, 255]
     *         r: integer [0, 255]
     *         g: integer [0, 255]
     *         b: integer [0, 255]
     *      mode: "solid", "lerp", "none" 
     */
    build(descriptor) {
        this.descriptor = descriptor;

        this.segments = [];

        for(var i = 0; i < descriptor.length; ++i) {
            this.segments.push(new PaletteSegment(descriptor[i]));
        }

        this.segments.sort(function(a, b) {
            return (a.start - b.start);
        })
    }

    /**
     * 
     */
    findSegment(value) {
        var index = 0;
        
        for(var i = 0; i < this.segments.length; ++i) {
            if(this.segments[i].start < value) {
                index = i;
            } else {
                break;
            }
        }

        return index;
    }

    /**
     * 
     */
    transform(value) {
        var segmentIndex = this.findSegment(value);
        var result = null;

        if(segmentIndex < this.segments.length) {
            var r = this.segments[segmentIndex].r;
            var g = this.segments[segmentIndex].g;
            var b = this.segments[segmentIndex].b;

            result = {r: r, g: g, b: b};
        }

        return result;
    }
}


//------------------------------------------------------------------------------------------
// Surface
//------------------------------------------------------------------------------------------


/**
 * \class Surface
 * \brief Canvas wrapper for simple image rendering.
 */
class Surface {
    constructor() {
        this.width         = 1;
        this.height        = 1;
        this.canvas        = document.getElementById("surface");
        this.context       = this.canvas.getContext("2d");
        this.rawImageData  = this.context.createImageData(this.width, this.height);
        this.rawMaxValue   = 0.0;
        this.rawMinValue   = 1.0;
        this.gray          = true;
        this.grayPalette   = new Palette();
        this.colorPalette  = new Palette();
        this.activePalette = (this.gray ? this.grayPalette : this.colorPalette);
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
            this.rawImageData  = this.context.createImageData(width, height);

            $("#surface").attr("width", width);
            $("#surface").attr("height", height);
        }
    }

    getRawImageData() {
        return this.rawImageData;
    }

    normalizeRawImage() {
        this.rawMaxValue = 0.0;
        this.rawMinValue = 1.0;

        var dataPos = this.rawImageData.length;

        while(dataPos--) {
            if(this.rawImageData[dataPos] < this.rawMinValue) {
                this.rawMinValue = this.rawImageData[dataPos];
            }
            if(this.rawImageData[dataPos] > this.rawMaxValue) {
                this.rawMaxValue = this.rawImageData[dataPos];
            }
        }

        const dataRange = (this.rawMaxValue - this.rawMinValue);
        const dataRangeReciprocal = 1.0 / dataRange;

        dataPos = this.rawImageData.length;

        while(dataPos--) {
            this.rawImageData[dataPos] = (this.rawImageData[dataPos] - this.rawMinValue) * dataRangeReciprocal;
        }
    }

    drawImage(data) {
        this.context.putImageData(data, 0, 0);
        this.rawImageData = this.context.getImageData(0, 0, this.width, this.height);
    }

    drawImageRect(data, startX, endX, startY, endY) {
        this.context.putImageData(data, 0, 0, startX, startY, (endX - startX), (endY - startY));
        this.rawImageData = this.context.getImageData(0, 0, this.width, this.height);
    }

    size() {
        return (this.width * this.height);
    }

    getURL() {
        var data = this.canvas.toDataURL();
        return data.replace(/^data:image\/[^;]/, 'data:application/octet-stream');
    }

    setPalette(descriptor, gray) {
        if(gray) {
            this.grayPalette.build(descriptor);
        } else {
            this.colorPalette.build(descriptor);
        }
    }

    applyPalette() {
        this.transformedImageData = this.context.createImageData(this.rawImageData);
            
        var value = 0;
        var color = null;

        for(var i = 0; i < this.transformedImageData.data.length; i += 4) {
            value = this.rawImageData.data[i];
            color = this.activePalette.transform(value);

            if(color) {
                this.transformedImageData.data[i + 0] = color.r;
                this.transformedImageData.data[i + 1] = color.g;
                this.transformedImageData.data[i + 2] = color.b;
                this.transformedImageData.data[i + 3] = 255;
            }
        }

        this.context.putImageData(this.transformedImageData, 0, 0);
    }
}