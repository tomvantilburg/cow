import Record from "./cow2.record";

export default class User extends Record{
	
	constructor(config){
		super(config);
		//if (!config._id) {throw 'No _id given for user';}
		this._id = config._id  || Cow.utils.idgen();;
		this._store = config.store;
	}
    /**
        isActive() - returns wether or not the user is connected to a peer at the moment
        TT: Might be obsolete, was used by core.activeUsers()
    **/
    isActive(){
        var returnVal = false;
        var peers = this._store._core.peers();
        for (var i = 0;i < peers.length;i++){
            if (peers[i].user() == this._id && !peers[i].deleted()){
                returnVal = true;
            }
        }
        return returnVal;
    }
    /**
        groups() - returns an array of groups that the user is member of
    **/
    groups(){
        var core = this._store._core;
        var returnArr = [];
        if (!core.project()){
            console.warn('No active project');
            return null;
        }
        var groups = core.project().groups();
        for (var i = 0;groups.length;i++){
            if (groups[i].hasMember(core.user().id())){
                returnArr.push(groups[i]);
            }
        }
        return returnArr;
    }
};