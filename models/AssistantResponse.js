var AssistantResponse=Function.extend(Object, function () {
	var _=this(AssistantResponse);
	AssistantResponse=_[AssistantResponse];

	function AssistantResponse(value) {
		_['base'].apply(this, arguments);
		this.Reply=value?.reply??'';
		this.MethodName=value?.MethodName??null;
		this.Arguments=value?.Arguments??null;
	}

	_['public'].Reply='';
	_['public'].MethodName=null;
	_['public'].Arguments=null;
});
