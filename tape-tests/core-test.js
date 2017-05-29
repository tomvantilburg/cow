var tape = require("tape"),
	cow = require("../dist/cow2"),
	lzwCompress = require('lzwcompress');

var core;

tape('Can create core', function (t) {
  t.doesNotThrow(function () {
    core = new cow.Core({
		herdname: 'test'
	});
  });
  t.end();
});