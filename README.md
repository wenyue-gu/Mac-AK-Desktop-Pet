## How to use:

1. Have npm installed
2. cd into this folder (desktop_pet2)
3. npm start (this will bring up the pet but you cannot close the terminal window or control c to quit there, or the program is stopped and the pet goes away.)

Alternatively:

3. npm run build
4. open the dist folder that the prior cmd should've created, then the folder mac-universal
5. double click the .app file inside to run it (no terminal needed, app runs in background, quit app by clicking the icon on the top menu bar and select Quit)
6. Default outfit is Radient Serenity, use the menu bar dropdown to switch to RI Uniform outfit.


## Expected behavior:

* When app is launched, pet plays the Start (battle start) animation once and enters battle idle animation (Normal mode)
* Every 15-40 seconds, pet have various chance to select a behavior. One of which (the most "special" behavior) is Move.
    * When pet decides to move, normally, he has 50-50 chance of picking going left or going right, and walks for a random multipler between 1-4 unit duration.
    * When pet hits edge while moving, he immediately turns back, finishes the current moving interval. Then the next time he choose to move, he will have a 70-30 preference of walking away from the previous wall vs towards the prevous wall. After that, the chance reset to 50-50.
    * After Move plays, pet has 50-50 chance of entering Normal or Base mode (different idle animation, behavior logic, and click ineteraction)
* Normal mode
    * Pet will choose between behaviors: S1, S2, S3, and Move
    * Click in normal idle mode plays the attack animation in 50-50 chance
    * Click during S1 plays the S1 attack
    * Click during S2 swaps S2 mode from up to down and vice versa
    * Click during S3 plays the S3 attack
* Base mode
    * Pet will choose between behaviors: Sit, Special, and Move
        * RI Uniform outfit does not have Special animation, so will only pick between Sit and Move
    * Sit only happens on the dock area, which is currently hardcoded to my computer. You may want to edit it to fit your computer
    * Click during any of base mode animation (including move) will play the Interact animation
* While app is in focus, press c to switch between base and normal mode (this is a debug feature that I thought was useful so left it in)
* When the quit button is presssed on the menu bar icon, pet plays the Die animation before app quits

## Unused animations:

1. base: Sleep
2. base: Default
3. normal: Default
4. normal: Skill_Down_2_Begin (skill 2 always begin as regular pose/up)
