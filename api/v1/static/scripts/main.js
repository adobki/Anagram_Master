/*
  ============================================================================
         Anagram Master's Script for Interactions and Dynamic Content
  ============================================================================
*/

// Set headers and data type for all HTTP requests
$.ajaxSetup({
    headers: {"Content-Type": "application/json"},
    dataType: "json"
});

// Homepage Buttons Actions
$(".logo").click(()=>{
    window.location.href = "index.htm";
});
$("#start").click(()=>{
    $.post("../onboarding", function(JSON){
        // Add onboarding window stylesheet
        const style=document.createElement('link');
        style.setAttribute("rel", "stylesheet");
        style.setAttribute("href", "../static/styles/onboarding.css?="+ new Date().getTime());
        document.head.appendChild(style);
        // Display onboarding screen in canvas
        $(".canvas").html(JSON.code);
        $("#user_name").focus();
        // Add onboarding window script
        const script=document.createElement('script');
        script.src="../static/scripts/onboarding.js?="+ new Date().getTime();
        document.head.appendChild(script);
    });
});
$("#scores").click(()=>{
    window.location.href = "scores.htm";
});


// Add onboarding window stylesheet (Moved out here to prevent flashing on load)
const style=document.createElement('link');
style.setAttribute("rel", "stylesheet");
style.setAttribute("href", "../static/styles/onboarding.css?="+ new Date().getTime());
document.head.appendChild(style);


// Highscores Buttons Actions
$("#back").click(()=>{
    history.back();
});


// Set Status Indicator State
//if (window.location.href == "index.htm"){;
if ($("logo_main")){;
    $("#status").addClass("green")
}

//// Check for existing script element and delete it if it exists
//var theme_js = document.getElementById("theme");
//if(theme_js) {
//    document.body.removeChild(theme_js);
//}

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

//$("body").toggleClass("main");
//$("header").toggleClass("main");
//$("footer").toggleClass("main");

console.log(ticks);
//const myTimer = setInterval(timer, 1000);
myTimer = setInterval(() => {
    // Check for existing script element and delete it if it exists
    let status = document.getElementById("status");
    $(status).removeClass("green red orange");
    $(status).toggleClass("green");
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

//    clearTimeout(myTimer);

//myTimer;
