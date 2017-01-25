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
 * ui_builder.js
 *
 * This script contains functions for populating the user control panel.
 */

function toTitleCase(str)
{
    // Source: http://stackoverflow.com/a/4878800
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function buildTitle(title, value, valuehidden) {
    return "<div class='ui_holder ui_title'>" + toTitleCase(title) + ": <div id='" + title + "_value' class='noise_property_value' " + (valuehidden ? "style='display:none;'" : "") + ">" + value + "</div></div>";
}

function buildInt(id, defaultVal) {
    return "<div class='ui_holder'><input id='" + id + "' class='ui_element' value='" + defaultVal + "'></div>";
}

function buildUint(id, defaultVal) {
    return "<div class='ui_holder'><input id='" + id + "' class='ui_element' value='" + defaultVal + "'></div>";
}

function buildFloat(id, defaultVal) {
    return "<div class='ui_holder'><input id='" + id + "' class='ui_element' value='" + defaultVal + "'></div>";
}

function buildRangeInt(id, minVal, maxVal, defaultVal) {
    var step = Math.trunc((Number(maxVal) - Number(minVal)) * 0.01);

    if(step < 1) { 
        step = 1;
    }

    return "<div class='ui_holder'>" +
                minVal +
                "<input class='ui_element' id='" + id + "' type='range' min='" + Math.trunc(minVal) + "' max='" + Math.trunc(maxVal) + "' value='" + Math.trunc(defaultVal) + "' step='" + step + "'>" + 
                maxVal +
            "</div>";
}

function buildRangeFloat(id, minVal, maxVal, defaultVal) {
    var step = (Number(maxVal) - Number(minVal)) * 0.01;

    return "<div class='ui_holder'>" +
                minVal +
                "<input class='ui_element' id='" + id + "' type='range' min='" + minVal + "' max='" + maxVal + "' value='" + defaultVal + "' step='" + step + "'>" + 
                maxVal +
            "</div>";
}

function buildSelect(id, values) {
    var html = "<div class='ui_holder'><select id='" + id + "' class='ui_element'>";

    for(var i = 1; i < values.length; ++i) { 
        html += "<option value='" + values[i] + "'>" + values[i] + "</option>"
    }

    html += "</select></div>";

    return html;
}

function buildUI(params) {

    /**
     * Noise properties are formatted as follows:
     *
     *     name: type param0 param1 ... paramN defaultValue;
     *
     * Valid property types are:
     *
     *     - int
     *     - uint
     *     - float
     *     - int_range
     *     - float_range
     *     - select
     */

    var html = "";
    var properties = params.split(";");

    for(var i = 0; i < properties.length; ++i) {

        html += "<div>";

        var temp = properties[i].split(":");
        var propertyName = temp[0];

        if(propertyName.length) {

            var propertyParams = temp[1].split(" ");
            var propertyType = propertyParams[0];

            switch(propertyType) {
            case "int":
                html += buildTitle(propertyName, propertyParams[1], true);
                html += buildInt(propertyName, propertyParams[1]);
                break;

            case "uint":
                html += buildTitle(propertyName, propertyParams[1], true);
                html += buildUint(propertyName, propertyParams[1]);
                break;

            case "float":
                html += buildTitle(propertyName, propertyParams[1], true);
                html += buildFloat(propertyName, propertyParams[1]);

                break;

            case "int_range":
                html += buildTitle(propertyName, propertyParams[3]);
                html += buildRangeInt(propertyName, propertyParams[1], propertyParams[2], propertyParams[3]);
                break;

            case "float_range":
                html += buildTitle(propertyName, propertyParams[3]);
                html += buildRangeFloat(propertyName, propertyParams[1], propertyParams[2], propertyParams[3]);
                break;

            case "select":
                html += buildTitle(propertyName, propertyParams[1], true);
                html += buildSelect(propertyName, propertyParams);
                break;

            default:
                break;
            }
        }

        html += "</div>";
    }

    $("#noise_properties").empty();
    $("#noise_properties").append(html);
}