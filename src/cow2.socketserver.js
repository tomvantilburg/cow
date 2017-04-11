import Record from "./cow2.record";

export default class Socketserver extends Record{
	
	constructor(config){
		super(config);
		this._id = config._id  || Cow.utils.idgen();;
		this._store = config.store;
		this._core = this._store._core;
		this._maxAge = this._core._maxAge;
	}
	url(){
		var protocol = this.data('protocol');
		var ip = this.data('ip');
		var port = this.data('port');
		var dir = this.data('dir') || '' ;
		return protocol + '://' + ip + ':' + port + '/' + dir;  
	}
};