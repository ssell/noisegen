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


//------------------------------------------------------------------------------------------
// UIMultiRangeThumb
//------------------------------------------------------------------------------------------


/**
 * \class UIMultiRangeThumb
 */
class UIMultiRangeThumb {
    constructor(parent, index, value) {
        this.parent    = parent;
        this.index     = index;
        this.value     = value;
        this.parentObj = parent.backgroundObj;
        this.obj       = null;
        this.selected  = false;
        this.prevX     = 0;
    }

    /**
     * 
     */
    recalculateValue() {
        var width    = parseInt(this.parentObj.css("width"));
        var pos      = parseInt(this.obj.css("margin-left"));
        var min      = this.parent.min;
        var max      = this.parent.max;
        var relValue = pos / width;
        var range    = (max - min);

        this.value = relValue * range;
    }

    /**
     * Centers the thumb vertically in the parent multirange_background element.
     */
    positionVertical() {
        var parentHeight = parseInt(this.parentObj.css("height"));
        var defaultHeight = parseInt(this.obj.css("height"));

        if(parentHeight && defaultHeight) {
            var yPos = (defaultHeight - parentHeight) * 0.5;
            this.obj.css("margin-top", -yPos);

            console.log("ph = " + parentHeight + " | dh = " + defaultHeight + " | yP = " + yPos);
        }
    }

    /**
     * 
     */
    positionHorizontal() {
        var parentWidth   = parseInt(this.parentObj.css("width"));
        var defaultHeight = parseInt(this.obj.css("height"));
        var parentMin     = this.parent.min;
        var parentMax     = this.parent.max;

        var relPos = (this.value - parentMin) / parentMax;

        relPos = Math.min(Math.max(relPos, 0.0), 1.0);
        relPos = relPos * parentWidth;

        this.obj.css("margin-left", relPos);
    }

    /**
     * 
     */
    static onMouseMove(event, thumb) {
        if(thumb.selected) {

            var mouseX = event.pageX;
            var offset = mouseX - thumb.prevX;

            var width  = parseInt(thumb.parentObj.css("width"));
            var relPos = parseInt(thumb.obj.css("margin-left"));

            relPos = relPos + offset;
            relPos = Math.min(Math.max(relPos, 0), width);

            thumb.obj.css("margin-left", relPos);
            thumb.prevX = event.pageX;
            thumb.recalculateValue();
        } else {
            thumb.obj.unbind("mousemove");
        }
    }

    /**
     * 
     */
    static onMouseUp(event, thumb) {
        thumb.obj.removeClass("multirange_thumb_selected");
        thumb.selected = false;
    }

    /**
     * 
     */
    static onMouseDown(event, thumb) {
        thumb.obj.addClass("multirange_thumb_selected");
        
        thumb.prevX = event.pageX;
        thumb.selected = true;

        $(document).mousemove(function(event){ UIMultiRangeThumb.onMouseMove(event, thumb); });
        $(document).mouseup(function(event){ UIMultiRangeThumb.onMouseUp(event, thumb); });
    }

    /**
     * 
     */
    build() {
        this.parentObj.append("<div class='multirange_thumb' />");
        this.obj = this.parentObj.find(".multirange_thumb").last();

        this.positionVertical();
        this.positionHorizontal();

        var thumb = this;

        this.obj.mousedown(function(event){ UIMultiRangeThumb.onMouseDown(event, thumb); });
    }
}

//------------------------------------------------------------------------------------------
// UIMultiRange
//------------------------------------------------------------------------------------------


/**
 * \class UIMultiRange
 */
class UIMultiRange {
    constructor(id) {
        this.id     = id;
        this.obj    = $("#" + id);
        this.count  = 0;
        this.step   = 0;
        this.min    = 0;
        this.max    = 0;
        this.values = null;
        this.thumbs = null;
    }

    buildBackground() {
        this.obj.append("<div class='multirange_background'></div>");
        this.backgroundObj = this.obj.find(".multirange_background").last();
    }

    buildThumbs() {
        var valuesStr = this.obj.data("rangevalues");
        var valuesSplit = [];

        if(valuesStr) { 
            valuesSplit = valuesStr.split(",");
        }

        for(var i = 0; i < this.count; ++i) {
            if(i < valuesSplit.length) {
                this.thumbs[i] = new UIMultiRangeThumb(this, i, Number(valuesSplit[i]));
            } else {
                this.thumbs[i] = new UIMultiRangeThumb(this, i, 0);
            }

            this.thumbs[i].build();
        }
    }
    
    build() {
        if(this.obj) {
            this.obj.empty();

            this.count  = Number(this.obj.data("rangecount"));
            this.step   = Number(this.obj.data("rangestep"));
            this.min    = Number(this.obj.data("rangemin"));
            this.max    = Number(this.obj.data("rangemax"));
            this.values = Array.apply(0, Array(this.count)).map(function() { }); 
            this.thumbs = Array.apply(0, Array(this.count)).map(function() { }); 

            this.buildBackground();
            this.buildThumbs();
        }
    }
}


//------------------------------------------------------------------------------------------
// Helper Functions
//------------------------------------------------------------------------------------------

function buildMultiRanges(parent) {
    var ranges = [];
    
    if(parent) {
        parent.find(".multirange").each(function() {
            ranges.push(new UIMultiRange($(this).attr("id")));
            ranges[ranges.length - 1].build();
        });
    }

    return ranges;
}

