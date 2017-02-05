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


//------------------------------------------------------------------------------------------
// Helper functions
//------------------------------------------------------------------------------------------


/**
 * Converts a string to title-case. Example:
 * 
 *     parameter -> Parameter 
 * 
 * Source: http://stackoverflow.com/a/4878800
 */
function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}


//------------------------------------------------------------------------------------------
// Individual Builders
//------------------------------------------------------------------------------------------


/**
 * Builds a title div. This is a centered, bold string to be displayed above the input element.
 * An optionally visible div is maintained next to the title containing the input element value.
 * 
 * \param[in] title       Title string to be displayed.
 * \param[in] value       Default value of the input below the title.
 * \param[in] valueHidden If true, the value of the input will not be displayed next to the title.
 */


function buildTitle(title, value, valuehidden) {
    var html = "<div class='ui_holder ui_title'>" + toTitleCase(title) + ": ";

    if(valuehidden) {
        html += "<div id='" + title + "_value' class='noise_property_value' style='display:none;'>" + value + "</div></div>";
    } else {
        html += "<input id='" + title + "_value' class='noise_property_value' type='number' value='" + value + "'></div>";
    }
    
    return html;
}

/**
 * Builds an input element that supports a single number entry.
 * The original parameter string should be formatted as:
 * 
 *     name:number value;
 * 
 * Example:
 * 
 *     age:number 26;
 * 
 * \param[in] id         ID of the input element.
 * \param[in] defaultVal Default value of the input.
 */
function buildNumber(id, defaultVal) {
    return "<div class='ui_holder'><input id='" + id + "' class='ui_element' type='number' value='" + defaultVal + "'></div>";
}

/**
 * Builds a range input element that supports integer values.
 * The original select parameter string should be formatted as:
 * 
 *     name:int_range minVal maxVal defaultVal;
 * 
 * Example:
 * 
 *     size:float_range 0 10 5;
 * 
 * Step size is calculated as non-zero integer 1/100 of the total range.
 * 
 * \param[in] id         ID of the new input element.
 * \param[in] minVal     Minimum allowed value. Displayed to the left of the range.
 * \param[in] maxVal     Maximum allowed value. Displayed to the right of the range.
 * \param[in] defaultVal Starting value of the range.
 */
function buildRangeInt(id, minVal, maxVal, defaultVal) {
    var step = Math.trunc((Number(maxVal) - Number(minVal)) * 0.01);

    if(step < 1) { 
        step = 1;
    }

    return "<div class='ui_holder'>" +
                "<table class='ui_table'>" +
                    "<tr>" +
                        "<td width='15%' style='text-align: right;'>" + minVal + "</td>" +
                        "<td width='60%'><input class='ui_element ui_range' id='" + id + "' type='range' min='" + minVal + "' max='" + maxVal + "' value='" + defaultVal + "' step='" + step + "'></td>" + 
                        "<td width='15%' style='text-align: left;'>" + maxVal + "</td>" +
                    "</tr>" +
                "</table>" +
            "</div>";
}

/**
 * Builds a range input element that supports floating-point values.
 * The original select parameter string should be formatted as:
 * 
 *     name:float_range minVal maxVal defaultVal;
 * 
 * Example:
 * 
 *     size:float_range 0.0 1.0 0.5;
 * 
 * Step size is calculated as 1/100 of the total range.
 * 
 * \param[in] id         ID of the new input element.
 * \param[in] minVal     Minimum allowed value. Displayed to the left of the range.
 * \param[in] maxVal     Maximum allowed value. Displayed to the right of the range.
 * \param[in] defaultVal Starting value of the range.
 */
function buildRangeFloat(id, minVal, maxVal, defaultVal) {
    var step = (Number(maxVal) - Number(minVal)) * 0.01;

    return "<div class='ui_holder'>" +
                "<table class='ui_table'>" +
                    "<tr>" +
                        "<td width='15%' style='text-align: right;'>" + minVal + "</td>" +
                        "<td width='60%'><input class='ui_element ui_range' id='" + id + "' type='range' min='" + minVal + "' max='" + maxVal + "' value='" + defaultVal + "' step='" + step + "'></td>" + 
                        "<td width='15%' style='text-align: left;'>" + maxVal + "</td>" +
                    "</tr>" +
                "</table>" +
            "</div>";
}

/**
 * Builds a select input element.
 * The original select parameter string should be formatted as:
 * 
 *     name:select option0 option1 ... optionN;
 * 
 * Example:
 * 
 *     vehicle:select car truck motorcycle;
 * 
 * \param[in] id     ID of the new input element.
 * \param[in] values The option values for the select element.
 */
function buildSelect(id, values) {
    var html = "<div class='ui_holder'><select id='" + id + "' class='ui_element'>";

    for(var i = 1; i < values.length; ++i) { 
        html += "<option value='" + values[i] + "'>" + values[i] + "</option>"
    }

    html += "</select></div>";

    return html;
}


//------------------------------------------------------------------------------------------
// UI Builder
//------------------------------------------------------------------------------------------


/**
 * Builds and populates the '#noise_properties' div.
 * Input a string containing parameters that may be customized by the user for the noise algorithm.
 * 
 * The params string is expected to be formatted as:
 * 
 *     param1;param2;param3;...;paramN;
 * 
 * Where each param may be of the following types:
 * 
 *     - number
 *     - int_range
 *     - float_range
 *     - select 
 * 
 * Individual parameters follow the general format of:
 * 
 *     name:type args;
 * 
 * The expected format for each parameter type may be found in the associated build function above.
 * 
 * An example multi-parameter string:
 * 
 *     age:number 26;vehicle:select car truck motorcycle;tolerance:float_range 0.0 10.0 8.0;
 * 
 * Elements are placed in the UI in the order that they appear in the parameter string.
 */
function buildUI(params) {

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
            case "number":
                html += buildTitle(propertyName, propertyParams[1], true);
                html += buildNumber(propertyName, propertyParams[1]);
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