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

1. Every 15-40 seconds, character chooses a behavior (currently: sit, move, special)
2. Sit will only ever be selected if character is on dock when the decision is happening (x,y coords are hardcoded to my computer, so you might want to change it to fit your computer)
3. If character chooses to walk, he will walk randomly between 1-4 units, randomly to the left or to the right (50%)
4. If the character hits the edge while walking, he immediately turns around and finish the walking interval
5. After that, the next time he chooses to walk, the direction weight will be away from the previous edge hit 70%: towards the edge 30%
6. After that, the weight resets to 50%
7. Click the character triggers "interact" animation


Unused animations:

1. base:sleep

-----


Next steps:

1. Add regular/attack models on the same outfit (but need different skel, atlas, and sprite sheet)
2. Add reg model animations as random options too, some good ones are S1 begin-idle (idle), S2 begin-loop-end (random action), S2-down begin-loop-end (random action), S3 begin-idle-end (random action?). Maybe attack too? idk.
3. Add other outfit and add switch outfit option in the menu bar
