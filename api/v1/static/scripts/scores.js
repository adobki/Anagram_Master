/*
  ============================================================================
         Anagram Master's Script for Interactions and Dynamic Content
  ============================================================================
*/

// Site routes
const url_home = "../";
const url_scores = "../scores";

// Highscores Buttons Actions
$(".logo").click(()=>{
    window.location.href = url_home;
});
$("#scores").click(()=>{
    window.location.href = url_scores;
});
$("#back").click(()=>{
    history.back();
});

// Get high scores from server and display them on page
$(window).ready(function(){
    $.post(url_scores, function(JSON){
        if (JSON.scores){
            console.log("scores: ", JSON.scores);
            const list_a = $("#scores_a");
            const list_b = $("#scores_b");
            list_a.text(""), list_b.text("");
            let index = 0;
            let scores = list_a;
            JSON.scores.forEach(function(item){
                const data =  `<tr><td class="name">${item[1]}: </td>` +
                              `<td>${item[0]}</td></tr>`;
                scores.html(scores.html() + data);
                // Check if first list is full and switch to second
                index++;
                if (index >= 10){
                    scores = list_b;
                }
            });
        } else {
            console.log("ERROR! ", JSON);
        }
    });
});
