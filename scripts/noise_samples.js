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

const g_ClassTitleActive    = "sample_title_active";
const g_ClassTitleInactive  = "sample_title_inactive";
const g_ClassSampleActive   = "sample_active";
const g_ClassSampleInactive = "sample_inactive";

$(document).ready(function() {
    $(".sample_title").click(function() {
        if($(this).hasClass(g_ClassTitleInactive)) {

            //------------------------------------------------------------
            // Make the clicked title active

            var title = $(this);

            $("." + g_ClassTitleActive).each(function() {
                $(this).removeClass(g_ClassTitleActive);
                $(this).addClass(g_ClassTitleInactive);
            })

            title.removeClass(g_ClassTitleInactive);
            title.addClass(g_ClassTitleActive);

            //------------------------------------------------------------
            // Make the selected sample visible

            const index = $(this).attr("id").split("_")[1];

            var sample = $("#sample_" + index);

            $("." + g_ClassSampleActive).each(function() {
                $(this).removeClass(g_ClassSampleActive);
                $(this).addClass(g_ClassSampleInactive);
            })

            sample.removeClass(g_ClassSampleInactive);
            sample.addClass(g_ClassSampleActive);
        }
    });
});