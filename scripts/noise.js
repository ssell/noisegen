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

    nextUnbound() {
        return 0;
    }

    next(min, max) {
        var value = this.nextUnbound();
        return (mod(value, (max - min)) + min);
    }
}

Random.phi = 1.618033988749895;


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
        this.state = [0, 0, 0, 0];
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
        this.gray   = true;
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
        case "gray":
            this.gray = (value == "true");
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
        return "octaves:int_range 1 20 5;persistence:float_range 0.0 1.0 0.5;scale:float_range 0.0001 0.1 0.01;"
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

    return result;
}


//------------------------------------------------------------------------------------------
// Multi-threaded Message
//------------------------------------------------------------------------------------------

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