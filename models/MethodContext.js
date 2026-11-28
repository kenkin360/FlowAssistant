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

	_['public'].ToLegacy=function () {
		return {image: this.Image, artifact: this.Artifact, track: this.Track};
	};
});
