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
 * Returns a 32-bit signed integer version of x.
 */
function int32(x) {
    return (x | 0);
}

/**
 * Returns a 32-bit unsigned integer version of x.
 */
function uint32(x) { 
    return (x >>> 0);
}

/**
 * True modulus. Javascript '%' is a remainder operation. Example:
 *
 *     -5 % 3
 *
 * Expected modulus result: 1
 * Javascript 'modulus' result: -2
 *
 * See: http://stackoverflow.com/q/4467539
 */
function mod(n, m) {
    return ((n % m) + m) % m;
}

/** 
 * Linearly interpolates from one value to another.
 *
 * With linear interpolation, a straight line will result from the transition between values.
 * If used to interpolate over multiple points, for example a graph, there will be no 
 * continuity between the points.
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
 */
function interpolateCosine(from, to, frac) {
    var clamped = clamp(frac, 0.0, 1.0);
    var x = (1.0 - Math.cos(clamped * Math.PI)) * 0.5;

    return (from * (1.0 - x)) + (to * x);
}

/**
 * Calculates the dot product between two 2-dimensional vectors.
 */
function dot2(a, b) {
    return ((a[0] * b[0]) + (a[1] * b[1]));
}

/**
 * Implementation of the Polar Form of the Box-Muller Transform.
 * 
 * Generates normally distributed random values from a source 
 * of uniformly distributed values.
 * 
 * The values generated have a mean of 0 with a standard deviation of 1.
 * Over 99% of random values will be +/- 3 standard deviation from the
 * mean, but the theoretical minimum/maximum is [-INF, +INF].
 * 
 * \param[in] rng Random implementation to generate values with.
 */
function gaussianRand(rng) {
    this.generate = true;
    this.value0   = 0.0;
    this.value1   = 0.0;

    var result = this.value1;

    if(this.generate) {
        var x0 = 0.0;
        var x1 = 0.0;
        var w  = 0.0;

        do {
            // Note: Our rng.nextf() gives a value on the range [0, 1],
            // but the Polar Form expects a value on the range [-1, 1].
            x0 = (2.0 * rng.nextf()) - 1.0;
            x1 = (2.0 * rng.nextf()) - 1.0;
            w  = (x0 * x0) + (x1 * x1);
        } while(w >= 1.0);

        w = Math.sqrt((-2.0 * Math.log(w)) / w);

        this.value0 = x0 * w;
        this.value1 = x1 * w;

        result = this.value0;
    }

    this.generate = !this.generate;
    return result;
}

/**
 * Generates a normally distributed random value with the 
 * specified mean and standard deviation. 
 * 
 * 99% of values will fall within +/- standard deviations 
 * of the mean, but the theoretical range is [-INF, INF].
 * 
 * Example:
 * 
 *                mean: 5 
 *              stddev: 2
 *     practical range: (-1, 11)
 *          true range: [-INF, INF]
 */
function gaussianRandAdjusted(rng, mean, stddev) {
    const value = gaussianRand(rng);
    return ((value * stddev) + mean);
}

/**
 * Returns the relative neighboring pixel based on the current step iteration.
 * For more information about Radius Sampling, see: https://jsfiddle.net/ssell/b2q98e4L/
 */
function radiusSample(step) {
    var result = {x: 0, y: 0};

    if(step) {
        const radius      = (((Math.sqrt(step) - 1) * 0.5) | 0) + 1;
        const radiusStart = ((4 * (radius * radius)) - (4 * radius)) + 1;
        const angleStep   = (2.0 * Math.PI) / (radius * 8);
        const angle       = (step - radiusStart) * angleStep;

        result.x = radius * Math.cos(angle);
        result.y = radius * Math.sin(angle);
    }

    return result;
}

/**
 * Returns the radius that the current sample is in.
 */
function radiusSampleRadius(step) {
    return (((Math.sqrt(step) - 1) * 0.5) | 0) + 1;
}

/**
 * Returns a single value for a coordinate pair. Indices are bijective.
 * 
 * Note that this is not the signed form. As our use of negative indices 
 * is minimal, the irregular behavior is tolerated. Especially since the 
 * signed form runs ~40% slower.
 * 
 * See the following for a comparison of pairing functions: 
 * 
 *     https://jsfiddle.net/ssell/5smy3qg6/
 */
function cantorPair(x, y) {
    return ((x + y) * (x + y + 1) * 0.5) + y;
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
        this.max  = 1;
    }

    /**
     * Sets the seed of the generator. The exact effect this has varies by implementation.
     */
    setSeed(value) {
        this.seed = uint32(value);
    }

    /**
     * Returns the next unbound value. The type and range is implementation dependent.
     */
    nextUnbound() {
        return 0;
    }

    /**
     * Returns the next unsigned integer value on the range [min, max].
     */
    next(min, max) {
        const value = this.nextUnbound();
        return (min + uint32((value * Random.maxRecip) * (max - min)));
    }

    /**
     * Returns the next floating-point value on the range [0, 1].
     */
    nextf() {
        const value = this.nextUnbound();
        return (value * Random.maxRecip);
    }
}

Random.phi      = 1.618033988749895;
Random.max      = 4294967296.0;
Random.maxRecip = 1.0 / (Random.max + 1.0);

//------------------------------------------------------------------------------------------
// PRNG - XorShift32
//------------------------------------------------------------------------------------------


/**
 * \class RandomXorShift32
 *
 * Implementation of the 32 periodicity variation of the XorShift PRNG.
 *
 * Adapted from the algorithm described in:
 *
 *     Marsaglia, George. "Xorshift RNGs." Journal of Statistical Software; Section 3 Application to Xorshift RNGs
 */ 
class RandomXorShift32 extends Random {
    constructor() {
        super();

        this.state = 0;
    }

    setSeed(value) {
        super.setSeed(uint32(value));
        this.state = this.seed;
    }

    nextUnbound() {

        var x = this.state;

        x = uint32(x ^ uint32(x << 13));
        x = uint32(x ^ uint32(x >> 17));
        x = uint32(x ^ uint32(x << 5));

        this.state = x;

        return x;
    }
}

RandomXorShift32.type = "XorShift32";


//------------------------------------------------------------------------------------------
// PRNG - XorShift128
//------------------------------------------------------------------------------------------


/**
 * \class RandomXorShift128
 *
 * Implementation of the 128 periodicity variation of the XorShift PRNG.
 *
 * Adapted from the algorithm described in:
 *
 *     Marsaglia, George. "Xorshift RNGs." Journal of Statistical Software; Section 4 Summary 
 */ 
class RandomXorShift128 extends Random {
    constructor() {
        super();

        this.stateShift = [0, 239006280, 397831840, 88675123];
        this.state      = [0, 0, 0, 0];
    }

    setSeed(value) {
        super.setSeed(uint32(value));

        for(var i = 0; i < 4; ++i) { 
            this.state[i] = uint32(this.seed + this.stateShift[i]);
        }
    }

    nextUnbound() {

        var temp = uint32(this.state[0] ^ uint32(this.state[0] << 11));

        this.state[0] = this.state[1];
        this.state[1] = this.state[2];
        this.state[2] = this.state[3];

        this.state[3] = uint32(this.state[3] ^ uint32(this.state[3] >> 19) ^ uint32(temp ^ uint32(temp >> 8)));

        return this.state[3];
    }
}

RandomXorShift128.type = "XorShift128";


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

        this.index = 0;
        this.state = Array.apply(0, Array(16)).map(function() { }); 
        this.xor   = new RandomXorShift128();
    }

    setSeed(value) {
        super.setSeed(uint32(value));
        this.xor.setSeed(value);
        for(var i = 0; i < 16; ++i) {
            this.state[i] = this.xor.nextUnbound();
        }
    }

    nextUnbound() {
        var a = 0;
        var b = 0;
        var c = 0;
        var d = 0;

        a = this.state[this.index];
        c = this.state[(this.index + 13) & 15];
        b = uint32(a ^ uint32(c ^ uint32(a << 16) ^ uint32(c << 15)));
        c = this.state[(this.index + 9) & 15];
        c = uint32(c ^ uint32(c >> 11));
        a = this.state[this.index] = b ^ c;
        d = uint32(a ^ uint32(uint32(a << 5) & 3661901088));

        this.index = (this.index + 15) & 15;

        a = this.state[this.index];

        this.state[this.index] = uint32(a ^ uint32(b ^ uint32(d ^ uint32(a << 2) ^ uint32(b << 18) ^ uint32(c << 28))));

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

    nextUnbound() {
        this.i = (this.i + 1) & 4095;

        var temp = 18782 * this.qarray[this.i] + this.c;
        this.c = temp >> 32;
        this.qarray[this.i] = uint32(4294967294 - temp);

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
    case RandomXorShift32.type:
        prng = new RandomXorShift32();
        break;

    case RandomXorShift128.type:
        prng = new RandomXorShift128();
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
        this.width  = 0;           // Width of the active image data (in pixels)
        this.height = 0;           // Height of the active image data (in pixels)
        this.length = 0;           // Total length of the active image data (in bytes [4 bytes per pixel])
    }

    /**
     * Sets an individual parameter value.
     * Implementations are expected to override with custom parameter handling.
     * 
     * \param[in] param Parameter name string.
     * \param[in] value Parameter value string.
     */
    setParam(param, value) {
        var result = true;

        switch(param) {
        case "seed":
            this.setSeed(Number(value));
            break;

        default:
            result = false;
            break;
        }

        return result;
    }

    /**
     * Sets a list of parameters for the noise implementation.
     * The parameters string is expected in the following format:
     * 
     *     param0name:param0value;param1name:param1value;...;paramNname:paramNvalue
     * 
     * Each parameter is then set with a call to setParam which should
     * be overriden by the child implementation.
     */
    setParams(params) {
        var paramsSplit   = params.split(";");
        var paramSegments = [];
        var paramName     = "";
        var paramVal      = 0;

        for(var i = 0; i < paramsSplit.length; ++i) {
            paramSegments = paramsSplit[i].split(":");
            paramName = paramSegments[0];
            paramVal = paramSegments[1];

            this.setParam(paramName, paramVal);
        }
    }

    /**
     * Returns a formatted list of parameters that the noise algorithm expects.
     * The list is typically formatted as:
     * 
     *     param0name:paramType ...;param1name:paramType ...;
     * 
     * See `ui_builder.js` for valid parameter types and formatting.
     */
    static getParams() {
        return "";
    }

    /**
     * Sets the seed of the noise implementation.
     */
    setSeed(value) {
        this.seed = value;
    }

    /**
     * Converts the index to an x/y position. 
     * Assumes usage in conjunction with a standard ImageData data array.
     */
    indexToXY(index, x, y) {
        const pixIndex = index / 4;

        y = (pixIndex / this.width);
        x = mod(pixIndex, this.width);
    }

    /**
     * Converts the x/y position to an index.
     * Assumes usage in conjunction with a standard ImageData data array.
     */
    xyToIndex(x, y) {
        return (((y * this.width) + x) * 4);
    }

    /**
     * Expected to return the raw value for the given x/y position.
     * Most noise algorithms generate on the range (-1.0, 1.0) but this may return any value.
     */
    getPixelRaw(x, y) {
        return 0;
    }

    /**
     * Expected to return the final pixel value on range [0, 255] for the given x/y position.
     */
    getPixel(x, y) {
        return 0;
    }

    /**
     * Sets the pixel value in the ImageData data array.
     * 
     * \param[in] imageData ImageData object.
     * \param[in] x         X-position in the 2D image.
     * \param[in] y         Y-position in the 2D image.
     * \param[in] r         R-channel value of the pixel. On range [0, 255].
     * \param[in] g         G-channel value of the pixel. On range [0, 255].
     * \param[in] b         B-channel value of the pixel. On range [0, 255].
     * \param[in] a         A-channel value of the pixel. On range [0, 255].
     */
    setPixel(imageData, x, y, r, g, b, a) {
        const index = this.xyToIndex(x, y);

        imageData.data[index + 0] = r;
        imageData.data[index + 1] = g;
        imageData.data[index + 2] = b;
        imageData.data[index + 3] = a;
    }

    /**
     * Sets the pixel value in the ImageData data array where (r = g = b).
     * 
     * \param[in] imageData ImageData object.
     * \param[in] x         X-position in the 2D image.
     * \param[in] y         Y-position in the 2D image.
     * \param[in] color     Color value of the pixel. On range [0, 255].
     */
    setPixelUniform(imageData, x, y, color) {
        const index = this.xyToIndex(x, y);

        imageData.data[index + 0] = color;
        imageData.data[index + 1] = color;
        imageData.data[index + 2] = color;
        imageData.data[index + 3] = 255;
    }

    /**
     * 
     */
    setRaw(rawData, x, y, value) {
        const index = (y * this.width) + x;
        rawData[index] = value;
    }

    /**
     * Fills the provided ImageData data array with pixels generated from the noise implementation.
     * 
     * \param[in] imageData ImageData object. 
     * \param[in] startX    Starting x-position in the 2D image.
     * \param[in] endX      Ending x-position in the 2D image.
     * \param[in] startY    Starting y-position in the 2D image.
     * \param[in] endY      Ending y-position in the 2D image.
     */
    generate(imageData, startX, endX, startY, endY) {
        
        const progressStep = (endY - startY);
        
        for(var x = startX; x < endX; ++x) {
            for(var y = startY; y < endY; ++y) {
                const color = this.getPixel(x, y);
                this.setPixelUniform(imageData, x, y, color);
            }

            postMessage({ progress: progressStep });
        }
    }

    /**
     * 
     */
    generateRaw(rawData, startX, endX, startY, endY) {
        
        const progressStep = (endY - startY);

        for(var x = startX; x < endX; ++x) {
            for(var y = startY; y < endY; ++y) {
                const raw = this.getPixelRaw(x, y);
                this.setRaw(rawData, x, y, raw);
            }

            postMessage({ progress: progressStep });
        }
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
        this.prng = CreateRandom(RandomXorShift32.type);
    }

    setParam(param, value) {
        var result = super.setParam(param, value);

        if(!result) {
            switch(param) {
            case "prng":
                this.prng = CreateRandom(value);
                result = true;
                break;

            default:
                break;
            }
        }

        return result;
    }

    static getParams() {
        super.getParams();
        return "prng:select " + RandomXorShift32.type + " " + RandomXorShift128.type + " " + RandomWELL512.type + " " + RandomCMWC131104.type + ";seed:number 1337;";
    }

    setSeed(value) {
        super.setSeed(value);
        this.prng.setSeed(value);
    }

    getPixelRaw(x, y) {
        super.getPixelRaw();
        return this.prng.next(0, 255);
    }

    getPixel(x, y) {
        super.getPixel();
        return this.getPixelRaw(x, y);
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
                result = true;
                break;

            case "persistence":
                this.persistence = Number(value);
                result = true;
                break;

            case "scale":
                this.scale = Number(value);
                result = true;
                break;

            default:
                break;
            }
        }

        return result;
    }

    static getParams() {
        super.getParams();
        return "octaves:int_range 1 20 6;persistence:float_range 0.0 1.0 0.6;scale:float_range 0.0001 0.1 0.02;";
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

    getPixelRaw(x, y) {
        super.getPixelRaw(x, y);
        return (this.getValue(x + this.seed, y + this.seed));
    }

    getPixel(x, y) {
        super.getPixel(x, y);
        return ((this.getPixelRaw(x, y) + 1.0) * 0.5) * 255; // Perlin noise generates values on the range of [-1.0, 1.0] but for our pixels we require a color on the range [0, 255]
    }
}

NoisePerlin.type = "Perlin";


//-----------------------------------------------------------------------------------------
// NoiseSimplex 
//-----------------------------------------------------------------------------------------


/** 
 * \class NoiseSimplex
 * 
 * Implementation of Simplex Noise.
 * 
 * This is an adaptation of the C++ implementation found within Ocular Engine at:
 * 
 *     https://github.com/ssell/OcularEngine/blob/master/OcularCore/include/Math/Noise/SimplexNoise.hpp
 *
 * Simplex Noise has three controlling variables:
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
 */
class NoiseSimplex extends Noise {
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
                result = true;
                break;

            case "persistence":
                this.persistence = Number(value);
                result = true;
                break;

            case "scale":
                this.scale = Number(value);
                result = true;
                break;

            default:
                break;
            }
        }

        return result;
    }

    static getParams() {
        super.getParams();
        return "octaves:int_range 1 20 5;persistence:float_range 0.0 1.0 0.5;scale:float_range 0.0001 0.1 0.005;"
    }

    getRawNoise(x, y) {
        var n0 = 0.0;                                 // Noise contributions from the three corners 
        var n1 = 0.0;
        var n2 = 0.0;

        const F2 = 0.36602540378;                     // Skew the input space to determine which simplex cell we are in. (0.5 * (Math.sqrt(3.0) - 1.0))
        const s  = (x + y) * F2;                      // Hairy factor for 2D

        const i = int32(x + s);
        const j = int32(y + s);

        const G2 = 0.2113248654;                      // (3.0 - Math.sqrt(3.0)) / 6.0;
        const t  = (i + j) * G2;

        const X0 = i - t;                             // Unskew the cell origin back to (x, y) space 
        const Y0 = j - t;

        const x0 = x - X0;                           // The x,y distances from the cell origin 
        const y0 = y - Y0;

        //----------------------------------------------------------------
        // For the 2D case, the simplex shape is an equilateral triangle.
        // Determine which simplex we are in.

        var i1 = 0;
        var j1 = 0;

        // Offsets for second (middle) corner of simplex in (i, j) coords
        if(x0 > y0) {
            i1 = 1;                                   // Lower triangle, XY order: (0, 0) -> (1, 0) -> (1, 1)
        } else {
            j1 = 1;                                   // Upper triangle, XY order: (0, 0) -> (0, 1) -> (1, 1)
        }

        //----------------------------------------------------------------
        // A step of (1, 0) in (i, j) means a step of ((1 - c), -c) in (x, y), and 
        // a step of (0, 1) in (i, j) means a step of (-c, (1 - c)) in (x,y), where
        // c = (3 - sqrt(3)) / 6

        const x1 = x0 - i1 + G2;                     // Offsets for middle corner in (x, y) unskewed coords 
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + (2.0 * G2);            // Offsets for last corner in (x, y) unskewed coords 
        const y2 = y0 - 1.0 + (2.0 * G2);

        // Work out the hashed gradient indices of the three simplex corners 

        const ii = int32(i & 255);
        const jj = int32(j & 255);
        
        const gi0 = mod(int32(NoiseSimplex.perm[ii + NoiseSimplex.perm[jj]]), 12);
        const gi1 = mod(int32(NoiseSimplex.perm[ii + i1 + NoiseSimplex.perm[jj + j1]]), 12);
        const gi2 = mod(int32(NoiseSimplex.perm[ii + 1 + NoiseSimplex.perm[jj + 1]]), 12);

        //----------------------------------------------------------------
        // Calculate the contribution from the three corners 

        var t0 = 0.5 - (x0 * x0) - (y0 * y0);

        if(t0 > 0.0) {
            t0 *= t0;
            n0  = t0 * t0 * dot2(NoiseSimplex.grad3[gi0], [x0, y0]);
        }

        var t1 = 0.5 - (x1 * x1) - (y1 * y1);

        if(t1 > 0.0) {
            t1 *= t1;
            n1  = t1 * t1 * dot2(NoiseSimplex.grad3[gi1], [x1, y1]);
        }

        var t2 = 0.5 - (x2 * x2) - (y2 * y2);

        if(t2 > 0.0) {
            t2 *= t2;
            n2  = t2 * t2 * dot2(NoiseSimplex.grad3[gi2], [x2, y2]);
        }

        //----------------------------------------------------------------
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1, 1].

        return (70.0 * (n0 + n1 + n2));
    }

    getValue(x, y) {
        var result       = 0.0;
        var frequency    = this.scale;
        var amplitude    = 1.0;
        var maxAmplitude = 0.0;

        for(var i = 0; i < this.octaves; ++i) {
            result += this.getRawNoise((x * frequency), (y * frequency)) * amplitude;

            frequency    *= 2.0;
            maxAmplitude += amplitude;
            amplitude    *= this.persistence;
        }

        return (result / maxAmplitude);
    }
    
    getPixelRaw(x, y) {
        super.getPixelRaw(x, y);
        return (this.getValue(x + this.seed, y + this.seed));
    }

    getPixel(x, y) {                        // override
        return ((this.getPixelRaw(x, y) + 1.0) * 0.5) * 255; // Simplex noise generates values on the range of [-1.0, 1.0] but for our pixels we require a color on the range [0, 255]
    }
}

NoiseSimplex.type = "Simplex";

// The gradients are the midpoints of the vertices of a cube.
NoiseSimplex.grad3 = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], 
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], 
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];

// Permutation table.  The same list is repeated twice.
NoiseSimplex.perm = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 
    8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 
    35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 
    134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 
    55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208,  89, 
    18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 
    250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 
    189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 
    172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 
    228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 
    107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 
    138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180, 

    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 
    8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 
    35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 
    134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 
    55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208,  89, 
    18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 
    250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 
    189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 
    172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 
    228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 
    107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 
    138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
];

// A lookup table to traverse the simplex around a given point in 4D.
NoiseSimplex.simplex = [
    [0, 1, 2, 3], [0, 1, 3, 2], [0, 0, 0, 0], [0, 2, 3, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [1, 2, 3, 0], 
    [0, 2, 1, 3], [0, 0, 0, 0], [0, 3, 1, 2], [0, 3, 2, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [1, 3, 2, 0], 
    [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], 
    [1, 2, 0, 3], [0, 0, 0, 0], [1, 3, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [2, 3, 0, 1], [2, 3, 1, 0], 
    [1, 0, 2, 3], [1, 0, 3, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 3, 1], [0, 0, 0, 0], [2, 1, 3, 0], 
    [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], 
    [2, 0, 1, 3], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [3, 0, 1, 2], [3, 0, 2, 1], [0, 0, 0, 0], [3, 1, 2, 0], 
    [2, 1, 0, 3], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [3, 1, 0, 2], [0, 0, 0, 0], [3, 2, 0, 1], [3, 2, 1, 0]
];


//-----------------------------------------------------------------------------------------
// NoiseWorley
//-----------------------------------------------------------------------------------------


/**
 * \class NoiseWorley
 * 
 * Implementation of Worley, aka Cellular, Noise.
 */
class NoiseWorley extends Noise {
    constructor() {
        super();

        this.regionDimensions = 16;
        this.dimensionRecip   = 1 / 16;
        this.densityMean      = 3;
        this.densityStdDev    = 3;
        this.nClosestPoints   = 3;
        this.prng             = CreateRandom(RandomXorShift32.type);
        this.distances        = null;
        this.currX            = 0.0;
        this.currY            = 0.0;
        this.seed             = 1337;
    }

    setParam(param, value) {
        var result = super.setParam(param, value);

        if(!result) {
            switch(param) {
            case "region_dimensions":
                this.regionDimensions = Number(value);
                this.dimensionRecip  = 1 / this.regionDimensions;
                result = true;
                break;

            case "density_mean":
                this.densityMean = Number(value);
                result = true;
                break;

            case "density_deviations":
                this.densityStdDev = Number(value);
                result = true;
                break;

            case "n_closest_points":
                this.nClosestPoints = Number(value);
                result = true;
                break;

            default:
                break;
            }
        }

        return result;
    }

    static getParams() {
        super.getParams();
        return "region_dimensions:int_range 64 256 128;n_closest_points:int_range 1 5 1;density_mean:int_range 1 10 3;density_deviations:int_range 1 5 1;seed:number 1337;";
    }

    insertDistance(distance) {
        var index = 0;

        for( ; index < this.nClosestPoints; ++index) {
            if((this.distances[index] < Infinity) && 
               (Math.abs(distance - this.distances[index]) < 0.01)) {
                return;
            }
            if(distance < this.distances[index]) {
                break;
            }
        }

        if(index < this.nClosestPoints) {    
            for(var i = (this.nClosestPoints - 1); i > index; --i) {
                this.distances[i] = this.distances[i - 1];
            }

            this.distances[index] = distance;
        }
    }

    adjust(x) {
        const epsilon = 0.0001;
        const intX = x | 0;
        
        var result = 0.0;
        
        if(x > 0.0) {
            if((x - intX) > epsilon) {
                result = Math.ceil(x);
            } else {
                result = intX;
            }
        } else if(x < 0.0) {
            if((x - intX) < -epsilon) {
                result = x | 0;
            } else {
                result = intX;
            }
        }
        
        return result;
    }

    checkRegion(regionX, regionY) {
        const regionIndex = cantorPair(regionX, regionY);
        this.prng.setSeed(this.seed + regionIndex);

        // Generate the feature points 

        const numFeaturePoints = gaussianRandAdjusted(this.prng, this.densityMean, this.densityStdDev);

        for(var i = 0; i < numFeaturePoints; ++i) {
            const featureX = (regionX * this.regionDimensions) + (this.prng.nextf() * this.regionDimensions);
            const featureY = (regionY * this.regionDimensions) + (this.prng.nextf() * this.regionDimensions);

            const vecToCurr = {x: (featureX - this.currX), y: (featureY - this.currY) };
            const vecLength = (vecToCurr.x * vecToCurr.x) + (vecToCurr.y * vecToCurr.y);    // Squared distance 

            this.insertDistance(vecLength);
        }
    }

    keepChecking(step) {
        var result = true;

        const furthestNearFeature = this.distances[(this.nClosestPoints - 1)];

        if(furthestNearFeature < Infinity) {
            // Keep checking until the current sample radius exceeds our furthest near feature point.
            // Remember that feature distances are the squared values.
            var prevRadius = radiusSampleRadius(step - 1) - 1;
            var currRadius = radiusSampleRadius(step) - 1;

            if(prevRadius != currRadius) {
                prevRadius = prevRadius * this.regionDimensions;

                if((furthestNearFeature) < (prevRadius * prevRadius))
                {
                    result = false;
                }
            }
        }

        return result;
    }

    resetDistances() {
        if((!this.distances) || (this.distances.length != this.nClosestPoints)) {
            this.distances = new Array(this.nClosestPoints);
        }

        for(var i = 0; i < this.nClosestPoints; ++i) {
            this.distances[i] = Infinity;
        }
    }

    getValue(x, y) {
        this.currX = x;
        this.currY = y;

        this.resetDistances();
        
        const regionX = (x / this.regionDimensions) | 0;
        const regionY = (y / this.regionDimensions) | 0;

        var step   = 0;
        var checkX = regionX;
        var checkY = regionY;

        do {
            this.checkRegion(checkX, checkY);

            const nextCheck = radiusSample(step++);

            checkX = regionX + this.adjust(nextCheck.x);
            checkY = regionY + this.adjust(nextCheck.y);
        } while(this.keepChecking(step));

        return this.distances[this.nClosestPoints - 1];
    }

    getPixelRaw(x, y) {
        super.getPixelRaw(x, y);
        return this.getValue(x, y);
    }

    getPixel(x, y) {
        return this.getPixelRaw(x, y);
    }
}

NoiseWorley.type = "Worley";


//-----------------------------------------------------------------------------------------
// Noise Factory
//-----------------------------------------------------------------------------------------


function createNoise(type) {
    var result = null;

    switch(type) {
    case NoiseRandom.type:
        result = new NoiseRandom();
        break;

    case NoisePerlin.type:
        result = new NoisePerlin();
        break;

    case NoiseSimplex.type:
        result = new NoiseSimplex();
        break;

    case NoiseWorley.type:
        result = new NoiseWorley();
        break;

    default:
        break; 
    }

    return result;
}

function getUIParams(type) {
    var result = "";

    switch(type) {
    case NoiseRandom.type:
        result = NoiseRandom.getParams();
        break;

    case NoisePerlin.type:
        result = NoisePerlin.getParams();
        break;

    case NoiseSimplex.type:
        result = NoiseSimplex.getParams();
        break;

    case NoiseWorley.type:
        result = NoiseWorley.getParams();
        break;

    default:
        break; 
    }

    return result;
}


//------------------------------------------------------------------------------------------
// Multi-threaded Message
//------------------------------------------------------------------------------------------

function runNoiseSingleDebug(rawData, noise, params, width, height) {
    var noise = createNoise(noise);

    noise.setParams(params);
    noise.width  = width;
    noise.height = height;
    noise.length = (width * height);

    noise.generateRaw(rawData, 0, width, 0, height);
}

self.onmessage = function(e) {
    var data = e.data;

    if(data) {
        var isRaw  = data.isRaw;
        var noise  = createNoise(data.noise);
        var params = data.noiseParams;
        var width  = data.width;
        var height = data.height;
        var startX = data.startX;
        var endX   = data.endX;
        var startY = data.startY;
        var endY   = data.endY;

        noise.setParams(params);
        noise.width  = width;
        noise.height = height;
        noise.length = (width * height);

        if(isRaw) {
             var rawData = data.rawData;

             noise.generateRaw(rawData, startX, endX, startY, endY);
             postMessage({ rawData: rawData, startX: startX, endX: endX, startY: startY, endY: endY});
        } else {
            var image = data.image;

            noise.generate(image, startX, endX, startY, endY);
            postMessage({ image: data.image, startX: startX, endX: endX, startY: startY, endY: endY});
        }
    }
}