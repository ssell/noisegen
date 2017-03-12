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