var MethodContext=Function.extend(Object, function () {
	var _=this(MethodContext);
	MethodContext=_[MethodContext];

	function MethodContext(image, artifact) {
		_['base'].apply(this, arguments);
		this.Image=image??null;
		this.Artifact=artifact??null;
	}

	_['public'].Image=null;
	_['public'].Artifact=null;
	_['public'].Track=true;

	Object.defineProperties(MethodContext.prototype, {
		image: {get: function () { return this.Image; }}
		, artifact: {get: function () { return this.Artifact; }}
		, track: {get: function () { return this.Track; }}
	});
});
