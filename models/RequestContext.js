var RequestContext=Function.extend(Object, function () {
	var _=this(RequestContext);
	RequestContext=_[RequestContext];

	function RequestContext(text, images) {
		_['base'].apply(this, arguments);
		this.Text=text??'';
		this.Images=images??[];
	}

	_['public'].Text='';
	_['public'].Images=null;
});
