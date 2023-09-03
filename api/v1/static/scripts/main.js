/*
  ============================================================================
         Anagram Master's Script for Interactions and Dynamic Content
  ============================================================================
*/

// Set headers and data type and URLs for all HTTP requests
const header = {"Content-Type": "application/json"};
$.ajaxSetup({
    headers: header,
    dataType: "json"
});

// Site routes
const url_home = "../";
const url_game = "../game";
const url_onboarding = "../onboarding";
const url_scores = "../scores";

// API routes
const url_init = "../api/v1/init";
const url_status = "../api/v1/status";
const url_close = "../api/v1/close";

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
