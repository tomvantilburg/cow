export default class Websocket{
	
	constructor(config){
		this._core = config.core;
		this._url = config.url;
		this._connection = null;
		this._connected = false;
	}

    /**
        disconnect() - disconnect us from websocket server
    **/
	disconnect() {
		if (this._connection){
			this._connection.close();    
			this._connection = null;
		}
	}

    /**
        connect(url) - connect to websocket server on url, returns connection
    **/
	connect() {
		var self = this;
		var core = this._core;
		var promise = new Promise(function(resolve, reject){
			if (core.socketserver()){
				self._url = core.socketserver().url(); //get url from list of socketservers
			}
			else {
				self._url = null;
				reject('No valid socketserver selected');
			}
			
			if (!self._url) {
				reject('No URL given to connect to. Make sure you give a valid socketserver id as connect(id)');
			}
		
			if (!self._connection || self._connection.readyState != 1 || self._connection.state != 'open') //if no connection
			{
				if(self._url.indexOf('ws') === 0) {
				  try {
					var connection = null;
					connection = new WebSocket();
					connection.on('connectFailed', function(error) {
						reject('Connect Error: ' + error.toString());
					});
					connection.on('connect', function(conn) {
						conn.on('error', self._onError);
						conn.on('close', function(){
							core.websocket().trigger('notice','socket closed');
						});
						conn.on('message', function(message) {
							if (message.type === 'utf8') {
								//console.log("Received: '" + message.utf8Data + "'");
								self._onMessage({data:message.utf8Data});
							}
						});
						conn.obj = self;
						self._connection = conn;
						resolve(self._connection);
					});
					//TODO: there is some issue with the websocket module,ssl and certificates
					//This param should be added: {rejectUnauthorized: false}
					//according to: http://stackoverflow.com/questions/18461979/node-js-error-with-ssl-unable-to-verify-leaf-signature#20408031
					connection.connect(self._url, 'connect');
				  }
				  catch (e){
					  reject(e);
				  }
				}
				else {
					reject('Incorrect URL: ' + self._url);
				}
			}
			else {
				connection = self._connection;
				resolve(self._connection);
			}
			
		});
		return promise;
	}
    /**
        connection() - returns connection object
    **/
	connection(){
		return this._connection;
	}

	send(message){
		if (this._connection && (this._connection.readyState == 1 || this._connection.state == 'open')){
			this._connection.send(message);
		}
	}

	_onMessage(message){
		this._core.websocket().trigger('message',message);
	}

	_onError(e){
		this._core.peerStore().clear();
		this._connected = false;
		this._core.websocket().trigger('error','error in websocket connection: ' + e.type);
	}

	_onClose(event){
		this.trigger('notice','socket closed');
	}
};