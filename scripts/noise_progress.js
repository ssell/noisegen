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
 * noise_progress.js
 *
 * This script contains the static NoiseProgressBar class used to
 * display the progress of the noise generation.
 */

class NoiseProgressBar {
    constructor() {

    }

    static start(total) {
        NoiseProgressBar.startTime = performance.now();
        NoiseProgressBar.total     = total;
        NoiseProgressBar.current   = 0;

        $("#progress_bar").show();
        $("#progress_bar").css("width", "0%");
    }

    static stop() {
        NoiseProgressBar.stopTime = performance.now();

        $("#progress_bar").hide();
        $("#progress_bar").css("width", "0%");
    }

    static update(increment) {
        NoiseProgressBar.current += increment;
        var progress = ((NoiseProgressBar.current) / (NoiseProgressBar.total)) * 100.0;
        $("#progress_bar").css("width", progress + "%");
    }

    static elapsed() { 
        return NoiseProgressBar.stopTime - NoiseProgressBar.startTime;
    }
}

NoiseProgressBar.total     = 0.0;
NoiseProgressBar.current   = 0.0;
NoiseProgressBar.active    = false;
NoiseProgressBar.startTime = 0;
NoiseProgressBar.stopTime  = 0;