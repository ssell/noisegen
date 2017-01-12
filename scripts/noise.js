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
// Noise 
//------------------------------------------------------------------------------------------


/** 
 * \class Noise
 * \brief Parent class of all noise implementations.
 */
class Noise {
    constructor() {
        this.type = "Unknown";
        this.seed = 0;
    }

    setSeed(value) {
        this.seed = value;
    }

    generate(imageData) {
        if(imageData) {
            var length = imageData.width * imageData.height * 4;

            for(var i = 0; i < length; ++i) {
                imageData.data[i] = 255;
            }
        }
    }
}


//------------------------------------------------------------------------------------------
// Noise - Random
//------------------------------------------------------------------------------------------

/** 
 * \class NoiseRandom
 * \brief Generates an image populated by the specified PRNG algorithm.
 */
class NoiseRandom extends Noise {
    constructor(prng) {
        super();

        this.type = "Random";
        this.prng = CreateRandom(prng);
        this.gray = true;
    }

    setSeed(value) {
        super.setSeed(value);
        this.prng.setSeed(value);
    }

    generate(imageData) {
        if(imageData) {
            var length = imageData.width * imageData.height * 4;

            if(this.gray) {
                for(var i = 0; i < length; i += 4) {
                    imageData.data[i + 0] = this.prng.next(0, 255);
                    imageData.data[i + 1] = imageData.data[i + 0];
                    imageData.data[i + 2] = imageData.data[i + 0];
                    imageData.data[i + 3] = 255;
                }

            } else {
                for(var i = 0; i < length; i += 4) {
                    imageData.data[i + 0] = this.prng.next(0, 255);
                    imageData.data[i + 1] = this.prng.next(0, 255);
                    imageData.data[i + 2] = this.prng.next(0, 255);
                    imageData.data[i + 3] = 255;
                }
            }
        }
    }
}


//------------------------------------------------------------------------------------------
// Noise - Perlin
//------------------------------------------------------------------------------------------


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

        this.type        = "Perlin";
        this.octaves     = 6.0;
        this.persistence = 0.5;
        this.scale       = 0.01;
        this.seed        = 0;
    }

    generate(imageData) { 

    }
}


//------------------------------------------------------------------------------------------
// Noise - Factory
//------------------------------------------------------------------------------------------


function CreateNoise(type) {
    var noise;

    switch(type) {
    case "Random":
        noise = new NoiseRandom();
        break;

    case "Perlin":
        noise = new NoisePerlin();
        break;

    default:
        break;
    }

    return noise;
}