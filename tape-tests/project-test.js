var tape = require("tape"),
	cow = require("../dist/cow2");
debugger;
var core;
var project;

tape('Can create core', function (t) {
  t.doesNotThrow(function () {
	core = new cow.Core({herdname: 'test'});
  });
  t.end();
});

tape('Can create a valid project', function (t) {
  t.doesNotThrow(function () {
    project = core.projects({_id:1});
    project.id();
    
  });
  t.end();
});

tape('idIsString', function(t) {
    var expected = '1';
    var actual = project.id();
	t.equal(expected,actual);
	t.end();
});

