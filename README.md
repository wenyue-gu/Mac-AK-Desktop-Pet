How to use:

1. Have npm installed
2. cd into this folder (desktop_pet2)
3. npm start (this will bring up the pet but you cannot close the terminal window or control c to quit there, or the program is stopped and the pet goes away.)

Alternatively:

3. npm run build
4. open the dist folder that the prior cmd should've created, then the folder mac-arm64
5. double click the .app file inside to run it (no terminal needed, app runs in background, quit app by clicking the icon on the top menu bar and select Quit)


-----


Current behavior:

1. every 15-40 seconds, character chooses either the move behavior or the special animation (weight 85% vs 15%)
2. If character chooses to walk, he will walk randomly between 1-4 units, randomly to the left or to the right (50%)
3. If the character hits the edge while walking, he immediately turns around and finish the walking interval
4. After that, the next time he chooses to walk, the direction weight will be away from the previous edge hit 70%: towards the edge 30%
5. After that, the weight resets to 50%
6. Click the character triggers "interact" animation


Unused animations:

1. base:sleep

-----


Next steps:

1. Fix and add sit (currently disabled because window is clipeed)
2. Add regular/attack models on the same outfit (but need different skel, atlas, and sprite sheet)
3. Add reg model animations as random options too, some good ones are S1 begin-idle (idle), S2 begin-loop-end (random action), S2-down begin-loop-end (random action), S3 begin-idle-end (random action?). Maybe attack too? idk.
4. Add other outfit and add switch outfit option in the menu bar
