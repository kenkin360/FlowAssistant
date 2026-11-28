var AssistantRequest=Function.extend(Object, function () {
	var _=this(AssistantRequest);
	AssistantRequest=_[AssistantRequest];

	function AssistantRequest(prompt, options) {
		_['base'].apply(this, arguments);
		this.Prompt=prompt??'';
		this.Options=options??null;
	}

	_['public'].Prompt='';
	_['public'].Options=null;
});
