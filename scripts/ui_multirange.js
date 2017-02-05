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
        var pos      = this.pos;
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
        this.pos = relPos;
    }

    /**
     * 
     */
    update() {
        this.positionVertical();
        this.positionHorizontal();
    }

    /**
     * 
     */
    static onMouseMove(event, thumb) {
        if(thumb.selected) {

            const mouseX = event.pageX;
            const offset = mouseX - thumb.prevX;

            const width  = parseInt(thumb.parentObj.css("width"));
            const curPos = parseInt(thumb.obj.css("margin-left"));
            const relPos = Math.min(Math.max((curPos + offset), 0), width);

            if(curPos != relPos) {
                var posLeft  = thumb.parent.getThumbPos(thumb.index - 1);
                var posRight = thumb.parent.getThumbPos(thumb.index + 1);

                if(posLeft == 0) {
                    posLeft = -1;
                }

                if((relPos > posLeft) && (relPos < posRight)) {
                    thumb.obj.css("margin-left", relPos);
                    thumb.pos = relPos;
                    thumb.prevX = event.pageX;
                    thumb.recalculateValue();
                    thumb.parent.onThumbUpdate(thumb);
                }
            }
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

    /**
     * 
     */
    destroy() {
        this.obj.remove();
    }
}


//------------------------------------------------------------------------------------------
// UIMultiRangeSegmentEditor
//------------------------------------------------------------------------------------------

class UIMultiRangeSegmentEditor {
    constructor(parent, segment) {
        this.parent    = parent;
        this.parentObj = parent.obj;
        this.segment   = segment;
        this.color     = segment.color;
    }

    /**
     * 
     */
    bindActions() {
        const self = this;

        $(document).mouseup(function(e) {
            if(!self.obj.is(e.target) && (self.obj.has(e.target).length === 0)) {
                self.obj.remove();
            }
        });

        $("#multirange_segment_editor_color").spectrum({ 
            color: this.color, 
            showPalette: false, 
            appendTo: this.obj,
            containerClassName: "multirange_colorpick_container",
            replacerClassName: "multirange_colorpick_replacer",
            showButtons: false });

        $("#multirange_segment_editor_color").change(function(e) {
            const color = $(this).spectrum("get").toHexString();
            self.segment.setColor(color);
            
        });

        $("#multirange_segment_editor_split").click(function(e) {
            self.parent.splitSegment(self.segment);
        });

        $("#multirange_segment_editor_remove").click(function(e) {
            self.parent.removeSegment(self.segment);
            self.obj.remove();
        })
    }

    /**
     * 
     */
    build() {
        if(this.parentObj) {
            var html = 
                "<div class='multirange_segment_editor'>" +
                    "<table class='multirange_table'>" + 
                        "<tr>" + 
                            "<td width='50%'>Color</td>" +
                            "<td width='50%'><input id='multirange_segment_editor_color' type='text'></td>" +
                        "</tr>" +
                        "<tr>" +
                            "<td>" +
                                "Mode" + 
                            "</td>" +
                            "<td>" + 
                                "<select id='multirange_segment_editor_mode' class='multirange_select'>" +
                                    "<option>solid</option>" +
                                    "<option>smooth</option>" + 
                                    "<option>none</option>" +
                                "</select>" +
                            "</td>" +
                    "</table>" +
                    "<hr>" + 
                    "<div class='multirange_button_holder'>" + 
                        "<button type='button' id='multirange_segment_editor_split' class='multirange_button' " + (this.segment.width < 12 ? "disabled" : "") + ">Split</button>" + 
                        "<button type='button' id='multirange_segment_editor_remove' class='multirange_button' " + (this.parent.segments.length <= 1 ? "disabled" : "") + ">Remove</button>" +
                    "</div>" +
                "</div>";
                
            this.parentObj.append(html);
            this.obj = this.parentObj.find(".multirange_segment_editor").last();

            this.bindActions();  
        }
    }
}


//------------------------------------------------------------------------------------------
// UIMultiRangeSegment
//------------------------------------------------------------------------------------------


/**
 * 
 */
class UIMultiRangeSegment {
    constructor(parent, index, editable, color, mode) {
        this.parent    = parent;
        this.parentObj = parent.backgroundObj;
        this.index     = index;
        this.editable  = editable;
        this.color     = color;
        this.mode      = mode;
        this.obj       = null;
        this.pos       = 0;
        this.width     = 0;
    }

    /**
     * 
     */
    calculatePosWidth() {
        var startPos = this.parent.getThumbPos(this.index - 1);
        var stopPos = this.parent.getThumbPos(this.index);

        this.pos = startPos;
        this.width = (stopPos - startPos);
    }

    /**
     * 
     */
    update() {
        this.calculatePosWidth();

        this.obj.css("background-color", this.color);
        this.obj.css("margin-left", this.pos);
        this.obj.css("width", this.width);
    }

    /**
     * 
     */
    setColor(color) {
        this.color = color;
        this.update();
    }

    /**
     * 
     */
    bindActions() {
        if(this.editable) {
            var parent = this.parent;
            var self = this;

            this.obj.click(function() { 
                var editor = new UIMultiRangeSegmentEditor(parent, self);
                editor.build();
            });
        }
    }

    /**
     * 
     */
    build() {
        var classes = "multirange_segment";

        if(this.editable) {
            classes += " multirange_segment_editable";
        }

        this.parentObj.append("<div class='" + classes + "' />");
        this.obj = this.parentObj.find(".multirange_segment").last();

        this.update();
        this.bindActions();
    }
    
    /**
     * 
     */
    destroy() {
        this.obj.remove();
    }
}


//------------------------------------------------------------------------------------------
// UIMultiRange
//------------------------------------------------------------------------------------------


/**
 * \class UIMultiRange
 */
class UIMultiRange {
    constructor(id, updateCallback) {
        this.id       = id;
        this.callback = updateCallback;
        this.obj      = $("#" + id);
        this.editable = false;
        this.count    = 0;
        this.step     = 0;
        this.min      = 0;
        this.max      = 0;
        this.values   = null;
        this.thumbs   = null;
        this.segments = null;
    }

    /**
     * 
     */
    update() {
        for(var i = 0; i < this.thumbs.length; ++i) {
            this.thumbs[i].update();
        }

        for(var i = 0; i < this.segments.length; ++i) {
            this.segments[i].update();
        }
    }

    /**
     * 
     */
    buildBackground() {
        this.obj.append("<div class='multirange_background'></div>");
        this.backgroundObj = this.obj.find(".multirange_background").last();
    }

    /**
     * 
     */
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

    /**
     * 
     */
    buildSegments() {
        const colorsStr = this.obj.data("rangecolors");
        var colorsSplit = [];

        if(colorsStr) {
            colorsSplit = colorsStr.split(",");
        }

        const typesStr = this.obj.data("rangetypes");
        var typesSplit = [];

        if(typesStr) {
            typesSplit = typesStr.split(",");
        }

        var color = "";
        var type = "";

        for(var i = 0; i < (this.count + 1); ++i) {
            if(i < colorsSplit.length) {
                color = colorsSplit[i];
            } else {
                color = "#000000";
            }

            if(i < typesSplit.length) {
                type = typesSplit[i];
            } else {
                type = "none";
            }

            this.segments[i] = new UIMultiRangeSegment(this, i, this.editable, color, type);
            this.segments[i].build();
        }
    }
    
    /**
     * 
     */
    build() {
        if(this.obj) {
            this.obj.empty();

            var rangeEditStr = this.obj.data("rangeedit");

            if(rangeEditStr) {
                rangeEditStr = String(rangeEditStr).toLocaleLowerCase();
                this.editable = (rangeEditStr.localeCompare("true") == 0);
            }

            this.count    = Number(this.obj.data("rangecount"));
            this.step     = Number(this.obj.data("rangestep"));
            this.min      = Number(this.obj.data("rangemin"));
            this.max      = Number(this.obj.data("rangemax"));
            this.values   = Array.apply(0, Array(this.count)).map(function() { }); 
            this.thumbs   = Array.apply(0, Array(this.count)).map(function() { }); 
            this.segments = Array.apply(0, Array(this.count + 1)).map(function() { });

            this.buildBackground();
            this.buildThumbs();
            this.buildSegments();
        }
    }

    /**
     * 
     */
    onThumbUpdate(thumb) {
        var index = thumb.index;

        var left  = index;
        var right = index + 1;

        this.segments[left].update();
        this.segments[right].update();

        if(this.callback) {
            this.callback(this);
        }
    }

    /**
     * 
     */
    getThumbPos(index) {
        var result = 0;

        if(index < 0) {
            result = 0;
        } else if(index < this.thumbs.length) {
            result = this.thumbs[index].pos;
        } else {
            result = parseInt(this.backgroundObj.css("width"));
        }

        return result;
    }

    /**
     * 
     */
    splitSegment(segment) {
        if(segment) {
            const segmentIndex = segment.index;

            if(this.segments.length == 1) {
                // Splitting the only segment, which means there are no thumbs currently.
                const thumbValue = (this.max - this.min) * 0.5;
                this.thumbs.push(new UIMultiRangeThumb(this, 0, thumbValue));
                this.thumbs[0].build();

                this.segments.push(new UIMultiRangeSegment(this, 1, segment.editable, segment.color, segment.mode));
                this.segments[(this.segments.length - 1)].build();
                this.segments[segmentIndex].update();

            } else {
                const leftThumbIndex  = segmentIndex - 1;
                const rightThumbIndex = segmentIndex;

                if(leftThumbIndex < 0) {
                    // Add new thumb and segment at the start
                    const rightThumbValue = this.thumbs[rightThumbIndex].value;
                    const leftThumbValue  = (rightThumbValue * 0.5);

                    this.thumbs.splice(0, 0, new UIMultiRangeThumb(this, 0, leftThumbValue));
                    this.thumbs[0].build();

                    for(var i = 1; i < this.thumbs.length; ++i) { 
                        this.thumbs[i].index = i;
                    }

                    this.segments.splice(0, 0, new UIMultiRangeSegment(this, 0, segment.editable, segment.color, segment.mode));
                    this.segments[0].build();

                    for(var i = 1; i < this.segments.length; ++i) {
                        this.segments[i].index = i;
                    }

                    this.segments[1].update();

                } else if(rightThumbIndex == this.thumbs.length) {
                    // Add new thumb and segment at the end
                    const leftThumbValue  = this.thumbs[leftThumbIndex].value;
                    const rightThumbValue = ((this.max - leftThumbValue) * 0.5) + leftThumbValue;

                    this.thumbs.push(new UIMultiRangeThumb(this, rightThumbIndex, rightThumbValue));
                    this.thumbs[rightThumbIndex].build();

                    this.segments.push(new UIMultiRangeSegment(this, segmentIndex + 1, segment.editable, segment.color, segment.mode));
                    this.segments[segmentIndex + 1].build();
                    this.segments[segmentIndex].update();
                } else {
                    // Add new thumb and segment in the middle
                    const leftThumbValue  = this.thumbs[leftThumbIndex].value;
                    const rightThumbValue = this.thumbs[rightThumbIndex].value;
                    const newThumbValue   = ((rightThumbValue - leftThumbValue) * 0.5) + leftThumbValue;

                    this.thumbs.splice(rightThumbIndex, 0, new UIMultiRangeThumb(this, rightThumbIndex, newThumbValue));
                    this.thumbs[rightThumbIndex].build();

                    for(var i = rightThumbIndex; i < this.thumbs.length; ++i) {
                        this.thumbs[i].index = i;
                    }

                    this.segments.splice(rightThumbIndex, 0, new UIMultiRangeSegment(this, rightThumbIndex, segment.editable, segment.color, segment.mode));
                    this.segments[rightThumbIndex].build();

                    for(var i = rightThumbIndex; i < this.segments.length; ++i) {
                        this.segments[i].index = i;
                    }

                    this.segments[rightThumbIndex].update();
                }
            }
        }
    }

    /**
     * 
     */
    removeSegment(segment) {
        if(segment && this.segments.length > 1) { 
            const segmentIndex    = segment.index;
            const leftThumbIndex  = segmentIndex - 1;
            const rightThumbIndex = segmentIndex;

            if(segmentIndex == (this.segments.length - 1)) {
                // Remove far right segment
                this.thumbs[leftThumbIndex].destroy();
                this.thumbs.splice(leftThumbIndex, 1);

                for(var i = 0; i < this.thumbs.length; ++i) {
                    this.thumbs[i].index = i;
                }

                this.segments[segmentIndex].destroy();
                this.segments.splice(segmentIndex, 1);

                for(var i = 0; i < this.segments.length; ++i) {
                    this.segments[i].index = i;
                }

                this.segments[(this.segments.length - 1)].update();
            } else if(segmentIndex >= 1) {
                // Remove middle segment and expand to fill the space evenly.
                const leftThumbValue  = this.thumbs[leftThumbIndex].value;
                const rightThumbValue = this.thumbs[rightThumbIndex].value;
                const newThumbValue   = ((rightThumbValue - leftThumbValue) * 0.5) + leftThumbValue;

                this.thumbs[leftThumbIndex].destroy();
                this.thumbs.splice(leftThumbIndex, 1);

                for(var i = 0; i < this.thumbs.length; ++i) {
                    this.thumbs[i].index = i;
                }

                this.thumbs[leftThumbIndex].value = newThumbValue;
                this.thumbs[leftThumbIndex].update();

                this.segments[segmentIndex].destroy();
                this.segments.splice(segmentIndex, 1);

                for(var i = 0; i < this.segments.length; ++i) {
                    this.segments[i].index = i;
                    this.segments[i].update();
                }

            } else {
                // Remove far left segment
                this.thumbs[rightThumbIndex].destroy();
                this.thumbs.splice(0, 1);

                for(var i = 0; i < this.thumbs.length; ++i) {
                    this.thumbs[i].index = i;
                }

                this.segments[0].destroy();
                this.segments.splice(0, 1);

                for(var i = 0; i < this.segments.length; ++i) {
                    this.segments[i].index = i;
                }

                this.segments[0].update();
            }
        }
    }
}


//------------------------------------------------------------------------------------------
// Helper Functions
//------------------------------------------------------------------------------------------

/**
 * 
 */
function buildMultiRanges(parent, updateCallback) {
    var ranges = [];
    
    if(parent) {
        parent.find(".multirange").each(function() {
            ranges.push(new UIMultiRange($(this).attr("id"), updateCallback));
            ranges[ranges.length - 1].build();
        });
    }

    return ranges;
}

/**
 * http://stackoverflow.com/a/5624139
 */
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * http://stackoverflow.com/a/3752026
 */
function rgbToRgb(rgb) {
    var rgb = rgb.replace(/^(rgb|rgba)\(/,'').replace(/\)$/,'').replace(/\s/g,'').split(',');
    return rgb ? {
        r: rgb[0],
        g: rgb[1],
        b: rgb[2]
    } : null;
}

/**
 * 
 */
function toPaletteDescriptor(multirange) {
    var descriptor = [];

    if(multirange) {
        for(var i = 0; i < multirange.segments.length; ++i) {
            var mode  = multirange.segments[i].mode;
            var color = rgbToRgb(multirange.segments[i].obj.css("background-color"));

            if(color) {
                var start = 0;

                if(i == 0) {
                    start = 0;
                } else {
                    start = parseInt(multirange.thumbs[(i - 1)].value);
                }

                descriptor.push(start + "," + color.r + "," + color.g + "," + color.b + "," + mode);
            }
        }
    }

    return descriptor;
}

