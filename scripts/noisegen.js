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
 * noisegen.js
 *
 * This script is responsible for the general behavior of the noisegen page.
 * This includes, but is not limited to, the following:
 *
 *     - Initiating UI creation
 *     - Responding to UI events
 *     - Initiating noise generation
 *     - Filling surface
 *     - Reszing surface
 */

var gSurface = null;
var gGrayMultiRange = null;
var gColorMultiRange = null;

/**
 * Populates the #noise_algorithms select element with all
 * available noise algorithms that can be used to generate the image.
 */
function populateAlgorithmList() {
    $("#noise_algorithms").append(
        "<option value='" + NoisePerlin.type  + "'>" + NoisePerlin.type  + "</option>" +
        "<option value='" + NoiseSimplex.type + "' selected>" + NoiseSimplex.type + "</option>" +
        "<option value='" + NoiseWorley.type  + "'>" + NoiseWorley.type  + "</option>" +
        "<option value='" + NoiseRandom.type  + "'>" + NoiseRandom.type  + "</option>");
}

/**
 * Returns the selected noise algorithm string.
 */
function getSelectedAlgorithm() {
    return $("#noise_algorithms").val();
}

/**
 * 
 */
function getNormalized() {
    return $("#noise_normalized").is(':checked');
}

/**
 * Builds the noise properties parameters list used in image generation.
 */
function buildNoiseParamsList() {
    var params = "";

    $("#noise_properties .noise_property_value").each(function() {
        var id    = $(this).attr('id');
        var name  = id.substr(0, (id.length - 6));    // Remove the '_value'
        var value = "";
        
        if($(this).is("input")) {
            value = $(this).val();
        } else {
            value = $(this).text();
        }

        params += name + ":" + value + ";";
    });

    return params;
}

/**
 * Rounds the provided number down to the nearest even integer.
 */
function roundDownToEven(value) {
    return (2.0 * Math.floor(value * 0.5));
}

/**
 * Updates the dimensions of the surface canvas.
 */
function updateDimensions() {

    // First check if there is a set dimension.
    // If not, we default to the document dimensions.

    var width_element  = $("#surface_width");
    var height_element = $("#surface_height");

    var width  = Number(width_element.val());
    var height = Number(height_element.val());

    if(width == 0) {
        width = $(document).width();
    }

    if(height == 0) {
        height = $(document).height();
    }

    width  = roundDownToEven(width);
    height = roundDownToEven(height);

    width_element.val(width);
    height_element.val(height);

    gSurface.resize(width, height);
    gSurface.clear(51, 51, 51);
}

/**
 * Updates the id_value display on input change.
 * This is used by different ui elements such as the range sliders.
 */
function updateInput(id) {
    var sourceObj = $("#" + id);
    var destObj   = $("#" + id + "_value");

    if(sourceObj && destObj) {
        if(destObj.is("input")) {
            destObj.val(sourceObj.val());
        } else {
            destObj.html(sourceObj.val());
        }
    }
}

/**
 *
 */
function toggleGenerateButton() {
    $("#generate_button").prop('disabled', function(i, v) { return !v; });
}

/**
 * 
 */
function toggleApplyButton() {
    $("#color_apply_button").prop('disabled', function(i, v) { return !v; });
}

/**
 *
 */
function enableExportButton() {
    $("#export_button").prop('disabled', '');
}

/**
 *
 */
function triggerExport() {
    var a = $("<a>").attr("href", gSurface.getURL()).attr("download", "noise.png").appendTo("body");

    a[0].click();
    a.remove();
}

/**
 *
 */
function triggerUIRebuild() {
    buildUI(getUIParams(getSelectedAlgorithm()));

    $("#noise_properties .ui_element").change(function(){ 
        updateInput($(this).attr('id')); 
    });

    $("#noise_properties .noise_property_value").change(function() {
        // If the user has manually modified the noise value, update the associated .ui_element.
        var parent = $(this).parent().parent().find(".ui_element").val($(this).val());
    })
}

/**
 *
 */
function enableColorModeGray() {
    gSurface.gray = true;

    $("#grayscale_button").addClass("color_button_selected");
    $("#color_button").removeClass("color_button_selected");

    $("#ui_color_grayscale").removeClass("hidden");
    $("#ui_color_color").addClass("hidden");

    gGrayMultiRange.update();
}

/**
 *
 */
function enableColorModeColor() {
    gSurface.gray = false;

    $("#color_button").addClass("color_button_selected");
    $("#grayscale_button").removeClass("color_button_selected");

    $("#ui_color_color").removeClass("hidden");
    $("#ui_color_grayscale").addClass("hidden");

    gColorMultiRange.update();
}

/**
 *
 */
function toggleColorMode() {
    if(gSurface.gray) {
        enableColorModeColor();
    } else {
        enableColorModeGray();
    }
}

/**
 *
 */
function generateStop() {

    NoiseProgressBar.stop();

    toggleGenerateButton();
    toggleApplyButton();

    enableExportButton();
}

/**
 * Generates the noise image.
 */
function generateStart() {


    toggleGenerateButton();
    toggleApplyButton();
    updateDimensions();

    NoiseProgressBar.start(gSurface.size(), "Generating ...");

    generateNoiseMultithreaded(gSurface, getSelectedAlgorithm(), getNormalized(), buildNoiseParamsList(), 2, generateStop);
}

/**
 * 
 */
function applyColorPropertiesStop() {
    NoiseProgressBar.stop();

    toggleApplyButton();
    toggleGenerateButton();
}

/**
 * 
 */
function applyColorPropertiesStart() {
    var descriptor = "";
    
    if(gSurface.gray) {
        descriptor = toPaletteDescriptor(gGrayMultiRange);
    } else {
        descriptor = toPaletteDescriptor(gColorMultiRange);
    }
    
    gSurface.setPalette(descriptor, gSurface.gray);

    NoiseProgressBar.start(gSurface.size(), "Applying Palette ...");

    toggleApplyButton();
    toggleGenerateButton();

    applyPaletteMultithreaded(gSurface, 2, applyColorPropertiesStop);
}

function isValidHexChar(char) {
    return ((char >= '0') && (char <= '9')) || 
           ((char >= 'a') && (char <= 'f')) || 
           ((char >= 'A') && (char <= 'F'));
}

function isValidHexString(string) {
    if(string.length != 7) {
        return false;
    }

    for(var i = 1; i < string.length; ++i) {
        if(!isValidHexChar(string[i])) {
            return false;
        }
    }

    return true;
}

/**
 * 
 */
function applyPaletteString()
{
    var result = true;
    var descriptor = $("#color_templates").val();

    var segments = descriptor.split(";");
    const numSegments = segments.length - 1;

    if(numSegments > 0) {
        var thumbValues   = new Array(numSegments - 1);
        var segmentColors = new Array(numSegments);
        var segmentModes  = new Array(numSegments);

        //--------------------------------------------------------------------
        // Parse the segment information from the string 

        for(var i = 0; i < numSegments; ++i) {        // - 1: do not include split from final ';'
            var segmentSplit = segments[i].split(",");

            if(segmentSplit.length != 5) {
                result = false;
                break;
            }

            if(i != 0) {
                // The first thumb value (always 0) is not needed as there is not a true thumb there.
                thumbValues[i - 1] = Number(segmentSplit[0]);
            }

            segmentColors[i] = rgbToHex(Number(segmentSplit[1]), Number(segmentSplit[2]), Number(segmentSplit[3]));
            segmentModes[i] = segmentSplit[4];
        }
        
        if(result) {

            //------------------------------------------------------------
            // Validate each thumb value 

            for(var i = 0; i < thumbValues.length; ++i) {
                if(thumbValues[i] < 0 || thumbValues[i] > 255) {
                    console.log("thumbValues[" + i + "] invalid (" + thumbValues[i] + ")");
                    result = false;
                    break;
                }
            }

            //------------------------------------------------------------
            // Validate segment colors 

            for(var i = 0; i < segmentColors.length; ++i) {
                if(!isValidHexString(segmentColors[i])) {
                    console.log("segmentColors[" + i + "] invalid (" + segmentColors[i] + ")");
                    result = false;
                    break;
                }
            }

            //------------------------------------------------------------
            // Validate segment modes 

            for(var i = 0; i < segmentModes.length; ++i) {
                const upper = segmentModes[i].toUpperCase();

                if((upper !== "SOLID") && (upper !== "SMOOTH RGB") && (upper !== "SMOOTH HSV") && (upper !== "NONE"))
                {
                    console.log("segmentModes[" + i + "] invalid (" + segmentModes[i] + ")");
                    result = false;
                    break;
                }
            }
        }
    } else {
        result = false;
    }

    if(result) 
    {
        gColorMultiRange.load(thumbValues, segmentColors, segmentModes);
        $("#color_templates").css("border-bottom", "1px solid transparent");
    }
    else
    {
        $("#color_templates").css("border-bottom", "1px solid #AA3333");
    }
}

/**
 * 
 */
function updatePaletteString()
{
    var paletteString = "";
    var descriptor;

    if(gSurface.gray) {
        descriptor = toPaletteDescriptor(gGrayMultiRange);
    } else {
        descriptor = toPaletteDescriptor(gColorMultiRange);
    }

    for(var i = 0; i < descriptor.length; ++i) {
        paletteString += descriptor[i] + ";"
    }

    $("#color_templates").val(paletteString);
    $("#color_templates").css("border-bottom", "1px solid transparent");
}

/**
 * 
 */
function multirangeUpdateCallback() {
    updatePaletteString();
}

/**
 * 
 */
function buildColorPropertiesGray() {
    var multiranges = buildMultiRanges($("#ui_color_grayscale"), multirangeUpdateCallback);

    if(multiranges.length) {
        gGrayMultiRange = multiranges[0];
    }
}

/**
 * 
 */
function buildColorPropertiesColor() {
    var multiranges = buildMultiRanges($("#ui_color_color"), multirangeUpdateCallback);

    if(multiranges.length) {
        gColorMultiRange = multiranges[0];
    }
}

/**
 * 
 */
function buildColorProperties() {
    buildColorPropertiesGray();
    buildColorPropertiesColor();
}

$(document).ready(function() {
    gSurface = new Surface();

    buildColorProperties();
    populateAlgorithmList();

    updateDimensions();
    triggerUIRebuild();
    updatePaletteString();
    
    $("#set_palette").click(function() { applyPaletteString(); });
    $("#generate_button").click(function() { generateStart(); });
    $("#export_button").click(function() { triggerExport(); });
    $("#noise_algorithms").change(function() { triggerUIRebuild(); });
    $(".color_button").click(function() { toggleColorMode(); });
    $("#color_apply_button").click(function() { applyColorPropertiesStart(); });
});