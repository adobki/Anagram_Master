// Reports API status and keeps track of user-selected Amenities filters

/*
  ====================================================
       Anagram Master's Header and Footer Styles
  ====================================================
*/

// Set headers and data type for all HTTP requests
$.ajaxSetup({
    headers: {'Content-Type': 'application/json'},
    dataType: 'json'
});

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
let ticks = 61;

$("body").toggleClass("main");
$("header").toggleClass("main");
$("footer").toggleClass("main");

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
        $(status).removeClass("green red orange");
        status.innerHTML = "<p></p>";
    }
}, 1000);

//    clearTimeout(myTimer);
//    timer()

//myTimer;

function timer() {
}

/*
    // Create new script element and load a script into it
    js = document.createElement("script");
    js.src = 'word.js';
    js.id = "wrdScript";
    document.body.appendChild(js);

	tmpArray = []///, 	tmr = [];

    if(parseWord().length > 2) {
		// Check if word has changed and begin countdown if true
		if (document.getElementById('wrd').innerHTML != parseWord()[1]) {
			document.getElementById('num').innerHTML = "Number " + parseWord()[0];
			document.getElementById('num').style.color = "black";

			// Display new word
			document.getElementById('wrd').innerHTML = parseWord()[1];
			document.getElementById('num').style.color = "white";

			// Show countdown timer
			document.getElementById("tmrLbl").style.display = "block";

			// Create temporary array to index total number of words in Wordlist
			x = 1
			do {
				tmpArray.push(x);
				x++;
			} while (x < parseWord()[3]+1);
			// Parse list of used words, then reverse list for array.splice()
			usdNums = parseWord()[2].split(",").reverse()
			// Remove used words from temporary array using parsed list
			usdNums.forEach(function(x){tmpArray.splice(x-1, 1)});
			if (tmpArray.length) {
				// Display available numbers for next selection
				document.getElementById('num2').innerHTML = "AVAILABLE: " + (tmpArray+"").split();
				document.getElementById("num2").style.display = "block";
			} else {
				// Hide available numbers list/box if all numbers have been used
				document.getElementById("num2").style.display = "none";
			}

		} else {
			cntDwn();
		}

    } else {
		// First run. Display loading text,  hide available numbers list/box and countdown timer
		document.getElementById('num').innerHTML = parseWord()[0];
		document.getElementById('wrd').innerHTML = parseWord()[1];
		document.getElementById("num2").style.display = "none";
		document.getElementById("tmrLbl").style.display = "none";
		document.getElementById("muteBtn").style.display = "none";
	}

    setTimeout("reWord();", 250);
*/
