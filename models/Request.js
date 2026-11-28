var Request=Function.extend(Object, function () {
	var _=this(Request);
	Request=_[Request];

	function Request(prompt) {
		_['base'].apply(this, arguments);
		this.Prompt=prompt??'';
	}

	_['public'].Prompt='';
});
