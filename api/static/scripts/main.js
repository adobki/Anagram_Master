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

// Check if player has an active/saved game and update interface
let status = $("#active").text();
$("#active").remove();
let score = "";
let time = 0;
if (status) {
    status = JSON.parse(status);
    console.log(status);
    $("#start").text(status.action);
    user_name = status.name;
    document.title = user_name + " | " + document.title;
}

// Homepage Buttons Actions
$(".logo").click(()=>{
    window.location.href = url_home;
});
$("#start").click(()=>{
    if (status) {
        // Load and display game screen in canvas
        resume(status)
    } else {
        // Load and display onboarding screen in canvas
        $.post(url_onboarding, function(data){
            $(".canvas").html(data.code);
        });
    }
    // Add onboarding window script
    $.getScript("../static/scripts/onboarding.js?=" + new Date().getTime());
});
$("#scores").click(()=>{
    window.location.href = url_scores;
});

// Resumes active/last saved game instead of starting a new one
function resume (active) {
    if (!active) { return }
    $.post(url_api_play, '{}', function(data){
        if (data.status){
            // Store values to be parsed by game screen
            root_word = data.word;
            current_time = data.time;
            words_limit = data.rounds_limit;
            rounds_limit = data.rounds_limit - data.round;
            used = data["words"][root_word];
            if (used){
                used_words = used;
            }
            score = data.score;
            time = data.time;
        } else {
            window.onbeforeunload = null
            setStatus("red");
            dialog_txt.html(data.error);
            dialog.showModal();
        }
    });
}

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
