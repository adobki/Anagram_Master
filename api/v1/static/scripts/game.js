/*
  ============================================================================
         Anagram Master's Script for Interactions and Dynamic Content
  ============================================================================
*/

console.log("header: ", header);
console.log("round_limit: ", round_limit, "\n", "words_limit: ", words_limit);

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
                }
            } else {
                console.log(`${current} is invalid!`);
            }
        });
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

    console.log(JSON);
    console.log(" round_limit: ", round_limit, "\n", "words_limit: ", words_limit,
                "\n", "round_words: ", round_words);

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
            // Set status based
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
    header["new_word"] = true;
    header["time"] = 40;
    header["quit"] = false;
    $.post(url_status, JSON.stringify(header), function(JSON){
        if (!JSON.error){
            updateWords(JSON);
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
});

/*
// Resize words box based on word length
// Max root word length = 16?
// Max used words per round = 20?
// Move everything up as #used height increases?
// Alignment of used=center while words <= 5 else left?
// Change word.attr("pattern", `[a-z]{2,$(word.length)}`
// Try vmin and vmax as an alternative to vw/vh
// Try rem too in place of em for places with resized fonts
// isAnagram tweak: if word == root: False
let max_length = 0

onWordLoad
if (word.length > max_length) {
    max_length = word.length;
    $("#used p").css("width": `$(max_length + 4)vw` ;
}
*/
