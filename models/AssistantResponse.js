var AssistantResponse=Function.extend(Response, function () {
	var _=this(AssistantResponse);
	AssistantResponse=_[AssistantResponse];

	function AssistantResponse(value) {
		_['base'].call(this, value?.reply);
		this.MethodName=value?.MethodName??null;
		this.Arguments=value?.Arguments??null;
	}

	_['public'].MethodName=null;
	_['public'].Arguments=null;
});
