import Events from "./events"

export default class Websocket extends Events{

	constructor(config){
		super();
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
			this._connected = false;
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
			
			var connectpromise;
			if (!self._connection || self._connection.readyState != 1 || self._connection.state != 'open') //if no connection
			{
				if(self._url.indexOf('ws') === 0) {
					var connection = null;
					//In case of nodejs....
					connection = new WebSocket(self._url, 'connect');
					connection.onopen = self._onOpen;
					connection.onmessage = self._onMessage;
					connection.onclose = self._onClose;    
					connection.onerror = self._onError;
					connection._core = self._core;
					self._connection = connection;
					self._connected = true;//TODO, perhaps better to check if the connection really works
				}
				else {
					reject('Incorrect URL: ' + self._url);
				}
			}
			else {
				connection = self._connection;
			}
			resolve(connection);
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
	_onOpen(){
		this._core.websocket().trigger('connected');
	}
	
	_onMessage(message){
		this._core.websocket().trigger('message',message);
	}
	
	_onError(e){
		this._core.peerStore().clear();
		this._connected = false;
		this._core.websocket().trigger('error',e);
	}
	
	_onClose(event){
		this._core.websocket().trigger('closed',event);
		var code = event.code;
		var reason = event.reason;
		var wasClean = event.wasClean;
		
		var notice = 'WS disconnected: ' + code + reason;
		this._core.websocket().trigger('notice',notice);
		this._core.peerStore().clear();
		this._connected = false;
		var self = this;
		var restart = function(){
			try{
				self._core.websocket().trigger('notice','Trying to reconnect');
				self._core.websocket().disconnect();
			}
			catch(err){
				self._core.websocket().trigger('notice',err);
			}
			self._core.websocket().connect().then(function(d){
			   self._connection = d;
			}, function(e){
				self._core.websocket().trigger('notice',e);
			});
		};
		if (this._core._autoReconnect){
			window.setTimeout(restart,5000);
		}
	}
};