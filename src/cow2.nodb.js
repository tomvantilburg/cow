export default class Localdb{ 
	constructor(config){
		var self = this;
		this._dbname = config.dbname;
		this._core = config.core;
		this._db = null;
		var version = 2;
		
		var dbUrl = "NO DB WILL BE USED";
		if (!dbUrl){
			throw('No global dbUrl set. Should be like: "tcp://user:pass@ip/dir"');
		}
		this._schema = self._dbname;
		this._openpromise = new Promise(function(resolve, reject){
			resolve();
		});
	}
	
	write(config){
		var self = this;
		var storename = config.storename;
		var record = config.data;
		var projectid = config.projectid;
		record._id = record._id.toString();
		record.projectid = projectid;
		var promise = new Promise(function(resolve, reject){
			  resolve();
		});
		return promise;
	}
	
	//This is different from the idb approach since we don't care about the transaction in postgres
	//We just redirect every record to a .write function
	writeAll(config){
		var self = this;
		var storename = config.storename;
		var list = config.data;
		var projectid = config.projectid;
		var promisearray = [];
		for (var i = 0;i< list.length;i++){
			var record = list[i];
			var subpromise = this.write({
				storename: storename,
				projectid: projectid,
				data: record
			});
			promisearray.push(subpromise);
		}
		var promise = Promise.all(promisearray);
		return promise;
	}
	
	getRecord(config){
		var self = this;
		var storename = config.storename;
		var id = config.id;
		
		var promise = new Promise(function(resolve, reject){
			  resolve();
		});
		return promise;
		
	}
	
	getRecords(config){
		var self = this;
		var storename = config.storename;
		var projectid = config.projectid;
		var query;
	
		var promise = new Promise(function(resolve, reject){
			resolve([]);
		});
		return promise;
	}
	
	delRecord(config){
		var promise = new Promise(function(resolve, reject){
				//console.warn('delRecord not used with postgres');
				reject();
		});
		return promise;
	}
};
