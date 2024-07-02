/*
  ============================================================================
         Anagram Master's Script for Interactions and Dynamic Content
  ============================================================================
*/

// Site routes
const url_home = "../";
const url_api_scores = "../api/v1/scores";

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
    $.get(url_api_scores, function(JSON){
        if (JSON.scores){
            const list_a = $("#scores_a");
            const list_b = $("#scores_b");
            list_a.text(""), list_b.text("");
            let index = 0;
            let scores = list_a;
            JSON.scores.slice(0, 20).forEach(function(item){
                const data =  `<tr><td class="name">${item[1]} </td>` +
                              `<td>${item[0]}</td></tr>`;
                scores.html(scores.html() + data);
                // Switch to second column if the first one is full
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
