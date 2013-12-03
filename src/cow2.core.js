Cow.core = function(){};
Cow.core.prototype = 
{
    /*
    MYSPECS
    */
    _mySpecs: { //Contain
        _location:  null,   //
        _logontime: null   //timestamp
    },   
    
    
    
    /*PROJECTS*/
    _projectStore: _.extend(
        new Cow.syncstore('projects'),{
        _records: [],
        _recordproto:   function(_id){return new Cow.project({_id:_id});},
        _dbname:        'projects',
        getProjects:    function(){ //returns all projects
            return this._records;
        }, 
        getProject:     function(id){ //returns 1 project
            return this._getRecord(id);
        }, 
        addProject:     function(config){ //adds (and returns) 1 project
            return this._addRecord(config);
        }, 
        updateProject:  function(config){ //changes and returns 1 project
            return this.updateRecord(config);
        }
    }),
    
    projectStore:       function(){
        return this._projectStore;
    }, //returns the _projectstore object
    
    projects:       function(){
        return this._projectStore.getProjects();
    }, //returns the project objects
    
    /*PEERS*/
    _peers:             [], //array of peer
    getPeers:           function(){}, //returns all peer objects
    getPeer:            function(ID){}, //return 1 peer
    addPeer:            function(config){},
    updatePeer:         function(config){},
    removePeer:         function(ID){}, //remove peer from _peers
    getPeerExtents:     function(){}, //returns featurecollection of peerextents
    getPeerPositions:   function(){},//returns featurecollection of peerpositions
    
    /*USERS*/
    _userStore:  _.extend(
        new Cow.syncstore('users'), {
        _records: [],
        _recordproto:   function(){return new Cow.user();},     //prototype for record
        _dbname:        'users',
        getUsers:       function(){
            return this._records;
        },
        getUser:        function(id){
            return this._getRecord(id);
        },
        addUser:        function(config){ //returns record
            return this._addRecord(config);
        }, 
        updateUser:     function(config){ //returns record
            return this._updateRecord(config); 
        }
        
    }),
    userStore:      function(){
        return this._userStore;
    }, //returns the _userStore object
    users:       function(){
        return this._userStore.getUsers();
    }, //returns the user objects
    
    /*WEBSOCKET*/
    _websocket: {
        _connection: {
            //socket connection object
        },
        connect: function(URL){},
        disconnect: function(){},
        sendData: function(data, action, target){},
        _onMessage: function(d){},
        _onClose: function(e){},
        _onConnect: function(d){},
        _onError: function(e){}
        //... follows a whole set of internal functions that handle the COW message protocol
        // this could be called the 'heart' of the software 
    },
    websocket: function(){} //returns the _websocket object
};