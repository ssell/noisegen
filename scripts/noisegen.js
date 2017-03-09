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
    $("#noise_properties .ui_element").change(function(){ updateInput($(this).attr('id')); });
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
function onMultiRangeUpdate(multirange) {
    
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

    NoiseProgressBar.start(gSurface.size(), "Generating ...");

    toggleGenerateButton();
    toggleApplyButton();

    var noiseParams = buildNoiseParamsList();

    updateDimensions();
    generateNoiseMultithreaded(gSurface, getSelectedAlgorithm(), getNormalized(), noiseParams, 2, generateStop);
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

/**
 * 
 */
function buildColorPropertiesGray() {
    var multiranges = buildMultiRanges($("#ui_color_grayscale"));

    if(multiranges.length) {
        gGrayMultiRange = multiranges[0];
    }
}

/**
 * 
 */
function buildColorPropertiesColor() {
    var multiranges = buildMultiRanges($("#ui_color_color"));

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

    $("#generate_button").click(function() { generateStart(); });
    $("#export_button").click(function() { triggerExport(); });
    $("#noise_algorithms").change(function() { triggerUIRebuild(); });
    $(".color_button").click(function() { toggleColorMode(); });
    $("#color_apply_button").click(function() { applyColorPropertiesStart(); });
});