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
// Misc
//-----------------------------------------------------------------------------------------

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function int32(x) {
	return (x | 0);
}

//-----------------------------------------------------------------------------------------
// Interpolation
//-----------------------------------------------------------------------------------------

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