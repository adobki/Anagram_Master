/*
  ============================================================================
         Anagram Master's Script for Interactions and Dynamic Content
  ============================================================================
*/

// Global variables used for game screen
let root_word = "overwhelmingly";
let used_words = [];
let round_limit = 6;
let words_limit = 0;

// Dialog box for displaying errors
let dialog = document.getElementById("error");
let dialog_txt = $("dialog p");
// Loads the game screen
function loadGame(){
    $.post(url_game, JSON.stringify(header), function(JSON){
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
    });
};

// Onboarding Page Actions
$("#onboarding").on("submit", function(event){
    event.preventDefault();
    const user_name = $("#user_name").val();
    // Input Validation
    if (user_name.length == 0){
        dialog_txt.html("ERROR: No name! You must provide a name!");
        dialog.showModal();
    } else if (user_name.length < 3){
        let err_msg = "ERROR: Name is too short!<br>";
        err_msg += "Must be 3 to 15 characters long!";
        dialog_txt.html(err_msg);
        dialog.showModal();
    } else {
        header["User Name"] = user_name;
        console.log(header);
        $.post(url_home, JSON.stringify(header), function(JSON){
            // Check if new player was created successfully and start game
            if (JSON.status){
                header["Session ID"] = JSON["Session ID"];
                // Store loaded words
                root_word = JSON["word"][0];
                round_limit = JSON["round_limit"] - 1;
                words_limit = JSON["round_limit"];
                used = JSON["words"][root_word];
                if (used){
                    used_words = used;
                }
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
