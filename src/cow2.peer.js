import Record from "./cow2.record";

export default class Peer extends Record{
	constructor(config){
		super(config);
		this._id = config._id  || Cow.utils.idgen();
		this._store = config.store;
		this._core = this._store._core;
		this._data = {
			userid:null, 
			family: 'alpha' //default is alpha
		};
	}

	/**
		user() - return id of currently connected user
		user(id) - sets id of currently connected user, returns peer object
	**/
	user(id){
		if (id){
			return this.data('userid',id).sync();
		}
		if (this.data('userid')){
		  var userid = this.data('userid');
		  return this._core.users(userid);
		}
		return null;
	}
	username(){
		if (this.user()){
			return this.user().data('name');
		}
		else {
			return null;
		}
	}
};