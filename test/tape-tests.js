var test = require('tape');
var tapSpec = require('tap-spec');
/*
test.createStream()
  .pipe(tapSpec())
  .pipe(process.stdout);
*/
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


test('not throwing up', function (t) {
  t.doesNotThrow(function () {
    cow.project();
  });
  t.end();
});

test('idIsString', function(t) {
    var expected = '1';
    var actual = testproject.id();
	t.equal(expected,actual);
	t.end();
});


test('recordIsMine', function(t) {
	var expected = testuser;
	var actual = testproject.creator();
	t.equal(actual,expected);
	t.end();
});


test('produce 100 deltas in project', function(t){
	var promisearray = [];
	for (var i=0;i<100;i++){
		promisearray.push(testproject.data('counter',i).touch().sync());
	}
	//Promise.all(promisearray).then(d=>{
			var expected = 100;
			var actual = testproject.deltas().length;
			t.equal(actual,expected);
			t.end();
	//});
});