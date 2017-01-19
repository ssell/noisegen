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

function populateAlgorithmList() {
	$("#noise_algorithms").append(
		"<option value='Perlin'>Perlin</option>" +
		"<option value='Random'>Random</option>")
}

function getSelectedAlgorithm() {
	return $("#noise_algorithms").val();
}

function buildParamsList() {
	var params = "";

	$(".noise_property_value").each(function() {
		var id   = $(this).attr('id');
		var temp = id.split("_");
		var name = temp[0];
		var value = $(this).text();

		params += name + ":" + value + ";";
	});

	return params;
}

function updateInput(id) {
	var obj = $("#" + id);
	console.log("'" + id + "' changed -> " + obj);
	if(obj) {
		var newVal = obj.val();
		console.log("new value = " + newVal);
		$("#" + id + "_value").text(newVal);
	}
}

function generate() {
	var params = buildParamsList();

    gSurface.clear(0, 0, 0);
	generateNoiseMultithreaded(gSurface, getSelectedAlgorithm(), params, 2);
}

$(document).ready(function() {

    gSurface = new Surface();

	populateAlgorithmList();
    buildUI(getUIParams(getSelectedAlgorithm()));

    $("#generate_button").click(function() { generate(); });
    $("input").change(function(){ updateInput($(this).attr('id')); });
});