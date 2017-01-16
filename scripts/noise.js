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

//-----------------------------------------------------------------------------------------
// Math Utilities
//-----------------------------------------------------------------------------------------

/** 
 * Clamps the specified value to the minimum and maximum.
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Returns 32-bit signed integer version of x.
 */
function int32(x) {
    return (x | 0);
}

/** 
 * Linearly interpolates from one value to another.
 *
 * With linear interpolation, a straight line will result from the transition between values.
 * If used to interpolate over multiple points, for example a graph, there will be no 
 * continuity between the points.
 * 
 * Adapted from original source in Ocular Engine:
 *
 *     https://github.com/ssell/OcularEngine/blob/master/OcularCore/include/Math/Interpolation.hpp
 */
function interpolateLinear(from, to, frac) {
    var clamped = clamp(frac, 0.0, 1.0);
    return (from * (1.0 - clamped)) + (to * clamped);
}

/**
 * Smoothly interpolates from one value to another.
 *
 * With cosine interpolation, a smooth curve will result from the transition between values.
 * If used to interpolate over multiple points, for example a graph, there will be no
 * continuity between the points.
 * 
 * Adapted from original source in Ocular Engine:
 *
 *     https://github.com/ssell/OcularEngine/blob/master/OcularCore/include/Math/Interpolation.hpp
 */
function interpolateCosine(from, to, frac) {
    var clamped = clamp(frac, 0.0, 1.0);
    var x = (1.0 - Math.cos(clamped * Math.PI)) * 0.5;

    return (from * (1.0 - x)) + (to * x);
}


//-----------------------------------------------------------------------------------------
// Noise
//-----------------------------------------------------------------------------------------


/** 
 * \class Noise
 * \brief Parent class of all noise implementations.
 */
class Noise {
    constructor() {

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

    generate(imageData, startX, endX, startY, endY) {
        this.width  = imageData.width;
        this.height = imageData.height;
        this.length = (this.width * this.height * 4);
    }
}


//-----------------------------------------------------------------------------------------
// NoiseRandom
//-----------------------------------------------------------------------------------------


/** 
 * \class NoiseRandom
 * \brief Generates an image populated by the specified PRNG algorithm.
 */
class NoiseRandom extends Noise {
    constructor() {
        super();

        this.type = "Random";
        this.prng = new RandomWELL512();
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

    generate(imageData, startX, endX, startY, endY) {
        super.generate(imageData, startX, startY, endY);

        for(var x = startX; x < endX; ++x) {
            for(var y = startY; y < endY; ++y) {

                var r = this.prng.next(0, 255);
                var g = this.prng.next(0, 255);
                var b = this.prng.next(0, 255);

                this.setPixel(imageData, x, y, r, g, b, 255);
            }
        }
    }
}


//-----------------------------------------------------------------------------------------
// NoisePerlin
//-----------------------------------------------------------------------------------------


/**
 * \class NoisePerlin
 *
 * Implementation of classic Perlin Noise. 
 *
 * This is an adaptation of the C++ implementation found within Ocular Engine at:
 *
 *     https://github.com/ssell/OcularEngine/blob/master/OcularCore/include/Math/Noise/PerlinNoise.hpp
 *
 * Perlin Noise has three controlling variables:
 *
 *     - Octaves -
 *
 *     For each octave, a higher frequency/lower amplitude function will be added to the original.
 *     Additional octaves increase the definition of the resulting noise but may be computationally expensive.
 *     Typical values range from [0.0, 15.0] with the default being 6.0.
 *
 *     - Persistence -
 *
 *     The higher the persistence, the more of each succeeding octave will be added to the original.
 *     Very high persistence values can lead to output resembling raw (non-coherent) noise.
 *     Values range from [0.0, 1.0] with the default being 0.5.
 *
 *     - Scale - 
 *
 *     Scale can be thought of as a zoom-level. The lower the scale, the closer in the zoom and vice versa.
 *     Extremely low values can result in a blobby or solid output.
 *     Extremely high values can result in output resembling raw noise.
 *     Typical values range from [0.0001, 1.0] with the default being 0.01.
 *
 * For more information, visit Ken Perlin's page on Perlin Noise at:
 *
 *     http://mrl.nyu.edu/~perlin/doc/oscar.html
 */
class NoisePerlin extends Noise {
    constructor() {
        super();

        this.octaves     = 6;
        this.persistence = 0.5;
        this.scale       = 0.01;
        this.seed        = 0;
    }

    getRandom(x, y) {
        var n = int32(x) + int32(y) * 57;
        n = (n << 13) ^ n;

        // Note the gratuitous use of 'int32'. This is because the original C/C++ algorithms rely on 32-bit integer overflow behavior.
        return (1.0 - int32(int32(int32(n * int32(int32(int32(n * n) * 15731) + 789221)) + 1376312589) & 2147483647) * 0.00000000093132257);
    }

    getSmoothNoise(x, y) {
        var corners = (this.getRandom((x - 1.0), (y - 1.0)) + 
                       this.getRandom((x + 1.0), (y - 1.0)) +
                       this.getRandom((x - 1.0), (y + 1.0)) +
                       this.getRandom((x + 1.0), (y + 1.0))) * 0.0625;

        var sides = (this.getRandom((x - 1.0), y) +
                     this.getRandom((x + 1.0), y) + 
                     this.getRandom(x, (y - 1.0)) + 
                     this.getRandom(x, (y + 1.0))) * 0.125;

        var center = this.getRandom(x, y) * 0.25;

        var result = (corners + sides + center);

        return result;
    }

    getInterpolatedNoise(x, y) {
        var wholeX = int32(x);
        var wholeY = int32(y);
        var fracX  = x - wholeX;
        var fracY  = y - wholeY;

        var value0 = this.getSmoothNoise(wholeX, wholeY);
        var value1 = this.getSmoothNoise((wholeX + 1.0), wholeY);
        var value2 = this.getSmoothNoise(wholeX, (wholeY + 1.0));
        var value3 = this.getSmoothNoise((wholeX + 1.0), (wholeY + 1.0));

        var interpolated0 = interpolateLinear(value0, value1, fracX);
        var interpolated1 = interpolateLinear(value2, value3, fracX);

        var result = interpolateLinear(interpolated0, interpolated1, fracY);

        return result;
    }

    getValue(x, y) {
        var result       = 0.0;
        var frequency    = this.scale;
        var amplitude    = 1.0;
        var maxAmplitude = 0.0;

        for(var i = 0; i < this.octaves; ++i) {
            result += this.getInterpolatedNoise((x * frequency), (y * frequency)) * amplitude;

            frequency    *= 2.0;
            maxAmplitude += amplitude;
            amplitude    *= this.persistence;
        }

        return (result / maxAmplitude);
    }

    generate(imageData, startX, endX, startY, endY) {
        super.generate(imageData, startX, startY, endY);

        for(var x = startX; x < endX; ++x) {
            for(var y = startY; y < endY; ++y) {
                // Perlin noise generates values on the range of [-1.0, 1.0] but for our pixels we require a color on the range [0, 255]
                var color = ((this.getValue(x + this.seed, y + this.seed) + 1.0) * 0.5) * 255;
                this.setPixel(imageData, x, y, color, color, color, 255);
            }
        }
    }
}



//-----------------------------------------------------------------------------------------
// Noise Factory
//-----------------------------------------------------------------------------------------


function createNoise(type) {
    var result = null;

    switch(type) {
    case "Perlin":
        result = new NoisePerlin();
        break;

    default:
        break; 
    }

    return result;
}


//-----------------------------------------------------------------------------------------
// Multithreaded Message
//-----------------------------------------------------------------------------------------

self.onmessage = function(e) {
    var data = e.data;

    if(data) {
        var image  = data.image;
        var noise  = createNoise(data.noise);
        var startX = data.startX;
        var endX   = data.endX;
        var startY = data.startY;
        var endY   = data.endY;

        noise.generate(image, startX, endX, startY, endY);

        postMessage({ image: data.image, startX: startX, endX: endX, startY: startY, endY: endY});
    }
}