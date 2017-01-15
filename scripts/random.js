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

//------------------------------------------------------------------------------------------
// Random 
//------------------------------------------------------------------------------------------


/**
 * \class Random
 * \brief Parent class of all PRNG implementations.
 */
class Random {
    constructor() {
        this.type = "Unknown";
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
        
        this.type = "XorShift96";

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
        this.state = Array.apply(0, Array(16)).map(function() { });
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

    default:
        break;
    }

    return prng;
}