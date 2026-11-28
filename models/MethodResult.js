var MethodResult=Function.extend(Object, function () {
	var _=this(MethodResult);
	MethodResult=_[MethodResult];

	function MethodResult(message, artifact) {
		_['base'].apply(this, arguments);
		this.Message=message??'';
		this.Artifact=artifact??null;
	}

	_['public'].Message='';
	_['public'].Artifact=null;
	_['public'].toJSON=function () {
		return {Message: this.Message, Artifact: this.Artifact instanceof Media?this.Artifact.toJSON():this.Artifact};
	};
});
