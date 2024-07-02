/*
  ============================================================================
         Anagram Master's Script for Interactions and Dynamic Content
  ============================================================================
*/

// Set header and data type for all HTTP requests
$.ajaxSetup({
    headers: {"Content-Type": "application/json"},
    dataType: "json"
});

// Site routes
const url_home = "../";
const url_game = "../game";
const url_onboarding = "../onboarding";
const url_scores = "../scores";

// API routes
const url_api_health = "../api/v1/health";
const url_api_init = "../api/v1/init";
const url_api_status = "../api/v1/status";
const url_api_play = "../api/v1/play";
const url_api_close = "../api/v1/close";
const url_api_scores = "../api/v1/scores";

// Homepage Buttons Actions
$(".logo").click(()=>{
    window.location.href = url_home;
});
$("#start").click(()=>{
    $.post(url_onboarding, function(JSON){
        // Display onboarding screen in canvas
        $(".canvas").html(JSON.code);
        // Add onboarding window script
        const m_script=document.createElement('script');
        m_script.src="../static/scripts/onboarding.js?="+ new Date().getTime();
        document.head.appendChild(m_script);
    });
});
$("#scores").click(()=>{
    window.location.href = url_scores;
});


// Add onboarding window stylesheet (Moved out here to prevent flashing on load)
const style=document.createElement('link');
style.setAttribute("rel", "stylesheet");
style.setAttribute("type", "text/css");
style.setAttribute("href", "../static/styles/onboarding.css?="+ new Date().getTime());
document.head.appendChild(style);


// Set Status Indicator State
function setStatus (status){
    $("#status").removeClass("green red orange");
    $("#status").addClass(status);
};
