var AssistantRequest=Function.extend(Request, function () {
	var _=this(AssistantRequest);
	AssistantRequest=_[AssistantRequest];

	function AssistantRequest(prompt, options) {
		_['base'].call(this, prompt);
		this.Options=options??null;
	}

	_['public'].Options=null;
});
