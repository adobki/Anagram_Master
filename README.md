# ___Anagram Master___
![Anagram Master's Homepage Mockup](ref/Design%20Diagrams/Anagram%20Master's%20Drawings-Mockups-Homepage.drawio.png)
Created as the Research/Portfolio Project at the end of the _Software Engineering Foundations_ stage of the [ALX Software Engineering Course](https://www.alxafrica.com/software-engineering), Anagram Master is a multiplayer word game that involves rearranging letters from a root word to form new words. 


## Table of Contents
* [Environment](#Environment)
* [Technologies and Frameworks](#Technologies-and-Frameworks)
* [Folder Structure](#Folder-Structure)
* [API Routes](#API-Routes)
* [Installation and Usage](#Installation-and-Usage)
* [Bugs](#Bugs)
* [Authors](#Authors)
* [License](#License)


## Environment
This project was developed and tested in the following environments:
* Windows 11 22H2 using Python v3.10.5, and
* Ubuntu 20.04.05 LTS using Python v3.8.10.

However, it should work in any other environment that is configured to run Python v3+ as well as all the required pip packages and their dependencies. 

## Technologies and Frameworks
| S/N | Technology            | Implementation                      |
|-----|-----------------------|-------------------------------------|
| 1.  | **Flask/Python**      | **BACKEND**: API                    |
| 2.  | **Gunicorn**          | **BACKEND**: Application Server     |
| 3.  | **HTML**              | **FRONTEND**: Static Web Pages      |
| 4.  | **CSS**               | **FRONTEND**: Web Pages' Design     |
| 5.  | **jQuery/JavaScript** | **FRONTEND**: Web Application       |
| 6.  | **Shell/Bash Script** | **AUTOMATION**: Launches Web Server |


## Folder Structure
> ___[api/v1](api/v1):___<br>
> Ambigram Master API which has three routes (see [#API Routes](#API-Routes) below for details).
> <br><br>___[api/v1/templates](api/v1/templates):___<br>
> Static web pages and their resources ([styles](api/v1/templates/styles), [scripts](api/v1/templates/scripts), [images](api/v1/templates/media), etc.)

> ___[models](models):___<br>
> Ambigram Master Models and Classes. [game_engine.py](models/game_engine.py) contains the Game class which implements the game engine and logic.

> ___[ref](ref):___<br>
> Reference materials such as [documentation](ref/AnagramMaster%20MVP%20Specification.txt) and [UI Mockups](ref/Design%20Diagrams) used in the design and development of Ambigram Master.

> ___[src](src):___<br>
> Third-party [word lists](src/words.txt) and [source code](src/scowl-2020.12.07) used by the game engine.

## API Routes
Routes available for HTTP requests from the API are:
1. `/api/v1/init`
  <br>**GET**: _Creates a new session ID for a new player at the start of the game._
2. `/api/v1/status`
  <br>**POST**: _Returns information about the ongoing game, using player's session ID to authenticate. This information would include round info (current root word, whose turn it is, current time on clock, etc.) and game stats (number of players in current games, their scores, words formed for the current round/root word, etc.)._
3. `/api/v1/close`
  <br>**POST**: _Ends the game for the player who requests it, using player's session ID to authenticate. Removes them from the list of active players, returns their game stats, and notifies other players._


## Installation and Usage
* Install the following packages and their dependencies:<br>
`Python`, `Flask`, `Gunicorn`.
* Clone this repository:<br>
`git clone https://github.com/adobki/Anagram_Master.git`
* Access repo folder and run script to launch app server:
  * Windows: [AmbigramMaster.cmd](AmbigramMaster.cmd)
  * Ubuntu: [AmbigramMaster.sh](AmbigramMaster.sh)
  * Others: `gunicorn --bind localhost:5555 api.v1.api_wsgi:app`
* Open the bound address in a local web browser:<br>
  `http://localhost:5555`



## Bugs
There are no known bugs at this time.


## Authors
[Donald Ajaps](https://github.com/adobki)


## License
Anagram Master is the intellectual property of Donald Ajaps, Copyright © 2023. No part of it should be copied or reproduced without express permission from him.
