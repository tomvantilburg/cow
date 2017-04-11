var tape = require('tape');

Cow = require('../dist/cow2');

var item = new Cow.Item({_id:1});

tape('not throwing up', function (t) {
  t.doesNotThrow(function () {
    item.id();
  });
  t.end();
});

tape('idIsString', function(t) {
    var expected = '1';
    var actual = item.id();
	t.equal(expected,actual);
	t.end();
});