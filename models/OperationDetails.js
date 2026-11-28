var OperationDetails=Function.extend(Object, function () {
	var _=this(OperationDetails);
	OperationDetails=_[OperationDetails];

	function OperationDetails(title, prompt, width, height, error) {
		_['base'].apply(this, arguments);
		this.Title=title??null;
		this.Prompt=prompt??null;
		this.Width=width??null;
		this.Height=height??null;
		this.Error=error??null;
	}

	_['public'].toJSON=function () {
		return {Title: this.Title, Prompt: this.Prompt, Width: this.Width, Height: this.Height, Error: this.Error};
	};
	_['public'].Title=null;
	_['public'].Prompt=null;
	_['public'].Width=null;
	_['public'].Height=null;
	_['public'].Error=null;
});
