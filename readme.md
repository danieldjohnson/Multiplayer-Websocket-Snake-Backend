# Augmented Shanahan Multiplayer Snake Backend

This is a lightweight implementation of the game of Snake as a [node.js][] app, designed to be connected to by multiple users simultaneously. This is the backend for my augmented reality project [Augmented Shanahan](http://www.github.com/hexahedria/AugmentedShan).

The server app communicates with the client using [socket.io][]. The app keeps track of every player's snake, and every 500 ms, it updates the positions of each snake, handles collisions, and then broadcasts the state to each player that is currently connected. If all players leave, the server resets the game and pauses the timer until a new player arrives.

[node.js]:http://nodejs.org/
[socket.io]: http://socket.io/

For implementation details and more information, you can read [my blog post](http://www.hexahedria.com/2015/01/23/augmented-shanahan-detection/ ).