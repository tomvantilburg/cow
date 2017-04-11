import Record from "./cow2.record";
import Syncstore from "./cow2.syncstore";

export default class Project extends Record{
	constructor(config){
		super(config);
		var self = this;
		this._id = config._id  || cow.Utils.idgen();;
		this._store = config.store;
		this._core = this._store._core;
		this._maxAge = this._core._maxAge;
		
		var dbname = 'groups';
		this._groupStore = new cow.Syncstore({
			dbname: dbname, 
			noIDB: false, 
			core: self._core, 
			maxAge: this._maxAge,
			recordproto: function(_id){return new cow.Group({_id: _id, store: this});},
			type: 'groups',
			projectid: this._id
		});
		
		dbname = 'items';
		this._itemStore = new cow.Syncstore({
			dbname: dbname, 
			noIDB: false, 
			core: self._core, 
			maxAge: this._maxAge,
			recordproto:   function(_id){return new cow.Item({_id: _id, store: this});},
			projectid: this._id,
			type: 'items'
		});
	};

    /**
        close(bool) - closes the project locally
            Since we don't want to sync the closed status it is written seperately to the database.
    **/
    closed(truefalse){
        if (truefalse !== undefined){
            this._closed = truefalse;
            var data = this.deflate();
            data.closed = this._closed;
            this._store._db_write({source: 'UI', data: data});
            return this;
        }
        else {
            return this._closed;
        }
    }
    /**
        groupStore() - return groupStore object
    **/
    groupStore(){
        return this._groupStore;
    }
    /**
        groups() - return array of group objects
        groups(id) - returns group with id
        groups({options}) - creates and returns group object
    **/
    groups(data){
           return this._groupStore.records(data);
    }
    /**
        itemStore() - return itemStore object
    **/
    itemStore(){
        return this._itemStore;
    }
    /**
        items() - return array of item objects
        items(id) - returns item with id
        items({options}) - creates and returns item object
    **/
    items(data){
        return this._itemStore.records(data);
    }
    /**
        myGroups() - return the group objects that I am member of
    **/
    myGroups(){
        var groups = this.groups();
        var myid = this._core.user().id();
        var mygroups = [];
        for (var i=0;i<groups.length;i++){
            var group = groups[i];
            if (group.hasMember(myid)){
                mygroups.push(group.id());
            }
        }
        return mygroups;
    }
};