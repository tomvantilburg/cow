(function(){

var root = this;
if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = Cow || {};
    }
    exports.Cow = Cow || {}; 
} else {
    root.Cow = Cow || {};
}

Cow.websocket = function(config){
    this._core = config.core;
    //socket connection object
    this._url = config.url;
    this._connection = null; //obs this.connect();
    this._connected = false;
};



    /**
        disconnect() - disconnect us from websocket server
    **/
Cow.websocket.prototype.disconnect = function() {
    if (this._connection){
        this._connection.close();    
        this._connection = null;
    }
    else { 
        console.log('No websocket active');
    }
};
    /**
        connect(url) - connect to websocket server on url, returns connection
    **/
Cow.websocket.prototype.connect = function() {
    var self = this;
    var core = this._core;
    if (core.socketserver()){
        this._url = core.socketserver().url(); //get url from list of socketservers
    }
    
    if (!this._url) {
        console.warn('Nu URL given to connect to. Make sure you give a valid socketserver id as connect(id)');
        return false;
    }

    if (!this._connection || this._connection.readyState != 1 || this._connection.state != 'open') //if no connection
    {
        if(this._url.indexOf('ws') === 0) {
            var connection = null;
            //In case of nodejs....
            if (typeof exports !== 'undefined') {
                connection = new WebSocket();
                connection.on('connectFailed', function(error) {
                    console.log('Connect Error: ' + error.toString());
                });
                connection.on('connect', function(conn) {
                    console.log('WebSocket client connected');
                    conn.on('error', self._onError);
                    conn.on('close', self._onClose);
                    conn.on('message', function(message) {
                        if (message.type === 'utf8') {
                            //console.log("Received: '" + message.utf8Data + "'");
                            self._onMessage({data:message.utf8Data});
                        }
                    });
                    conn.obj = self;
                    self._connection = conn;
                });
                //TODO: there is some issue with the websocket module,ssl and certificates
                //This param should be added: {rejectUnauthorized: false}
                //according to: http://stackoverflow.com/questions/18461979/node-js-error-with-ssl-unable-to-verify-leaf-signature#20408031
                connection.connect(this._url, 'connect');
            }
            //Just in-browser websocket
            else {
                connection = new WebSocket(this._url, 'connect');
                //connection.onopen = this._onOpen;
                connection.onmessage = this._onMessage;
                connection.onclose = this._onClose;    
                connection.onerror = this._onError;
                connection._core = this._core;
                this._connection = connection;
            }
        }
        else {throw('Incorrect URL: ' + this._url);}
    }
    else {
        connection = this._connection;
    }
    return connection;
};
    /**
        connection() - returns connection object
    **/
Cow.websocket.prototype.connection = function(){
    return this._connection;
};    
    /**
        sendData(data, action, target) - send data to websocket server with params:
            data - json object
            action - string that describes the context of the message
            target - (optional) id of the target peer
    **/
Cow.websocket.prototype.sendData = function(data, action, target){
    //TODO: check if data is an object
    var message = {};        
    message.sender = this._core.peerid();
    message.target = target;
    message.action = action;
    message.payload = data;
    var stringified;
    try {
        stringified = JSON.stringify(message);
    }
    catch (e){
        console.error(e, message);
    }
    if (this._connection && (this._connection.readyState == 1 || this._connection.state == 'open')){
        console.log('Sending ',message);
        this._connection.send(JSON.stringify(message));
    }
    else{
        //console.warn('Could not send, socket not connected?');
    }
};
Cow.websocket.prototype._onMessage = function(message){
    var core = this._core;
    var data = JSON.parse(message.data); //TODO: catch parse errors
    var sender = data.sender;
    var PEERID = core.peerid(); 
    var action = data.action;        
    var payload = data.payload;    
    var target = data.target;
    if (sender != PEERID){
        console.log('Receiving ',data);
    }
    switch (action) {
    /**
        Commands 
    **/
        case 'command':
            if (sender != PEERID){
                this._core.websocket()._onCommand(data);
            }
        break;
    /**
        Messages related to the websocket connection
    **/
        //websocket confirms connection by returning the unique peerID (targeted)
        case 'connected':
            this._core.websocket()._onConnect(payload);
        break;
        
        //websocket tells everybody a peer has gone, with ID: peerID
        case 'peerGone':
            this._core.websocket()._onPeerGone(payload);
        break;      
    
    /**
        Messages related to the syncing protocol
    **/
        //a new peer has arrived and gives a list of its records
        case 'newList':
            if(sender != PEERID) {
                this._core.websocket()._onNewList(payload,sender);
            }
        break;
        //you just joined and you receive info from the alpha peer on how much will be synced
        case 'syncinfo':
            if(sender != PEERID) {
                this._core.websocket()._onSyncinfo(payload,sender);
            }
        break;
        //you just joined and you receive a list of records the others want (targeted)
        case 'wantedList':
            if(target == PEERID) {
                this._core.websocket()._onWantedList(payload);
            }
        break;
        
        //you just joined and receive the records you are missing (targeted)
        case 'missingRecords':
            if(target == PEERID) {
                this._core.websocket()._onMissingRecords(payload);
            }   
        break;
        
        //a new peer has arrived and sends everybody the records that are requested in the *wantedList*
        case 'requestedRecords':
            if(sender != PEERID) {
                this._core.websocket()._onMissingRecords(payload);
                //OBS: this._onRequestedRecords(payload);
            }
        break;
    /**
        Messages related to real-time changes in records
    **/
        //a peer sends a new or updated record
        case 'updatedRecord':
            if(sender != PEERID) {
                this._core.websocket()._onUpdatedRecords(payload);
            }
        break;
        
    }
    
};
Cow.websocket.prototype._onClose = function(event){
    var code = event.code;
    var reason = event.reason;
    var wasClean = event.wasClean;
    var self = this;
    //this.close(); //FIME: TT: why was this needed?
    this._core.peerStore().clear();
    this._connected = false;
    //TODO this._core.trigger('ws-disconnected');    
    var restart = function(){
        try{
            self._core.websocket().disconnect();
        }
        catch(err){
            console.warn(err);
        }
        self._connection = self._core.websocket().connect();
    };
    setTimeout(restart,5000);
};
Cow.websocket.prototype._onConnect = function(payload){
    this._connected = true;
    var self = this;
    this._core.peerid(payload.peerID);
    var mypeer = this._core.peers({_id: payload.peerID});
    var version = payload.server_version;
    var serverkey = payload.server_key;
    
    if (serverkey !== undefined && serverkey != this._core._herdname){
        self.disconnect();
        return;
    }
        
    //add userid to peer object
    if (this._core.user()){
        mypeer.data('userid',this._core.user()._id);
    }
    mypeer.deleted(false).sync();
    this.trigger('connected',payload);
    
    //initiate socketserver sync
    this._core.socketserverStore().sync();
    
    //initiate peer sync
    this._core.peerStore().sync();

    //initiate user sync
    this._core.userStore().sync();
    
    //initiate project sync
    var projectstore = this._core.projectStore();
    projectstore.sync();
    
    //wait for projectstore to load
    projectstore.loaded.then(function(d){
        var projects = self._core.projects();
        for (var i=0;i<projects.length;i++){
            var project = projects[i];
            self._core.projects(project._id).itemStore().sync();
            self._core.projects(project._id).groupStore().sync();
        }
    });
};
    
    
    //A peer has disconnected, remove it from your peerList
Cow.websocket.prototype._onPeerGone = function(payload) {
    var peerGone = payload.gonePeerID.toString();
    if (this._core.peers(peerGone)){
        this._core.peers(peerGone).deleted(true).sync();
    }
    //this._core.peerStore().removePeer(peerGone);        
    //TODO this.core.trigger('ws-peerGone',payload); 
};
Cow.websocket.prototype._onError = function(e){
    this._core.peerStore().clear();
    this._connected = false;
    console.warn('error in websocket connection: ' + e.type);
};
Cow.websocket.prototype._getStore = function(payload){
    var storetype = payload.syncType;
    var projectid = payload.project;
    var project;
    switch (storetype) {
        case 'peers':
            return this._core.peerStore();
        case 'socketservers':
            return this._core.socketserverStore();
        case 'projects':
            return this._core.projectStore();
        case 'users':
            return this._core.userStore();
        case 'items':
            if (!projectid) {throw('No project id given');}
            if (this._core.projects(projectid)){
                project = this._core.projects(projectid);
            }
            else {
                project = this._core.projects({_id:projectid});
            }
            return project.itemStore();
        case 'groups':
            if (!projectid) {throw('No project id given');}
            if (this._core.projects(projectid)){
                project = this._core.projects(projectid);
            }
            else {
                project = this._core.projects({_id:projectid});
            }
            return project.groupStore();
    }
};
    
//A peer initiates a sync
Cow.websocket.prototype._onNewList = function(payload,sender) {
    var self = this;
    //Only answer if we are the alpha peer
    if (this._amIAlpha()){
        var store = this._getStore(payload);
        var project = store._projectid;
        var syncobject = store.compareRecords({uid:sender, list: payload.list});
        var data;
        //Give the peer information on what will be synced
        var syncinfo = {
            IWillSent: _.pluck(syncobject.pushlist,"_id"),
            IShallReceive: _.pluck(syncobject.requestlist,"_id") 
        };
        data = {
            "syncType" : payload.syncType,
            "project" : project,
            "syncinfo" : syncinfo
        };
            
        this.sendData(data, 'syncinfo',sender);
        
        data =  {
            "syncType" : payload.syncType,
            "project" : project,
            "list" : syncobject.requestlist
        };
        this.sendData(data, 'wantedList', sender);
        
        data =  {
            "syncType" : payload.syncType,
            "project" : project,
            "list" : syncobject.pushlist
        };
        /** TT: IIS/signalR can't handle large chunks in websocket.
        Therefore we sent the records one by one. This slows down the total but should be 
        more stable **/
        _(data.list).each(function(d){
            msg = {
                "syncType" : payload.syncType,
                "project" : project,
                "record" : d
            };
            self.sendData(msg, 'updatedRecord', sender);
        });
        //this.sendData(data, 'missingRecords', sender);
    }
};
Cow.websocket.prototype._amIAlpha = function(){ //find out wether I am alpha
    /** 
    peers all have a unique id from the server based on the timestamp
    the peer with the oldest timestamp AND member of the alpha familty is alpha
    **/
    var returnval = null;
    //First only get alpha peers
    var alphaPeers = _.sortBy(
        _.filter(this._core.peers(),function(d){
            return (d.data('family') == 'alpha' && !d.deleted());
        }),
     function(d){return d.created();});
    //If we are the oldest of alpha peers
    var oldestpeer = alphaPeers[0];
    var me = this._core.peer();
    if (me.created() == oldestpeer.created()) {//yes, I certainly am (the oldest) 
        returnval =  true;
    }
    else { 
        returnval = false; //Not the oldest in the project
    }
    return returnval;
};

Cow.websocket.prototype._onSyncinfo = function(payload) {
    var store = this._getStore(payload);
    store.syncinfo.toReceive = payload.syncinfo.IWillSent;
    store.syncinfo.toSent = payload.syncinfo.IShallReceive;
};

Cow.websocket.prototype._onWantedList = function(payload) {
    var self = this;
    var store = this._getStore(payload);
    var returnlist = store.requestRecords(payload.list);
    var data =  {
        "syncType" : payload.syncType,
        "project" : store._projectid,
        "list" : returnlist
    };
    /** TT: IIS/signalR can't handle large chunks in websocket.
        Therefore we sent the records one by one. This slows down the total but should be 
        more stable **/
    _(data.list).each(function(d){
        msg = {
            "syncType" : payload.syncType,
            "project" : store._projectid,
            "record" : d
        };
        self.sendData(msg, 'updatedRecord');
    });
    //this.sendData(data, 'requestedRecords');
    //TODO this.core.trigger('ws-wantedList',payload); 
};
    
Cow.websocket.prototype._onMissingRecords = function(payload) {
    var store = this._getStore(payload);
    var list = payload.list;
    var synclist = [];
    var i;
    for (i=0;i<list.length;i++){
        var data = list[i];
        //var record = store._addRecord({source: 'WS', data: data});
        var record = store._addRecord({source: 'WS', data: data});
        //if we receive a new project, we also have to get the items and groups in it
        if (store._type == 'projects'){
            record.groupStore().sync();
            record.itemStore().sync();
        }
        //Do the syncing for the deltas
        if (data.deltas && record.deltas()){
            var localarr = _.pluck(record.deltas(),'timestamp');
            var remotearr = _.pluck(data.deltas,'timestamp');
            var diff = _.difference(localarr, remotearr);
            //TODO: nice solution for future, when dealing more with deltas
            //For now we just respond with a forced sync our own record so the delta's get synced anyway
            if (diff.length > 0){
                synclist.push(record);
            }
        }
    }
    for (i=0;i<synclist.length;i++){
        store.syncRecord(synclist[i]);
    }
    store.trigger('datachange');
};
  
Cow.websocket.prototype._onUpdatedRecords = function(payload) {
    var store = this._getStore(payload);
    var data = payload.record;
    store._addRecord({source: 'WS', data: data});
    //TODO: _.without might not be most effective way to purge an array
    store.syncinfo.toReceive = _.without(store.syncinfo.toReceive,data._id); 
    store.trigger('datachange');
};
    // END Syncing messages
    
    
    /**
        Command messages:
            commands are ways to control peer behaviour.
            Commands can be targeted or non-targeted. Some commands are handled here (all purpose) but all commands
            will send a trigger with the command including the message data.
    **/
Cow.websocket.prototype._onCommand = function(data) {
    var core = this._core;
    var payload = data.payload;
    var command = payload.command;
    var targetuser = payload.targetuser;
    var params = payload.params;
    this.trigger('command',data);
    //TODO: move to icm
    if (command == 'zoomTo'){
        if (targetuser && targetuser == core.user().id()){
            this.trigger(command, payload.location);
        }
    }
    //Closes a (misbehaving or stale) peer
    if (command == 'kickPeer'){
        if (targetuser && targetuser == core.peerid()){
            //TODO: make this more gentle, possibly with a trigger
            window.open('', '_self', ''); 
            window.close();
        }
    }
    //Remove all data from a peer
    if (command == 'purgePeer'){
        if (targetuser && targetuser == this._core.peerid()){
            _.each(core.projects(), function(d){
                d.itemStore().clear();
                d.groupStore().clear();
            });
            core.projectStore().clear();
            core.userStore().clear();
        }
    }
    //Close project and flush the items and groups in the project (use with utter caution!) 
    if (command == 'flushProject'){
        var projectid = payload.projectid;
        var project;
        if (core.projects(projectid)){
            project = core.projects(projectid);
            project.itemStore().clear(); //remove objects from store
            project.itemStore()._db.main.clear(); //remove records from db
        }
    }
    //Answer a ping with a pong
    if (command == 'ping'){
        var target = data.sender;
        this.sendData({command: 'pong'},'command',target);
    }
};

//Adding some Backbone event binding functionality to the store
_.extend(Cow.websocket.prototype, Events);
}.call(this));