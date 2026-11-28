var Dimensions=Function.extend(Object, function () {
	var _=this(Dimensions);
	Dimensions=_[Dimensions];

	function Dimensions(width, height) {
		_['base'].apply(this, arguments);
		this.Width=width??null;
		this.Height=height??null;
	}

	_['public'].Width=null;
	_['public'].Height=null;
});
