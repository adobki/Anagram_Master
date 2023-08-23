/*
  ============================================================================
         Anagram Master's Script for Interactions and Dynamic Content
  ============================================================================
*/

// Header dictionary for HTTP requests
let header = {"Content-Type": "application/json"};
let user_name = "";

// Loads the game screen
function loadGame(header, user_name){
    $.post("../game", JSON.stringify(header), function(JSON){
        // Display game screen in canvas
        $(".canvas").html(JSON.code);
        // Add game window stylesheet
        const style=document.createElement('link');
        style.setAttribute("rel", "stylesheet");
        style.setAttribute("href", "../static/styles/game.css?="+ new Date().getTime());
        document.head.appendChild(style);
        // Add game window script
        const script=document.createElement('script');
        script.src="../static/scripts/game.js?="+ new Date().getTime();
        document.head.appendChild(script);
    });
};

// Onboarding Page Actions
$("#onboarding").on("submit", function(event){
    event.preventDefault();
    const dialog = document.getElementById("error");
    user_name = $("#user_name").val();
    // Input Validation
    if (user_name.length == 0){
        $("dialog p").html("ERROR: No name! You must provide a name!");
        dialog.showModal();
    } else if (user_name.length < 3){
        let err_msg = "ERROR: Name is too short!<br>";
        err_msg += "Must be 3 to 15 characters long!";
        $("dialog p").html(err_msg);
        dialog.showModal();
    } else {
        let header = {"user_name": user_name};
        $.post(".", JSON.stringify(header), function(JSON){
            console.log(JSON);
            // Check if new player was created successfully and start game
            if (JSON.status){
                header = {"Session ID": JSON["Session ID"]}
                console.log(header, user_name);
                loadGame(header, user_name);
            } else {
                $("#status").removeClass("green red orange");
                $("#status").toggleClass("orange");
                $("dialog p").html("ERROR: " + JSON.error);
                dialog.showModal();
            }
        });
    }
});
