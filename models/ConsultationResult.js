var ConsultationResult=Function.extend(Object, function () {
	var _=this(ConsultationResult);
	ConsultationResult=_[ConsultationResult];

	function ConsultationResult(response, details) {
		_['base'].apply(this, arguments);
		this.Response=response??null;
		this.Details=details??null;
	}

	_['public'].Response=null;
	_['public'].Details=null;
});
