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
 * ui_multigen.js
 *
 * Implementation of a range input element with variable number of sliders.
 */

/**
 * \class UIMultiRange
 */
class UIMultiRange {
    constructor(id) {
        this.parentID  = id;
        this.parent    = $("#" + id);
        this.numRanges = 0;
    }

    rebuildRanges() {
        console.log("build " + this.rangeCount + " ranges");
    }

    updateRangeCount() {
        this.rangeCount = this.parent.data("rangecount");
        this.rebuildRanges();
    }
}

/**
 * Builds all multirange elements within the specified parent.
 *
 * A multirange is declared as follows:
 *
 *     <div id="some_id" class="multirange" data-rangecount="2"></div>
 *
 * Where,
 *
 *                  id: The custom id for the multirange element
 *               class: Must incluse the `multirange` class
 *     data-rangecount: The number of ranges that make up the multirange.
 */
function buildMultiRanges(parent) {
    var ranges = [];
    parent.find(".multirange").each(function() {
        ranges.push(new UIMultiRange($(this).attr("id")));
        ranges[ranges.length - 1].updateRangeCount();
    });
}