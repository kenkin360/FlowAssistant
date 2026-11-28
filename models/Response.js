var Response=Function.extend(Object, function () {
	var _=this(Response);
	Response=_[Response];

	function Response(reply) {
		_['base'].apply(this, arguments);
		this.Reply=reply??'';
	}

	_['public'].Reply='';
});
