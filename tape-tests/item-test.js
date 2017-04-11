var tape = require("tape"),
	cow = require("../dist/cow2");

var item;

tape('Can create item', function (t) {
  t.doesNotThrow(function () {
    item = new cow.Item({_id:1});
  });
  t.end();
});

tape('idIsString', function(t) {
    var expected = '1';
    var actual = item.id();
	t.equal(expected,actual);
	t.end();
});

