import Record from "./cow2.record";

export default class Item extends Record{
	
	constructor(config){
		super(config);
		this._id = config._id  || cow.Utils.idgen();
		this._store = config.store;
    }
    /**
        Function to get or set the permissions:
        permissions() will return an array with all permissions set on this item
        permissions('type') will return an array with the permission of type 'type'
        permissions('type',group) will add the group to the permissions 
            of type 'type' (and create permission of type 'type' if needed), returns item
        permissions('type',[group]) will add the array of groups to the permissions 
            of type 'type' (and create permission of type 'type' if needed), returns item
    */
    permissions(type,groups) {
        var self = this;
        switch(arguments.length) {
        case 0:
            return self.data('permissions') || [];
        case 1:
            if(typeof type === "string") {
                return self._permissionsByType(type);
            }
            else {
                throw('type should be a string');
            }
            break;
        case 2: 
            if(typeof type === "string") {
                return self._setPermission(type, groups);
            }
            else {
                throw('type should be a string');
           }
           break;
        default:
            throw('wrong argument number');
        }
    
    }
    _permissionsByType(type) {
        var permissions = this.permissions();
        var returnval = null;
        for (var i=0;i<permissions.length;i++){
            var permission = permissions[i];
            if (permission.type == type){
                returnval = permission;
            }
        }
        return returnval;
    }
    _setPermission(type,groups) {
        var self = this;
        var permission = this._permissionsByType(type);
        var permissions = this.permissions();
        if (!permission) {
            //new type
            if(!Array.isArray(groups)) {
                //single group
                permission = {'type':type,'groups':[groups]};
            }
            else {
               permission = {'type':type,'groups':groups};
            }
            permissions.push(permission);
        }
        else {
            if(!Array.isArray(groups)&&!self.permissionHasGroup(type,groups)) {
                //1 group that is not in permissionlist yet
                permission.groups.push(groups);
            }
            else {
                for (var i=0;i<groups.length;i++){
                    if(!self.permissionHasGroup(type,groups[i])) {
                        permission.groups.push(groups[i]);
                    }
                }
            }
        }
        this.data('permissions', permissions);
        return this;
    }
    /**
        permissionsHasGroup(type <string>,group <string>) - function to check if a particular type contains a particular group
            returns true if it is the case, false in all other cases
    **/
    permissionHasGroup(type,group) {
        var permission  = this.permissions(type);
        var ingroups = [];
        if (group && Array.isArray(group)){
                ingroups = group;
        }
        else if (group){
            ingroups.push(group);
        }
        if(!permission) {
            return false;
        }
        else {
            var groups = permission.groups;
            if(groups.length === 0) {
                return false;
            }
            else {
                var doeshave = false;
                for (var i=0;i<groups.length;i++){
                    for (var j=0;j<ingroups.length;j++){
                       if (groups[i] == ingroups[j]){
                           doeshave = true;
                       }
                    }
                }
                return doeshave;
            }
        }
    }
    /**
        hasPermission(<string>) - check to see if current user has <string> permission on item
    **/
    hasPermission(type) {
        var core = this._store._core;
        var user = core.user().id();
        //TODO: use the new function
        var project = core.projects(this._store._projectid);
        var groups  = project.groups();
        var hasperm = false;
        var permittedgroups = this.permissions(type);
        if (permittedgroups){
            for (var i=0;i<permittedgroups.groups.length;i++){
                var value = permittedgroups.groups[i];
                if((project.groups(value) !== undefined) &&(project.groups(value).hasMember(user))) {
                    hasperm = true;
                }
            }
        }
        return hasperm;
    }
    /**
        function to remove a group from an permission type, or the entire type
        removePermission('type') removes the entire permission type from the item
        removePermission('type',[groups]) removes the groups from the permission type
    */
    removePermission(type,groups) {
        var index, permission, permissions, i;
        switch(arguments.length) {
        case 0:
            throw("this function doesn't take no arguments");
        case 1:
            if(typeof type === "string") {
                index = null;
                permissions = this.permissions();
                for (i=0;i<permissions.length;i++){
                    permission = permissions[i];
                    if(permission.type == type) {
                        index = i;
                    }
                }
                if(index >= 0) {
                    permissions.splice(index,1);
                }
                this.data('permissions', permissions);
                return this;
            }
            else {
                throw('type should be a string');
            }
            break;
        case 2: 
            if(typeof type === "string") {
                permissions = this.permissions();
                for (i=0;i<permissions.length;i++){
                    permission = permissions[i];
                    if(permission.type == type) {
                        index = i;
                    }
                }
                //TODO, this is prone to errors
                permission = permissions[index];
                if(permission) {
                    var pgroups = permission.groups;
                    if(pgroups.length >= 0) {
                        if(!Array.isArray(groups)) {
                            index = null;
                            for (i=0;i<pgroups.length;i++){
                                if(pgroups[i] == groups) {            
                                    index = i;
                                }            
                            }
                            if(index >= 0) {
                                pgroups.splice(index,1);
                            }
                        }
                        else {
                            for (i=0;i<groups.length;i++){                            
                                index = null;
                                for (j=0;j<pgroups.length;j++){
                                    if(pgroups[j] == groups[i]) {            
                                        index = j;
                                    }                                    
                                }
                                if(index >= 0) {
                                    pgroups.splice(index,1);
                                }
                            }
                        }
                    }
                    permission.groups = pgroups;
                    this.data('permissions',permissions);
                }
                return this;
            }
            else {
                throw('type should be a string');
            }
            break;
        default:
            throw('wrong argument number');
        }
    }
}
//_.extend(Cow.item.prototype, Cow.record.prototype);
