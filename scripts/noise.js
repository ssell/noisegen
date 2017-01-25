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
 * noise.js
 *
 * This script houses all of the noise algorithm implementations and
 * any associated functions (math, helpers, etc.).
 *
 * It also contains general functions for noise creation, parameter
 * retrieval, and multi-thread worker execution.
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


//------------------------------------------------------------------------------------------
// Random 
//------------------------------------------------------------------------------------------


/**
 * \class Random
 * \brief Parent class of all PRNG implementations.
 */
class Random {
    constructor() {
        this.seed = 0;
    }

    setSeed(value) {
        this.seed = value;
    }

    next() {
        return 0;
    }

    next(min, max) {
        var value = next();
        return (value % (max - min)) + min;
    }
}

Random.phi = 1.618033988749895;


//------------------------------------------------------------------------------------------
// PRNG - XorShift96
//------------------------------------------------------------------------------------------


/** 
 * \class RandomXorShift96
 *
 * Implementation of the 96 periodicity variation of the XorShift PRNG.
 *
 * This is an adaptation of the C++ implementation found within Ocular Engine at:
 *
 *     https://github.com/ssell/OcularEngine/blob/master/OcularCore/include/Math/Random/XorShift.hpp
 */
class RandomXorShift96 extends Random {
    constructor() {
        super();

        this.shiftY = 238979280;
        this.shiftZ = 158852560;

        this.x = 0;
        this.y = 0;
        this.z = 0;
    }

    setSeed(value) {
        super.setSeed(value);

        this.x = value;
        this.y = this.x + this.shiftY;
        this.z = this.y + this.shiftZ;
    }

    next() {
        this.x ^= this.x << 16;
        this.x ^= this.x >> 5;
        this.x ^= this.x << 1;

        var temp = this.x;

        this.x = this.y;
        this.y = this.z;
        this.z = temp ^ this.x ^ this.y;

        return this.z;
    }
}

RandomXorShift96.type = "XorShift96";


//------------------------------------------------------------------------------------------
// PRNG - WELL512
//------------------------------------------------------------------------------------------


/**
 * \class RandomWELL512
 *
 * Implementation of the 512 periodicity variation of the WELL (Well Equidistributed Long-Period Linear) PRNG algorithm.
 *
 * This is an adaptation of the C++ implementation found within Ocular Engine at:
 *
 *     https://github.com/ssell/OcularEngine/blob/master/OcularCore/include/Math/Random/WELL.hpp
 * 
 * That implementation was based on the original work found at:
 *
 *     http://www.iro.umontreal.ca/~panneton/well/WELL512a.c
 */
class RandomWELL512 extends Random {
    constructor() {
        super();
        
        this.type = "WELL512";

        this.index = 0;
        this.state = Array.apply(0, Array(16)).map(function() { });  // *sigh*
        this.xor   = new RandomXorShift96;
    }

    setSeed(value) {
        super.setSeed(value);

        this.xor.setSeed(value);

        for(var i = 0; i < 16; ++i) {
            this.state[i] = this.xor.next();
        }
    }

    next() {
        var a = 0;
        var b = 0;
        var c = 0;
        var d = 0;

        a  = this.state[this.index];
        c  = this.state[(this.index + 13) & 15];
        b  = a ^ c ^ (a << 16) ^ (c << 15);
        c  = this.state[(this.index + 9) & 15];
        c ^= (c >> 11);
        a  = this.state[this.index] = b ^ c;
        d  = a ^ ((a << 5) & 3661901088);
        this.index = (this.index + 15) & 15;
        a  = this.state[this.index];
        this.state[this.index] = a ^ b ^ d ^ (a << 2) ^ (b << 18) ^ (c << 28);

        return this.state[this.index];
    }
}

RandomWELL512.type = "WELL512";


//------------------------------------------------------------------------------------------
// PRNG - CMWC131104
//------------------------------------------------------------------------------------------

/**
 * \class RandomCMWC131104
 *
 * Implementation of the 131104 periodicity variation of the CMWC (Complementary-Multiply-With-Carry) PRNG algorithm.
 *
 * This is an adaptation of the C++ implementation found within Ocular Engine at:
 *
 *     https://github.com/ssell/OcularEngine/blob/master/OcularCore/include/Math/Random/CMWC.hpp
 */
class RandomCMWC131104 extends Random {
    constructor() {
        super();

        this.type   = "CMWC131104";
        this.qarray = Array.apply(0, Array(RandomCMWC131104.qsize)).map(function() { });
        this.c      = 362436;
        this.i      = RandomCMWC131104.qsize - 1;
    }

    setSeed(value) {
        super.setSeed(value);

        this.qarray[0] = this.seed;
        this.qarray[1] = this.seed + Random.phi;
        this.qarray[2] = this.seed + Random.phi + Random.phi;

        for(var i = 3; i < RandomCMWC131104.qsize; ++i) {
            this.qarray[i] = this.qarray[i - 3] ^ this.qarray[i - 2] ^ Random.phi ^ i;
        }
    }

    next() {
        this.i = (this.i + 1) & 4095;

        var temp = 18782 * this.qarray[this.i] + this.c;
        this.c = temp >> 32;
        this.qarray[this.i] = (4294967294 - temp) | 0;

        return this.qarray[this.i];
    }
}

RandomCMWC131104.type  = "CMWC131104";
RandomCMWC131104.qsize = 4096;


//------------------------------------------------------------------------------------------
// Random - Factory
//------------------------------------------------------------------------------------------


function CreateRandom(type) {
    var prng;

    switch(type) {
    case RandomXorShift96.type:
        prng = new RandomXorShift96();
        break;

    case RandomWELL512.type:
        prng = new RandomWELL512();
        break;

    case RandomCMWC131104.type:
        prng = new RandomCMWC131104();
        break;

    default:
        break;
    }

    return prng;
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

        this.params = "";
        this.seed   = 0;
        this.gray   = true;
        this.width  = 0;           // Width of the active image data (in pixels)
        this.height = 0;           // Height of the active image data (in pixels)
        this.length = 0;           // Total length of the active image data (in bytes [4 bytes per pixel])
    }

    setParam(param, value) {
        var result = true;

        switch(param) {
        case "gray":
            this.gray = (value == "true");
            break;

        default:
            result = false;
            break;
        }

        return result;
    }

    setParams(params) {
        var paramsSplit = params.split(";");

        for(var i = 0; i < paramsSplit.length; ++i) {
            var paramSegments = paramsSplit[i].split(":");
            var paramName = paramSegments[0];
            var paramVal = paramSegments[1];

            this.setParam(paramName, paramVal);
        }
    }

    static getParams() {
        return "";
    }

    setSeed(value) {
        console.log("\tNoise Seed = " + value);
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
        this.prng = CreateRandom(RandomXorShift96.type);
    }

    setParam(param, value) {
        var result = super.setParam(param, value);

        if(!result) {
            switch(param) {
            case "prng":
                this.prng = CreateRandom(value);
                break;

            case "seed":
                this.setSeed(Number(value));
                break;

            default:
                result = true;
                break;
            }
        }

        return result;
    }

    static getParams() {
        super.getParams();
        return "prng:select " + RandomXorShift96.type + " " + RandomWELL512.type + " " + RandomCMWC131104.type + ";seed:uint 1337;";
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
                var color = this.prng.next(0, 255);
                this.setPixel(imageData, x, y, color, color, color, 255);
            }
        }
    }
}

NoiseRandom.type = "Random";


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
    }

    setParam(param, value) {
        var result = super.setParam(param, value);

        if(!result) {
            switch(param) {
            case "octaves":
                this.octaves = Number(value);
                break;

            case "persistence":
                this.persistence = Number(value);
                break;

            case "scale":
                this.scale = Number(value);
                break;

            default:
                result = true;
                break;
            }
        }

        return result;
    }

    static getParams() {
        super.getParams();
        return "octaves:int_range 1 20 5;persistence:float_range 0.0 1.0 0.5;scale:float_range 0.0001 1.0 0.01;"
    }

    getRandom(x, y) {
        var n = int32(x) + int32(y) * 57;
        n = (n << 13) ^ n;

        // Note the gratuitous use of 'int32'. This is because the original C/C++ algorithms rely on 32-bit integer overflow behavior.
        return (1.0 - int32(int32(int32(n * int32(int32(int32(n * n) * 15731) + 789221)) + 1376312589) & 2147483647) * 0.00000000093132257);
    }

    getSmoothNoise(x, y) {
        const corners = (this.getRandom((x - 1.0), (y - 1.0)) + 
                         this.getRandom((x + 1.0), (y - 1.0)) +
                         this.getRandom((x - 1.0), (y + 1.0)) +
                         this.getRandom((x + 1.0), (y + 1.0))) * 0.0625;

        const sides   = (this.getRandom((x - 1.0), y) +
                         this.getRandom((x + 1.0), y) + 
                         this.getRandom(x, (y - 1.0)) + 
                        
                         this.getRandom(x, (y + 1.0))) * 0.125;

        const center  = this.getRandom(x, y) * 0.25;

        const result  = (corners + sides + center);

        return result;
    }

    getInterpolatedNoise(x, y) {
        const wholeX = int32(x);
        const wholeY = int32(y);
        const fracX  = x - wholeX;
        const fracY  = y - wholeY;

        const value0 = this.getSmoothNoise(wholeX, wholeY);
        const value1 = this.getSmoothNoise((wholeX + 1.0), wholeY);
        const value2 = this.getSmoothNoise(wholeX, (wholeY + 1.0));
        const value3 = this.getSmoothNoise((wholeX + 1.0), (wholeY + 1.0));

        const interpolated0 = interpolateLinear(value0, value1, fracX);
        const interpolated1 = interpolateLinear(value2, value3, fracX);

        const result = interpolateLinear(interpolated0, interpolated1, fracY);

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

        const progressStep = (endY - startY);

        for(var x = startX; x < endX; ++x) {
            for(var y = startY; y < endY; ++y) {
                // Perlin noise generates values on the range of [-1.0, 1.0] but for our pixels we require a color on the range [0, 255]
                var color = ((this.getValue(x + this.seed, y + this.seed) + 1.0) * 0.5) * 255;
                this.setPixel(imageData, x, y, color, color, color, 255);
            }
            
            postMessage({ progress: progressStep });
        }
    }
}

NoisePerlin.type = "Perlin";


//-----------------------------------------------------------------------------------------
// Noise Factory
//-----------------------------------------------------------------------------------------


function createNoise(type) {
    var result = null;

    switch(type) {
    case NoisePerlin.type:
        result = new NoisePerlin();
        break;

    case NoiseRandom.type:
        result = new NoiseRandom();
        break;

    default:
        break; 
    }

    return result;
}

function getUIParams(type) {
    var result = "";

    switch(type) {
    case NoisePerlin.type:
        result = NoisePerlin.getParams();
        break;

    case NoiseRandom.type:
        result = NoiseRandom.getParams();
        break;

    default:
        break; 
    }

    console.log("'" + type + "': " + result);

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
        var params = data.noiseParams;
        var startX = data.startX;
        var endX   = data.endX;
        var startY = data.startY;
        var endY   = data.endY;

        noise.setParams(params);
        noise.generate(image, startX, endX, startY, endY);

        postMessage({ image: data.image, startX: startX, endX: endX, startY: startY, endY: endY});
    }
}