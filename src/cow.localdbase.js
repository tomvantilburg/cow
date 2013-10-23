/**Thanks to jquery-indexeddb.js:
https://github.com/axemclion/jquery-indexeddb/blob/gh-pages/docs/README.md
**/


//var localdbase = {
$.Cow.LocalDbase.prototype = {
   _init: function(){
        //Init projects db
        var storeOptions = {
            "autoIncrement" : false,
            "keyPath": "uid"
		};
		$.indexedDB(this.options.dbname)
		    .objectStore("projects",storeOptions);
		//Init features db
		var tablename = core.activeproject();
		$.indexedDB(this.options.dbname)
		    .objectStore("projects",storeOptions);
    },

    //PROJECTS
    projectsdb: function(options) {
		switch(arguments.length) {
        case 0:
            return this._getProjects();
        case 1:
            if (!$.isArray(options)) {
                return this._addProject(options);
            }
        }
    },
    _addProject: function(project){
        var record = {};

        record.uid = project.options.uid;
        record.name = project.options.name;
        record.active = project.options.active;

        var request = $.indexedDB(this.options.dbname)
		    .objectStore("projects",false)
		    .put(record);
		 request.onerror = function(e){
            console.warn('Error adding: '+e);
         };

         return project;
    },
    _getProjects: function() {
        var self = this;
        var storeOptions = {
            "autoIncrement" : false,
            "keyPath": "uid"
		};

		var projectList = [];

        var promise = $.indexedDB(this.options.dbname)
		    .objectStore("projects",storeOptions)
		    .each(function(elem){
		        var options = {};
		        options.uid = elem.value.uid;
		        options.name = elem.value.name;
		        options.active = elem.value.active;

		        self.core.herds(options);
	        });
	    return promise;
    },
    removeherd: function(uid){
        //This will never happen....
        $.indexedDB(this.options.dbname)
		    .objectStore("herds",false)["delete"](uid);
    },
    //GROUPS
    groupsdb: function(group) {
		switch(arguments.length) {
        case 0:
            return this._getGroups();
        case 1:
            return this._addGroup(group);
        }
    },
    _addGroup: function(group){
        var record = {};
        record.uid = group.uid;
        record.name = group.name;
        record.members = group.members();
        record.groups = group.groups();
        var storeOptions = {
            "autoIncrement" : false,
            "keyPath": "uid"
		};
        var tablename = 'groups_' + this.core.activeherd();
        var request = $.indexedDB(this.options.dbname)
		    .objectStore(tablename,storeOptions)
		    .put(record);
		 request.fail = function(e){
		    console.warn(e.message);
         };
         return group;
    },
    _getGroups: function() {
        var self = this;
        var storeOptions = {
            "autoIncrement" : false,
            "keyPath": "uid"
		};
		var herdList = [];
		var tablename = 'groups_' + self.core.activeherd();
        var promise = $.indexedDB(this.options.dbname)
		    .objectStore(tablename,storeOptions)
		    .each(function(elem){
		        var options = {};
		        options.uid = elem.value.uid;
		        options.name = elem.value.name;
		        var project = self.core.getHerdById(self.core.activeherd());
		        var group = project.groups(options);
		        var members = elem.value.members || [];
		        var groups = elem.value.groups || [];
		        $.each(members,function(i,d){
                    group.members(d);
		        });
		        $.each(groups,function(i,d){
	                group.groups(d);
		        })
=======
		        self.core.projects(options);
>>>>>>> 1d9f24367930a1ea4fcbf5d19cdbf69125b080d0
	        });
	    return promise;
    },
    removeproject: function(uid){
        //This will never happen....
        $.indexedDB(this.options.dbname)
		    .objectStore("projects",false)["delete"](uid);
    },
    
    //ITEMS
    featuresdb: function(options) {
        var self = this;
		switch(arguments.length) {
        case 0:
            return this._getFeatures();
        case 1:
            if (!$.isArray(options)) {
                return this._addFeature(options);
            }
        }
    },
    
    _getFeatures: function(){
        var core = this.core;
        var self = this;
		this.storeOptions = {
            "autoIncrement" : false,
            "keyPath": "key"
		};
		var tablename = core.activeproject();
		var dbname = this.options.dbname;
		var expirytime = this.options.expirytime;
		var myFeatureList = [];
		var fids = [];
		var iteration = $.indexedDB(dbname)
		    .objectStore(tablename,this.storeOptions)
		    .each(function(elem){
                //array for use in map
                var item = new Object();
                item.key 	 = elem.value.key; 	
                item.uid 	 = elem.value.uid; 	
                item.created = elem.value.created; 
                item.updated = elem.value.updated;
                item.status  = elem.value.status; 
                item.feature = elem.value.feature;
                var d_creation = new Date(item.updated)
                var d_now = new Date();
                var d_diff = (d_now - d_creation)/1000; //(age in seconds)
                
                if (item.feature.properties && item.feature.properties.key
                    && !(tablename == 666 && d_diff > expirytime)){
                    core.featurestore().featureItems({data: item, source: 'db'});
                    var iditem = {};
                    iditem.key = item.key;
                    iditem.updated = item.updated;
                    iditem.status = item.status;
                    fids.push(iditem);
                    //myFeatureList.push(item);
                }
                else { //We can safely remove items that are over their expiry date
                    self.removeFeature(item.key);
                }
            });    
		iteration.done(function(){
		    //Callback that will fill featurestore
		    //core.featurestore().fill(myFeatureList);
		    self.core.trigger('storeChanged');
		    var message = {};
            message.fids = fids;
            message.storename = self.core.activeproject();
		    self.core.websocket().sendData(message, "newPeerFidList");
		});
		iteration.fail(function(e){
		    throw "Problem loading local indexeddb";        
		});
		return iteration;
    },
    
    _addFeature: function(item){
        var core = this.core;
        var tablename = core.activeproject();
		var newRecord = {};
		newRecord.key = item.key;
		newRecord.uid = item.uid;
		newRecord.created = item.created;
		newRecord.updated = item.updated;
		newRecord.status = item.status;
		newRecord.feature = item.feature;
		var d_creation = new Date(item.updated);
        var d_now = new Date();
        var d_diff = (d_now - d_creation)/1000; //(age in seconds)
        if (!(tablename == 666 && d_diff > this.options.expirytime)){
            $.indexedDB(this.options.dbname)
                .objectStore(core.activeproject(),false)
                .put(newRecord)//Advantage of putting is that we overwrite old features with same key
                .then(function(){
                    //console.log("Data added");
                }, function(e){
                    console.log("Error adding data " + e);
                });
        }
        
    },
    
    removeFeature: function(fid) {
        $.indexedDB(this.options.dbname)
		    .objectStore(core.activeproject(),false)["delete"](fid);
    },
}

