// cow-spec.js
//'use strict';

var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);



var expect = chai.expect;

_ = require('../node_modules/underscore/underscore.js')._;
Events = require('../src/events.js');
lzwCompress = require('lzwcompress');
Cow = require('../dist/cow.nodb.js');

var cow = new Cow.core({
			herdname: 'test',
			maxage: 1000 * 60 * 60 * 24 * 30 //30 days
		 });

//Preparing a cow population for testing
var testuser = cow.users({_id: 'testuser'}).sync();
cow.user('testuser');
var testproject = cow.projects({_id: 1,_data: {foo: 'baz'}}).sync();
var testsocketserver = cow.socketservers({
    _id: 'default',
    data: {protocol:'wss',ip:'websocket.geodan.nl', port:443, dir: 'geofort'}
});
cow.socketserver('default');


//STARTING CHAI TESTS
describe('Cow', function() {
    it('should exist', function() {
        expect(cow).to.not.be.undefined;
    });
});

describe('#idIsString()', function() {
    it('new project should return string as ID', function() {
    	var expected = '1';
        var actual = testproject.id();
        expect(actual).to.eql(expected);
    });
});

describe('#recordIsMine()', function() {
    it('owner of new project should be same as active user', function() {
    	var expected = testuser;
        var actual = testproject.creator();
        expect(actual).to.eql(expected);
    });
});
var tmp;
describe('#canConnect()', function() {
    it('able to connect to cash server', function() {
        var promise = cow.connect();
        expect(promise).to.eventually.be.fulfilled;
    });
});