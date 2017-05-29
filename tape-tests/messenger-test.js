var tape = require("tape"),
	cow = require("../dist/cow2"),
	lzwCompress = require('lzwcompress');

tape('should lzw encode/decode something', function (t) {
	const input = 'Een string';
	var encoded = lzw_encode(input);
	var decoded = lzw_decode(encoded);
	t.equal(input, decoded);
	t.end();
});

tape('should lzw encode/decode large strings', function (t) {
	function reqListener () {
	  var encoded = lzw_encode(this.responseText);
	  var decoded = lzw_decode(encoded);
	}
	var oReq = new XMLHttpRequest();
	oReq.addEventListener("load", reqListener);
	oReq.open("GET", "base/test/data/a_lot.txt");
	oReq.send();
});