var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var _ = require('lodash');

/*app.get('/', function(req, res){
	res.sendfile('index.html');
});*/

http.listen(3000, function(){
	console.log('listening on *:3000');
});


var snake = {};
snake.socket = io.of('/snake');
snake.width = 52;
snake.height = 34;
snake.blocks = [
	{x:16,y:7,w:10,h:8},
	{x:35,y:7,w:10,h:8},
	{x:12,y:22,w:10,h:8},
	{x:31,y:22,w:10,h:8}
];
snake.players = [];
snake.deadParts = [];
snake.board = [];

snake.spectators = [];
snake.nextId = 0;


function resetGame(){
	for (var x = -1; x <= snake.width; x++) {
		snake.board[x] = [];
		for (var y = -1; y <= snake.height; y++) {
			snake.board[x][y] = (x>=0 && x<snake.width && y>=0 && y<snake.height) ? 'open' : 'full';
		};
	};
	for (var i = 0; i < snake.blocks.length; i++) {
		block=snake.blocks[i];
		for (var x = 0; x < block.w; x++) {
			for (var y = 0; y < block.h; y++) {
				snake.board[x+block.x][y+block.y]='full';
			};
		};
	};

	snake.food = findOpenPosition();
	snake.board[snake.food.x][snake.food.y]='food';
	snake.deadParts = [];
}
resetGame();

function findOpenPosition(){
	var openSpots = [];
	for (var x = 0; x < snake.width; x++) {
		for (var y = 0; y < snake.height; y++) {
			if(snake.board[x][y] == 'open')
				openSpots.push({x:x,y:y});
		};
	};
	if(openSpots.length==0)
		return null;
	return _.sample(openSpots);
}

snake.socket.on('connection', function(socket){
	console.log('a snake user connected');

	snake.spectators.push(socket);
	sendState(socket);
	socket.on('join',function(){
		console.log('Player attempting to join!');
		var player = {
			id:snake.nextId++,
			socket:socket,
			parts:[],
			head:null,
			length:3,
			dir:{x:0,y:0},
			lastdir:{x:0,y:0}
		}
		var openPos = findOpenPosition();
		if(!openPos){
			socket.emit('rejoin');
			console.log('No room!');
			return;
		}
		console.log('Player joined!');
		socket.emit('configure',{id:player.id});
		sendState(socket);

		player.head = openPos;
		player.parts.push(openPos);
		snake.board[openPos.x][openPos.y] = 'full';

		snake.players.push(player);
		if(snake.players.length==1){
			startTicking();
		}

		socket.on('disconnect', function(){
			console.log('Player left!');
			for (var i = 0; i < player.parts.length; i++) {
				var part = player.parts[i];
				snake.deadParts.push({
					x:part.x,
					y:part.y,
					timeLeft:i+1,
				});
			};
			_.pull(snake.players,player);
			if(snake.players.length==0){
				stopTicking();
				resetGame();
			}
		});
		socket.on('move',function(dir){
			if(dir=='left' && player.lastdir.x!=1)
				player.dir = {x:-1,y:0};
			else if(dir=='right' && player.lastdir.x!=-1)
				player.dir = {x:1,y:0};
			else if(dir=='up' && player.lastdir.y!=1)
				player.dir = {x:0,y:-1};
			else if(dir=='down' && player.lastdir.y!=-1)
				player.dir = {x:0,y:1};
		});
	});

	socket.on('disconnect', function(){
		console.log('user disconnected');
		_.pull(snake.spectators,socket);
	});
});
function resetPlayer(p){
	p.parts = [];
	p.length = 3;
	p.dir={x:0,y:0};
	p.lastdir={x:0,y:0};
	var openPos = findOpenPosition();
	p.head = openPos;
	p.parts.push(openPos);
	snake.board[openPos.x][openPos.y] = 'full';
}
function startTicking(){
	if(!snake.timer)
		snake.timer = setInterval(tick,500);
}
function stopTicking(){
	if(snake.timer)
		clearInterval(snake.timer);
	snake.timer = null;
}
function tick(){
	snake.deadParts = _.filter(snake.deadParts,function(dp,i){
		dp.timeLeft--;
		if(dp.timeLeft <=0){
			snake.board[dp.x][dp.y]='open';
			return false;
		}
		return true;
	});

	var orderedPlayers = _.shuffle(snake.players);
	for (var i = 0; i < orderedPlayers.length; i++) {
		var p = orderedPlayers[i];
		if(p.dir.x == 0 && p.dir.y == 0) continue;
		if(p.length==p.parts.length){
			var last = p.parts.shift();
			snake.board[last.x][last.y]='open';
		}
	}
	for (var i = 0; i < orderedPlayers.length; i++) {
		var p = orderedPlayers[i];
		p.lastdir=p.dir;
		if(p.dir.x == 0 && p.dir.y == 0) continue;

		var newPos = {
			x:p.head.x+p.dir.x,
			y:p.head.y+p.dir.y
		};
		if(snake.board[newPos.x][newPos.y] == 'full'){
			//Death!
			for (var i = 0; i < p.parts.length; i++) {
				var part = p.parts[i];
				snake.deadParts.push({
					x:part.x,
					y:part.y,
					timeLeft:i+1,
				});
			};
			resetPlayer(p);
		}else{
			if(newPos.x == snake.food.x && newPos.y == snake.food.y){
				var newFood = findOpenPosition();
				if(newFood){
					snake.food = newFood;
					snake.board[snake.food.x][snake.food.y]='food';
					if(p.length<15)
						p.length+=3;
					else if(p.length<30)
						p.length+=2;
					else
						p.length++;
				}else{
					resetGame();
					for (var i = 0; i < players.length; i++) {
						resetPlayer(players[i]);
					};
					return;
				}
			}
			p.parts.push(newPos);
			p.head=newPos;
			snake.board[newPos.x][newPos.y]='full';
		}
	};
	//console.log(snake.players);
	_.map(snake.spectators,sendState);
}
function sendState(socket){
	if(!socket) return;
	var state = {};
	state.snakes=_.map(snake.players,function(player,i){
		return _.pick(player,['id','parts']);
	});
	state.deadParts = snake.deadParts;
	state.food = snake.food;
	socket.emit('update',state);
}