# rps
FIRST STEP: Understand Problem Statement

ENTITIES
- Match: time, gameId, 2 players, what each player played
- Player: name


winners aren't directly encoded
dates are returned in unix timestamp

questions:
- how to create an effective API polling regine for something that is updating live. 
- how do pages work?


SECOND STEP: explore given API Endpoints
- the endpoint GET /history has around 400 pages and each page has roughly 300 entroes. how to query effectively at run-time? 
- live returns objects every 2-3 seconds.
- each of the requested features needs to have an API endpoint. 
--> How to sync these two databases? Event-listener? Cache?


THIRD STEP
- How to hide that database needs to be cached and that it takes a while to laod everything from user? Introduce partial ready attribute so first information can be loaded when one is on the landing page.


FOURTH STEP
How to structure frontend:
- First thing that appears is the leaderboard and the latest matches for today. THey each have filter options
- The leaderboard can be filtered by day
- The latest matches can be filtered by date and palyer

