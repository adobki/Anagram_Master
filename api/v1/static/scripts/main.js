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
//const url_scores = "../scores";

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


// Highscores Buttons Actions
$("#back").click(()=>{
    history.back();
});


// Set Status Indicator State
//if (window.location.href == "index.htm"){;
//if ($("logo_main")){;
function setStatus (status){
    $("#status").removeClass("green red orange");
    $("#status").addClass(status);
};

// Create new style element and load a style into it
theme_js = document.createElement("link");
theme_js.rel = 'stylesheet';
theme_js.href = 'styles/game.css';
theme_js.id = "theme";
//document.head.appendChild(theme_js);

// reWord()
let time = 15;
//let ticks = 61;
let ticks = 1;

console.log(ticks);
//const myTimer = setInterval(timer, 1000);
myTimer = setInterval(() => {
    setStatus("green");
    status.innerHTML = "<p>" + time + "</p>";
//    console.log(status);
    console.log(" Timer: " + time + "\n Left: " + ticks);
    time--, ticks--;
    if (time == 0) {
        time = 15;
    }
    if (ticks == 0) {
        clearInterval(myTimer);
//        $(status).removeClass("green red orange");
        status.innerHTML = "<p></p>";
    }
}, 1000);
