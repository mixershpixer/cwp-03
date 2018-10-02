// server.js
const net = require('net');
const fs = require('fs');
const path = require('path');
const port = 8124;
let seed = 0;
let ARRQ = require('./qa.json');
let CLIENTS = [];
let connections = 0;
const log = fs.createWriteStream('client_id.txt');

const DEFAULT_DIR = process.env.DEFAULT_DIR;
const MAX_CONNECTIONS = parseInt(process.env.M_CONN);

const server = net.createServer((client) => {
	if (++connections >= MAX_CONNECTIONS + 1) { 
		console.log(`[${formatDate()}][WARNING]: For client no free slots!\n`);
		log.write(`[${formatDate()}][WARNING]: For client no free slots!\n`);
		connections--;
		client.destroy();
	} else {
		client.id = Date.now() + seed++;
		client.setEncoding('utf8');
		
		console.log(`[${formatDate()}]: Client #${client.id} connected\n`);
		log.write(`[${formatDate()}]: Client #${client.id} connected\n`);		
		
		client.on('data', (data) => {
			// console.log('recv: ' + data);
			if ((data === 'FILES') || (data === 'QA')) {
				if (data === 'FILES') fs.mkdir(DEFAULT_DIR + path.sep + client.id, () => {});
				CLIENTS[client.id] = data;
				client.write('ACK');
			}	
			else if (client.id === undefined) {
				client.write('DEC');
				client.destroy();
			}

			if ((CLIENTS[client.id] === 'QA') && (data !== 'QA')) {     	
				let answr = 'Bad answer';
				if (Math.floor(Math.random() * 2) === 1) {
					let QID = -1;
					for (let i = 0; i < ARRQ.length; i++)
						if (ARRQ[i].q === data) {
							QID = i;
							break;
						}
					answr = ARRQ[QID].g;
				}
				log.write(`[${formatDate()}][#${client.id}] > Data: ${data}; Answer: ${answr}\n`);
				client.write(answr);	
			} else if (CLIENTS[client.id] === 'FILES' && data !== 'FILES') {
				let x = data.split('₿');
				let buf = Buffer.from(x[0], 'hex');
				let filePath = DEFAULT_DIR + path.sep + client.id + path.sep + x[1];
				console.log(`CHECK: ${filePath}`);
				let fr = fs.createWriteStream(filePath);
				fr.write(buf);
				fr.close();
				client.write('NEXT');
			}
		});

		client.on('end', () => {
			connections--;
			console.log(`[${formatDate()}]: Client #${client.id} disconnected\n`);
			log.write(`[${formatDate()}]: Client #${client.id} disconnected\n`);
		});
	
	}
});

server.listen(port, () => {
	console.log(`Server listening on localhost:${port}`);
});

function formatDate() {
	return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
}