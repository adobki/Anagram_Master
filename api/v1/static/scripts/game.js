/*
  ============================================================================
         Anagram Master's Script for Interactions and Dynamic Content
  ============================================================================
*/

// Dialog box and function for displaying errors
dialog = document.getElementById("error");
dialog_txt = $("dialog p");
function displayError(err_msg){
    setStatus("red");
    if (err_msg){
        dialog_txt.html(err_msg);
    }
    dialog.showModal();
}

// Game clock function
const game_clock = setInterval(function roundTimer(){
    if (current_time < 0){
        setStatus("red");
        $("#skip").click();
        return;
    }

    const clock = $("#clock");
    const minutes = parseInt(current_time / 60);
    let seconds = current_time % 60;

    // Update displayed time
    if (seconds < 10){
        seconds = `0${seconds}`;
    }
    if (minutes){
        clock.text(`0${minutes}:${seconds}`);
        clock.css("color", "white");
    } else {
        clock.text(seconds);
        if (!parseInt(seconds)) {
            clock.text(0);
        } else if (seconds <= 30){
            clock.css("color", "#F73F52");
        } else {
            clock.css("color", "white");
        }
    }

    current_time--
}, 1000);

// Set status indicator and load words
setStatus("orange");
let round_words = 0;
displayWords();

// Display loaded words on game screen
function displayWords(){
    // Display root word
    $("#root_word").text(root_word);
    // Clear previous used words and display current ones if any
    const used = $("#used_words");
    used.text("");
    round_words = 0;
    if (used_words.length){
        used_words.forEach(function(word){
            current = word[0];
            isValid = word[1];
            // Display only valid words
            if (isValid){
                used.html(used.html() + `<p>${current}</p>`);
                round_words++;
                // Clear input box if inputted word is valid
                if (current == $("#word").val().toLowerCase()){
                    $("#word").val("");
                    setStatus("green");
                }
            } else {
                if (current == $("#word").val().toLowerCase()){
                    console.log(`${current} is invalid!`);
                }
            }
        });
    } else {
        setStatus("green");
    }
}

// Update game round on word skip/check if last round
function gameRound(check){
    // Check and return last round status
    if (check){
        if (!round_limit){
            return false
        } else {
            setStatus("green");
            return true
        }
    }

    // Check if last round and update round otherwise
    if (!round_limit || round_limit < 0){
        displayError("ERROR: Game over! That's the last word for the game!");
        console.log("ERROR: Game over! That's the last word for the game!");
        // Quit game session
        $("#quit").click();
        return false;
    } else {
        round_limit--;
        setStatus("green");
        return true;
    }
}

function loadUserWord(){
    if (round_words >= words_limit){
        // Check if round over
        if (gameRound(true)){
            displayError(`\n ${round_words} is enough words! Skipping. . .\n`);
            console.log("\n", round_words, " is enough words! Skipping. . .\n");
            $("#skip").click();
        } else {
            displayError("Game over!<br>Restart game!");
        }
        return false;
    }
    setStatus("green");
    return true;
}

// Update words then displays them on game screen
function updateWords(JSON){
    root_word = JSON["word"];
    used = JSON["words"][root_word];
    if (used){
        used_words = used;
    } else {
        used_words = [];
    }

    // Clear input box if skip was triggered on round words_limit reached
    if (JSON.skipped){
        $("#word").val("");
    }

    // Display loaded words
    displayWords();
}

// Submits a new word from the user
$("#root").on("submit", function(event){
    event.preventDefault();
    word = $("#word").val();
    if (!loadUserWord()){
        return;
    }
    setStatus("red");
    let err_msg = false;
    // Input Validation
    if (word.length == 0){
        displayError("ERROR: Blank! You must type a new word!");
        return;
    } else if (word.length < 2){
        displayError("ERROR: Word is too short!<br>" +
                     "Must be 2 to 18 characters long!");
        return;
    }
    // Check if duplicate word
    used_words.forEach(function(used){
        if (word.toLowerCase() == used[0]){
            err_msg = "ERROR: Duplicate word!<br>Try another new word.";
            return;
        }
    });
    if (err_msg){
        displayError(err_msg);
        return;
    }
    // Update header with current game stats
    header["word"] = word;
    header["time"] = 40;
    header["new_word"] = false;
    header["quit"] = false;
    // Submit new word from user
    $.post(url_status, JSON.stringify(header), function(JSON){
        if (JSON.status){
            // Update words
            updateWords(JSON);
            // Update time
            current_time = JSON.time;
            // Set status based on word validity
            if (!$("#word").val().length){
                setStatus("green");
            }
        } else {
            displayError(JSON.error);
            console.log("ERROR! ", JSON);
        }
    });
});

// Skip Button: Fetches a new word to trigger a new game round
$("#skip").click(()=>{
    if (!gameRound()){
        return;
    }
    $("#clock").css("color", "black");
    setStatus("orange");
    header["new_word"] = true;
    header["time"] = 40;
    header["quit"] = false;
    $.post(url_status, JSON.stringify(header), function(JSON){
        if (!JSON.error){
            updateWords(JSON);
            // Update time
            current_time = JSON.time;
            // Clear input box
            $("#word").val("");
        } else {
            displayError(JSON.error);
            console.log("ERROR! ", JSON);
        }
    });
});

// Quit Button: Ends the game and loads off-boarding actions
$("#quit").click(()=>{
    header["quit"] = true;
    console.log("Quit button clicked!");
    displayError("Game Over! Refresh page or go back to homepage");
    $.post(url_close, JSON.stringify(header), function(JSON){
        // Begin off-boarding if quit action was successful
        if (!JSON.error){
            // Load highscores page
            window.location.href = url_scores;
        }
    });
    // Disable page exit popup/warning and stop game clock
    window.onbeforeunload = undefined;
    clearInterval(game_clock);
    $("#clock").text(" ");
});
