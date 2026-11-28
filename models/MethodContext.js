var MethodContext=Function.extend(Object, function () {
	var _=this(MethodContext);
	MethodContext=_[MethodContext];

	function MethodContext(image, artifact) {
		_['base'].apply(this, arguments);
		this.image=image??null;
		this.artifact=artifact??null;
	}

	_['public'].image=null;
	_['public'].artifact=null;
	_['public'].track=true;
});
