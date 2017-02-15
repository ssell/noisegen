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
// Utility Math Functions
//------------------------------------------------------------------------------------------

/**
 * Converts an RGB color to HSV.
 * 
 * Adapted from C++ code at http://stackoverflow.com/a/6930407
 * 
 * \param[in] r R-component on range of [0, 255]
 * \param[in] g G-component on range of [0, 255]
 * \param[in] b B-component on range of [0, 255]
 */
function rgbToHsv(r, g, b) {
    var result = { h: 0.0, s: 0.0, v: 0.0 };

    const min   = Math.min(r, Math.min(g, b));
    const max   = Math.max(r, Math.max(g, b));
    const delta = max - min;
    
    result.v = max;

    if(delta < 0.00001) {
        result.s = 0.0;
        result.h = 0.0;
    } else if(max > 0.0) {
        result.s = (delta / max);

        if(r >= max) {
            result.h = (g - b) / delta;
        } else if(g >= max) {
            result.h = 2.0 + (b - r) / delta;
        } else {
            result.h = 4.0 + (r - g) / delta;
        }

        result.h *= 60.0;

        if(result.h < 0.0) {
            result.h += 360.0;
        }
    }

    return result;
}

/**
 * Converts an HSV color to RGB.
 * 
 * Adapted from C++ code at http://stackoverflow.com/a/6930407
 * 
 * \param[in] h H-component on range [0, 360]
 * \param[in] s S-component on range [0, 1]
 * \param[in] v V-component on range [0, 255]
 */
function hsvToRgb(h, s, v) {
    var result = { r: v, g: v, b: v};
    
    if(s > 0.0) {
        const hh = ((h >= 360.0) ? 0.0 : h) * 0.01666666666;
        const i  = Math.trunc(hh);
        const f  = hh - i;
        const p  = v * (1.0 - s);
        const q  = v * (1.0 - (s * f));
        const t  = v * (1.0 - (s * (1.0 - f)));
        
        switch(i) {
        case 0:
            result.r = v;
            result.g = t;
            result.b = p;
            break;

        case 1:
            result.r = q;
            result.g = v;
            result.b = p;
            break;

        case 2:
            result.r = p;
            result.g = v;
            result.b = t;
            break;

        case 3:
            result.r = p;
            result.g = q;
            result.b = v;
            break;

        case 4:
            result.r = t;
            result.g = p;
            result.b = v;
            break;

        case 5:
        default:
            result.r = v;
            result.g = p;
            result.b = q;
            break;
        }
    }

    return result;
}

/**
 * Simple linear interpolation. 
 * 
 * Smoothly transitions from one value to another.
 * 
 * \param[in] from Starting interpolation value
 * \param[in] to   Ending interpolation value
 * \param[in] frac Fractional interpolation value on range [0, 1]
 */
function lerp(from, to, frac) {
    return (from * (1.0 - frac)) + (to * frac);
}

/**
 * Interpolates between two RGB colors.
 */
function lerpColorRGB(r0, g0, b0, r1, g1, b1, frac) {
    return  {
        r: Math.trunc(lerp(r0, r1, frac)), 
        g: Math.trunc(lerp(g0, g1, frac)), 
        b: Math.trunc(lerp(b0, b1, frac)) 
    };
}

/**
 * Converts between two RGB colors on the HSV color model.
 */
function lerpColorHSV(r0, g0, b0, r1, g1, b1, frac) {
    // Convert RGB to HSV first
    var rgb0 = { r: r0, g: g0, b: b0 };
    var rgb1 = { r: r1, g: g1, b: b1 };

    var hsv0 = rgbToHsv(rgb0.r, rgb0.g, rgb0.b);
    var hsv1 = rgbToHsv(rgb1.r, rgb1.g, rgb1.b);

    // Lerp the HSV values
    var lerpHsv = { h: lerp(hsv0.h, hsv1.h, frac), s: lerp(hsv0.s, hsv1.s, frac), v: lerp(hsv0.v, hsv1.v, frac) };

    // Convert HSV back to RGB
    var lerpRgb = hsvToRgb(lerpHsv.h, lerpHsv.s, lerpHsv.v);

    return {r: lerpRgb.r, g: lerpRgb.g, b: lerpRgb.b };
}


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
        return "mode = " + this.mode + " | start = " + this.start + " | (" + this.r + "," + this.g + ", " + this.b + ")";
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
        });
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

        var r = value;
        var g = value;
        var b = value;

        if(segmentIndex < this.segments.length) {
            const mode = String(this.segments[segmentIndex].mode).toLocaleLowerCase();

            if(mode.localeCompare("solid") == 0) {
                r = this.segments[segmentIndex].r;
                g = this.segments[segmentIndex].g;
                b = this.segments[segmentIndex].b;
            } else if(mode.includes("smooth")) {
                if(segmentIndex < (this.segments.length - 1)) {
                    var left  = this.segments[segmentIndex];
                    var right = this.segments[segmentIndex + 1];
                    var frac  = (value - left.start) / (right.start - left.start);

                    var smoothed = null;

                    if(mode.includes("rgb")) {
                        smoothed = lerpColorRGB(left.r, left.g, left.b, right.r, right.g, right.b, frac);
                    } else if(mode.includes("hsv")) {
                        smoothed = lerpColorHSV(left.r, left.g, left.b, right.r, right.g, right.b, frac);
                    }

                    if(smoothed) {
                        r = smoothed.r;
                        g = smoothed.g;
                        b = smoothed.b;
                    }
                } else {
                    var left  = this.segments[segmentIndex];

                    r = left.r;
                    g = left.g;
                    b = left.b;
                }
            }
        }

        return {r: r, g: g, b: b};
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

    updateRawImageData() {
        this.rawImageData = this.context.getImageData(0, 0, this.width, this.height);
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
    }

    drawImageRect(data, startX, endX, startY, endY) {
        this.context.putImageData(data, 0, 0, startX, startY, (endX - startX), (endY - startY));
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

    getPalette() {
        this.activePalette = (this.gray ? this.grayPalette : this.colorPalette);
        return this.activePalette;
    }
}

//------------------------------------------------------------------------------------------
// Multi-threaded Palette Application 
//------------------------------------------------------------------------------------------

self.onmessage = function(e) {
    var data = e.data;

    if(data) {

        const descr  = data.paletteDescr;
        const startX = data.startX;
        const startY = data.startY;
        const endX   = data.endX;
        const endY   = data.endY;

        var srcImage  = data.srcImage;
        var destImage = data.destImage;
        var palette   = new Palette();

        palette.build(descr);

        const progressStep = (endY - startY);
        const width = srcImage.width;

        var value = 0;
        var color = null;
        var index = 0;

        for(var x = startX; x < endX; ++x) {
            for(var y = startY; y < endY; ++y) {
                index = ((y * width) + x) * 4;

                value = srcImage.data[index];
                color = palette.transform(value);

                destImage.data[index + 0] = color.r;
                destImage.data[index + 1] = color.g;
                destImage.data[index + 2] = color.b;
                destImage.data[index + 3] = 255;
            }

            postMessage({ progress: progressStep });
        }

        postMessage({ image: destImage, startX: startX, endX: endX, startY: startY, endY: endY });
    }
}