var AssistantResponse=Function.extend(Object, function () {
	var _=this(AssistantResponse);
	AssistantResponse=_[AssistantResponse];

	function AssistantResponse(value, isValid) {
		_['base'].apply(this, arguments);
		this.Reply=value?.reply??'';
		this.MethodName=value?.MethodName??null;
		this.Arguments=value?.Arguments??null;
		this.SuggestedPrompt=value?.suggestedPrompt??null;
		this.AspectRatio=value?.aspectRatio??null;
		this.IsValid=isValid===true;
	}

	_['public'].Reply='';
	_['public'].MethodName=null;
	_['public'].Arguments=null;
	_['public'].SuggestedPrompt=null;
	_['public'].AspectRatio=null;
	_['public'].IsValid=false;
});
