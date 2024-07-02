/*
  ============================================================================
         Anagram Master's Script for Interactions and Dynamic Content
  ============================================================================
*/

// Check if new game or resumed saved game
if (status) {
    // Go directly to game screen for resumed saved game
    loadGame();
} else {
    // Global variables used for game screen
    let root_word = "";
    let used_words = [];
    let rounds_limit = 0;
    let words_limit = 0;
    let current_time = 0;
}

// Dialog box for displaying errors
let dialog = document.getElementById("error");
let dialog_txt = $("dialog p");

// Prevent user from leaving game screen accidentally
window.onbeforeunload = function() {
   // Return any value to trigger alert message
   return false;
};

// Loads the game screen
function loadGame(){
    $.post(url_game, '{}', function(JSON){
//    $.get(url_api_play, JSON.stringify(header), function(JSON){
        if (JSON.error){
            setStatus("red");
            dialog_txt.html(JSON.error);
            dialog.showModal();
            console.log("401 - FAILED onboarding REQUEST");
            return;
        }
        // Display game screen in canvas
        $(".canvas").html(JSON.code);
        // Add game window stylesheet
        const o_style=document.createElement('link');
        o_style.setAttribute("rel", "stylesheet");
        o_style.setAttribute("href", "../static/styles/game.css?="+ new Date().getTime());
        document.head.appendChild(o_style);
        // Add game window script
        const o_script=document.createElement('script');
        o_script.src="../static/scripts/game.js?="+ new Date().getTime();
        document.head.appendChild(o_script);
        document.title = user_name + " | Anagram Master"
        // Set score and time for resumed saved game
        $("#score").text(score);
        $("#clock").text(time);
    });
}

// Checks if user's screen resolution/aspect ratio are unsuitable for the game
function checkScreen(user_name){
    if (user_name === "Tester") {
        return false
    }

    if (window.outerWidth < window.outerHeight || window.outerWidth < 1280
            || window.outerWidth/window.outerHeight >= 2) {
        return true;
    }

    return false;
}

// Onboarding Page Actions
$("#onboarding").on("submit", function(event){
    // Stop browser from reloading the page
    event.preventDefault();

    user_name = $("#user_name").val();
    // Input Validation
    if (user_name.length == 0){
        dialog_txt.html("ERROR: No name! You must provide a name!");
        dialog.showModal();
    } else if (user_name.length < 3){
        dialog_txt.html("ERROR: Name is too short!<br>" +
                        "Must be 3 to 15 characters long!");
        dialog.showModal();
    } else if (checkScreen(user_name)){
        const err_msg =
        dialog_txt.html("ERROR: Your screen or device is not supported!<br>" +
                        "Must be run on a modern PC in landscape mode.");
        dialog.showModal();
    } else {
        // Submit name to server
        payload = JSON.stringify({ "name": user_name })
        $.post(url_api_init, payload, function(JSON){
            // Check if new player was created successfully and start game
            if (JSON.status){
                // Store loaded game session data
                root_word = JSON.word;
                current_time = JSON.time;
                words_limit = JSON.rounds_limit;
                rounds_limit = JSON.rounds_limit - JSON.round;
                used = JSON["words"][root_word];
                if (used){
                    used_words = used;
                }

                // Load game screen
                loadGame();
            } else {
                setStatus("red");
                dialog_txt.html(JSON.error);
                dialog.showModal();
            }
        });
        setStatus("orange");
    }
});

// Auto-focuses input box if autofocus attribute fails due to usage in index.htm
$("#onboarding").click(() => { $("#user_name").focus(); });
setTimeout(() => { $("#user_name").focus(); }, 1000);
